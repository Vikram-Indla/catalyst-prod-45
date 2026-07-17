/**
 * SC-DEF-003 — STRATA side-navigation from NESTED Scorecard routes (incl. Evidence).
 * CAT-STRATA-SCDEF-20260717-001.
 *
 * Reported: from /strata/scorecards/:slug/evidence, the side-nav items only change active
 * styling; they do not navigate to their real routes.
 *
 * This drives the REAL EnterpriseSidebar (the only component that renders all seven STRATA
 * nav labels) inside a route tree that mirrors the real mount shape: a parent "/strata/*"
 * route containing a NESTED <Routes> (src/modules/strata/StrataRoutes.tsx), which is the
 * structure the defect implicates. Each assertion checks BOTH halves of real navigation —
 * the URL changed AND the rendered page content changed — because active styling alone was
 * the reported symptom.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('@/hooks/home/useStarredItems', () => ({
  // SidebarBase calls starredIds?.has(...) — this is a Set, not an array.
  useStarredItemIds: () => ({ data: new Set<string>() }),
  useToggleStar: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/hooks/useMigrateLegacyFavorites', () => ({ useMigrateLegacyFavorites: () => {} }));

import { EnterpriseSidebar } from '@/components/layout/EnterpriseSidebar';

/** Renders the live URL so a test can assert the URL half of "real navigation". */
function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="url">{loc.pathname}</div>;
}

/** Distinct page content per area — the content half of "real navigation". */
const Page = ({ name }: { name: string }) => <main data-testid="page">{name} PAGE</main>;

/** Mirrors StrataRoutes.tsx: a nested <Routes> under the /strata/* parent. */
function StrataShell() {
  return (
    <Routes>
      <Route path="strategy" element={<Page name="Strategy Room" />} />
      <Route path="scorecards" element={<Page name="Scorecards" />} />
      <Route path="scorecards/:slug" element={<Page name="Scorecard Detail" />} />
      <Route path="scorecards/:slug/evidence" element={<Page name="Evidence" />} />
      <Route path="kpis" element={<Page name="KPIs" />} />
      <Route path="execution" element={<Page name="Project Cards" />} />
      <Route path="portfolio" element={<Page name="Portfolio" />} />
      <Route path="reviews" element={<Page name="Reviews" />} />
      <Route path="data" element={<Page name="Data" />} />
      <Route path="*" element={<Page name="NOT FOUND" />} />
    </Routes>
  );
}

const NESTED_EVIDENCE = '/strata/scorecards/b2b-sector-scorecard-q2-fy2026/evidence';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <EnterpriseSidebar expanded onToggle={() => {}} />
      <Routes>
        <Route path="/strata/*" element={<StrataShell />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Every STRATA side-nav target: label → real route → the page that must render. */
const TARGETS = [
  { label: 'Strategy Room', url: '/strata/strategy', page: 'Strategy Room PAGE' },
  { label: 'Scorecards', url: '/strata/scorecards', page: 'Scorecards PAGE' },
  { label: 'KPIs & OKRs', url: '/strata/kpis', page: 'KPIs PAGE' },
  { label: 'Project Cards', url: '/strata/execution', page: 'Project Cards PAGE' },
  { label: 'Portfolio & Benefits', url: '/strata/portfolio', page: 'Portfolio PAGE' },
  { label: 'Reviews & Decisions', url: '/strata/reviews', page: 'Reviews PAGE' },
  { label: 'Data & Lineage', url: '/strata/data', page: 'Data PAGE' },
] as const;

describe('SC-DEF-003 — side-nav from nested Scorecard Evidence route', () => {
  it('starts on the nested Evidence route', () => {
    renderAt(NESTED_EVIDENCE);
    expect(screen.getByTestId('url').textContent).toBe(NESTED_EVIDENCE);
    expect(screen.getByTestId('page').textContent).toBe('Evidence PAGE');
  });

  it.each(TARGETS)('$label navigates to $url and changes page content', async ({ label, url, page }) => {
    const user = userEvent.setup({ delay: null });
    renderAt(NESTED_EVIDENCE);

    await user.click(screen.getByRole('button', { name: new RegExp(label.replace(/&/g, '&'), 'i') }));

    // BOTH halves must change — active styling alone is the defect, not the fix.
    await waitFor(() => expect(screen.getByTestId('url').textContent).toBe(url));
    expect(screen.getByTestId('page').textContent).toBe(page);
    expect(screen.getByTestId('page').textContent).not.toBe('Evidence PAGE');
  });

  it('also navigates from the nested Scorecard DETAIL route', async () => {
    const user = userEvent.setup({ delay: null });
    renderAt('/strata/scorecards/some-card');
    await user.click(screen.getByRole('button', { name: /KPIs & OKRs/i }));
    await waitFor(() => expect(screen.getByTestId('url').textContent).toBe('/strata/kpis'));
    expect(screen.getByTestId('page').textContent).toBe('KPIs PAGE');
  });
});
