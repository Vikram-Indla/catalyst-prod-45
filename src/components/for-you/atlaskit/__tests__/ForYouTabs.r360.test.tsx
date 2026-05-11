/**
 * ForYouTabs — Resource 360° tab extension tests
 *
 * Step 1 of the R360 For You integration.
 * These tests FAIL until TabType includes 'r360' and FOR_YOU_TAB_ORDER
 * includes the Resource 360° entry.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ForYouTabs, { FOR_YOU_TAB_ORDER } from '@/components/for-you/atlaskit/ForYouTabs';
import type { TabType } from '@/hooks/useForYouData';

// `useAgeingCount` (consumed by ForYouTabs for the Ageing badge) calls
// `useQuery`, so every render must be inside a QueryClientProvider.
function render(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

// Minimal tabCounts — must include 'r360' once TabType has it
const COUNTS: Record<TabType, number> = {
  'ai-theme':    0,
  recommended:   0,
  assigned:      0,
  starred:       0,
  worked:        0,
  viewed:        0,
  ageing:        0,
  r360:          0,
};

describe('ForYouTabs — Resource 360° tab', () => {
  it('FOR_YOU_TAB_ORDER includes an r360 entry', () => {
    const r360Tab = FOR_YOU_TAB_ORDER.find(t => t.id === 'r360');
    expect(r360Tab).toBeDefined();
    expect(r360Tab?.label).toBe('Resource 360°');
  });

  it('r360 tab is positioned after Starred (4th position in strip)', () => {
    const starredIdx = FOR_YOU_TAB_ORDER.findIndex(t => t.id === 'starred');
    const r360Idx    = FOR_YOU_TAB_ORDER.findIndex(t => t.id === 'r360');
    expect(r360Idx).toBe(starredIdx + 1);
  });

  it('renders the Resource 360° tab button in the DOM', () => {
    render(
      <ForYouTabs
        activeTab="r360"
        tabCounts={COUNTS}
        onChange={vi.fn()}
      />
    );
    expect(
      screen.getByRole('tab', { name: /Resource 360°/i })
    ).toBeInTheDocument();
  });

  it('Resource 360° tab is aria-selected when active', () => {
    render(
      <ForYouTabs
        activeTab="r360"
        tabCounts={COUNTS}
        onChange={vi.fn()}
      />
    );
    const tab = screen.getByRole('tab', { name: /Resource 360°/i });
    expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  it('Resource 360° tab has no count badge (showCount is false)', () => {
    render(
      <ForYouTabs
        activeTab="recommended"
        tabCounts={{ ...COUNTS, r360: 99 }}
        onChange={vi.fn()}
      />
    );
    // The tab label renders but the count badge should NOT be present,
    // because showCount:false means the badge is suppressed regardless of count.
    const tab = screen.getByRole('tab', { name: /Resource 360°/i });
    expect(tab).toBeInTheDocument();
    // '99' badge text must not appear inside or near this tab.
    // (The ageing tab has 99 but that's a different element — we query within the r360 tab)
    expect(tab.textContent).not.toContain('99');
  });
});
