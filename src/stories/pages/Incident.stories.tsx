import type { Meta, StoryObj } from '@storybook/react';
import { CatalystViewIncident } from '@/components/catalyst-detail-views/incident/CatalystViewIncident';

const meta: Meta<typeof CatalystViewIncident> = {
  title: 'Pages/Production Incident',
  component: CatalystViewIncident,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof CatalystViewIncident>;

export const Default: Story = {
  args: { issueKey: 'BAU-5900', mode: 'panel' },
};
