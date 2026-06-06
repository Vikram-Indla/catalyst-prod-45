import type { Meta, StoryObj } from '@storybook/react';
import { CatalystViewDefect } from '@/components/catalyst-detail-views/defect/CatalystViewDefect';

const meta: Meta<typeof CatalystViewDefect> = {
  title: 'Pages/Defect (QA Bug)',
  component: CatalystViewDefect,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof CatalystViewDefect>;

export const Default: Story = {
  args: { issueKey: 'BAU-5737', mode: 'panel' },
};
