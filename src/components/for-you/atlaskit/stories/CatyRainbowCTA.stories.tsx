import type { Meta, StoryObj } from '@storybook/react';
import { CatyRainbowCTA } from '../CatyRainbowCTA';

const meta: Meta<typeof CatyRainbowCTA> = {
  title: 'Caty AI/RainbowCTA',
  component: CatyRainbowCTA,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof CatyRainbowCTA>;

export const Default: Story = {
  args: { label: 'Ask Caty - Triage stale', onClick: () => {} },
};

export const Thinking: Story = {
  args: { label: 'Ask Caty - Board health', onClick: () => {}, isLoading: true },
};

export const LeftAligned: Story = {
  args: { label: 'Ask Caty - Workload risk', onClick: () => {}, align: 'left' },
};
