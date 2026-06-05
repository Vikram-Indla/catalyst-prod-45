import type { Meta, StoryObj } from '@storybook/react';
import { DetailPageShell } from './_DetailPageShell';

const meta: Meta<typeof DetailPageShell> = {
  title: 'Pages/Feature',
  component: DetailPageShell,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof DetailPageShell>;

export const Default: Story = {
  args: {
    issueType: 'Feature', issueKey: 'BAU-5174',
    title: 'Landing Page – DGA modification',
    status: 'In Development', statusCategory: 'indeterminate',
    description: 'Modify the public landing page to align with DGA (Digital Government Authority) guidelines — accessibility, bilingual support, and unified header.',
    assignee: 'Nada Alfassam', reporter: 'Hassan Raza Hasrat', priority: 'High',
    parentKey: 'BAU-4466', parentSummary: 'Senaei App – Revamp (UI)',
    labels: ['dga', 'landing-page'],
  },
};
