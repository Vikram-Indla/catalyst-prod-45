import type { Meta, StoryObj } from '@storybook/react';
import { CatalystTag, CatalystTagGroup } from '@/components/ads/CatalystTag';

const meta: Meta<typeof CatalystTag> = {
  title: 'Components/Tag',
  component: CatalystTag,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatalystTag>;

export const Default: Story = { args: { text: 'frontend' } };
export const Blue: Story = { args: { text: 'in-scope', color: 'blue' } };
export const Green: Story = { args: { text: 'approved', color: 'green' } };
export const Removable: Story = { args: { text: 'auth', onRemove: () => {} } };

export const LabelGroup: Story = {
  render: () => (
    <CatalystTagGroup
      labels={['frontend', 'auth', 'api', 'mobile', 'security']}
      color="blue"
    />
  ),
};

export const IssueLabels: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>Labels</div>
        <CatalystTagGroup labels={['frontend', 'auth']} />
      </div>
      <div>
        <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>Fix Versions</div>
        <CatalystTagGroup labels={['Sprint 2.2 - 15 May 2025', 'v3.0']} color="teal" />
      </div>
    </div>
  ),
};
