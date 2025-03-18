import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  Injectable,
  input,
  isDevMode,
  output,
  signal,
} from '@angular/core';
import { Config, RESIZE_CONFIG } from './on-resize.tokens';

@Injectable({
  providedIn: 'root',
})
export class ResizeService {
  private readonly _config = inject(RESIZE_CONFIG, { optional: true });
  private readonly elements = new Map<Element, ResizeObserverCallback>();
  public readonly boxModel = computed(
    () => this._config?.boxModel ?? 'content-box'
  );

  private resizeObserver?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.resizeObserver = this._createResizeObserver();
    });
  }

  public observe(
    element: Element,
    callback: ResizeObserverCallback,
    destroyRef?: DestroyRef
  ) {
    this.elements.set(element, callback);
    this.resizeObserver?.observe(element, { box: this.boxModel() });
    if (destroyRef) {
      destroyRef.onDestroy(() => {
        this.elements.delete(element);
        this.resizeObserver?.unobserve(element);
      });
    }
  }

  private _createResizeObserver(): ResizeObserver {
    const r = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.elements.get(entry.target)?.([entry], r);
      }
    });

    return r;
  }
}

@Directive({
  selector: '(plsOnResize)',
  standalone: true,
  exportAs: 'resizeHost',
})
export class ResizeDirective {
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _config = inject(RESIZE_CONFIG, { optional: true });

  private readonly boxModel = computed(() => {
    const instanceConfig = this.resizeConfig();
    return instanceConfig?.boxModel ?? this._config?.boxModel ?? 'content-box';
  });

  public readonly resizeConfig = input<Config | null>(null);
  public readonly sizeChanged = output<CurrentSize>({
    alias: 'plsOnResize',
  });

  private resizeObserver?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.resizeObserver = this._createResizeObserver();
      this.resizeObserver.observe(this.el.nativeElement, {
        box: this.boxModel(),
      });
    });

    effect(() => {
      const boxModel = this.boxModel();
      if (!this.resizeObserver) return;

      this.resizeObserver.unobserve(this.el.nativeElement);
      this.resizeObserver.observe(this.el.nativeElement, { box: boxModel });
    });
  }

  private _createResizeObserver() {
    const r = new ResizeObserver((entries) => {
      const boxModelKey = this.boxModel() ? 'contentBoxSize' : 'borderBoxSize';
      const { inlineSize, blockSize } = entries[0][boxModelKey][0];

      this.sizeChanged.emit({
        inlineSize,
        blockSize,
      });
    });

    this.destroyRef.onDestroy(() => {
      r.disconnect();
    });

    return r;
  }
}

export interface CurrentSize {
  readonly inlineSize: number;
  readonly blockSize: number;
}

export interface CurrentThresholds {
  // which threshold triggered: if null, the number is larger than all inline flow thresholds; if undefined, no thresholds are calculated
  readonly inlineThreshold?: number | null;
  // which threshold triggered: if null, the number is larger than all block flow thresholds; if undefined, no thresholds are calculated
  readonly blockThreshold?: number | null;
}

const NoOpThresholds = () => Infinity;

@Directive({
  selector: '(plsOnResizeThreshold)',
  standalone: true,
  exportAs: 'resizeHost',
})
export class ResizeThresholdsDirective {
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  // TODO: find a way to make this more performant
  private readonly _config = inject(RESIZE_CONFIG, { optional: true });
  private readonly inlineThresholds = computed(() => {
    const t = this.resizeConfig()?.inlineThresholds;
    if (!t) return NoOpThresholds;

    return this._compileThresholds(t);
  });

  private readonly blockThresholds = computed(() => {
    const t = this.resizeConfig()?.blockThresholds;
    if (!t) return NoOpThresholds;

    return this._compileThresholds(t);
  });

  private readonly boxModel = computed(() => {
    const instanceConfig = this.resizeConfig();
    return instanceConfig?.boxModel ?? this._config?.boxModel ?? 'content-box';
  });

  public readonly resizeConfig = input<Config | null>(null);
  private readonly _prevThresholds = signal<CurrentThresholds>({});
  public readonly threshold = output<CurrentThresholds>({
    alias: 'plsOnResizeThreshold',
  });

  private resizeObserver?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.resizeObserver = this._createResizeObserver();
      this.resizeObserver.observe(this.el.nativeElement, {
        box: this.boxModel(),
      });
    });

    effect(() => {
      const boxModel = this.boxModel();
      if (!this.resizeObserver) return;

      this.resizeObserver.unobserve(this.el.nativeElement);
      this.resizeObserver.observe(this.el.nativeElement, { box: boxModel });
    });
  }

  private _createResizeObserver() {
    const r = new ResizeObserver((entries) => {
      const entry = entries.find((entry) => {
        return 'contentBoxSize' in entry;
      });

      if (entry) {
        const boxModelKey = this.boxModel()
          ? 'contentBoxSize'
          : 'borderBoxSize';
        const { inlineSize, blockSize } = entries[0][boxModelKey][0];

        const [i, b] = [this.inlineThresholds(), this.blockThresholds()];
        if (i.length > 0 || b.length > 0) {
          const next = {
            inlineThreshold: i(inlineSize),
            blockThreshold: b(blockSize),
          };

          if (
            next.inlineThreshold !== this._prevThresholds().inlineThreshold ||
            next.blockThreshold !== this._prevThresholds().blockThreshold
          ) {
            this._prevThresholds.set(next);
            this.threshold.emit(next);
          }
        }
      }
    });

    this.destroyRef.onDestroy(() => {
      r.disconnect();
    });

    return r;
  }

  private _compileThresholds(thresholds: number[]): (v: number) => number {
    const sorted = [...new Set(thresholds)].sort((a, b) => a - b);
    if (sorted[0] !== 0) sorted.unshift(0);
    const minInterval = sorted.reduce((min, next, i) => {
      const prev = sorted[i - 1];
      return Math.min(min, next - prev);
    }, Infinity);
    const normalized = sorted.map((t) => Math.ceil(t / minInterval));

    if (normalized.length !== new Set(normalized).size) {
      throw new Error(
        'One or more resize thresholds cannot be differentiated efficiently'
      );
    }

    if (isDevMode() && normalized[normalized.length - 1] > 1024) {
      console.warn(
        'One or more resize thresholds are exponentially too large. This may cause a noticeable increase in memory usage in cases where many resize observers are used.'
      );
    }

    const compiled = normalized
      .map((n, i) => new Array<number>(n).fill(sorted[i]))
      .flat();

    return (value: number): number => {
      const normalizedValue = Math.ceil(value / minInterval);
      return compiled[normalizedValue] ?? Infinity;
    };
  }
}
