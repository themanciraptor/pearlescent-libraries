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
import { ResizeThresholdService } from './on-resize.service';
import { Config, RESIZE_CONFIG } from './on-resize.tokens';

export interface CurrentThresholds {
  // which threshold triggered: if null, the number is larger than all inline flow thresholds; if undefined, no thresholds are calculated
  readonly inlineThreshold?: number | null;
  // which threshold triggered: if null, the number is larger than all block flow thresholds; if undefined, no thresholds are calculated
  readonly blockThreshold?: number | null;
}

const NoOpThresholds = () => Infinity;

@Directive({
  selector: '[plsResizeThresholds], (plsOnResizeThreshold)',
  exportAs: 'plsResizeThresholds',
})
export class ResizeThresholdsDirective {
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _config = inject(RESIZE_CONFIG, { optional: true });
  private readonly service = inject(ResizeThresholdService);
  private readonly inlineThresholds = computed(() => {
    const t = this.resizeThresholdConfig()?.inlineThresholds;
    return t ? this._compileThresholds(t) : NoOpThresholds;
  });

  private readonly blockThresholds = computed(() => {
    const t = this.resizeThresholdConfig()?.blockThresholds;
    return t ? this._compileThresholds(t) : NoOpThresholds;
  });

  private readonly boxModel = computed(() => {
    const instanceConfig = this.resizeThresholdConfig();
    return instanceConfig?.boxModel ?? this._config?.boxModel ?? 'content-box';
  });

  public readonly resizeThresholdConfig = input<Config | null>(null, {
    alias: 'plsResizeThresholds',
  });
  public readonly threshold = output<CurrentThresholds>({
    alias: 'plsOnResizeThreshold',
  });
  public readonly currentThresholds = signal<CurrentThresholds>({
    inlineThreshold: null,
    blockThreshold: null,
  });

  private readonly _resizeCallback = (entry: ResizeObserverEntry) => {
    const boxModelKey = this.boxModel() ? 'contentBoxSize' : 'borderBoxSize';
    const { inlineSize, blockSize } = entry[boxModelKey][0];
    const next = {
      inlineThreshold: this.inlineThresholds()(inlineSize),
      blockThreshold: this.blockThresholds()(blockSize),
    };
    this.currentThresholds.set(next);
    this.threshold.emit(next);
  };

  constructor() {
    afterNextRender(() => {
      this._observe();
    });

    effect(() => {
      const boxModel = this.boxModel();
      this.service.reset(this.el.nativeElement, { box: boxModel });
    });
  }

  private _compileThresholds(thresholds: number[]): (v: number) => number {
    const sorted = [...new Set(thresholds)].sort((a, b) => a - b);
    if (sorted[0] !== 0) sorted.unshift(0);
    const minInterval = sorted.reduce((min, next, i) => {
      if (i === 0) return Infinity;
      const prev = sorted[i - 1];
      return Math.min(min, next - prev);
    }, Infinity);
    const normalized = sorted.map((t) => Math.ceil(t / minInterval));

    if (normalized.length !== new Set(normalized).size) {
      throw new Error('One or more resize thresholds cannot be differentiated efficiently');
    }

    if (isDevMode() && normalized[normalized.length - 1] > 1024) {
      console.warn(
        'One or more resize thresholds are exponentially too large. This may cause a noticeable increase in memory usage in cases where many resize observers are used.'
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
