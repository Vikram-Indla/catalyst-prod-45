import type { Meta, StoryObj } from '@storybook/react';
import { DetailPageShell } from './_DetailPageShell';

const meta: Meta<typeof DetailPageShell> = {
  title: 'Pages/Subtask',
  component: DetailPageShell,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof DetailPageShell>;

export const Default: Story = {
  args: {
    issueType: 'Sub-task', issueKey: 'BAU-5958',
    title: 'Add client-side validation rule for price field',
    status: 'In Progress', statusCategory: 'indeterminate',
    description: 'Implement the client-side validation rule that rejects negative or zero prices and shows an inline error message on the price field.',
    assignee: 'Amadou Ndiaye', reporter: 'Ahmed Yousry', priority: 'Medium',
    parentKey: 'BAU-5957', parentSummary: 'Update product details survey – add price validation',
  },
};
