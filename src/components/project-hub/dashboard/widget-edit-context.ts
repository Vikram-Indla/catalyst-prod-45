/**
 * Widget edit state context and hook - extracted to break circular dependency
 * between DashboardWidgetGrid.tsx and WidgetWrapper.tsx
 */
import { createContext, useContext } from 'react';
import type { WidgetSpan } from './widget-types';

// ────────────────────────────────────────────────────────────────────
// Edit-mode contexts — consumed by WidgetWrapper inside each widget.
// ────────────────────────────────────────────────────────────────────

interface WidgetIdContextValue {
  widgetId: string;
  currentSpan: number;
  minSpan: number;
}

export const WidgetIdContext = createContext<WidgetIdContextValue | null>(null);

interface GridEditContextValue {
  isEditing: boolean;
  onResize?: (widgetId: string, direction: 'wider' | 'narrower') => void;
  onReorder?: (sourceId: string, targetId: string, edge: 'before' | 'after') => void;
  onToggleCollapseDraft?: (widgetId: string) => void;
  /**
   * Solo / focus mode — transient. When set, only that widget renders;
   * every other widget unmounts via `display: none` (preserving query
   * cache + scroll). null = no focus.
   */
  soloWidgetId?: string | null;
  onSolo?: (id: string | null) => void;
}

export const GridEditContext = createContext<GridEditContextValue>({
  isEditing: false,
});

export function useWidgetEditState() {
  const id = useContext(WidgetIdContext);
  const grid = useContext(GridEditContext);
  
  if (!id) {
    return {
      isEditing: false,
      widgetId: undefined,
      currentSpan: undefined,
      minSpan: undefined,
      onResize: undefined,
      onCollapseDraft: undefined,
      reorderRaw: undefined,
      soloWidgetId: null,
      onSolo: undefined,
    };
  }
  
  return {
    isEditing: grid.isEditing,
    widgetId: id.widgetId,
    currentSpan: id.currentSpan as WidgetSpan,
    minSpan: id.minSpan,
    // Bound: "this widget" IS the subject of resize/collapse.
    onResize: grid.onResize ? (dir: 'wider' | 'narrower') => grid.onResize!(id.widgetId, dir) : undefined,
    onCollapseDraft: grid.onToggleCollapseDraft
      ? () => grid.onToggleCollapseDraft!(id.widgetId)
      : undefined,
    // Raw (page-level): pragmatic-DnD's dropTarget runs on the TARGET widget,
    // and the source is whichever widget was dragged. The WidgetWrapper needs
    // to call onReorder(sourceId, thisWidgetId, edge) — neither argument is
    // implicit. Expose the unbound version so it can pass both ids itself.
    reorderRaw: grid.onReorder,
    // Solo / focus passthrough — used by the wrapper to render the focus
    // toggle button + ESC handler. null = no focus.
    soloWidgetId: grid.soloWidgetId ?? null,
    onSolo: grid.onSolo,
  };
}
