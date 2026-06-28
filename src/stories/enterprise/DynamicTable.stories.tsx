import type { Meta, StoryObj } from '@storybook/react';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface Row {
  id: string;
  key: string;
  type: string;
  summary: string;
  status: string;
  statusAppearance: 'default' | 'inprogress' | 'success';
  assignee: string;
}

const ROWS: Row[] = [
  { id: '1', key: 'BAU-5957', type: 'Story', summary: 'Update product details survey', status: 'In Progress', statusAppearance: 'inprogress', assignee: 'Nada Alfassam' },
  { id: '2', key: 'BAU-5078', type: 'Story', summary: 'Enable Active Directory SSO login', status: 'In Development', statusAppearance: 'inprogress', assignee: 'Ahmed Yousry' },
  { id: '3', key: 'BAU-5751', type: 'QA Bug', summary: 'Global services – industrial auditing', status: 'In QA', statusAppearance: 'default', assignee: 'Aya Ibrahims' },
  { id: '4', key: 'BAU-4466', type: 'Epic', summary: 'Senaei App – Revamp (UI)', status: 'Done', statusAppearance: 'success', assignee: 'Andrew Fayyaz' },
];

const COLUMNS: Column<Row>[] = [
  {
    id: 'key', label: 'Work', width: 30, alwaysVisible: true,
    cell: ({ row }) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <JiraIssueTypeIcon type={row.type} size={14} />
        <span style={{ font: `500 12px/16px var(--ds-font-family-code, monospace)`, color: token('color.link', '#0052CC') }}>{row.key}</span>
      </span>
    ),
  },
  {
    id: 'summary', label: 'Summary', flex: true,
    cell: ({ row }) => <span style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D') }}>{row.summary}</span>,
  },
  {
    id: 'status', label: 'Status', width: 18,
    cell: ({ row }) => <Lozenge appearance={row.statusAppearance}>{row.status}</Lozenge>,
  },
  {
    id: 'assignee', label: 'Assignee', width: 22,
    cell: ({ row }) => <span style={{ font: `400 13px/18px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', '#44546F') }}>{row.assignee}</span>,
  },
];

function TableHarness({ data }: { data: Row[] }) {
  return (
    <div style={{ maxWidth: 900 }}>
      <JiraTable<Row> columns={COLUMNS} data={data} getRowId={(r) => r.id} />
    </div>
  );
}

const meta: Meta<typeof TableHarness> = {
  title: 'Enterprise Components/Dynamic Table',
  component: TableHarness,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof TableHarness>;

export const Default: Story = { args: { data: ROWS } };
export const Empty: Story = { args: { data: [] } };
