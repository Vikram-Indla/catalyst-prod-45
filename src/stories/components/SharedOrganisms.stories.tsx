/**
 * Components/Shared/Organisms — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import { AttachmentsSection } from '@/components/shared/AttachmentsSection';
import { BulkSelectionBar } from '@/components/shared/BulkSelectionBar';
import { CommentsSection } from '@/components/shared/CommentsSection';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import { JiraBulkActionBar } from '@/components/shared/JiraBulkActionBar';
import { JiraFilterAtlaskit } from '@/components/shared/JiraFilterAtlaskit';
import { JiraSyncChip } from '@/components/shared/JiraSyncChip';
import { MentionInput } from '@/components/shared/MentionInput';
import { MentionTextarea } from '@/components/shared/MentionTextarea';
import { ResourceModal } from '@/components/shared/ResourceModal';
import { TicketLinkCard } from '@/components/shared/TicketLinkCard';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</MemoryRouter></QueryClientProvider></div>);
}

export default { title: 'Components/Shared/Organisms' };

export const AttachmentsSectionDefault: StoryObj = {
  name: 'AttachmentsSection / Default',
  render: () => <Wrap><AttachmentsSection entityId="item-1" entityType="test-value" /></Wrap>,
}

export const CommentsSectionDefault: StoryObj = {
  name: 'CommentsSection / Default',
  render: () => <Wrap><CommentsSection entityId="item-1" entityType="test-value" /></Wrap>,
}

export const MentionInputDefault: StoryObj = {
  name: 'MentionInput / Default',
  render: () => <Wrap><MentionInput value="test-value" onChange={fn()} /></Wrap>,
}

export const MentionTextareaDefault: StoryObj = {
  name: 'MentionTextarea / Default',
  render: () => <Wrap><MentionTextarea value="test-value" onChange={fn()} /></Wrap>,
}

export const ImportDialogDefault: StoryObj = {
  name: 'ImportDialog / Default',
  render: () => <Wrap><ImportDialog open=true onOpenChange={fn()} onImport={fn()} title="Sample item title" /></Wrap>,
}

export const ImportDialogOpen: StoryObj = {
  name: 'ImportDialog / Open',
  render: () => <Wrap><ImportDialog open=true onOpenChange={fn()} onImport={fn()} title="Sample item title" open={true} /></Wrap>,
}

export const ResourceModalDefault: StoryObj = {
  name: 'ResourceModal / Default',
  render: () => <Wrap><ResourceModal isOpen=true onClose={fn()} mode={{{}}} context={{{}}} /></Wrap>,
}

export const ResourceModalOpen: StoryObj = {
  name: 'ResourceModal / Open',
  render: () => <Wrap><ResourceModal isOpen=true onClose={fn()} mode={{{}}} context={{{}}} /></Wrap>,
}

export const BulkSelectionBarDefault: StoryObj = {
  name: 'BulkSelectionBar / Default',
  render: () => <Wrap><BulkSelectionBar selectedCount=5 onClear={fn()} /></Wrap>,
}

export const JiraBasicFilterDefault: StoryObj = {
  name: 'JiraBasicFilter / Default',
  render: () => <Wrap><JiraBasicFilter categories=[] selected=[] onSelectionChange={fn()} onClearAll={fn()} onClose={fn()} /></Wrap>,
}

export const JiraBulkActionBarDefault: StoryObj = {
  name: 'JiraBulkActionBar / Default',
  render: () => <Wrap><JiraBulkActionBar selectedIds=[] /></Wrap>,
}

export const JiraFilterAtlaskitDefault: StoryObj = {
  name: 'JiraFilterAtlaskit / Default',
  render: () => <Wrap><JiraFilterAtlaskit value={{{}}} onChange={fn()} /></Wrap>,
}

export const JiraSyncChipDefault: StoryObj = {
  name: 'JiraSyncChip / Default',
  render: () => <Wrap><JiraSyncChip jiraKey="BAU-5972" /></Wrap>,
}

export const TicketLinkCardDefault: StoryObj = {
  name: 'TicketLinkCard / Default',
  render: () => <Wrap><TicketLinkCard issueKey="BAU-5972" /></Wrap>,
}
