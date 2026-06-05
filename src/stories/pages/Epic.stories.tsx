import type { Meta, StoryObj } from '@storybook/react';
import { DetailPageShell } from './_DetailPageShell';

const meta: Meta<typeof DetailPageShell> = {
  title: 'Pages/Epic',
  component: DetailPageShell,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof DetailPageShell>;

export const Default: Story = {
  args: {
    issueType: 'Epic', issueKey: 'BAU-4466',
    title: 'Senaei App – Revamp (UI)',
    status: 'In Progress', statusCategory: 'indeterminate',
    description: 'Full UI revamp of the Senaei investor application — modernize the registration flow, dashboard, and back-office screens to match the new design system.',
    assignee: 'Andrew Fayyaz', reporter: 'Vikram Indla', priority: 'Highest',
    labels: ['ui-revamp', 'senaei'],
  },
};
