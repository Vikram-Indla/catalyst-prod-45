/**
 * jira-compare 2026-05-10 — N1 (P0): clicking the parent crumb on a
 * Defect detail (e.g. BAU-4466 inside BAU-5736) silently no-ops because
 * /allwork's items list excludes Epic/Feature/Task (CLAUDE.md 2026-04-28
 * lesson). The breadcrumb wiring itself is correct — see
 * TicketBreadcrumbs.parent-crumb.test.tsx. The defect is in
 * ProjectAllWorkView's inner-panel onOpenItem: it always calls
 * selectItem(id), but selectItem(parentEpicKey) leaves activeItem
 * undefined because the parent isn't in items.
 *
 * Fix: dispatch on whether the target is in items.
 *   - in items  → in-place selection (existing behaviour, preserved for
 *                 subtask clicks etc.)
 *   - not in items → open via the overlay router, which resolves the
 *                    issue type from ph_issues by itself.
 *
 * This test is for a helper that doesn't exist yet; the file
 * openItemDispatch.ts must be created in T-B.
 */
import { describe, it, expect, vi } from 'vitest';
import { makeOpenItemHandler } from '../openItemDispatch';

describe('makeOpenItemHandler — N1 dispatch', () => {
  it('routes in-list ids through selectItem (in-place panel switch)', () => {
    const selectItem = vi.fn();
    const setOverlayItemId = vi.fn();
    const handler = makeOpenItemHandler(
      [{ id: 'BAU-1' }, { id: 'BAU-2' }],
      selectItem,
      setOverlayItemId,
    );
    handler('BAU-1');
    expect(selectItem).toHaveBeenCalledWith('BAU-1');
    expect(setOverlayItemId).not.toHaveBeenCalled();
  });

  it('routes out-of-list ids through setOverlayItemId (overlay fallback)', () => {
    const selectItem = vi.fn();
    const setOverlayItemId = vi.fn();
    const handler = makeOpenItemHandler(
      [{ id: 'BAU-1' }],
      selectItem,
      setOverlayItemId,
    );
    handler('BAU-4466');
    expect(setOverlayItemId).toHaveBeenCalledWith('BAU-4466');
    expect(selectItem).not.toHaveBeenCalled();
  });
});
