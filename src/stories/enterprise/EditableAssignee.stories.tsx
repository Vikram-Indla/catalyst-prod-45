import type { Meta, StoryObj } from '@storybook/react';
import { EditableAssignee } from '@/components/EditableAssignee/EditableAssignee';

const meta: Meta<typeof EditableAssignee> = {
  title: 'Enterprise Components/Editable Assignee',
  component: EditableAssignee,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof EditableAssignee>;

export const WithAssignee: Story = {
  args: { assigneeId: 'user-1', assigneeName: 'Vikram Indla', onAssigneeChange: () => {} },
};
export const Unassigned: Story = {
  args: { assigneeId: null, assigneeName: null, onAssigneeChange: () => {} },
};
