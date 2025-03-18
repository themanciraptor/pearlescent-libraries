import { afterNextRender, computed, DestroyRef, inject, Injectable, isDevMode } from '@angular/core';
import { RESIZE_CONFIG } from './on-resize.tokens';

export type OnResizeCallback = (entry: ResizeObserverEntry, resizeObserver: ResizeObserver) => void;

export class BaseResizeService {
  private readonly _config = inject(RESIZE_CONFIG, { optional: true });
  private readonly elements = new Map<Element, OnResizeCallback>();
  public readonly boxModel = computed(() => this._config?.boxModel ?? 'content-box');

  private resizeObserver?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.resizeObserver = this._createResizeObserver();
    });
  }

  public observe(
    element: Element,
    callback: OnResizeCallback,
    destroyRef?: DestroyRef,
    options?: ResizeObserverOptions
  ) {
    if (this.elements.has(element)) {
      return;
    }
    this.elements.set(element, callback);

    if (this.resizeObserver) {
      this.resizeObserver?.observe(element, options ?? { box: this.boxModel() });
      if (destroyRef) {
        destroyRef.onDestroy(() => this.unobserve(element));
      }
    }
  }

  /**
   * If no destroyRef is passed into the observe method, call this method to unobserve the element. Calling this method
   * manually when the call was originally registered with a destroyref may cause errors.
   *
   * @param element Element to be observed
   */
  public unobserve(element: Element) {
    this.elements.delete(element);
    this.resizeObserver?.unobserve(element);
  }

  public reset(element: Element, options?: ResizeObserverOptions) {
    if (!this.elements.has(element)) {
      if (isDevMode()) {
        console.warn('Attempting to reset an element that was not observed. Use the observe method instead.', element);
      }
      return;
    }
    this.resizeObserver?.unobserve(element);
    this.resizeObserver?.observe(element, options ?? { box: this.boxModel() });
  }

  private _createResizeObserver(): ResizeObserver {
    const r = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.elements.get(entry.target)?.(entry, r);
      }
    });

    for (const element of this.elements.keys()) {
      r.observe(element, { box: this.boxModel() });
    }

    return r;
  }
}

@Injectable({
  providedIn: 'root',
})
export class ResizeBreakpointsService extends BaseResizeService {}

@Injectable({
  providedIn: 'root',
})
export class OnResizeService extends BaseResizeService {}
