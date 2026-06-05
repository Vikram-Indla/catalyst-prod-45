import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { WorkItemTree } from '@/components/hierarchy/WorkItemTree';
import type { WorkItem } from '@/types/hierarchy';

const leaf = (id: string, key: string, title: string, level: number, hName: string, hColor: string, issueType: string, children: WorkItem[] = []): WorkItem => ({
  id, key, title,
  hierarchyLevel: level, hierarchyName: hName, hierarchyColor: hColor, hierarchyColorText: '#FFFFFF',
  parentId: null,
  status: { id: 's1', name: 'In Progress', color: '#E9F2FF', colorText: '#0055CC' },
  assignee: { id: 'u1', displayName: 'Nada Alfassam', email: 'nada@example.com' },
  priority: { name: 'High', color: '#FFECEB', colorText: '#AE2A19' },
  children,
  stats: { totalDescendants: children.length, completedCount: 0 },
  labels: [],
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
  issueType, source: 'jira',
});

const MOCK: WorkItem[] = [
  leaf('1', 'BAU-4466', 'Senaei App – Revamp (UI)', 1, 'Epic', '#8270DB', 'Epic', [
    leaf('2', 'BAU-5174', 'Landing Page – DGA modification', 2, 'Feature', '#36B37E', 'Feature', [
      leaf('3', 'BAU-5957', 'Update product details survey', 3, 'Story', '#4688EC', 'Story'),
      leaf('4', 'BAU-5872', 'Add validation for price field', 3, 'Story', '#4688EC', 'Story'),
    ]),
    leaf('5', 'BAU-5078', 'Enable Active Directory SSO login', 2, 'Feature', '#36B37E', 'Feature'),
  ]),
];

function TreeHarness({ items }: { items: WorkItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <div style={{ maxWidth: 720 }}>
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
