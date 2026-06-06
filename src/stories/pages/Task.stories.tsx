import type { Meta, StoryObj } from '@storybook/react';
import { CatalystViewTask } from '@/components/catalyst-detail-views/task/CatalystViewTask';

const meta: Meta<typeof CatalystViewTask> = {
  title: 'Pages/Task',
  component: CatalystViewTask,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof CatalystViewTask>;

export const Default: Story = {
  args: { issueKey: 'BAU-5800', mode: 'panel' },
};
