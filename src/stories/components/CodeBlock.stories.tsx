import type { Meta, StoryObj } from '@storybook/react';
import { CatalystInlineCode, CatalystCodeBlock } from '@/components/ads/CatalystCodeBlock';

const meta: Meta = {
  title: 'Components/Code',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

export const InlineCode: Story = {
  render: () => (
    <p style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, #172B4D)' }}>
      Use <CatalystInlineCode>JiraTable</CatalystInlineCode> for all work item lists.
      Import from <CatalystInlineCode>@/components/shared/JiraTable</CatalystInlineCode>.
    </p>
  ),
};

export const TypeScript: Story = {
  render: () => (
    <CatalystCodeBlock
      language="typescript"
      text={`import { JiraTable } from '@/components/shared/JiraTable';

const columns = [
  { id: 'key', label: 'Key', width: 120 },
  { id: 'summary', label: 'Summary', width: 400 },
  { id: 'status', label: 'Status', width: 120 },
];`}
    />
  ),
};

export const SQL: Story = {
  render: () => (
    <CatalystCodeBlock
      language="sql"
      text={`SELECT issue_key, summary, status, priority
FROM ph_issues
WHERE project_key = 'BAU'
  AND deleted_at IS NULL
ORDER BY jira_updated_at DESC
LIMIT 50;`}
    />
  ),
};
