
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
function Frame({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, padding: 16, background: 'var(--ds-surface, #fff)' }}>{children}</div></Providers>;
}

import { EditableAssignee } from '@/components/EditableAssignee';

const assigneeOptions = [
  { label: 'Vikram Indla', value: 'Vikram Indla' },
  { label: 'Yazeed Daraz', value: 'Yazeed Daraz' },
  { label: 'Nada Alfassam', value: 'Nada Alfassam' },
  { label: 'Imran Aslam', value: 'Imran Aslam' },
  { label: 'Andrew Fayyaz', value: 'Andrew Fayyaz' },
];

export default { title: 'Audit Grade/06 — Editable Fields' };

export const AssigneeWithValue: StoryObj = {
  render: () => <Frame width={300}><EditableAssignee currentAssignee="Vikram Indla" options={assigneeOptions} onSelect={fn()} /></Frame>,
};
export const AssigneeUnassigned: StoryObj = {
  render: () => <Frame width={300}><EditableAssignee currentAssignee={null} options={assigneeOptions} onSelect={fn()} /></Frame>,
};
export const AssigneeNoOptions: StoryObj = {
  render: () => <Frame width={300}><EditableAssignee currentAssignee={null} options={[]} onSelect={fn()} /></Frame>,
};
