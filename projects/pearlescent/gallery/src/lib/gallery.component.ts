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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { GalleryPaneDirective } from './gallery-pane.directive';

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

@Component({
  selector: 'pls-gallery',
  imports: [],
  template: `<ng-content></ng-content>`,
  styleUrl: './gallery.component.scss',
  standalone: true,
  host: {
    '(scroll)': 'handleScroll($event)',
    '[class.horizontal]': 'config().direction === "horizontal"',
    '[class.vertical]': 'config().direction === "vertical"',
  },
})
export class GalleryComponent {
  private readonly _hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly panes = contentChildren(GalleryPaneDirective);
  public readonly numPanes = computed(() => this.panes().length);
  public readonly config = input<Config>({
    direction: 'horizontal',
    delay: 4000,
  });
  private readonly direction = computed(() => this.config().direction);
  public readonly activePaneIndex = signal(0);
  private readonly parentController = inject(GalleryComponent, {
    optional: true,
    skipSelf: true,
  });
  public readonly forceHaltProgression = input(false);
  private readonly _systemHaltProgression = signal(false);
  private readonly isHalted = computed(() => this._systemHaltProgression() || this.forceHaltProgression());
  public readonly delay = computed(() => this.config().delay);
  private readonly userScroll = signal(0);
  private readonly userScrolling$ = toObservable(this.userScroll).pipe(debounceTime(100), takeUntilDestroyed());

  private intervalId?: number;
  private skipNumber = 0;

  public get hostEl() {
    return this._hostEl;
  }

  constructor() {
    this.userScrolling$.subscribe(() => this._updatePaneIndex());

    afterNextRender(() => {
      this.intervalId = window.setInterval(() => this.galleryLoop(), this.delay());
    });

    effect(() => {
      const i = this.delay();
      if (this.intervalId) window.clearInterval(this.intervalId);
      this.intervalId = window.setInterval(() => this.galleryLoop(), i);
    });
  }

  private galleryLoop() {
    if (this.isHalted()) return;
    if (this.skipNumber > 0) {
      this.skipNumber--;
      return;
    }
    const num = this.numPanes();
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

  protected handleScroll($event: Event) {
    const userScroll =
      this.direction() === 'horizontal'
        ? ($event.target as HTMLElement).scrollLeft
        : ($event.target as HTMLElement).scrollTop;
    this.userScroll.set(userScroll || 0);
  }

  private _updatePaneIndex() {
    const { left, top } = this._hostEl.nativeElement.getBoundingClientRect();
    const offsets = this.panes().map((p) => p.el.nativeElement.getBoundingClientRect());
    const start = this.direction() === 'horizontal' ? left : top;
    const closestPane = offsets.reduce(
      (prev: [DOMRect, number], next, i): [DOMRect, number] => {
        const prevStart = this.direction() === 'horizontal' ? prev[0].left : prev[0].top;
        const nextStart = this.direction() === 'horizontal' ? next.left : next.top;

        if (Math.abs(nextStart) - start < Math.abs(prevStart) - start) {
          return [next, i];
        }

        return prev as [DOMRect, number];
      },
      [offsets[0], 0]
    );
    if (closestPane[1] === this.activePaneIndex()) return;

    return this.selectPane(closestPane[1]);
  }
}
