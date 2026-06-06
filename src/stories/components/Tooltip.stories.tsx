import type { Meta, StoryObj } from '@storybook/react';
import Tooltip from '@atlaskit/tooltip';
import Button from '@atlaskit/button/new';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <Tooltip content="Save your changes">
      <Button>Hover me</Button>
    </Tooltip>
  ),
};

export const Positions: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, padding: 48 }}>
      <Tooltip content="Top tooltip" position="top"><Button>Top</Button></Tooltip>
      <Tooltip content="Right tooltip" position="right"><Button>Right</Button></Tooltip>
      <Tooltip content="Bottom tooltip" position="bottom"><Button>Bottom</Button></Tooltip>
      <Tooltip content="Left tooltip" position="left"><Button>Left</Button></Tooltip>
    </div>
  ),
};
