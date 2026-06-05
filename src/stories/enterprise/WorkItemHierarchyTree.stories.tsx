import type { Meta, StoryObj } from '@storybook/react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface Node {
  key: string; title: string; type: string; depth: number;
  status: string; appearance: 'default' | 'inprogress' | 'success';
}

const NODES: Node[] = [
  { key: 'BAU-4466', title: 'Senaei App – Revamp (UI)', type: 'Epic', depth: 0, status: 'In Progress', appearance: 'inprogress' },
  { key: 'BAU-5174', title: 'Landing Page – DGA modification', type: 'Feature', depth: 1, status: 'In Development', appearance: 'inprogress' },
  { key: 'BAU-5957', title: 'Update product details survey', type: 'Story', depth: 2, status: 'Ready for Development', appearance: 'default' },
  { key: 'BAU-5958', title: 'Add price field validation rule', type: 'Sub-task', depth: 3, status: 'In Progress', appearance: 'inprogress' },
  { key: 'BAU-5872', title: 'Add production-quantity validation', type: 'Story', depth: 2, status: 'Done', appearance: 'success' },
  { key: 'BAU-5078', title: 'Enable Active Directory SSO login', type: 'Feature', depth: 1, status: 'In Development', appearance: 'inprogress' },
];

function TreeHarness({ nodes }: { nodes: Node[] }) {
  return (
    <div style={{
      maxWidth: 760,
      border: `1px solid ${token('color.border', '#DFE1E6')}`,
      borderRadius: 8, overflow: 'hidden',
      background: token('elevation.surface', '#FFFFFF'),
    }}>
      {nodes.map((n, i) => (
        <div key={n.key} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 44, padding: '0 12px',
          paddingInlineStart: 12 + n.depth * 24,
          borderBottom: i < nodes.length - 1 ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none',
        }}>
          <JiraIssueTypeIcon type={n.type} size={16} />
          <span style={{ font: `500 12px/16px var(--ds-font-family-code, monospace)`, color: token('color.link', '#0052CC') }}>{n.key}</span>
          <span style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {n.title}
          </span>
          <Lozenge appearance={n.appearance}>{n.status}</Lozenge>
        </div>
      ))}
    </div>
  );
}

const meta: Meta<typeof TreeHarness> = {
  title: 'Enterprise Components/Work Item Hierarchy Tree',
  component: TreeHarness,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof TreeHarness>;

export const Expanded: Story = { args: { nodes: NODES } };
export const Empty: Story = { args: { nodes: [] } };
