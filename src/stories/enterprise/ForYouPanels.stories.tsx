import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import AssignedPanel from '@/components/for-you/atlaskit/AssignedPanel';
import StarredPanel from '@/components/for-you/atlaskit/StarredPanel';
import type { WorkItem } from '@/hooks/useForYouData';

function makeItem(id: string, key: string, summary: string): WorkItem {
  return { id, key, summary, mode: 'assigned', level: 'standard', project: 'Senaei BAU', projectKey: 'BAU', hub: 'project', hubLabel: 'Project Hub', updatedAt: new Date().toISOString(), createdAt: '2026-01-01T00:00:00Z', assignee: { name: 'Vikram Indla' }, issueType: 'Story', group: 'today', status: 'In Progress', statusCategory: 'indeterminate', priority: 'Medium', priorityLevel: 3 } as WorkItem;
}

const meta: Meta = {
  title: 'Enterprise Components/For You Panels',
  parameters: { layout: 'padded' },
};
export default meta;

export const Assigned: StoryObj = {
  render: () => <div style={{ maxWidth: 900 }}><AssignedPanel items={[makeItem('1', 'BAU-5972', 'Industrial Capabilities'), makeItem('2', 'BAU-5831', 'Deployment Pipeline')]} isLoading={false} onSelect={fn()} onToggleStar={fn()} /></div>,
};
export const AssignedEmpty: StoryObj = {
  render: () => <div style={{ maxWidth: 900 }}><AssignedPanel items={[]} isLoading={false} onSelect={fn()} onToggleStar={fn()} /></div>,
};
export const Starred: StoryObj = {
  render: () => <div style={{ maxWidth: 900 }}><StarredPanel items={[{ ...makeItem('3', 'BAU-5737', 'QA Bug Triage'), starred: true } as WorkItem]} isLoading={false} onSelect={fn()} onToggleStar={fn()} /></div>,
};
