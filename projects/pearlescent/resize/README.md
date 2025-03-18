# Resize

Resize provides multiple angular utility directives to monitor the size of an html element. Only supports box model.

## OnResize

A directive that simply spits out the current inline (width) and block (height) sizes of an Element.

### Usage - Use element size change in component implementation.

In component.ts:

```ts
handleSize(size: CurrentSize) {
    // ... do something
}
```

In template:

```html
<div (plsOnResize)="handleSize($event)"></div>
```

### Usage - Confined to template

```html
<div plsResize #resize="plsResize"></div>

@let inlineSize = resize.currentSize().inlineSize;
<!-- ... Do something with inlineSize -->
```

## ResizeBreakpointsDirective

A directive that matches your element width to a breakpoint. Essentially a directive implementation of the
[`matchContainer()`](https://github.com/w3c/csswg-drafts/issues/6205) function which will eventually come to CSS. The
current implementation does not depend on the `matchContainer` polyfill.

### Usage - Use element size change in component implementation.

In component.ts:

```ts
handleBreakpointChange(breakpoints: CurrentBreakpoints) {
    // ... do something
}
```

In template:

```html
<div
  plsResizeBreakpoints="{ inlineBreakpoints: [200, 400, 1600] }"
  (inlineBreakpointChanged)="handleBreakpointChange($event)"
>
  ...
</div>

<!-- If you inject a global config with default thresholds, you can use the event listener directly -->
<div (plsOnResizeBreakpoints)="handleBreakpointChange($event)">...</div>
```

### Usage - Confined to template

```html
<div
  plsResizeBreakpoints="{
    inlineBreakpoints: [200, 400, 1600],
  }"
  #breakpoint="plsResizeBreakpoints"
></div>

@let inlineBreakpoint = breakpoint.inlineBreakpoint();
<!-- ... Do something with inlineSize -->
```
