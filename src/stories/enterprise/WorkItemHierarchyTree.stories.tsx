import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { WorkItemTree } from '@/components/hierarchy/WorkItemTree';
import type { WorkItem } from '@/types/hierarchy';

const node = (
  id: string, key: string, title: string,
  level: number, hName: string, hColor: string, issueType: string,
  statusName: string, statusCat: 'new' | 'indeterminate' | 'done',
  children: WorkItem[] = [],
): WorkItem => ({
  id, key, title,
  hierarchyLevel: level, hierarchyName: hName, hierarchyColor: hColor, hierarchyColorText: 'var(--ds-surface, #FFFFFF)',
  parentId: null,
  status: {
    id: `st-${statusCat}`, name: statusName,
    color: statusCat === 'done' ? 'var(--ds-background-success, #DFFCF0)' : statusCat === 'indeterminate' ? 'var(--ds-background-information, #E9F2FF)' : 'var(--ds-border, #DFE1E6)',
    colorText: statusCat === 'done' ? 'var(--ds-text-success, #006644)' : statusCat === 'indeterminate' ? 'var(--ds-link-pressed, #0747A6)' : 'var(--ds-text, #253858)',
    isTerminal: statusCat === 'done',
  },
  assignee: { id: 'u1', displayName: 'Nada Alfassam', email: 'nada@example.com' },
  priority: { name: 'High', color: 'var(--ds-background-danger, #FFECEB)', colorText: 'var(--ds-text-danger, #AE2A19)' },
  children,
  stats: { totalDescendants: children.length, completedCount: 0 },
  labels: [],
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
  issueType, source: 'jira',
});

// ads-scanner:ignore-next-line — Storybook mock data with test hierarchy colors
const MOCK: WorkItem[] = [
  node('1', 'BAU-4466', 'Senaei App – Revamp (UI)', 1, 'Epic', 'var(--ds-background-discovery-bold, #6E5DC6)', 'Epic', 'In Progress', 'indeterminate', [
    node('2', 'BAU-5174', 'Landing Page – DGA modification', 2, 'Feature', 'var(--ds-background-success-bold, #1F845A)', 'Feature', 'In Development', 'indeterminate', [
      // ads-scanner:ignore-line — Storybook mock, test hierarchy color
      node('3', 'BAU-5957', 'Update product details survey', 3, 'Story', '#4688EC', 'Story', 'Ready for Development', 'new', [
        // ads-scanner:ignore-line — Storybook mock, test hierarchy color
        node('4', 'BAU-5958', 'Add price field validation rule', 4, 'Sub-task', '#4688EC', 'Sub-task', 'In Progress', 'indeterminate'),
      ]),
      // ads-scanner:ignore-line — Storybook mock, test hierarchy color
      node('5', 'BAU-5872', 'Add production-quantity validation', 3, 'Story', '#4688EC', 'Story', 'Done', 'done'),
    ]),
    node('6', 'BAU-5078', 'Enable Active Directory SSO login', 2, 'Feature', 'var(--ds-background-success-bold, #1F845A)', 'Feature', 'In Development', 'indeterminate'),
  ]),
];

function TreeHarness({ items }: { items: WorkItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <div style={{ maxWidth: 760 }}>
      <WorkItemTree
        items={items}
        selectedId={selectedId}
        onSelect={(i) => setSelectedId(i.id)}
        onDeselect={() => setSelectedId(null)}
        allExpanded
      />
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

export const Expanded: Story = { args: { items: MOCK } };
export const Empty: Story = { args: { items: [] } };
