import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../..');
const swimlane = readFileSync(resolve(repoRoot, 'src/components/kanban/KanbanSwimlane.tsx'), 'utf8');
const sortableCard = readFileSync(resolve(repoRoot, 'src/components/kanban/SortableCard.tsx'), 'utf8');

// ─── Migration: @dnd-kit swimlane → Pragmatic DnD (BAU-boards-swimlane-01) ──
//
// KanbanSwimlane.tsx (SwimlaneDndColumn) must replace:
//   useDroppable(@dnd-kit/core) + SortableContext(@dnd-kit/sortable)
// with:
//   dropTargetForElements + monitorForElements (Pragmatic)
//
// SortableCard.tsx must replace:
//   useSortable + CSS.Transform (@dnd-kit/sortable + @dnd-kit/utilities)
// with:
//   draggable() from Pragmatic

describe('KanbanSwimlane — Pragmatic DnD migration (BAU-boards-swimlane-01)', () => {
  describe('@dnd-kit must be removed from KanbanSwimlane', () => {
    it('does not import useDroppable from @dnd-kit/core', () => {
      expect(swimlane).not.toMatch(/useDroppable/);
    });

    it('does not import SortableContext from @dnd-kit/sortable', () => {
      expect(swimlane).not.toMatch(/SortableContext/);
    });

    it('does not import verticalListSortingStrategy from @dnd-kit/sortable', () => {
      expect(swimlane).not.toMatch(/verticalListSortingStrategy/);
    });

    it('does not import from @dnd-kit/core', () => {
      expect(swimlane).not.toMatch(/@dnd-kit\/core/);
    });

    it('does not import from @dnd-kit/sortable', () => {
      expect(swimlane).not.toMatch(/@dnd-kit\/sortable/);
    });
  });

  describe('Pragmatic DnD must be used in KanbanSwimlane', () => {
    it('imports dropTargetForElements from Pragmatic', () => {
      expect(swimlane).toMatch(/dropTargetForElements/);
    });

    it('imports from @atlaskit/pragmatic-drag-and-drop', () => {
      expect(swimlane).toMatch(/@atlaskit\/pragmatic-drag-and-drop/);
    });

    it('uses dropTargetForElements() call', () => {
      expect(swimlane).toMatch(/dropTargetForElements\(\s*\{/);
    });

    it('renders a drop indicator line (not full-column highlight)', () => {
      // The old pattern: background: isOver ? tk.dropHighlight : ...
      // The new pattern: a fixed-position line element or DropIndicator via portal
      expect(swimlane).not.toMatch(/isOver\s*\?\s*tk\.dropHighlight/);
    });
  });
});

describe('SortableCard — Pragmatic DnD migration (BAU-boards-swimlane-01)', () => {
  describe('@dnd-kit must be removed from SortableCard', () => {
    it('does not import useSortable from @dnd-kit/sortable', () => {
      expect(sortableCard).not.toMatch(/useSortable/);
    });

    it('does not import CSS from @dnd-kit/utilities', () => {
      expect(sortableCard).not.toMatch(/@dnd-kit\/utilities/);
    });

    it('does not import from @dnd-kit/sortable', () => {
      expect(sortableCard).not.toMatch(/@dnd-kit\/sortable/);
    });

    it('does not use CSS.Transform.toString', () => {
      expect(sortableCard).not.toMatch(/CSS\.Transform\.toString/);
    });
  });

  describe('Pragmatic DnD must be used in SortableCard', () => {
    it('imports draggable from @atlaskit/pragmatic-drag-and-drop/element/adapter', () => {
      expect(sortableCard).toMatch(
        /import[\s\S]{0,200}draggable[\s\S]{0,200}@atlaskit\/pragmatic-drag-and-drop\/element\/adapter/,
      );
    });

    it('calls draggable() with element ref', () => {
      expect(sortableCard).toMatch(/draggable\(\s*\{/);
    });

    it('still renders the card content (issue summary visible)', () => {
      expect(sortableCard).toMatch(/issue\.summary|issue\.title/);
    });
  });
});
