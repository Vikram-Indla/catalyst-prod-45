import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');
const src = readFileSync(
  resolve(repoRoot, 'src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx'),
  'utf8',
);

// ─── Migration: @dnd-kit row drag → Pragmatic DnD (BAU-backlog-drag-01) ───────
//
// BacklogPage.atlaskit.tsx's row-rank drag must use:
//   draggable() + dropTargetForElements() + monitorForElements()
//     from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
//   attachClosestEdge() / extractClosestEdge()
//     from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
//   DropIndicator
//     from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box'
//
// @dnd-kit must be removed from this file entirely.
// The rank persistence logic (sort_order write to ph_issues) is preserved
// and verified in backlog-drag-rank-write.test.ts — this file only checks
// the DnD engine contract.

describe('BacklogPage — Pragmatic DnD migration (BAU-backlog-drag-01)', () => {
  describe('@dnd-kit must be removed', () => {
    it('does not import from @dnd-kit/core', () => {
      expect(src).not.toMatch(/@dnd-kit\/core/);
    });

    it('does not import from @dnd-kit/sortable', () => {
      expect(src).not.toMatch(/@dnd-kit\/sortable/);
    });

    it('does not import from @dnd-kit/utilities', () => {
      expect(src).not.toMatch(/@dnd-kit\/utilities/);
    });

    it('does not use useSortable hook', () => {
      expect(src).not.toMatch(/useSortable/);
    });

    it('does not use DndContext component', () => {
      expect(src).not.toMatch(/\bDndContext\b/);
    });

    it('does not use SortableContext component', () => {
      expect(src).not.toMatch(/\bSortableContext\b/);
    });

    it('does not use DragOverlay component', () => {
      expect(src).not.toMatch(/\bDragOverlay\b/);
    });
  });

  describe('Pragmatic DnD must be used', () => {
    it('imports draggable from @atlaskit/pragmatic-drag-and-drop/element/adapter', () => {
      expect(src).toMatch(
        /import[\s\S]{0,200}draggable[\s\S]{0,200}@atlaskit\/pragmatic-drag-and-drop\/element\/adapter/,
      );
    });

    it('imports dropTargetForElements from Pragmatic', () => {
      expect(src).toMatch(/dropTargetForElements/);
    });

    it('imports monitorForElements from Pragmatic', () => {
      expect(src).toMatch(/monitorForElements/);
    });

    it('imports attachClosestEdge from pragmatic-drag-and-drop-hitbox', () => {
      expect(src).toMatch(/attachClosestEdge/);
    });

    it('imports extractClosestEdge from pragmatic-drag-and-drop-hitbox', () => {
      expect(src).toMatch(/extractClosestEdge/);
    });

    // DropIndicator (absolute-positioned ADS component) is clipped by the
    // JiraTable TD's overflow:hidden. The drop line is rendered via
    // createPortal to document.body with fixed positioning instead.
    it('uses createPortal to render the drop indicator outside the clipped TD', () => {
      expect(src).toMatch(/createPortal/);
    });
  });

  describe('DragHandleCell must use Pragmatic draggable()', () => {
    it('DragHandleCell calls draggable() with element ref', () => {
      // draggable() must appear inside or near DragHandleCell — look for the
      // useEffect-based registration pattern Pragmatic requires
      expect(src).toMatch(/draggable\(\s*\{/);
    });

    it('drag handle still renders the 6-dot grip SVG', () => {
      // NOTE (stale-contract update, 2026-07-01): BacklogPage's DragHandleCell
      // was rewritten to portal the grip to <body> (it must render like the
      // "+" button, outside the <tr>'s clipped overflow) so it no longer
      // relies on the shared `.jira-drag-handle` CSS class (that class only
      // drives the tr:hover visibility pattern used by JiraTable/BacklogTable's
      // own row-level drag handles). Assert the actual current markup instead:
      // an inline 6-dot grip SVG (viewBox "0 0 10 16", six <circle> dots).
      expect(src).toMatch(/6-dot grip/);
      expect(src).toMatch(/viewBox="0 0 10 16"/);
      const circleCount = (src.match(/<circle\b/g) ?? []).length;
      expect(circleCount).toBeGreaterThanOrEqual(6);
    });
  });

  describe('rank persistence contract is preserved', () => {
    it('still writes sort_order to ph_issues on drop', () => {
      expect(src).toMatch(/sort_order/);
      expect(src).toMatch(/ph_issues/);
    });
  });
});
