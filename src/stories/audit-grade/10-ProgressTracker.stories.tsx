
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

import { CatalystProgressTracker } from '@/components/ads/CatalystProgressTracker';

export default { title: 'Audit Grade/10 — Progress Tracker' };

export const ThreeSteps: StoryObj = {
  render: () => <Frame><CatalystProgressTracker stages={[
    { id: 's1', label: 'Select items', status: 'visited' },
    { id: 's2', label: 'Choose operation', status: 'current' },
    { id: 's3', label: 'Confirm changes', status: 'unvisited' },
  ]} /></Frame>,
};
export const FiveSteps: StoryObj = {
  render: () => <Frame><CatalystProgressTracker stages={[
    { id: 's1', label: 'Select', status: 'visited' },
    { id: 's2', label: 'Configure', status: 'visited' },
    { id: 's3', label: 'Review', status: 'current' },
    { id: 's4', label: 'Approve', status: 'unvisited' },
    { id: 's5', label: 'Deploy', status: 'disabled' },
  ]} /></Frame>,
};
export const AllComplete: StoryObj = {
  render: () => <Frame><CatalystProgressTracker stages={[
    { id: 's1', label: 'Created', status: 'visited' },
    { id: 's2', label: 'In Progress', status: 'visited' },
    { id: 's3', label: 'Done', status: 'visited' },
  ]} /></Frame>,
};
export const FirstStep: StoryObj = {
  render: () => <Frame><CatalystProgressTracker stages={[
    { id: 's1', label: 'Step 1', status: 'current' },
    { id: 's2', label: 'Step 2', status: 'unvisited' },
    { id: 's3', label: 'Step 3', status: 'unvisited' },
    { id: 's4', label: 'Step 4', status: 'unvisited' },
  ]} /></Frame>,
};
