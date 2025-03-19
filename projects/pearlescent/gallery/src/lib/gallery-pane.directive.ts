import { Directive, ElementRef, forwardRef, inject, signal } from '@angular/core';
import { GalleryComponent } from './gallery.component';

@Directive({
  selector: '[plsGalleryPane]',
  host: { '[class.pls-gallery-pane]': 'true' },
  providers: [forwardRef(() => GalleryComponent)],
})
export class GalleryPaneDirective {
  readonly el: ElementRef<HTMLElement> = inject(ElementRef);
  readonly index = signal(0);
}
