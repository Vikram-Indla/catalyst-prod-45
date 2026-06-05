import type { Meta, StoryObj } from '@storybook/react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

const ALL_TYPES = [
  'Story', 'Epic', 'Feature', 'Task', 'Sub-task', 'QA Bug', 'Defect',
  'Production Incident', 'Change Request', 'Business Request', 'Business Gap',
  'Backend', 'Frontend', 'Integration', 'Idea',
];

function IconGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
      {ALL_TYPES.map((type) => (
        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 4, border: '1px solid var(--ds-border, #DFE1E6)' }}>
          <JiraIssueTypeIcon type={type} size={16} />
          <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>{type}</span>
        </div>
      ))}
    </div>
  );
}

function IconSizes() {
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <JiraIssueTypeIcon type="Story" size={16} />
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginBlockStart: 4 }}>16px</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <JiraIssueTypeIcon type="Story" size={24} />
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginBlockStart: 4 }}>24px</div>
      </div>
    </div>
  );
}

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
export const AllTypes: Story = { render: () => <IconGrid /> };
export const Sizes: Story = { render: () => <IconSizes /> };
