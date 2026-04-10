/**
 * useTableColumns — Reusable hook for column resize + drag reorder with DB persistence
 * Supports: /testhub/defects, /project-hub/projects, /producthub/backlog
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ColumnDef {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth?: number;
  locked?: boolean; // locked columns can't be reordered
}

interface TablePrefs {
  columnOrder: string[];
  columnWidths: Record<string, number>;
}

export function useTableColumns(tableKey: string, defaultColumns: ColumnDef[]) {
  const queryClient = useQueryClient();
  const defaultOrder = defaultColumns.map(c => c.key);
  const defaultWidths = Object.fromEntries(defaultColumns.map(c => [c.key, c.defaultWidth]));

  // Fetch persisted prefs
  const { data: savedPrefs } = useQuery({
    queryKey: ['table-prefs', tableKey],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await (supabase as any)
        .from('user_table_preferences')
        .select('column_order, column_widths')
        .eq('user_id', user.id)
        .eq('table_key', tableKey)
        .maybeSingle();
      return data as { column_order: string[]; column_widths: Record<string, number> } | null;
    },
    staleTime: Infinity,
  });

  // Local state
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultOrder);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultWidths);

  // Apply saved prefs when loaded
  useEffect(() => {
    if (savedPrefs) {
      if (savedPrefs.column_order?.length) {
        // Merge: keep any new columns not in saved order, remove deleted ones
        const validKeys = new Set(defaultOrder);
        const saved = savedPrefs.column_order.filter(k => validKeys.has(k));
        const missing = defaultOrder.filter(k => !saved.includes(k));
        setColumnOrder([...saved, ...missing]);
      }
      if (savedPrefs.column_widths && Object.keys(savedPrefs.column_widths).length) {
        setColumnWidths(prev => ({ ...prev, ...savedPrefs.column_widths }));
      }
    }
  }, [savedPrefs]);

  // Save mutation (debounced via ref)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const saveMutation = useMutation({
    mutationFn: async (prefs: TablePrefs) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await (supabase as any)
        .from('user_table_preferences')
        .upsert({
          user_id: user.id,
          table_key: tableKey,
          column_order: prefs.columnOrder,
          column_widths: prefs.columnWidths,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,table_key' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-prefs', tableKey] });
    },
  });

  const persistPrefs = useCallback((order: string[], widths: Record<string, number>) => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveMutation.mutate({ columnOrder: order, columnWidths: widths });
    }, 800);
  }, [saveMutation]);

  // ── Resize ──
  const onResizeStart = useCallback((colKey: string, startX: number) => {
    const startWidth = columnWidths[colKey] || 100;
    const minW = defaultColumns.find(c => c.key === colKey)?.minWidth || 50;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(minW, startWidth + delta);
      setColumnWidths(prev => {
        const next = { ...prev, [colKey]: newWidth };
        return next;
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const delta = e.clientX - startX;
      const newWidth = Math.max(minW, startWidth + delta);
      setColumnWidths(prev => {
        const next = { ...prev, [colKey]: newWidth };
        persistPrefs(columnOrder, next);
        return next;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [columnWidths, columnOrder, defaultColumns, persistPrefs]);

  // ── Drag reorder ──
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const onDragStart = useCallback((key: string) => {
    const col = defaultColumns.find(c => c.key === key);
    if (col?.locked) return;
    setDragKey(key);
  }, [defaultColumns]);

  const onDragOver = useCallback((key: string) => {
    const col = defaultColumns.find(c => c.key === key);
    if (col?.locked) return;
    if (key !== dragKey) setDragOverKey(key);
  }, [dragKey, defaultColumns]);

  const onDragEnd = useCallback(() => {
    if (dragKey && dragOverKey && dragKey !== dragOverKey) {
      setColumnOrder(prev => {
        const next = [...prev];
        const fromIdx = next.indexOf(dragKey);
        const toIdx = next.indexOf(dragOverKey);
        if (fromIdx === -1 || toIdx === -1) return prev;
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, dragKey);
        persistPrefs(next, columnWidths);
        return next;
      });
    }
    setDragKey(null);
    setDragOverKey(null);
  }, [dragKey, dragOverKey, columnWidths, persistPrefs]);

  // ── Reset to defaults ──
  const resetColumns = useCallback(() => {
    setColumnOrder(defaultOrder);
    setColumnWidths(defaultWidths);
    persistPrefs(defaultOrder, defaultWidths);
  }, [defaultOrder, defaultWidths, persistPrefs]);

  // ── Ordered column defs — locked columns pinned to default positions ──
  const orderedColumns = (() => {
    // Separate locked from unlocked, preserving default positions for locked
    const lockedMap = new Map<number, ColumnDef>();
    const unlockedOrder: string[] = [];

    defaultColumns.forEach((c, i) => {
      if (c.locked) lockedMap.set(i, c);
    });

    // Get the reordered unlocked keys
    columnOrder.forEach(key => {
      const col = defaultColumns.find(c => c.key === key);
      if (col && !col.locked) unlockedOrder.push(key);
    });

    // Build final array: insert locked at their default indices, fill rest with unlocked
    const result: ColumnDef[] = [];
    let unlockedIdx = 0;
    for (let i = 0; i < defaultColumns.length; i++) {
      if (lockedMap.has(i)) {
        result.push(lockedMap.get(i)!);
      } else if (unlockedIdx < unlockedOrder.length) {
        const col = defaultColumns.find(c => c.key === unlockedOrder[unlockedIdx]);
        if (col) result.push(col);
        unlockedIdx++;
      }
    }
    return result;
  })();

  return {
    orderedColumns,
    columnWidths,
    columnOrder,
    dragKey,
    dragOverKey,
    onResizeStart,
    onDragStart,
    onDragOver,
    onDragEnd,
    resetColumns,
  };
}
