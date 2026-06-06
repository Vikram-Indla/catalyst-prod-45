import type { Meta, StoryObj } from '@storybook/react';
import { DangerConfirmModal } from '@/components/shared/DangerConfirmModal';

const meta: Meta<typeof DangerConfirmModal> = {
  title: 'Components/Danger Confirm Modal',
  component: DangerConfirmModal,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof DangerConfirmModal>;

export const DeleteItem: Story = {
  args: {
    isOpen: true,
    title: 'Delete work item?',
    onClose: () => {},
    onConfirm: () => {},
  },
};
