/**
 * jira-compare 2026-05-10 — N1 (P0) REGRESSION GUARD.
 *
 * Original Phase 0.5 N1 diagnosis was that the parent crumb click was
 * a no-op. This test, written to reproduce that failure, PASSED on the
 * first run — proving the wiring through TicketBreadcrumbs →
 * @/components/ads/Breadcrumbs → @atlaskit/breadcrumbs is intact and
 * onParentClick fires correctly.
 *
 * The actual N1 defect lives upstream in ProjectAllWorkView: its
 * onOpenItem unconditionally calls selectItem(id), but selectItem
 * silently no-ops when the target key isn't in the AllWork items list
 * (CLAUDE.md 2026-04-28 — /allwork excludes Epic/Feature/Task). The
 * Defect's parent is typically an Epic, so the click looked broken.
 * The fix lives there (see openItemDispatch.ts + ProjectAllWorkView
 * onOpenItem wiring).
 *
 * This test is retained as a guard so that if the wrapper stack ever
 * regresses, we catch it before it's misdiagnosed again.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@atlaskit/tokens', () => ({ token: (_t: string, fb: string) => fb }));

import { TicketBreadcrumbs } from '../TicketBreadcrumbs';

function renderCrumbs(onParentClick: () => void) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TicketBreadcrumbs
          projectKey="BAU"
          projectName="Senaei BAU"
          itemType="QA Bug"
          itemKey="BAU-5736"
          parentKey="BAU-4466"
          parentType="Epic"
          onParentClick={onParentClick}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TicketBreadcrumbs — N1 parent crumb navigation', () => {
  it('invokes onParentClick when the parent crumb is clicked', () => {
    const onParentClick = vi.fn();
    renderCrumbs(onParentClick);
    const crumb = screen.getByRole('button', { name: /BAU-4466/i });
    fireEvent.click(crumb);
    expect(onParentClick).toHaveBeenCalledTimes(1);
  });
});
