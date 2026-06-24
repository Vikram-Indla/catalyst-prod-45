
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
function Frame({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, padding: 16, background: 'var(--ds-surface, #fff)' }}>{children}</div></Providers>;
}

import { CatalystSidebarDetails } from '@/components/catalyst-detail-views/shared/sections/CatalystSidebarDetails';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';


const mockIssue = {
  id: 'ph-001', issue_key: 'BAU-5972', summary: 'Industrial Capabilities: Add Item Interface',
  description_adf: null, description_text: 'Implement the add item interface for industrial capabilities module with validation and error handling.',
  status: 'In Development', status_category: 'indeterminate',
  priority: 'High', issue_type: 'Story',
  parent_key: 'BAU-5400', parent_summary: 'Industrial Capabilities Module',
  assignee_account_id: 'u1', assignee_display_name: 'Vikram Indla',
  reporter_account_id: 'u2', reporter_display_name: 'Yazeed Daraz',
  project_key: 'BAU', sprint_release: null,
  labels: ['frontend', 'capabilities'], severity: null,
  jira_created_at: '2026-04-01T10:00:00Z', jira_updated_at: '2026-06-04T15:30:00Z',
  deleted_at: null, acceptance_criteria: '- Form validates required fields\n- Error messages are descriptive\n- Submit creates item in DB',
};

export default { title: 'Audit Grade/03 — Right Rail Sidebar' };

export const StoryType: StoryObj = {
  render: () => (
    <Frame width={380}>
      <CatalystSidebarDetails
        issue={mockIssue as any} itemId="BAU-5972"
        onStatusChange={fn()} onClose={fn()} onDelete={fn()}
        statusPill={<CatalystStatusPill status="In Development" statusCategory="indeterminate" onStatusChange={fn()} issueType="Story" />}
      />
    </Frame>
  ),
};

export const EpicType: StoryObj = {
  render: () => (
    <Frame width={380}>
      <CatalystSidebarDetails
        issue={{ ...mockIssue, issue_type: 'Epic', issue_key: 'BAU-5400', summary: 'Industrial Capabilities Module', parent_key: null } as any}
        itemId="BAU-5400" onStatusChange={fn()} onClose={fn()} onDelete={fn()}
        statusPill={<CatalystStatusPill status="In Progress" statusCategory="indeterminate" onStatusChange={fn()} issueType="Epic" />}
      />
    </Frame>
  ),
};

export const DoneStatus: StoryObj = {
  render: () => (
    <Frame width={380}>
      <CatalystSidebarDetails
        issue={{ ...mockIssue, status: 'Done', status_category: 'done' } as any}
        itemId="BAU-5972" onStatusChange={fn()} onClose={fn()} onDelete={fn()}
        statusPill={<CatalystStatusPill status="Done" statusCategory="done" onStatusChange={fn()} issueType="Story" />}
      />
    </Frame>
  ),
};

export const Unassigned: StoryObj = {
  render: () => (
    <Frame width={380}>
      <CatalystSidebarDetails
        issue={{ ...mockIssue, assignee_display_name: null, assignee_account_id: null, reporter_display_name: null } as any}
        itemId="BAU-5972" onStatusChange={fn()} onClose={fn()} onDelete={fn()}
      />
    </Frame>
  ),
};

export const WithImproveDropdown: StoryObj = {
  render: () => (
    <Frame width={380}>
      <CatalystSidebarDetails
        issue={mockIssue as any} itemId="BAU-5972"
        onStatusChange={fn()} onClose={fn()} onDelete={fn()}
        statusPill={<CatalystStatusPill status="In Development" statusCategory="indeterminate" onStatusChange={fn()} issueType="Story" />}
        improveDropdown={<button style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 3, background: 'var(--ds-surface, #fff)', cursor: 'pointer' }}>Improve</button>}
      />
    </Frame>
  ),
};
