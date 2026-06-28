
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
function Frame({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, padding: 16, background: 'var(--ds-surface)' }}>{children}</div></Providers>;
}

import { BulkSelectionBar } from '@/components/shared/BulkSelectionBar';

export default { title: 'Audit Grade/05 — Bulk Selection Bar' };

export const ThreeSelected: StoryObj = {
  render: () => <Frame width={1200}><BulkSelectionBar selectedCount={3} onClear={fn()} onDelete={fn()} onUpdateStatus={fn()} onAssign={fn()} onMove={fn()} /></Frame>,
};
export const SingleSelected: StoryObj = {
  render: () => <Frame width={1200}><BulkSelectionBar selectedCount={1} onClear={fn()} onDelete={fn()} /></Frame>,
};
export const ManySelected: StoryObj = {
  render: () => <Frame width={1200}><BulkSelectionBar selectedCount={47} onClear={fn()} onDelete={fn()} onUpdateStatus={fn()} onAssign={fn()} onMove={fn()} onDuplicate={fn()} onExport={fn()} onPriority={fn()} /></Frame>,
};
export const WithCustomActions: StoryObj = {
  render: () => <Frame width={1200}><BulkSelectionBar selectedCount={5} onClear={fn()} actions={[{ label: 'Assign sprint', onClick: fn() }, { label: 'Set labels', onClick: fn() }, { label: 'Archive', onClick: fn(), variant: 'danger' as any }]} /></Frame>,
};
