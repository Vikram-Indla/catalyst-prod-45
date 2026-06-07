import type { Meta, StoryObj } from '@storybook/react';
import { CatalystToast } from '@/components/ui/CatalystToast';

const meta: Meta<typeof CatalystToast> = {
  title: 'Components/CatalystToast',
  component: CatalystToast,
  parameters: { layout: 'padded' },
};
export default meta;

export const Success: StoryObj<typeof CatalystToast> = {
  args: { type: 'success', message: 'Issue created successfully' },
};
export const Error: StoryObj<typeof CatalystToast> = {
  args: { type: 'error', message: 'Failed to save changes' },
};
export const Warning: StoryObj<typeof CatalystToast> = {
  args: { type: 'warning', message: 'Jira sync is paused' },
};
