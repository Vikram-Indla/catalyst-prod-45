/**
 * Stories for For You panels that fetch data internally.
 * These use mock wrappers since the real components call hooks directly.
 */
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ForYouToolbar } from '@/components/for-you/ForYouToolbar';
import { ForYouStatsBar } from '@/components/for-you/ForYouStatsBar';
import { ForYouPagination } from '@/components/for-you/ForYouPagination';
import { StatusSummaryBar } from '@/components/for-you/StatusSummaryBar';
import { ForYouTable } from '@/components/for-you/ForYouTable';
import type { WorkItem } from '@/hooks/useForYouData';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: width, padding: 16 }}>{children}</div></MemoryRouter></QueryClientProvider>;
}

function makeItem(id: string, key: string, summary: string, extras?: Partial<WorkItem>): WorkItem {
  return {
    id, key, summary, mode: 'assigned', level: 'standard',
    project: 'Senaei BAU', projectKey: 'BAU', hub: 'project', hubLabel: 'Project Hub',
    updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
    createdAt: '2026-03-01T10:00:00Z',
    assignee: { name: 'Vikram Indla', accountId: 'u1' },
    issueType: 'Story', group: 'today', status: 'In Progress',
    priority: 'Medium', priorityLevel: 3, ...extras,
  } as WorkItem;
}

const items = [
  makeItem('1', 'BAU-5972', 'Industrial Capabilities: Add Item', { issueType: 'QA Bug', status: 'In QA', group: 'today' }),
  makeItem('2', 'BAU-5831', 'Upgrade to Production', { status: 'In Development', group: 'today' }),
  makeItem('3', 'BAU-4521', 'Decoupling Upgrade', { issueType: 'Feature', status: 'Done', group: 'week' }),
  makeItem('4', 'MWR-947', 'Raw Material Allocation', { projectKey: 'MWR', project: 'MWR Platform', issueType: 'Epic', group: 'week' }),
  makeItem('5', 'BAU-4489', 'Unified Search', { issueType: 'Task', group: 'month' }),
];

export default { title: 'Pages/For You/Data Components' };

// ─── ForYouToolbar ─────────────────────────────────────────────────────────

export const Toolbar: StoryObj = {
  render: () => <Wrap><ForYouToolbar searchQuery="" onSearchChange={fn()} /></Wrap>,
};

export const ToolbarWithQuery: StoryObj = {
  render: () => <Wrap><ForYouToolbar searchQuery="unified search" onSearchChange={fn()} /></Wrap>,
};

// ─── ForYouStatsBar ────────────────────────────────────────────────────────

export const StatsBar: StoryObj = {
  render: () => (
    <Wrap>
      <ForYouStatsBar
        hubCounts={{ 'Project Hub': 42, 'Product Hub': 12, Releases: 4 }}
        projectCount={3}
        reporterCount={8}
      />
    </Wrap>
  ),
};

// ─── ForYouPagination ──────────────────────────────────────────────────────

export const Pagination: StoryObj = {
  render: () => (
    <Wrap>
      <ForYouPagination
        currentPage={1} totalPages={5} totalItems={247}
        pageSize={50} onPageChange={fn()} onPageSizeChange={fn()}
      />
    </Wrap>
  ),
};

export const PaginationLastPage: StoryObj = {
  render: () => (
    <Wrap>
      <ForYouPagination
        currentPage={5} totalPages={5} totalItems={247}
        pageSize={50} onPageChange={fn()} onPageSizeChange={fn()}
      />
    </Wrap>
  ),
};

// ─── StatusSummaryBar ──────────────────────────────────────────────────────

export const StatusSummary: StoryObj = {
  render: () => (
    <Wrap>
      <StatusSummaryBar
        items={[
          { status: 'In Requirements', project: 'BAU' },
          { status: 'In Development', project: 'BAU' },
          { status: 'In QA', project: 'BAU' },
          { status: 'Done', project: 'BAU' },
          { status: 'Done', project: 'MWR' },
          { status: 'In Progress', project: 'BAU' },
        ]}
      />
    </Wrap>
  ),
};

// ─── ForYouTable ───────────────────────────────────────────────────────────

export const TableWithGroups: StoryObj = {
  render: () => (
    <Wrap width={1200}>
      <ForYouTable
        groupedItems={{
          YESTERDAY: [],
          THIS_WEEK: items.slice(0, 3),
          EARLIER: items.slice(3),
        } as any}
        onRowClick={fn()}
        onStarToggle={fn()}
      />
    </Wrap>
  ),
};

export const TableEmpty: StoryObj = {
  render: () => (
    <Wrap width={1200}>
      <ForYouTable
        groupedItems={{ YESTERDAY: [], THIS_WEEK: [], EARLIER: [] } as any}
        onRowClick={fn()}
      />
    </Wrap>
  ),
};

export const TableLoading: StoryObj = {
  render: () => (
    <Wrap width={1200}>
      <ForYouTable
        groupedItems={{ YESTERDAY: [], THIS_WEEK: [], EARLIER: [] } as any}
        onRowClick={fn()}
        isInitialLoad
      />
    </Wrap>
  ),
};
