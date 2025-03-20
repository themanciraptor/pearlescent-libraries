import {
  afterNextRender,
  Component,
  computed,
  contentChildren,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { CarouselPaneDirective } from './carousel-pane.directive';

export interface Config {
  /**
   * @description whether the gallery will position panes on the vertical or horizontal axis.
   * @default 'horizontal'
   */
  direction: 'vertical' | 'horizontal';

  /**
   * @description the delay in milliseconds between pane transitions.
   * @default 4000
   */
  delay: number;
}

function debounce<T>(callback: (...args: T[]) => void, debounceTime: number): (...args: T[]) => void {
  let timeoutId: number;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, debounceTime);
  };
}

@Component({
  selector: 'pls-carousel',
  template: `<ng-content></ng-content>`,
  styleUrl: './carousel.component.scss',
  standalone: true,
  host: {
    '(scroll)': 'debouncedIndexUpdate()',
    '[class.horizontal]': 'config().direction === "horizontal"',
    '[class.vertical]': 'config().direction === "vertical"',
  },
})
export class CarouselComponent {
  private readonly _hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly panes = contentChildren(CarouselPaneDirective);
  public readonly config = input<Config>({
    direction: 'horizontal',
    delay: 4000,
  });
  private readonly direction = computed(() => this.config().direction);
  public readonly activePaneIndex = signal(0);
  private readonly parentController = inject(CarouselComponent, {
    optional: true,
    skipSelf: true,
  });
  public readonly forceHaltProgression = input(false);
  private readonly _systemHaltProgression = signal(false);
  private readonly isHalted = computed(() => this._systemHaltProgression() || this.forceHaltProgression());
  public readonly delay = computed(() => this.config().delay);
  protected readonly debouncedIndexUpdate = debounce(() => this._updatePaneIndex(), 100);

  private intervalId?: number;
  private skipNumber = 0;

  constructor() {
    afterNextRender(() => {
      this.intervalId = window.setInterval(() => this.galleryLoop(), this.delay());
    });

    effect(() => {
      const i = this.delay();
      if (this.intervalId) {
        window.clearInterval(this.intervalId);
        this.intervalId = window.setInterval(() => this.galleryLoop(), i);
      }
    });
  }

  private galleryLoop() {
    if (this.isHalted()) return;
    if (this.skipNumber > 0) {
      this.skipNumber--;
      return;
    }
    const num = this.panes().length;
    const next = (this.activePaneIndex() + 1) % num;
    this.selectPane(next);
  }

  public haltProgression() {
    this._systemHaltProgression.set(true);
    if (this.parentController) this.parentController.haltProgression();
  }

  public resumeProgression(skip = 0) {
    this._systemHaltProgression.set(false);
    this.skipNumber = skip;
    if (this.parentController) this.parentController.resumeProgression();
  }

  public selectPane(next: number) {
    this.panes()?.[next]?.el?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: this.direction() === 'vertical' ? 'center' : 'nearest',
      inline: this.direction() === 'horizontal' ? 'center' : 'nearest',
    });
    this.activePaneIndex.set(next);
  }

  private _updatePaneIndex() {
    const paneRects = this.panes().map((p) => p.el.nativeElement.getBoundingClientRect());
    if (this._rectWithinCarousel(paneRects[this.activePaneIndex()])) return;

    const closestPane = paneRects.findIndex((p) => this._rectContainsCarouselMidpoint(p));
    if (closestPane === this.activePaneIndex()) return;

    return this.activePaneIndex.set(closestPane);
  }

  private _rectContainsCarouselMidpoint(rect: DOMRect): boolean {
    const carouselRect = this._hostEl.nativeElement.getBoundingClientRect();
    const midPoint =
      this.direction() === 'horizontal'
        ? carouselRect.left + carouselRect.width / 2
        : carouselRect.top + carouselRect.height / 2;

    return rect.left < midPoint && rect.right > midPoint;
  }

  private _rectWithinCarousel(rect: DOMRect): boolean {
    const carouselRect = this._hostEl.nativeElement.getBoundingClientRect();
    return (
      rect.left >= carouselRect.left &&
      rect.right <= carouselRect.right &&
      rect.top >= carouselRect.top &&
      rect.bottom <= carouselRect.bottom
    );
  }
}
