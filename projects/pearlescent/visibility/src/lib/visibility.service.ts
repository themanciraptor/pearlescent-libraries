import { afterNextRender, afterRenderEffect, DestroyRef, Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VisibilityService {
  private readonly registeredEls = signal<Map<Element, WritableSignal<boolean>>>(new Map());
  private intersectionObserver?: IntersectionObserver;

  constructor() {
    afterNextRender({
      read: () => this.initializeIntersectionObserver(),
    });
    afterRenderEffect({
      read: () => {
        const m = this.registeredEls();
        m.forEach((_, k) => this.intersectionObserver?.observe(k));
      },
    });
  }

  private initializeIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = this.registeredEls().get(entry.target);
          if (!isVisible) return this.unregister(entry.target);
          isVisible.set(entry.isIntersecting);
        });
      },
      { threshold: [0.0, 1.0] }
    );
  }

  public register(el: Element, signalRef: WritableSignal<boolean>, destroyRef: DestroyRef) {
    this.registeredEls.set(this.registeredEls().set(el, signalRef));
    destroyRef.onDestroy(() => {
      this.unregister(el);
    });
  }

  public unregister(el: Element) {
    const m = this.registeredEls();
    m.delete(el);
    this.registeredEls.set(m);
    this.intersectionObserver?.unobserve(el);
    if (this.registeredEls().size === 0) {
      this.intersectionObserver?.disconnect();
    }
  }
}
