
import type { StoryObj } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}
function Frame({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, padding: 16, background: 'var(--ds-surface, #fff)' }}>{children}</div></Providers>;
}

import { ProductAvatar } from '@/components/icons/ProductAvatar';
import { STOCK_PLACE_IDS, STOCK_PLACE_REGISTRY } from '@/components/icons/icons.registry';

export default { title: 'Audit Grade/18 — Product Avatars' };

/** All 20 Saudi landmark icons in the rotation pool */
export const AllLandmarks: StoryObj = {
  render: () => (
    <Frame width={900}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {STOCK_PLACE_IDS.map((id) => (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 96 }}>
            <img src={STOCK_PLACE_REGISTRY[id]} width={48} height={48} alt="" aria-hidden="true" style={{ borderRadius: 12 }} />
            <span style={{ fontSize: 10, color: 'var(--ds-text-subtle, #42526E)', textAlign: 'center', wordBreak: 'break-all' }}>{id}</span>
          </div>
        ))}
      </div>
    </Frame>
  ),
};

/** Known product assignment: INV → Kingdom Centre */
export const KnownProduct: StoryObj = {
  render: () => (
    <Frame width={400}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ProductAvatar code="INV" size={48} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Investor Journey Product</div>
          <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>INV → Kingdom Centre</div>
        </div>
      </div>
    </Frame>
  ),
};

/** Unknown product codes rotate deterministically via djb2 hash */
export const RotationDemo: StoryObj = {
  render: () => (
    <Frame width={700}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'OMEGA', 'ZETA', 'THETA', 'KAPPA'].map((code) => (
          <div key={code} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ProductAvatar code={code} size={40} />
            <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, #42526E)' }}>{code}</span>
          </div>
        ))}
      </div>
    </Frame>
  ),
};

/** Sizes */
export const Sizes: StoryObj = {
  render: () => (
    <Frame width={400}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        {([16, 24, 32, 40, 48, 64] as const).map((s) => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <ProductAvatar code="INV" size={s} />
            <span style={{ fontSize: 10, color: 'var(--ds-text-subtle, #42526E)' }}>{s}px</span>
          </div>
        ))}
      </div>
    </Frame>
  ),
};
