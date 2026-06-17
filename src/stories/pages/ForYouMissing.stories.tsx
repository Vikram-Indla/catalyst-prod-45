/**
 * Pages/For You/Missing Coverage — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import ForYouTabs from '@/components/for-you/atlaskit/ForYouTabs';
import ThemeIssueList from '@/components/for-you/atlaskit/ThemeIssueList';
import { CatyAgeingTriage } from '@/components/for-you/atlaskit/CatyAgeingTriage';
import { CatyBoardInsight } from '@/components/for-you/atlaskit/CatyBoardInsight';
import { CatyStarredDigest } from '@/components/for-you/atlaskit/CatyStarredDigest';
import { CatyWorkloadRisk } from '@/components/for-you/atlaskit/CatyWorkloadRisk';
import { ForYouHeader } from '@/components/for-you/ForYouHeader';
import { ForYouLightBulkBar } from '@/components/for-you/ForYouLightBulkBar';
import { ForYouTableSkeleton } from '@/components/for-you/ForYouTableSkeleton';
import { helpers } from '@/components/for-you/atlaskit/helpers';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>);
}

export default { title: 'Pages/For You/Missing Coverage' };

export const ForYouHeaderDefault: StoryObj = {
  name: 'ForYouHeader / Default',
  render: () => <Wrap><ForYouHeader  /></Wrap>,
}

export const ForYouLightBulkBarDefault: StoryObj = {
  name: 'ForYouLightBulkBar / Default',
  render: () => <Wrap><ForYouLightBulkBar selectedCount={5} onClear={fn()} /></Wrap>,
}

export const ForYouTableSkeletonDefault: StoryObj = {
  name: 'ForYouTableSkeleton / Default',
  render: () => <Wrap><ForYouTableSkeleton  /></Wrap>,
}

export const CatyAgeingTriageDefault: StoryObj = {
  name: 'CatyAgeingTriage / Default',
  render: () => <Wrap><CatyAgeingTriage items={[]} /></Wrap>,
}

export const CatyBoardInsightDefault: StoryObj = {
  name: 'CatyBoardInsight / Default',
  render: () => <Wrap><CatyBoardInsight  /></Wrap>,
}

export const CatyStarredDigestDefault: StoryObj = {
  name: 'CatyStarredDigest / Default',
  render: () => <Wrap><CatyStarredDigest starredKeys={[]} /></Wrap>,
}

export const CatyWorkloadRiskDefault: StoryObj = {
  name: 'CatyWorkloadRisk / Default',
  render: () => <Wrap><CatyWorkloadRisk teamMembers={{} as any} /></Wrap>,
}

export const ForYouTabsDefault: StoryObj = {
  name: 'ForYouTabs / Default',
  render: () => <Wrap><ForYouTabs activeTab={{} as any} tabCounts={{} as any} onChange={fn()} /></Wrap>,
}

export const ThemeIssueListDefault: StoryObj = {
  name: 'ThemeIssueList / Default',
  render: () => <Wrap><ThemeIssueList issueKeys={[]} /></Wrap>,
}

export const helpersDefault: StoryObj = {
  name: 'helpers / Default',
  render: () => <Wrap><helpers title="Sample item title" description="A test description" /></Wrap>,
}
