import type { Meta, StoryObj } from '@storybook/react';
import { JiraTable } from '@/components/shared/JiraTable/JiraTable';

const MOCK_COLUMNS = [
  { id: 'key', label: 'Key', width: 120 },
  { id: 'summary', label: 'Summary', width: 400 },
  { id: 'status', label: 'Status', width: 120 },
];

const MOCK_ROWS = [
  { id: '1', cells: { key: 'BAU-101', summary: 'Fix login page redirect', status: 'In Progress' } },
  { id: '2', cells: { key: 'BAU-102', summary: 'Add dark mode support', status: 'To Do' } },
  { id: '3', cells: { key: 'BAU-103', summary: 'Update API documentation', status: 'Done' } },
];

const meta: Meta<typeof JiraTable> = {
  title: 'Enterprise Components/Jira Table',
  component: JiraTable,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof JiraTable>;

export const Basic: Story = {
  args: { columns: MOCK_COLUMNS, rows: MOCK_ROWS },
};
