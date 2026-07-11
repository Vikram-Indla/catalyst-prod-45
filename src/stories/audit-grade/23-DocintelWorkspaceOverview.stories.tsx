import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { DocintelWorkspaceOverview } from '@/modules/docintel/components/DocintelWorkspaceOverview';

const meta = {
  title: 'Audit Grade/23 — Doc Intel Workspace Overview',
  component: DocintelWorkspaceOverview,
  parameters: { layout: 'padded' },
  args: {
    onAsk: fn(),
    onReviewFindings: fn(),
    onCreateDeliverable: fn(),
  },
} satisfies Meta<typeof DocintelWorkspaceOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  args: {
    findingCounts: {
      total: 5,
      unreviewed: 2,
      confirmed: 2,
      rejected: 1,
    },
    deliverableCounts: {
      total: 3,
      approved: 1,
    },
  },
};

export const ZeroCounts: Story = {
  args: {
    findingCounts: {
      total: 0,
      unreviewed: 0,
      confirmed: 0,
      rejected: 0,
    },
    deliverableCounts: {
      total: 0,
      approved: 0,
    },
  },
};

export const CountsUnavailable: Story = {
  args: {},
};

export const DisabledWhileSourceIsUnavailable: Story = {
  args: {
    isDisabled: true,
  },
};
