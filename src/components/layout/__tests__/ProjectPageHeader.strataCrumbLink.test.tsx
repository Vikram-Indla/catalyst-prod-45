/**
 * STRATA breadcrumb navigation — regression guard (2026-07-18).
 *
 * Defect: ProjectPageHeader passed react-router's raw <Link> as the ads
 * Breadcrumbs LinkComponent. The wrapper's contract supplies `href`, but a
 * raw <Link> ignores an `href` prop and recomputes it from `to` (undefined),
 * so every crumb's anchor resolved to the CURRENT page — clicking any STRATA
 * breadcrumb was a no-op. Fix: StrataCrumbLink adapter (href → to), ring-
 * fenced to hubType="strata".
 *
 * These tests render the real header inside a MemoryRouter at a STRATA
 * route and assert the crumb anchors carry their own destinations, not the
 * current pathname. With the raw-Link regression, both hrefs read
 * "/strata/admin/value-taxonomy" and this suite fails.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes as RRoutes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@atlaskit/tokens', () => ({ token: (_t: string, fb: string) => fb }));

import { ProjectPageHeader } from '../ProjectPageHeader';

let observedPath = '';
function PathSpy() {
  observedPath = useLocation().pathname;
  return null;
}

function renderStrataHeader() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/strata/admin/value-taxonomy']}>
        <PathSpy />
        <RRoutes>
          <Route
            path="*"
            element={
              <ProjectPageHeader
                hubType="strata"
                trail={[{ text: 'Administration', href: '/strata/admin' }]}
                title="Value taxonomy"
              />
            }
          />
        </RRoutes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProjectPageHeader — STRATA breadcrumb links', () => {
  it('crumb anchors carry their own destinations, not the current page', () => {
    renderStrataHeader();
    const root = screen.getByRole('link', { name: /STRATA/i });
    const admin = screen.getByRole('link', { name: /Administration/i });
    expect(root).toHaveAttribute('href', '/strata');
    expect(admin).toHaveAttribute('href', '/strata/admin');
  });

  it('clicking a crumb navigates to its destination', () => {
    renderStrataHeader();
    fireEvent.click(screen.getByRole('link', { name: /Administration/i }));
    expect(observedPath).toBe('/strata/admin');
  });
});
