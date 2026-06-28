import type { Meta, StoryObj } from '@storybook/react';
import { CatalystLink } from '@/components/ads/CatalystLink';

const meta: Meta<typeof CatalystLink> = {
  title: 'Components/Link',
  component: CatalystLink,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatalystLink>;

export const Default: Story = {
  args: { href: '/project-hub/BAU/backlog', children: 'View backlog' },
};

export const Subtle: Story = {
  args: { href: '/admin', children: 'Admin settings', appearance: 'subtle' },
};

export const External: Story = {
  args: { href: 'https://digital-transformation.atlassian.net', children: 'Open in Jira', isExternal: true },
};

export const InContext: Story = {
  render: () => (
    <p style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, #172B4D)' }}>
      This issue is tracked in <CatalystLink href="/project-hub/BAU/backlog">BAU-5757</CatalystLink> and
      linked to <CatalystLink href="https://digital-transformation.atlassian.net" isExternal>Jira</CatalystLink>.
    </p>
  ),
};
