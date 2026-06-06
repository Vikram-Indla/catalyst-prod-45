import type { Meta, StoryObj } from '@storybook/react';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';

const meta: Meta<typeof AIIntelligenceButton> = {
  title: 'Enterprise/AI Intelligence Button',
  component: AIIntelligenceButton,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof AIIntelligenceButton>;

export const Default: Story = { args: { label: 'Ask Caty', onClick: () => {} } };
export const CustomLabel: Story = { args: { label: 'Ask Caty - Profile', onClick: () => {} } };
export const Loading: Story = { args: { label: 'Ask Caty', onClick: () => {}, isLoading: true } };
export const Disabled: Story = { args: { label: 'Ask Caty', onClick: () => {}, disabled: true } };
export const Active: Story = { args: { label: 'Ask Caty', onClick: () => {}, isActive: true } };

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <AIIntelligenceButton label="Ask Caty" onClick={() => {}} />
      <AIIntelligenceButton label="Ask Caty - Triage" onClick={() => {}} />
      <AIIntelligenceButton label="Ask Caty" onClick={() => {}} isLoading />
      <AIIntelligenceButton label="Ask Caty" onClick={() => {}} disabled />
    </div>
  ),
};
