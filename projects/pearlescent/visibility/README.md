# Visibility

A simple, no-frills visibility utility. Will tell you if a component is 100% inside the viewport, and when a visible
component exits the viewport.

## Usage

1. Add `IsVisibilityDirective` to `hostDirectives` of the component you want to monitor visibility for:

```ts
import { Component, OnInit, computed, effect } from '@angular/core';

@Component({
  selector: 'selector-name',
  templateUrl: 'name.component.html',
  hostDirectives: [IsVisibleDirective],
})
```

and then assign the isVisible signal to a local field so you can perform actions on it.

```ts
export class NameComponent implements  {
   private readonly isVisible = inject(IsVisibleDirective).isVisible;
   protected readonly computeValueWhenIsVisible = computed(() => {
      const i = this.isVisible();
      if (i) return 'foo';

      return 'bar';
   });

   constructor() {
      effect(() => {
         const i = this.isVisible();
         if (i) doSomeWork();
      });
   }
}
```
