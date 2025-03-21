# Gallery

The intent of this library is to provide a series of utilities that make building galleries easy using native browser functionality as much as possible.

## Carousel

The CarouselComponent is a reusable UI component that displays a series of panes in a carousel layout, allowing users to navigate through them. It supports horizontal and vertical directions, and can be configured with a delay between pane transitions. The component also provides methods to halt and resume progression, making it easy to integrate with other interactive elements.

To use the CarouselComponent, simply wrap your panes in the `<pls-carousel>` element and add the `plsCarouselPane` directive to each pane. Configure the carousel's direction and delay using the `config` input. For example:

```html
<pls-carousel [config]="{ direction: 'horizontal', delay: 5000 }">
  <div plsCarouselPane>...</div>
  <div plsCarouselPane>...</div>
  <div plsCarouselPane>...</div>
  <div plsCarouselPane>...</div>
  <div plsCarouselPane>...</div>
</pls-carousel>
```

Panes do not necessarily need to be the same dimensions, some could be wider.
