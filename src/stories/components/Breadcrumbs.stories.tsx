import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumbs } from '@/components/ads';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const ProjectPath: Story = {
  args: {
    items: [
      { key: 'projects', text: 'Projects', href: '/project-hub/projects' },
      { key: 'bau', text: 'BAU', href: '/project-hub/BAU' },
      { key: 'backlog', text: 'Backlog', href: '/project-hub/BAU/backlog' },
      { key: 'bau-5757', text: 'BAU-5757', isCurrent: true },
    ],
  },
};

export const ProductPath: Story = {
  args: {
    items: [
      { key: 'products', text: 'Products', href: '/product-hub' },
      { key: 'senaei-app', text: 'Senaei App', href: '/product-hub/senaei' },
      { key: 'business-requests', text: 'Business Requests', isCurrent: true },
    ],
  },
};

export const AdminPath: Story = {
  args: {
    items: [
      { key: 'admin', text: 'Admin', href: '/admin' },
      { key: 'jira-integration', text: 'Jira Integration', href: '/admin/jira-connection' },
      { key: 'status-mapping', text: 'Status Mapping', isCurrent: true },
    ],
  },
};

export const Long: Story = {
  args: {
    items: [
      { key: 'home', text: 'Home' },
      { key: 'projects', text: 'Projects' },
      { key: 'bau', text: 'BAU' },
      { key: 'epics', text: 'Epics' },
      { key: 'senaei-revamp', text: 'Senaei Revamp' },
      { key: 'features', text: 'Features' },
      { key: 'permission-library', text: 'Permission Library' },
      { key: 'stories', text: 'Stories' },
      { key: 'bau-5972', text: 'BAU-5972', isCurrent: true },
    ],
    maxItems: 5,
  },
};
