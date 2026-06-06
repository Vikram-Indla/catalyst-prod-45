
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

import { ConfirmDeleteDialog } from '@/components/catalyst-detail-views/shared/ConfirmDeleteDialog';
import { ConfirmCloneDialog } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';
import { ConfirmArchiveDialog } from '@/components/catalyst-detail-views/shared/ConfirmArchiveDialog';
import { DangerConfirmModal } from '@/components/shared/DangerConfirmModal';

export default { title: 'Audit Grade/18 — Confirm Dialogs' };

export const DeleteOpen: StoryObj = {
  render: () => <Frame><ConfirmDeleteDialog isOpen={true} onClose={fn()} issueKey="BAU-5972" issueSummary="Industrial Capabilities: Add Item Interface" typeLabel="story" onConfirm={fn()} /></Frame>,
};
export const CloneOpen: StoryObj = {
  render: () => <Frame><ConfirmCloneDialog isOpen={true} onClose={fn()} issueKey="BAU-5972" issueSummary="Industrial Capabilities: Add Item Interface" onConfirm={fn()} /></Frame>,
};
export const ArchiveOpen: StoryObj = {
  render: () => <Frame><ConfirmArchiveDialog isOpen={true} onClose={fn()} issueKey="BAU-5972" issueSummary="Industrial Capabilities: Add Item Interface" onConfirm={fn()} /></Frame>,
};
export const DangerConfirm: StoryObj = {
  render: () => <Frame><DangerConfirmModal isOpen={true} onClose={fn()} title="Delete 5 items?" description="This action cannot be undone. All 5 selected work items will be permanently deleted." confirmLabel="Delete items" onConfirm={fn()} /></Frame>,
};
