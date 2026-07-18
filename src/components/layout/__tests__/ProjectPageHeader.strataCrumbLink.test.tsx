/**
 * STRATA breadcrumb navigation — regression guard (2026-07-18).
 *
 * Defect 1: ProjectPageHeader passed react-router's raw <Link> as the ads
 * Breadcrumbs LinkComponent. The wrapper's contract supplies `href`, but a
 * raw <Link> ignores an `href` prop and recomputes it from `to` (undefined),
 * so every crumb's anchor resolved to the CURRENT page — clicking any STRATA
 * breadcrumb was a no-op. Fix: StrataCrumbLink adapter (href → to), ring-
 * fenced to hubType="strata".
 *
 * Defect 2 (QA criteria, same date): the current page must be the terminal
 * crumb inside the breadcrumb nav with aria-current="page" (not a bare H2
 * beside it), and on the hub root "STRATA" must be the non-clickable current
 * location, never a self-link.
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

function renderHeader(
  initialPath: string,
  props: React.ComponentProps<typeof ProjectPageHeader>,
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <PathSpy />
        <RRoutes>
          <Route path="*" element={<ProjectPageHeader hubType="strata" {...props} />} />
        </RRoutes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProjectPageHeader — STRATA breadcrumb links', () => {
  it('crumb anchors carry their own destinations, not the current page', () => {
    renderHeader('/strata/admin/value-taxonomy', {
      trail: [{ text: 'Administration', href: '/strata/admin' }],
      title: 'Value taxonomy',
    });
    expect(screen.getByRole('link', { name: /STRATA/i })).toHaveAttribute('href', '/strata');
    expect(screen.getByRole('link', { name: /Administration/i })).toHaveAttribute('href', '/strata/admin');
  });

  it('clicking a crumb navigates to its destination', () => {
    renderHeader('/strata/admin/value-taxonomy', {
      trail: [{ text: 'Administration', href: '/strata/admin' }],
      title: 'Value taxonomy',
    });
    fireEvent.click(screen.getByRole('link', { name: /Administration/i }));
    expect(observedPath).toBe('/strata/admin');
  });

  it('renders the current page as the terminal crumb with aria-current inside the nav', () => {
    const { container } = renderHeader('/strata/admin/value-taxonomy', {
      trail: [{ text: 'Administration', href: '/strata/admin' }],
      title: 'Value taxonomy',
    });
    const current = container.querySelector('nav [aria-current="page"]');
    expect(current).not.toBeNull();
    expect(current!.textContent).toBe('Value taxonomy');
    expect(current!.closest('a')).toBeNull(); // never a self-link
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('index pages (no trail) still end with an aria-current terminal crumb', () => {
    const { container } = renderHeader('/strata/scorecards', {});
    // auto-derived route word becomes the terminal crumb
    const current = container.querySelector('nav [aria-current="page"]');
    expect(current!.textContent).toBe('Scorecards');
    expect(screen.getByRole('link', { name: /STRATA/i })).toHaveAttribute('href', '/strata');
  });

  it('on the hub root, STRATA is the non-clickable current location', () => {
    const { container } = renderHeader('/strata', {});
    expect(screen.queryByRole('link', { name: /STRATA/i })).toBeNull();
    const current = container.querySelector('nav [aria-current="page"]');
    expect(current!.textContent).toContain('STRATA');
  });

  it('loading shells (hideTitle + ancestors-only trail) fabricate no current crumb', () => {
    // Zero-assumption rendering: while an entity name is unknown, the nav must
    // show only real ancestors — never the parent word duplicated as "current".
    const { container } = renderHeader('/strata/kpis/b2b-revenue-growth', {
      trail: [{ text: 'KPI library', href: '/strata/kpis' }],
      hideTitle: true,
    });
    expect(container.querySelector('[aria-current="page"]')).toBeNull();
    expect(screen.getByRole('link', { name: /KPI library/i })).toHaveAttribute('href', '/strata/kpis');
    expect(screen.queryAllByText('KPI library')).toHaveLength(1); // no duplicate
  });

  it('hideTitle detail pages keep the trail terminal as the aria-current crumb', () => {
    const { container } = renderHeader('/strata/execution/real-project-1', {
      trail: [
        { text: 'Execution', href: '/strata/execution' },
        { text: 'Real Project 1' },
      ],
      hideTitle: true,
    });
    const current = container.querySelector('nav [aria-current="page"]');
    expect(current!.textContent).toBe('Real Project 1');
    expect(screen.getByRole('link', { name: /Execution/i })).toHaveAttribute('href', '/strata/execution');
  });
});
