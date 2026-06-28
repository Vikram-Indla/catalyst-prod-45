import type { Meta, StoryObj } from '@storybook/react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ISSUES } from '../fixtures/production-data';

const ALL_TYPES = [
  'Story', 'Epic', 'Feature', 'Task', 'Sub-task', 'QA Bug', 'Defect',
  'Production Incident', 'Change Request', 'Business Request', 'Business Gap',
  'Backend', 'Frontend', 'Integration', 'Idea',
];

const meta: Meta<typeof JiraIssueTypeIcon> = {
  title: 'Catalyst AI & Feed/Jira Issue Type Icon',
  component: JiraIssueTypeIcon,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof JiraIssueTypeIcon>;

export const Story_: Story = { name: 'Story', args: { type: 'Story', size: 16 } };
export const Epic: Story = { args: { type: 'Epic', size: 16 } };
export const Task: Story = { args: { type: 'Task', size: 16 } };

export const AllTypes: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
      {ALL_TYPES.map((type) => (
        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 4, border: '1px solid var(--ds-border)' }}>
          <JiraIssueTypeIcon type={type} size={16} />
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>{type}</span>
        </div>
      ))}
    </div>
  ),
};

export const RealIssueKeys: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.values(ISSUES).map((issue) => (
        <div key={issue.issue_key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <JiraIssueTypeIcon type={issue.issue_type} size={16} />
          <span style={{ fontSize: 'var(--ds-font-size-200)', fontFamily: 'monospace', color: 'var(--ds-text-subtle)' }}>{issue.issue_key}</span>
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>{issue.summary}</span>
        </div>
      ))}
    </div>
  ),
};
