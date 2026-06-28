
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

import { MentionInput } from '@/components/shared/MentionInput';

export default { title: 'Audit Grade/19 — Mention Input' };

export const Empty: StoryObj = {
  render: () => <Frame width={600}><MentionInput value="" onChange={fn()} placeholder="Leave a comment..." /></Frame>,
};
export const WithText: StoryObj = {
  render: () => <Frame width={600}><MentionInput value="@Vikram can you review this?" onChange={fn()} /></Frame>,
};
