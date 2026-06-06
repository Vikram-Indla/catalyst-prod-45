import type { Meta, StoryObj } from '@storybook/react';
import { CatalystViewIdea } from '@/components/catalyst-detail-views/idea/CatalystViewIdea';

const meta: Meta<typeof CatalystViewIdea> = {
  title: 'Pages/Idea',
  component: CatalystViewIdea,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof CatalystViewIdea>;

export const Default: Story = {
  args: { issueKey: 'IDEA-101', mode: 'panel' },
};
