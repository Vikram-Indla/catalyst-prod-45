/**
 * Enterprise/Detail Views/Dialogs — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import { ConfirmArchiveDialog } from '@/components/catalyst-detail-views/shared/ConfirmArchiveDialog';
import { ConfirmCloneDialog } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';
import { ConfirmDeleteDialog } from '@/components/catalyst-detail-views/shared/ConfirmDeleteDialog';
import { MoveIssueDialog } from '@/components/catalyst-detail-views/shared/MoveIssueDialog';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</QueryClientProvider></MemoryRouter></div>);
}

export default { title: 'Enterprise/Detail Views/Dialogs' };

export const ConfirmArchiveDialogDefault: StoryObj = {
  name: 'ConfirmArchiveDialog / Default',
  render: () => <Wrap><ConfirmArchiveDialog isOpen=true onClose={fn()} issueSummary=null onConfirm={fn()} /></Wrap>,
}

export const ConfirmArchiveDialogOpen: StoryObj = {
  name: 'ConfirmArchiveDialog / Open',
  render: () => <Wrap><ConfirmArchiveDialog isOpen=true onClose={fn()} issueSummary=null onConfirm={fn()} /></Wrap>,
}

export const ConfirmCloneDialogDefault: StoryObj = {
  name: 'ConfirmCloneDialog / Default',
  render: () => <Wrap><ConfirmCloneDialog isOpen=true onClose={fn()} issueKey=null issueSummary=null onConfirm={fn()} /></Wrap>,
}

export const ConfirmCloneDialogOpen: StoryObj = {
  name: 'ConfirmCloneDialog / Open',
  render: () => <Wrap><ConfirmCloneDialog isOpen=true onClose={fn()} issueKey=null issueSummary=null onConfirm={fn()} /></Wrap>,
}

export const ConfirmDeleteDialogDefault: StoryObj = {
  name: 'ConfirmDeleteDialog / Default',
  render: () => <Wrap><ConfirmDeleteDialog isOpen=true onClose={fn()} issueKey=null issueSummary=null typeLabel="Sample item title" onConfirm={fn()} /></Wrap>,
}

export const ConfirmDeleteDialogOpen: StoryObj = {
  name: 'ConfirmDeleteDialog / Open',
  render: () => <Wrap><ConfirmDeleteDialog isOpen=true onClose={fn()} issueKey=null issueSummary=null typeLabel="Sample item title" onConfirm={fn()} /></Wrap>,
}

export const MoveIssueDialogDefault: StoryObj = {
  name: 'MoveIssueDialog / Default',
  render: () => <Wrap><MoveIssueDialog isOpen=true onClose={fn()} issueKey="BAU-5972" /></Wrap>,
}

export const MoveIssueDialogOpen: StoryObj = {
  name: 'MoveIssueDialog / Open',
  render: () => <Wrap><MoveIssueDialog isOpen=true onClose={fn()} issueKey="BAU-5972" /></Wrap>,
}
