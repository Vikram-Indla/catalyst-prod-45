import type { Meta, StoryObj } from '@storybook/react';
import { ReactionBar } from '@/components/notifications/ReactionBar';

const meta: Meta<typeof ReactionBar> = {
  title: 'Components/Reaction Bar',
  component: ReactionBar,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof ReactionBar>;

export const WithReactions: Story = {
  args: { reactions: { '👍': 3, '🔥': 1, '👏': 2 }, onReact: () => {}, onReply: () => {} },
};
export const Empty: Story = {
  args: { reactions: {}, onReact: () => {}, onReply: () => {} },
};
