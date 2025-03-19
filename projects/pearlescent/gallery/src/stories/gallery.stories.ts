import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { GalleryComponent, Config } from '../lib/gallery.component';
import { GalleryPaneDirective } from '../lib/gallery-pane.directive';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<GalleryComponent> = {
  title: 'Gallery',
  component: GalleryComponent,
  tags: ['autodocs'],
  argTypes: {
    delay: {
      control: 'number',
    },
    config: {
      control: 'object',
    },
  },
  args: {
    config: { direction: 'horizontal', delay: 1000 },
    forceHaltProgression: false,
  },
  decorators: [
    moduleMetadata({
      imports: [GalleryPaneDirective],
    }),
  ],
  subcomponents: { GalleryPaneDirective },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  //   args: { onClick: fn() },
};

export default meta;
type Story = StoryObj<GalleryComponent>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  render: (args) => ({
    template: `
            <pls-gallery>
                <div plsGalleryPane><img src="accessibility.svg" /></div>
                <div plsGalleryPane><img src="tutorials.svg" /></div>
                <div plsGalleryPane><img src="youtube.svg" /></div>
            </pls-gallery>
        `,
    styles: [
      `
        .pls-gallery-pane {
            min-width: 90%;

        }
    `,
    ],
    props: args,
  }),
};
