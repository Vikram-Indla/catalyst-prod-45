/**
 * useKanbanKeyboard — Keyboard navigation for kanban board
 * 
 * Arrow keys: navigate between cards and columns
 * Enter: open detail panel for focused card
 * Escape: clear selection
 * F: toggle flag on focused card
 */
import { useEffect, useCallback } from 'react';
import { KANBAN_COLUMNS, STATUS_TO_COL_ID } from './kanban-tokens';
import type { BoardIssue, ColMap } from './kanban-types';

interface UseKanbanKeyboardOptions {
  enabled: boolean;
  colMap: ColMap;
  issuesById: Map<string, BoardIssue>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
  onToggleFlag: (id: string) => void;
  groupByActive: boolean;
}

export function useKanbanKeyboard({
  enabled,
  colMap,
  issuesById,
  selectedId,
  onSelect,
  onOpen,
  onToggleFlag,
  groupByActive,
}: UseKanbanKeyboardOptions) {

  // Build ordered list of (colIndex, issueId) for flat navigation
  const getOrderedIds = useCallback(() => {
    if (groupByActive) return [];
    const ordered: { colIdx: number; id: string }[] = [];
    KANBAN_COLUMNS.forEach((col, colIdx) => {
      const ids = colMap[col.id] ?? [];
      ids.forEach(id => ordered.push({ colIdx, id }));
    });
    return ordered;
  }, [colMap, groupByActive]);

  const findCurrentIndex = useCallback((ordered: { colIdx: number; id: string }[]) => {
    if (!selectedId) return -1;
    return ordered.findIndex(o => o.id === selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!enabled || groupByActive) return;

    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ordered = getOrderedIds();
      if (ordered.length === 0) return;

      const currentIdx = findCurrentIndex(ordered);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          if (currentIdx < 0) {
            // Select first card
            onSelect(ordered[0].id);
          } else {
            // Find next card in same column
            const currentColIdx = ordered[currentIdx].colIdx;
            const next = ordered.slice(currentIdx + 1).find(o => o.colIdx === currentColIdx);
            if (next) onSelect(next.id);
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          if (currentIdx < 0) return;
          const currentColIdx = ordered[currentIdx].colIdx;
          // Find previous card in same column
          const prevCandidates = ordered.slice(0, currentIdx).filter(o => o.colIdx === currentColIdx);
          if (prevCandidates.length > 0) onSelect(prevCandidates[prevCandidates.length - 1].id);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (currentIdx < 0) {
            onSelect(ordered[0].id);
          } else {
            const currentColIdx = ordered[currentIdx].colIdx;
            // Find first card in next column
            const nextCol = ordered.find(o => o.colIdx > currentColIdx);
            if (nextCol) onSelect(nextCol.id);
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (currentIdx < 0) return;
          const currentColIdx = ordered[currentIdx].colIdx;
          // Find first card in previous column
          const prevCol = ordered.filter(o => o.colIdx < currentColIdx);
          if (prevCol.length > 0) {
            // Get first card of the highest column index that is still less than current
            const targetColIdx = prevCol[prevCol.length - 1].colIdx;
            const firstInCol = prevCol.find(o => o.colIdx === targetColIdx);
            if (firstInCol) onSelect(firstInCol.id);
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (selectedId) onOpen(selectedId);
          break;
        }
        case 'Escape': {
          e.preventDefault();
          onSelect(null);
          break;
        }
        case 'f':
        case 'F': {
          if (selectedId && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onToggleFlag(selectedId);
          }
          break;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled, groupByActive, getOrderedIds, findCurrentIndex, selectedId, onSelect, onOpen, onToggleFlag]);
}
