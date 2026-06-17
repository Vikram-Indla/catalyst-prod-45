import type { Meta, StoryObj } from '@storybook/react';
import { CatyInsightCard } from '@/components/for-you/atlaskit/CatyInsightCard';
import { CatyRainbowCTA } from '@/components/for-you/atlaskit/CatyRainbowCTA';
import { fn } from 'storybook/test';

const meta: Meta = {
  title: 'Enterprise Components/Caty AI Components',
  parameters: { layout: 'padded' },
};
export default meta;

export const InsightCard: StoryObj = {
  render: () => <CatyInsightCard title="Sprint velocity trend" body="Your team completed 15% more story points this sprint compared to the 3-sprint average." icon="trending-up" />,
};
export const RainbowCTA: StoryObj = {
  render: () => <CatyRainbowCTA label="Ask Caty" onClick={fn()} />,
};
