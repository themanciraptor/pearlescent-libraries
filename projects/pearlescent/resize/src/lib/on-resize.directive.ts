import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Config } from './on-resize.tokens';
import { OnResizeService } from './on-resize.service';

export interface CurrentSize {
  readonly inlineSize: number;
  readonly blockSize: number;
}

@Directive({
  selector: '[plsResize], (plsOnResize)',
  exportAs: 'plsResize',
})
export class ResizeDirective {
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(OnResizeService);

  public readonly resizeConfig = input<Config | null>(null);
  public readonly sizeChanged = output<CurrentSize>({
    alias: 'plsOnResize',
  });
  public readonly currentSize = signal<CurrentSize>({
    inlineSize: 0,
    blockSize: 0,
  });

  private readonly boxModel = computed(() => this.resizeConfig()?.boxModel ?? this.service.boxModel());

  private readonly resizeCallback = (entry: ResizeObserverEntry) => {
    const boxModelKey = this.boxModel() ? 'contentBoxSize' : 'borderBoxSize';
    const { inlineSize, blockSize } = entry[boxModelKey][0];
    const next = { inlineSize, blockSize };
    this.sizeChanged.emit(next);
    this.currentSize.set(next);
  };

  constructor() {
    afterNextRender(() => this._observe());

    effect(() => {
      const boxModel = this.boxModel();
      this.service.reset(this.el.nativeElement, { box: boxModel });
    });
  }

  private _observe(): void {
    const opts = { box: this.boxModel() };
    this.service.observe(this.el.nativeElement, this.resizeCallback, this.destroyRef, opts);
  }
}
