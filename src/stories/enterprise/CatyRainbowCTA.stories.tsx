import type { Meta, StoryObj } from '@storybook/react';
import { CatyRainbowCTA } from '@/components/for-you/atlaskit/CatyRainbowCTA';

const meta: Meta<typeof CatyRainbowCTA> = {
  title: 'Catalyst AI & Feed/Caty Rainbow CTA',
  component: CatyRainbowCTA,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatyRainbowCTA>;

export const Default: Story = { args: { label: 'Ask Caty - Triage stale', onClick: () => {} } };
export const Thinking: Story = { args: { label: 'Ask Caty - Board health', onClick: () => {}, isLoading: true } };
export const LeftAligned: Story = { args: { label: 'Ask Caty - Workload risk', onClick: () => {}, align: 'left' } };
