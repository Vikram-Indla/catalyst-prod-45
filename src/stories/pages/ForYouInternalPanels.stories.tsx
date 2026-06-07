/**
 * Stories for For You panels that previously had zero props.
 * Now using extracted *View components that accept data as props.
 */
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimelinePanelView } from '@/components/for-you/atlaskit/TimelinePanel';
import { BoardPanelView } from '@/components/for-you/atlaskit/BoardPanel';
import { R360PanelView } from '@/components/for-you/atlaskit/R360Panel';
import { AgeingPanelView } from '@/components/for-you/atlaskit/AgeingPanel';
import type { AgeingItem } from '@/hooks/useAgeingItems';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 1100, padding: 16 }}>{children}</div></MemoryRouter></QueryClientProvider>;
}

export default { title: 'Pages/For You/Internal Panels' };

// ─── TimelinePanelView ─────────────────────────────────────────────────────

export const TimelineLoading: StoryObj = {
  render: () => <Wrap><TimelinePanelView resourceId={null} isLoading={true} /></Wrap>,
};

export const TimelineNoProfile: StoryObj = {
  render: () => <Wrap><TimelinePanelView resourceId={null} isLoading={false} /></Wrap>,
};

export const TimelineWithResource: StoryObj = {
  name: 'TimelinePanel / With Resource (renders R360MemberDetail)',
  render: () => <Wrap><TimelinePanelView resourceId="res-123" isLoading={false} /></Wrap>,
};

// ─── BoardPanelView ────────────────────────────────────────────────────────

export const BoardLoading: StoryObj = {
  render: () => <Wrap><BoardPanelView resourceId={null} isLoading={true} /></Wrap>,
};

export const BoardNoProfile: StoryObj = {
  render: () => <Wrap><BoardPanelView resourceId={null} isLoading={false} /></Wrap>,
};

export const BoardWithResource: StoryObj = {
  name: 'BoardPanel / With Resource',
  render: () => <Wrap><BoardPanelView resourceId="res-123" isLoading={false} /></Wrap>,
};

// ─── R360PanelView ─────────────────────────────────────────────────────────

export const R360Loading: StoryObj = {
  render: () => <Wrap><R360PanelView resourceId={null} isLoading={true} /></Wrap>,
};

export const R360NoProfile: StoryObj = {
  render: () => <Wrap><R360PanelView resourceId={null} isLoading={false} /></Wrap>,
};

export const R360WithResource: StoryObj = {
  name: 'R360Panel / With Resource',
  render: () => <Wrap><R360PanelView resourceId="res-456" isLoading={false} /></Wrap>,
};

// ─── AgeingPanelView ───────────────────────────────────────────────────────

const now = new Date().toISOString();
const thirtyDaysAgo = new Date(Date.now() - 35 * 86_400_000).toISOString();
const sixtyDaysAgo = new Date(Date.now() - 65 * 86_400_000).toISOString();
const ninetyDaysAgo = new Date(Date.now() - 95 * 86_400_000).toISOString();
const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString();

const mockAgeingItems: AgeingItem[] = [
  {
    id: 'a1', issue_key: 'BAU-4100', issue_type: 'Story', summary: 'Legacy API deprecation plan',
    status: 'In Progress', status_category: 'indeterminate', priority: 'High',
    jira_created_at: thirtyDaysAgo, jira_updated_at: twoWeeksAgo,
    parent_key: null, parent_summary: null, parent_issue_type: null,
    project_key: 'BAU', project_name: 'Senaei BAU',
    reporter_account_id: 'u2', reporter_display_name: 'Yazeed Daraz',
    assignee_account_id: 'u1', assignee_display_name: 'Vikram Indla',
    sprint_release: null, comment_count: 2, days_open: 35,
  } as any,
  {
    id: 'a2', issue_key: 'BAU-3800', issue_type: 'QA Bug', summary: 'Tooltip missing on capabilities grid',
    status: 'To Do', status_category: 'new', priority: 'Medium',
    jira_created_at: sixtyDaysAgo, jira_updated_at: thirtyDaysAgo,
    parent_key: 'BAU-3700', parent_summary: 'Capabilities Module', parent_issue_type: 'Epic',
    project_key: 'BAU', project_name: 'Senaei BAU',
    reporter_account_id: 'u3', reporter_display_name: 'Nada Alfassam',
    assignee_account_id: 'u1', assignee_display_name: 'Vikram Indla',
    sprint_release: null, comment_count: 0, days_open: 65,
  } as any,
  {
    id: 'a3', issue_key: 'MWR-500', issue_type: 'Feature', summary: 'Raw material allocation engine — phase 1',
    status: 'Backlog', status_category: 'new', priority: 'Critical',
    jira_created_at: ninetyDaysAgo, jira_updated_at: sixtyDaysAgo,
    parent_key: null, parent_summary: null, parent_issue_type: null,
    project_key: 'MWR', project_name: 'MWR Platform',
    reporter_account_id: 'u4', reporter_display_name: 'Imran Aslam',
    assignee_account_id: 'u1', assignee_display_name: 'Vikram Indla',
    sprint_release: null, comment_count: 5, days_open: 95,
    archived_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  } as any,
];

export const AgeingLoading: StoryObj = {
  render: () => (
    <Wrap>
      <AgeingPanelView
        ageingItems={undefined} isLoading={true} isError={false}
        jiraBaseUrl="https://digital-transformation.atlassian.net" isAdmin={false}
        onUnarchive={fn()} onNavigateArchives={fn()} onOpenDetail={fn()}
      />
    </Wrap>
  ),
};

export const AgeingError: StoryObj = {
  render: () => (
    <Wrap>
      <AgeingPanelView
        ageingItems={undefined} isLoading={false} isError={true}
        jiraBaseUrl={null} isAdmin={false}
        onUnarchive={fn()} onNavigateArchives={fn()} onOpenDetail={fn()}
      />
    </Wrap>
  ),
};

export const AgeingEmpty: StoryObj = {
  render: () => (
    <Wrap>
      <AgeingPanelView
        ageingItems={[]} isLoading={false} isError={false}
        jiraBaseUrl="https://digital-transformation.atlassian.net" isAdmin={false}
        onUnarchive={fn()} onNavigateArchives={fn()} onOpenDetail={fn()}
      />
    </Wrap>
  ),
};

export const AgeingWithItems: StoryObj = {
  render: () => (
    <Wrap>
      <AgeingPanelView
        ageingItems={mockAgeingItems} isLoading={false} isError={false}
        jiraBaseUrl="https://digital-transformation.atlassian.net" isAdmin={true}
        onUnarchive={fn()} onNavigateArchives={fn()} onOpenDetail={fn()}
        onOpenDetailByKey={fn()}
      />
    </Wrap>
  ),
};

export const AgeingAsNonAdmin: StoryObj = {
  render: () => (
    <Wrap>
      <AgeingPanelView
        ageingItems={mockAgeingItems} isLoading={false} isError={false}
        jiraBaseUrl="https://digital-transformation.atlassian.net" isAdmin={false}
        onUnarchive={fn()} onNavigateArchives={fn()} onOpenDetail={fn()}
      />
    </Wrap>
  ),
};
