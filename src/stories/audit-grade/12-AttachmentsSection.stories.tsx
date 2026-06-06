
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

import { AttachmentsSection } from '@/components/shared/AttachmentsSection';

export default { title: 'Audit Grade/12 — Attachments Section' };

export const Default: StoryObj = {
  render: () => <Frame width={700}><AttachmentsSection entityId="ph-001" entityType="issue" /></Frame>,
};
export const Different: StoryObj = {
  name: 'Business Request',
  render: () => <Frame width={700}><AttachmentsSection entityId="br-001" entityType="business_request" /></Frame>,
};
