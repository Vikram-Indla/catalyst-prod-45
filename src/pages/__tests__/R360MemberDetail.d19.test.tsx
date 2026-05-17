/**
 * R360MemberDetail — D-19 scroll reset guard (embedded mode).
 *
 * When embedded={true} the D-19 useEffect must NOT call window.scrollTo
 * when the view tab changes.  Without the guard the For You page scroll
 * position is destroyed every time the user switches Ring → Chron → Board.
 *
 * FAILS until the `if (embedded) return;` guard is added.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Heavy deps stubbed so the component can mount in jsdom ────────────────────

vi.mock('@/hooks/useR360', () => ({
  useR360Overview: () => ({ data: null, isLoading: true }),
  useR360WorkItems: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false }),
}));

vi.mock('@/services/r360Service', () => ({
  computeCarriedFromLabel: () => null,
  getMemberOverview: vi.fn(),
}));

vi.mock('@/components/ui/AIIntelligenceButton', () => ({
  AIIntelligenceButton: () => null,
}));

vi.mock('@/components/r360/R360ProfileDrawer', () => ({
  default: () => null,
}));

vi.mock('../r360-member', () => ({
  getWeekRange: () => ({ start: new Date(), end: new Date(), label: 'Week 20' }),
  getMonthRange: () => ({ start: new Date(), end: new Date(), label: 'May 2026' }),
  WeekStripCollapsible: () => null,
  RingView: () => null,
  ChronologyView: () => null,
  BoardView: () => null,
  DetailPanel: () => null,
  TicketListDrawer: () => null,
}));

vi.mock('@/styles/r360.css', () => ({}));
vi.mock('@/components/resource360/r360-member.css', () => ({}));

// ── System under test ─────────────────────────────────────────────────────────

import R360MemberDetail from '../R360MemberDetail';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

describe('R360MemberDetail — D-19 scroll reset guard', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('does NOT call window.scrollTo when embedded=true and view changes', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <R360MemberDetail resourceId="res-1" embedded={true} />
      </MemoryRouter>,
      { wrapper },
    );

    // Clear any calls from initial mount
    (window.scrollTo as ReturnType<typeof vi.spyOn>).mockClear();

    // Re-render simulates a view state change triggering the useEffect([view])
    // We can't directly set internal state, but remounting with a key forces
    // the effect to re-fire. The guard must suppress the scroll regardless.
    await act(async () => {
      rerender(
        <MemoryRouter>
          <R360MemberDetail resourceId="res-1" embedded={true} key="rerender-1" />
        </MemoryRouter>,
      );
    });

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('DOES call window.scrollTo when embedded=false (standalone page)', async () => {
    render(
      <MemoryRouter>
        <R360MemberDetail resourceId="res-1" embedded={false} />
      </MemoryRouter>,
      { wrapper },
    );

    await act(async () => {
      // Let effects settle
    });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
