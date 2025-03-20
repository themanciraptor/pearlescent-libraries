import { Directive, ElementRef, forwardRef, inject, signal } from '@angular/core';

@Directive({
  selector: '[plsGalleryPane]',
  host: { '[class.pls-gallery-pane]': 'true' },
})
export class CarouselPaneDirective {
  readonly el: ElementRef<HTMLElement> = inject(ElementRef);
}
