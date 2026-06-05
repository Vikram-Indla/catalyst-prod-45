import type { Meta, StoryObj } from '@storybook/react';
import { DetailPageShell } from './_DetailPageShell';

const meta: Meta<typeof DetailPageShell> = {
  title: 'Pages/Story',
  component: DetailPageShell,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof DetailPageShell>;

export const Default: Story = {
  args: {
    issueType: 'Story', issueKey: 'BAU-5957',
    title: 'Update product details survey – add price validation',
    status: 'Ready for Development', statusCategory: 'new',
    description: 'As an operator, I want price and production-quantity validation on the product details survey so that invalid submissions are blocked before reaching review.',
    assignee: 'Ahmed Yousry', reporter: 'Nada Alfassam', priority: 'Medium',
    parentKey: 'BAU-5174', parentSummary: 'Landing Page – DGA modification',
    labels: ['validation'],
  },
};
