
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}
function Frame({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, padding: 16, background: 'var(--ds-surface, #fff)' }}>{children}</div></Providers>;
}

import { Description } from '@/components/catalyst-detail-views/shared/sections/Description/Description';


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

export default { title: 'Audit Grade/15 — Rich Text Description' };

export const ViewMode: StoryObj = {
  render: () => <Frame width={700}><Description issue={mockIssue as any} /></Frame>,
};
export const CustomLabel: StoryObj = {
  render: () => <Frame width={700}><Description issue={mockIssue as any} label="Acceptance Criteria" /></Frame>,
};
export const EmptyDescription: StoryObj = {
  render: () => <Frame width={700}><Description issue={{ ...mockIssue, description_text: null, description_adf: null } as any} /></Frame>,
};
export const LongDescription: StoryObj = {
  render: () => <Frame width={700}><Description issue={{ ...mockIssue, description_text: 'This is a detailed specification for the industrial capabilities module.\n\n## Requirements\n\n1. The form must validate all required fields before submission\n2. Error messages should be descriptive and actionable\n3. The interface should support both Arabic and English\n4. All buttons must follow the ADS token system\n\n## Technical Notes\n\n- Use @atlaskit/form for validation\n- Integrate with the existing Supabase backend\n- Follow CLAUDE.md design system rules' } as any} /></Frame>,
};
