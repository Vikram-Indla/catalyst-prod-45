import type { Meta, StoryObj } from '@storybook/react';
import { token } from '@atlaskit/tokens';
import { LinkedWorkItemRow } from '@/modules/project-work-hub/components/linked-work-items/LinkedWorkItemRow';
import type { LinkedWorkItem } from '@/modules/project-work-hub/components/linked-work-items/types';

const link = (id: string, linkType: string, key: string, summary: string, type: string, status: string, cat: 'new' | 'indeterminate' | 'done', assignee: string): LinkedWorkItem => ({
  id, link_type: linkType, created_at: '2026-05-01T00:00:00Z',
  source_id: 'BAU-5957', target_id: key,
  target: {
    issue_key: key, summary, issue_type: type, status,
    status_category: cat as never,
    assignee_account_id: 'a1', assignee_display_name: assignee,
    priority: 'High', jira_updated_at: '2026-05-01T00:00:00Z', project_key: 'BAU',
  },
});

const LINKS: LinkedWorkItem[] = [
  link('1', 'blocks', 'BAU-5078', 'Enable Active Directory SSO login', 'Story', 'In Development', 'indeterminate', 'Ahmed Yousry'),
  link('2', 'is blocked by', 'BAU-5751', 'Global services – industrial auditing', 'QA Bug', 'In QA', 'indeterminate', 'Aya Ibrahims'),
  link('3', 'relates to', 'BAU-5872', 'Add production-quantity validation', 'Story', 'Done', 'done', 'Nada Alfassam'),
];

function LinkedHarness({ links }: { links: LinkedWorkItem[] }) {
  return (
    <div style={{ maxWidth: 760, border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 8, overflow: 'hidden' }}>
      {links.map((l) => (
        <LinkedWorkItemRow key={l.id} link={l} onOpen={() => {}} onCopyKey={() => {}} onUnlink={() => {}} readOnly />
      ))}
    </div>
  );
}

const meta: Meta<typeof LinkedHarness> = {
  title: 'Enterprise Components/Linked Issues',
  component: LinkedHarness,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof LinkedHarness>;

export const Default: Story = { args: { links: LINKS } };
