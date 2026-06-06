import type { Meta, StoryObj } from '@storybook/react';
import { WatchersChip } from '@/components/catalyst-detail-views/shared/WatchersChip';

const meta: Meta<typeof WatchersChip> = {
  title: 'Enterprise Components/Watchers Chip',
  component: WatchersChip,
  parameters: { layout: 'padded' },
};
export default meta;

export const Default: StoryObj<typeof WatchersChip> = {
  args: { issueKey: 'BAU-5972' },
};

export const NoIssue: StoryObj<typeof WatchersChip> = {
  args: { issueKey: null },
};
