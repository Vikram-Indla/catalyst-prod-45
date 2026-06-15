/**
 * Pages/Tasks/Dashboard Components — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import { DashboardMetricCards } from '@/modules/tasks/components/dashboard/DashboardMetricCards';
import { DashboardRoleBanner } from '@/modules/tasks/components/dashboard/DashboardRoleBanner';
import { DashboardSkeleton } from '@/modules/tasks/components/dashboard/DashboardSkeleton';
import { DashboardStatusChart } from '@/modules/tasks/components/dashboard/DashboardStatusChart';
import { DashboardTeamWorkload } from '@/modules/tasks/components/dashboard/DashboardTeamWorkload';
import { DashboardTeamWorkloadV2 } from '@/modules/tasks/components/dashboard/DashboardTeamWorkloadV2';
import { DashboardUpcomingDeadlines } from '@/modules/tasks/components/dashboard/DashboardUpcomingDeadlines';
import { DashboardUpcomingDeadlinesV2 } from '@/modules/tasks/components/dashboard/DashboardUpcomingDeadlinesV2';
import { DashboardWorkstreamFilter } from '@/modules/tasks/components/dashboard/DashboardWorkstreamFilter';
import { DashboardWorkstreamHealth } from '@/modules/tasks/components/dashboard/DashboardWorkstreamHealth';
import { DashboardWorkstreamHealthV2 } from '@/modules/tasks/components/dashboard/DashboardWorkstreamHealthV2';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>);
}

export default { title: 'Pages/Tasks/Dashboard Components' };

export const DashboardMetricCardsDefault: StoryObj = {
  name: 'DashboardMetricCards / Default',
  render: () => <Wrap><DashboardMetricCards metrics={{} as any} /></Wrap>,
}

export const DashboardRoleBannerDefault: StoryObj = {
  name: 'DashboardRoleBanner / Default',
  render: () => <Wrap><DashboardRoleBanner userRole="test-value" assignedWorkstreams={{} as any} /></Wrap>,
}

export const DashboardSkeletonDefault: StoryObj = {
  name: 'DashboardSkeleton / Default',
  render: () => <Wrap><DashboardSkeleton  /></Wrap>,
}

export const DashboardStatusChartDefault: StoryObj = {
  name: 'DashboardStatusChart / Default',
  render: () => <Wrap><DashboardStatusChart data={[]} /></Wrap>,
}

export const DashboardTeamWorkloadDefault: StoryObj = {
  name: 'DashboardTeamWorkload / Default',
  render: () => <Wrap><DashboardTeamWorkload data={[]} unassignedCount={5} /></Wrap>,
}

export const DashboardTeamWorkloadV2Default: StoryObj = {
  name: 'DashboardTeamWorkloadV2 / Default',
  render: () => <Wrap><DashboardTeamWorkloadV2 data={[]} unassignedCount={5} /></Wrap>,
}

export const DashboardUpcomingDeadlinesDefault: StoryObj = {
  name: 'DashboardUpcomingDeadlines / Default',
  render: () => <Wrap><DashboardUpcomingDeadlines data={[]} /></Wrap>,
}

export const DashboardUpcomingDeadlinesV2Default: StoryObj = {
  name: 'DashboardUpcomingDeadlinesV2 / Default',
  render: () => <Wrap><DashboardUpcomingDeadlinesV2 data={[]} /></Wrap>,
}

export const DashboardWorkstreamFilterDefault: StoryObj = {
  name: 'DashboardWorkstreamFilter / Default',
  render: () => <Wrap><DashboardWorkstreamFilter workstreams={[]} selectedFilter="my" onFilterChange={fn()} canViewAll={false} /></Wrap>,
}

export const DashboardWorkstreamHealthDefault: StoryObj = {
  name: 'DashboardWorkstreamHealth / Default',
  render: () => <Wrap><DashboardWorkstreamHealth data={[]} /></Wrap>,
}

export const DashboardWorkstreamHealthV2Default: StoryObj = {
  name: 'DashboardWorkstreamHealthV2 / Default',
  render: () => <Wrap><DashboardWorkstreamHealthV2 data={[]} /></Wrap>,
}
