import { afterNextRender, DestroyRef, Injectable, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VisibilityService {
  private readonly registeredEls = new Map<Element, WritableSignal<boolean>>();
  private intersectionObserver?: IntersectionObserver;

  constructor() {
    afterNextRender(() => this.initializeIntersectionObserver());
  }

  private initializeIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = this.registeredEls.get(entry.target);
          if (!isVisible) return this.unregister(entry.target);
          if (entry.isIntersecting) {
            isVisible?.set(true);
          } else {
            isVisible?.set(false);
          }
        });
      },
      { threshold: [0.0, 1.0] }
    );

    this.registeredEls.forEach((_, el) => this.intersectionObserver?.observe(el));
  }

  public register(el: Element, signalRef: WritableSignal<boolean>, destroyRef: DestroyRef) {
    this.registeredEls.set(el, signalRef);

    destroyRef.onDestroy(() => {
      this.unregister(el);
    });
  }

  public unregister(el: Element) {
    this.registeredEls.delete(el);
    this.intersectionObserver?.unobserve(el);
    if (this.registeredEls.size === 0) {
      this.intersectionObserver?.disconnect();
    }
  }
}
