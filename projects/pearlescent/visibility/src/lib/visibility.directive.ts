import { DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';
import { VisibilityService } from './visibility.service';

@Directive({ selector: '[plsIsVisible]', standalone: true })
export class IsVisibleDirective {
  private readonly _isVisible = signal(false);
  public readonly isVisible = this._isVisible.asReadonly();

  constructor(r: VisibilityService, d: DestroyRef, el: ElementRef) {
    r.register(el.nativeElement, this._isVisible, d);
  }
}
