import {
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
import { timeout, catchError, EMPTY, finalize, Subscription, first, switchMap, interval, skip } from 'rxjs';
import { GalleryPaneDirective } from './gallery-pane.directive';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'pls-gallery',
  imports: [],
  template: `<ng-content></ng-content>`,
  styles: ``,
  standalone: true,
})
export class GalleryComponent {
  private readonly appRef = inject(ApplicationRef);
  private readonly _hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly panes = contentChildren(GalleryPaneDirective);
  public readonly numPanes = computed(() => this.panes().length);
  public readonly width = signal(0);
  protected readonly currentPane = signal(0);
  public readonly activeIndex = this.currentPane.asReadonly();
  private readonly parentController = inject(GalleryComponent, {
    optional: true,
    skipSelf: true,
  });
  readonly forceHaltProgression = input(false);
  public readonly delay = input(4000);
  protected readonly scrollLeft = computed(() => {
    const c = this.currentPane();
    const w = this.width();

    return c * w || 0;
  });
  private readonly userScroll = signal(0);
  private readonly userScrolling$ = toObservable(this.userScroll).pipe(
    timeout(50),
    catchError(() => EMPTY),
    finalize(() => {
      this.updatePaneIndex();
      this.resumeIntervalPane();
    })
  );

  private intervalSub = new Subscription();
  private userScrollSub = new Subscription();

  public get hostEl() {
    return this._hostEl;
  }

  constructor() {
    this.userScrollSub.unsubscribe();
    this.intervalSub.unsubscribe();

    effect(() => {
      const sl = this.scrollLeft();
      this.userScroll.set(sl);

      if ('scrollTo' in this._hostEl.nativeElement) {
        this.scroll(sl);
      }
    });

    effect(() => {
      const h = this.forceHaltProgression();
      if (h) this.haltProgression();
      else if (this.userScrollSub.closed) {
        this.resumeProgression();
      }
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
        const next = this.currentPane() + 1;
        this.currentPane.set(next % this.panes().length);
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
    this.currentPane.set(i);
    this.resumeProgression(1);
    if (this.parentController) this.parentController.resumeProgression(1);
  }

  private scroll(sl: number) {
    this._hostEl.nativeElement.scrollTo({
      left: sl,
      behavior: 'smooth',
    });
  }

  incrementPane(offset: number) {
    this.handleUserSelectedPane(this.nextPane(offset));
  }

  nextPane(offset: number) {
    const next = this.currentPane() + offset;
    if (next < 0) return this.panes().length - 1;
    else if (next >= this.panes().length) return next % this.panes().length;

    return next;
  }

  protected handleScroll() {
    this.intervalSub.unsubscribe();
    if (this.userScrollSub.closed) {
      this.userScrollSub = this.userScrolling$.subscribe();
    }
    this.userScroll.set(this._hostEl.nativeElement.scrollLeft || 0);
  }

  private updatePaneIndex() {
    const scrollLeft = this.userScroll();
    const scrollSize = this.width();
    const current = this.currentPane();
    const expected = Math.round(scrollLeft / scrollSize);
    if (current != expected) {
      this.currentPane.set(expected);
    }
  }

  // protected handleResize($event: CurrentSize): void {
  //   this.width.set($event.inlineSize);
  // }
}
