import { Directive, ElementRef, forwardRef, inject, signal } from '@angular/core';

@Directive({
  selector: '[plsCarouselPane]',
  host: { '[class.pls-carousel-pane]': 'true' },
})
export class CarouselPaneDirective {
  readonly el: ElementRef<HTMLElement> = inject(ElementRef);
}
