import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  output,
  signal,
} from '@angular/core';
import { ResizeBreakpointsService } from './on-resize.service';
import { Config, RESIZE_CONFIG } from './on-resize.tokens';

export interface CurrentBreakpoints {
  // which Breakpoints triggered: if null, the number is larger than all inline flow Breakpoints; if undefined, no Breakpoints are calculated
  readonly inlineBreakpoints?: number | null;
  // which Breakpoints triggered: if null, the number is larger than all block flow Breakpoints; if undefined, no Breakpoints are calculated
  readonly blockBreakpoints?: number | null;
}

const NoOpBreakpoints = () => Infinity;

@Directive({
  selector: '[plsResizeBreakpoints], (plsOnResizeBreakpoints)',
  exportAs: 'plsResizeBreakpoints',
})
export class ResizeBreakpointsDirective {
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _config = inject(RESIZE_CONFIG, { optional: true });
  private readonly service = inject(ResizeBreakpointsService);
  private readonly inlineBreakpoints = computed(() => {
    const t = this.resizeBreakpointsConfig()?.inlineBreakpoints;
    return t ? this._compileBreakpoints(t) : NoOpBreakpoints;
  });

  private readonly blockBreakpoints = computed(() => {
    const t = this.resizeBreakpointsConfig()?.blockBreakpoints;
    return t ? this._compileBreakpoints(t) : NoOpBreakpoints;
  });

  private readonly boxModel = computed(() => {
    const instanceConfig = this.resizeBreakpointsConfig();
    return instanceConfig?.boxModel ?? this._config?.boxModel ?? 'content-box';
  });

  /**
   * @description
   * Breakpoint configuration for inline and block flow
   */
  public readonly resizeBreakpointsConfig = input<Config | null>(null, {
    alias: 'plsResizeBreakpoints',
  });

  /**
   * @description
   * Event emitter for most recently matched breakpoint for inline flow.
   */
  public readonly inlineBreakpointChanged = output<number>({
    alias: 'plsInlineBreakpointChanged',
  });

  /**
   * @description
   * Event emitter for most recently matched breakpoint for block flow.
   */
  public readonly blockBreakpointChanged = output<number>({
    alias: 'plsBlockBreakpointChanged',
  });

  private readonly _inlineBreakpoint = signal<number>(0);

  /**
   * @description
   * Most recently matched breakpoint for inline flow.
   */
  public readonly inlineBreakpoint = this._inlineBreakpoint.asReadonly();

  private readonly _blockBreakpoint = signal<number>(0);

  /**
   * @description
   * Most recently matched breakpoint for block flow.
   */
  public readonly blockBreakpoint = this._blockBreakpoint.asReadonly();

  private readonly _resizeCallback = (entry: ResizeObserverEntry) => {
    const boxModelKey = this.boxModel() ? 'contentBoxSize' : 'borderBoxSize';
    const { inlineSize, blockSize } = entry[boxModelKey][0];

    const inlineBreakpoint = this.inlineBreakpoints()(inlineSize);
    const blockBreakpoint = this.blockBreakpoints()(blockSize);

    this._inlineBreakpoint.set(inlineBreakpoint);
    this._blockBreakpoint.set(blockBreakpoint);
  };

  constructor() {
    afterNextRender(() => {
      this._observe();
    });

    effect(() => {
      const boxModel = this.boxModel();
      this.service.reset(this.el.nativeElement, { box: boxModel });
    });

    effect(() => {
      const inlineBreakpoint = this.inlineBreakpoint();
      this.inlineBreakpointChanged.emit(inlineBreakpoint);
    });

    effect(() => {
      const blockBreakpoint = this.blockBreakpoint();
      this.blockBreakpointChanged.emit(blockBreakpoint);
    });
  }

  private _compileBreakpoints(Breakpoints: number[]): (v: number) => number {
    const sorted = [...new Set(Breakpoints)].sort((a, b) => a - b);
    if (sorted[0] !== 0) sorted.unshift(0);
    const minInterval = sorted.reduce((min, next, i) => {
      if (i === 0) return Infinity;
      const prev = sorted[i - 1];
      return Math.min(min, next - prev);
    }, Infinity);
    const normalized = sorted.map((t) => Math.ceil(t / minInterval));

    if (normalized.length !== new Set(normalized).size) {
      throw new Error('One or more resize Breakpoints cannot be differentiated efficiently');
    }

    if (isDevMode() && normalized[normalized.length - 1] > 1024) {
      console.warn(
        'One or more resize Breakpoints are exponentially too large. This may cause a noticeable increase in memory usage in cases where many resize observers are used.'
      );
    }

    const compiled = normalized
      .map((n, i) => (n > 0 ? new Array<number>(n - normalized[i - 1]).fill(sorted[i]) : [0]))
      .flat();

    return (value: number): number => {
      const normalizedValue = Math.ceil(value / minInterval);
      return compiled[normalizedValue] ?? Infinity;
    };
  }

  private _observe(): void {
    const opts = { box: this.boxModel() };
    this.service.observe(this.el.nativeElement, this._resizeCallback, this.destroyRef, opts);
  }
}
