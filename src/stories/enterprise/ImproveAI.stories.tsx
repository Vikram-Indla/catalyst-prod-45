/**
 * Enterprise/Improve AI — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import { CatyImproveStrap } from '@/components/catalyst-detail-views/improve/CatyImproveStrap';
import { CatyStreamingOverlay } from '@/components/catalyst-detail-views/improve/CatyStreamingOverlay';
import { CommentsSummaryCard } from '@/components/catalyst-detail-views/improve/CommentsSummaryCard';
import { ImproveDescriptionDialog } from '@/components/catalyst-detail-views/improve/ImproveDescriptionDialog';
import { LinkSimilarItemsDialog } from '@/components/catalyst-detail-views/improve/LinkSimilarItemsDialog';
import { SuggestChildIssuesDialog } from '@/components/catalyst-detail-views/improve/SuggestChildIssuesDialog';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>);
}

export default { title: 'Enterprise/Improve AI' };

export const CatyImproveStrapDefault: StoryObj = {
  name: 'CatyImproveStrap / Default',
  render: () => <Wrap><CatyImproveStrap phase={{} as any} onStop={fn()} /></Wrap>,
}

export const CatyStreamingOverlayDefault: StoryObj = {
  name: 'CatyStreamingOverlay / Default',
  render: () => <Wrap><CatyStreamingOverlay issueKey="BAU-5972" issueType="test-value" issueSummary="test-value" currentDescription="test-value" currentAcceptanceCriteria="test-value" attachmentUrls={[]} onApply={{} as any} fullMarkdown="test-value" parts={{} as any} /></Wrap>,
}

export const CommentsSummaryCardDefault: StoryObj = {
  name: 'CommentsSummaryCard / Default',
  render: () => <Wrap><CommentsSummaryCard status={{} as any} text="test-value" errorMessage="test-value" issueKey="BAU-5972" onDismiss={fn()} autoEnabled={false} onToggleAuto={fn()} /></Wrap>,
}

export const ImproveDescriptionDialogDefault: StoryObj = {
  name: 'ImproveDescriptionDialog / Default',
  render: () => <Wrap><ImproveDescriptionDialog isOpen={true} onClose={fn()} /></Wrap>,
}

export const ImproveDescriptionDialogOpen: StoryObj = {
  name: 'ImproveDescriptionDialog / Open',
  render: () => <Wrap><ImproveDescriptionDialog isOpen={true} onClose={fn()} /></Wrap>,
}

export const LinkSimilarItemsDialogDefault: StoryObj = {
  name: 'LinkSimilarItemsDialog / Default',
  render: () => <Wrap><LinkSimilarItemsDialog isOpen={true} onClose={fn()} /></Wrap>,
}

export const LinkSimilarItemsDialogOpen: StoryObj = {
  name: 'LinkSimilarItemsDialog / Open',
  render: () => <Wrap><LinkSimilarItemsDialog isOpen={true} onClose={fn()} /></Wrap>,
}

export const SuggestChildIssuesDialogDefault: StoryObj = {
  name: 'SuggestChildIssuesDialog / Default',
  render: () => <Wrap><SuggestChildIssuesDialog isOpen={true} onClose={fn()} /></Wrap>,
}

export const SuggestChildIssuesDialogOpen: StoryObj = {
  name: 'SuggestChildIssuesDialog / Open',
  render: () => <Wrap><SuggestChildIssuesDialog isOpen={true} onClose={fn()} /></Wrap>,
}
