import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from '@/components/ads/EmptyState';
import Button from '@atlaskit/button/new';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/Empty State',
  component: EmptyState,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Basic: Story = {
  args: { header: 'No items found', description: 'Try adjusting your filters or create a new item.' },
};

export const WithAction: Story = {
  args: {
    header: 'No work items yet',
    description: 'Create your first work item to get started.',
    primaryAction: <Button appearance="primary">Create item</Button>,
  },
};

export const WithSecondaryAction: Story = {
  args: {
    header: 'No results',
    description: 'Your search returned no matches.',
    primaryAction: <Button appearance="primary">Clear filters</Button>,
    secondaryAction: <Button appearance="subtle">Learn more</Button>,
  },
};
