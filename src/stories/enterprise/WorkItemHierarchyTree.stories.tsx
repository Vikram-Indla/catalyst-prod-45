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
  hierarchyLevel: level, hierarchyName: hName, hierarchyColor: hColor, hierarchyColorText: '#FFFFFF',
  parentId: null,
  status: {
    id: `st-${statusCat}`, name: statusName,
    color: statusCat === 'done' ? '#E3FCEF' : statusCat === 'indeterminate' ? '#DEEBFF' : '#DFE1E6',
    colorText: statusCat === 'done' ? '#006644' : statusCat === 'indeterminate' ? '#0747A6' : '#253858',
    isTerminal: statusCat === 'done',
  },
  assignee: { id: 'u1', displayName: 'Nada Alfassam', email: 'nada@example.com' },
  priority: { name: 'High', color: '#FFEBE6', colorText: '#AE2A19' },
  children,
  stats: { totalDescendants: children.length, completedCount: 0 },
  labels: [],
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
  issueType, source: 'jira',
});

const MOCK: WorkItem[] = [
  node('1', 'BAU-4466', 'Senaei App – Revamp (UI)', 1, 'Epic', '#8270DB', 'Epic', 'In Progress', 'indeterminate', [
    node('2', 'BAU-5174', 'Landing Page – DGA modification', 2, 'Feature', '#36B37E', 'Feature', 'In Development', 'indeterminate', [
      node('3', 'BAU-5957', 'Update product details survey', 3, 'Story', '#4688EC', 'Story', 'Ready for Development', 'new', [
        node('4', 'BAU-5958', 'Add price field validation rule', 4, 'Sub-task', '#4688EC', 'Sub-task', 'In Progress', 'indeterminate'),
      ]),
      node('5', 'BAU-5872', 'Add production-quantity validation', 3, 'Story', '#4688EC', 'Story', 'Done', 'done'),
    ]),
    node('6', 'BAU-5078', 'Enable Active Directory SSO login', 2, 'Feature', '#36B37E', 'Feature', 'In Development', 'indeterminate'),
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
