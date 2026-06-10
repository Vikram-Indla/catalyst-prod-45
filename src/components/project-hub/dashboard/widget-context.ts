import { createContext, useContext } from 'react';

export type WidgetSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface WidgetProps {
  projectId: string;
  projectKey: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

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
  soloWidgetId?: string | null;
  onSolo?: (id: string | null) => void;
}
export const GridEditContext = createContext<GridEditContextValue>({
  isEditing: false,
});

export function useWidgetEditState() {
  const id = useContext(WidgetIdContext);
  const grid = useContext(GridEditContext);
  if (!id) return { isEditing: false } as const;
  return {
    isEditing: grid.isEditing,
    widgetId: id.widgetId,
    currentSpan: id.currentSpan as WidgetSpan,
    minSpan: id.minSpan,
    onResize: grid.onResize ? (dir: 'wider' | 'narrower') => grid.onResize!(id.widgetId, dir) : undefined,
    onCollapseDraft: grid.onToggleCollapseDraft
      ? () => grid.onToggleCollapseDraft!(id.widgetId)
      : undefined,
    reorderRaw: grid.onReorder,
    soloWidgetId: grid.soloWidgetId ?? null,
    onSolo: grid.onSolo,
  };
}
