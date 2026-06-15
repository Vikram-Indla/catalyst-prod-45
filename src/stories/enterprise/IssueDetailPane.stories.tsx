/**
 * Enterprise/Issue Detail Pane — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import { ActivityPanel } from '@/components/IssueDetailPane/ActivityPanel';
import { AttachmentsSection } from '@/components/IssueDetailPane/AttachmentsSection';
import { CatalystTitleEditor } from '@/components/IssueDetailPane/CatalystTitleEditor';
import { CommentComposer } from '@/components/IssueDetailPane/CommentComposer';
import { DescriptionEditor } from '@/components/IssueDetailPane/DescriptionEditor';
import { IssueHeader } from '@/components/IssueDetailPane/IssueHeader';
import { KeyDetailsSection } from '@/components/IssueDetailPane/KeyDetailsSection';
import { LinkedWorkItemsSection } from '@/components/IssueDetailPane/LinkedWorkItemsSection';
import { SubtasksPanel } from '@/components/IssueDetailPane/SubtasksPanel';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>);
}

export default { title: 'Enterprise/Issue Detail Pane' };

export const ActivityPanelDefault: StoryObj = {
  name: 'ActivityPanel / Default',
  render: () => <Wrap><ActivityPanel  /></Wrap>,
}

export const AttachmentsSectionDefault: StoryObj = {
  name: 'AttachmentsSection / Default',
  render: () => <Wrap><AttachmentsSection  /></Wrap>,
}

export const CatalystTitleEditorDefault: StoryObj = {
  name: 'CatalystTitleEditor / Default',
  render: () => <Wrap><CatalystTitleEditor  /></Wrap>,
}

export const CommentComposerDefault: StoryObj = {
  name: 'CommentComposer / Default',
  render: () => <Wrap><CommentComposer  /></Wrap>,
}

export const DescriptionEditorDefault: StoryObj = {
  name: 'DescriptionEditor / Default',
  render: () => <Wrap><DescriptionEditor  /></Wrap>,
}

export const IssueHeaderDefault: StoryObj = {
  name: 'IssueHeader / Default',
  render: () => <Wrap><IssueHeader  /></Wrap>,
}

export const KeyDetailsSectionDefault: StoryObj = {
  name: 'KeyDetailsSection / Default',
  render: () => <Wrap><KeyDetailsSection  /></Wrap>,
}

export const LinkedWorkItemsSectionDefault: StoryObj = {
  name: 'LinkedWorkItemsSection / Default',
  render: () => <Wrap><LinkedWorkItemsSection  /></Wrap>,
}

export const SubtasksPanelDefault: StoryObj = {
  name: 'SubtasksPanel / Default',
  render: () => <Wrap><SubtasksPanel  /></Wrap>,
}
