import type { Meta, StoryObj } from '@storybook/react';
import { CatalystInlineEdit } from '@/components/ads/CatalystInlineEdit';

const meta: Meta<typeof CatalystInlineEdit> = {
  title: 'Components/Inline Edit',
  component: CatalystInlineEdit,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CatalystInlineEdit>;

export const WithValue: Story = {
  args: { defaultValue: 'Export task list', label: 'Summary', onConfirm: () => {} },
};

export const Empty: Story = {
  args: { defaultValue: '', label: 'Description', placeholder: 'Add a description...', onConfirm: () => {} },
};

export const Required: Story = {
  args: { defaultValue: '', label: 'Summary', placeholder: 'Enter summary', isRequired: true, onConfirm: () => {} },
};
