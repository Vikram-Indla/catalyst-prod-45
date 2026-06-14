import type { Meta, StoryObj } from '@storybook/react';
import { CatyButton } from '@/components/for-you/atlaskit/CatyButton';
import '@/components/for-you/atlaskit/caty-button.css';

const meta: Meta<typeof CatyButton> = {
  title: 'Catalyst AI & Feed/Caty Button',
  component: CatyButton,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatyButton>;

export const Default: Story = { args: { label: 'Board health', onClick: () => {} } };
export const Thinking: Story = { args: { label: 'Board health', onClick: () => {}, loading: true } };
export const BoardHealthLabel: Story = { args: { label: 'Board health', onClick: () => {} } };
export const TriageStale: Story = { args: { label: 'Triage stale', onClick: () => {} } };
export const WorkloadRisk: Story = { args: { label: 'Workload risk', onClick: () => {} } };
