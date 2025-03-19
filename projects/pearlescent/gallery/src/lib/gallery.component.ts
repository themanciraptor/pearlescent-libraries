import {
  afterNextRender,
  ApplicationRef,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  timeout,
  catchError,
  EMPTY,
  finalize,
  Subscription,
  first,
  switchMap,
  interval,
  skip,
  debounceTime,
} from 'rxjs';
import { GalleryPaneDirective } from './gallery-pane.directive';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

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
  private readonly appRef = inject(ApplicationRef);
  private readonly _hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
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
  public readonly delay = computed(() => this.config().delay);
  private readonly userScroll = signal(0);
  private readonly userScrolling$ = toObservable(this.userScroll).pipe(debounceTime(100), takeUntilDestroyed());

  private intervalSub = new Subscription();

  public get hostEl() {
    return this._hostEl;
  }

  constructor() {
    this.intervalSub.unsubscribe();
    this.userScrolling$.subscribe(() => this.updatePaneIndex());

    afterNextRender(() => {
      if (this.forceHaltProgression()) this.resumeIntervalPane({ skipCount: 0, initial: true });
    });

    effect(() => {
      const h = this.forceHaltProgression();
      if (h) this.haltProgression();
      else this.resumeIntervalPane();
    });
  }

  protected resumeIntervalPane({ initial, skipCount } = { initial: false, skipCount: 0 }) {
    if (!this.intervalSub.closed && !initial) return;
    this.intervalSub = this.appRef.isStable
      .pipe(
        first((isStable) => isStable),
        switchMap(() => interval(this.delay()).pipe(skip(skipCount ?? 0), takeUntilDestroyed(this.destroyRef)))
      )
      .subscribe(() => {
        const num = this.numPanes();
        const next = (this.activePaneIndex() + 1) % num;
        this.panes()?.[next]?.el?.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: this.direction() === 'vertical' ? 'center' : 'nearest',
          inline: this.direction() === 'horizontal' ? 'center' : 'nearest',
        });
      });
  }

  public haltProgression() {
    this.intervalSub.unsubscribe();
    if (this.parentController) this.parentController.haltProgression();
  }

  public resumeProgression(skip = 0) {
    this.resumeIntervalPane({ initial: false, skipCount: skip });
    if (this.parentController) this.parentController.resumeProgression();
  }

  public handleUserSelectedPane(i: number) {
    this.haltProgression();
    this.resumeProgression(1);
    if (this.parentController) this.parentController.resumeProgression(1);
  }

  protected handleScroll($event: Event) {
    const userScroll =
      this.direction() === 'horizontal'
        ? ($event.target as HTMLElement).scrollLeft
        : ($event.target as HTMLElement).scrollTop;
    this.userScroll.set(userScroll || 0);
  }

  private updatePaneIndex() {
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
    this.panes()[closestPane[1]]?.el?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: this.direction() === 'vertical' ? 'center' : 'nearest',
      inline: this.direction() === 'horizontal' ? 'center' : 'nearest',
    });
    return this.activePaneIndex.set(closestPane[1]);
  }
}
