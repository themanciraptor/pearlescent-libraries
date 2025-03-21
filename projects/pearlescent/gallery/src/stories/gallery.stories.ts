import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { CarouselComponent } from '../lib/carousel.component';
import { CarouselPaneDirective } from '../lib/carousel-pane.directive';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<CarouselComponent> = {
  title: 'Gallery',
  component: CarouselComponent,
  tags: ['autodocs'],
  argTypes: {
    config: {
      control: 'object',
    },
    forceHaltProgression: {
      control: 'boolean',
    },
  },
  args: {
    config: { direction: 'horizontal', delay: 1000 },
    forceHaltProgression: false,
  },
  decorators: [
    moduleMetadata({
      imports: [CarouselPaneDirective],
    }),
  ],
  subcomponents: { CarouselPaneDirective },
};

export default meta;
type Story = StoryObj<CarouselComponent>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  name: 'Carousel with full-width panes',
  render: (args) => ({
    template: `
            <pls-carousel ${argsToTemplate(args)}>
                <div plsCarouselPane><img src="accessibility.svg" /></div>
                <div plsCarouselPane><img src="tutorials.svg" /></div>
                <div plsCarouselPane><img src="youtube.svg" /></div>
                <div plsCarouselPane><img src="github.svg" /></div>
                <div plsCarouselPane><img src="discord.svg" /></div>
            </pls-carousel>
        `,
    styles: [
      `
        .pls-carousel-pane {
            min-width: 100%;
        }
    `,
    ],
    props: args,
  }),
  args: {
    config: { direction: 'horizontal', delay: 5000 },
    forceHaltProgression: false,
  },
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const ShortPanes: Story = {
  name: 'Carousel panes are short',
  render: (args) => ({
    template: `
            <pls-carousel ${argsToTemplate(args)}>
                <div plsCarouselPane><img src="accessibility.svg" /></div>
                <div plsCarouselPane><img src="tutorials.svg" /></div>
                <div plsCarouselPane><img src="youtube.svg" /></div>
                <div plsCarouselPane><img src="github.svg" /></div>
                <div plsCarouselPane><img src="discord.svg" /></div>
            </pls-carousel>
        `,
    styles: [
      `
        .pls-carousel-pane {
            min-width: 30%;
        }
    `,
    ],
    props: args,
  }),
  args: {
    config: { direction: 'horizontal', delay: 5000 },
    forceHaltProgression: false,
  },
};
