import type { Meta, StoryObj } from '@storybook/react';
import { CatyInsightCard } from '@/components/for-you/atlaskit/CatyInsightCard';

const meta: Meta<typeof CatyInsightCard> = {
  title: 'Catalyst AI & Feed/Caty Insight Card',
  component: CatyInsightCard,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatyInsightCard>;

export const Default: Story = { args: { title: "Caty's brief", children: 'You have 3 items due this week. BAU-5957 moved to Ready for Development.' } };
export const WithActions: Story = { args: { title: 'Board health', children: '58 open items across 5 active columns.', onRefresh: () => {}, onDismiss: () => {} } };
export const Loading: Story = { args: { title: 'Stale item triage', isLoading: true, children: 'Loading...' } };
