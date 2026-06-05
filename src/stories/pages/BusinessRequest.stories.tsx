import type { Meta, StoryObj } from '@storybook/react';
import { DetailPageShell } from './_DetailPageShell';

const meta: Meta<typeof DetailPageShell> = {
  title: 'Pages/Business Request',
  component: DetailPageShell,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof DetailPageShell>;

export const Default: Story = {
  args: {
    issueType: 'Business Request', issueKey: 'MDT-688',
    title: 'Investor onboarding – fast-track shipment requests',
    status: 'In Requirements', statusCategory: 'new',
    description: 'Enable investors to submit fast-track shipment requests directly from the portal, with automatic routing to the operations team and SLA tracking.',
    assignee: 'Nada Alfassam', reporter: 'Vikram Indla', priority: 'High',
    labels: ['investor-journey', 'q2-2026'],
  },
};
