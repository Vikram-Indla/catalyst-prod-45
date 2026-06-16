
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

import { CatalystAvatar } from '@/components/shared/CatalystAvatar';
import { UserAvatar } from '@/components/shared/UserAvatar';

export default { title: 'Audit Grade/17 — Avatars' };

export const WithName: StoryObj = {
  render: () => <Frame width={400}><div style={{ display: 'flex', gap: 16, alignItems: 'center' }}><CatalystAvatar name="Vikram Indla" size={32} /><CatalystAvatar name="Yazeed Daraz" size={32} /><CatalystAvatar name="Nada Alfassam" size={32} /></div></Frame>,
};
export const Sizes: StoryObj = {
  render: () => <Frame width={400}><div style={{ display: 'flex', gap: 16, alignItems: 'center' }}><CatalystAvatar name="Vikram Indla" size={16} /><CatalystAvatar name="Vikram Indla" size={24} /><CatalystAvatar name="Vikram Indla" size={32} /><CatalystAvatar name="Vikram Indla" size={48} /></div></Frame>,
};
export const NoName: StoryObj = {
  render: () => <Frame width={200}><CatalystAvatar name="" size={32} /></Frame>,
};
export const UserAvatarDefault: StoryObj = {
  render: () => <Frame width={400}><div style={{ display: 'flex', gap: 16 }}><UserAvatar name="Vikram Indla" size={32} /><UserAvatar name="Yazeed Daraz" size={32} /></div></Frame>,
};
