import type { Meta, StoryObj } from '@storybook/react';
import { CatalystBreadcrumbs } from '@/components/ads/CatalystBreadcrumbs';

const meta: Meta<typeof CatalystBreadcrumbs> = {
  title: 'Components/Breadcrumbs',
  component: CatalystBreadcrumbs,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatalystBreadcrumbs>;

export const ProjectPath: Story = {
  args: {
    items: [
      { label: 'Projects', href: '/project-hub/projects' },
      { label: 'BAU', href: '/project-hub/BAU' },
      { label: 'Backlog', href: '/project-hub/BAU/backlog' },
      { label: 'BAU-5757' },
    ],
  },
};

export const ProductPath: Story = {
  args: {
    items: [
      { label: 'Products', href: '/product-hub' },
      { label: 'Senaei App', href: '/product-hub/senaei' },
      { label: 'Business Requests' },
    ],
  },
};

export const AdminPath: Story = {
  args: {
    items: [
      { label: 'Admin', href: '/admin' },
      { label: 'Jira Integration', href: '/admin/jira-connection' },
      { label: 'Status Mapping' },
    ],
  },
};

export const Long: Story = {
  args: {
    items: [
      { label: 'Home' },
      { label: 'Projects' },
      { label: 'BAU' },
      { label: 'Epics' },
      { label: 'Senaei Revamp' },
      { label: 'Features' },
      { label: 'Permission Library' },
      { label: 'Stories' },
      { label: 'BAU-5972' },
    ],
    maxItems: 5,
  },
};
