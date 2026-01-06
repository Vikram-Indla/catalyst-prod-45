/**
 * useDefectColumnPreferences - Hook for managing defect table column preferences
 * Persists column visibility and widths to Supabase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DEFAULT_DEFECT_COLUMNS, type ColumnConfig } from '../components/defects/DefectsTableView';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ColumnPreferencesData {
  columns: string[];
  column_widths: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

const QUERY_KEY = ['defect-column-preferences'];

async function fetchColumnPreferences(userId: string): Promise<ColumnPreferencesData | null> {
  const { data, error } = await supabase
    .from('defect_column_preferences')
    .select('columns, column_widths')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching column preferences:', error);
    return null;
  }

  if (!data) return null;

  // Parse JSON fields properly
  return {
    columns: Array.isArray(data.columns) ? data.columns as string[] : [],
    column_widths: typeof data.column_widths === 'object' && data.column_widths !== null
      ? data.column_widths as Record<string, number>
      : {},
  };
}

async function upsertColumnPreferences(
  userId: string,
  preferences: ColumnPreferencesData
): Promise<void> {
  const { error } = await supabase
    .from('defect_column_preferences')
    .upsert(
      {
        user_id: userId,
        columns: preferences.columns,
        column_widths: preferences.column_widths,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Error saving column preferences:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useDefectColumnPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  // Fetch preferences
  const { data: savedPrefs, isLoading } = useQuery({
    queryKey: [...QUERY_KEY, userId],
    queryFn: () => fetchColumnPreferences(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation to save preferences
  const saveMutation = useMutation({
    mutationFn: (preferences: ColumnPreferencesData) => 
      upsertColumnPreferences(userId!, preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  // Merge saved preferences with defaults
  const columns: ColumnConfig[] = DEFAULT_DEFECT_COLUMNS.map((col) => {
    const isVisible = savedPrefs?.columns 
      ? savedPrefs.columns.includes(col.id)
      : col.visible;
    const width = savedPrefs?.column_widths?.[col.id] ?? col.width;

    return {
      ...col,
      visible: isVisible,
      width,
    };
  });

  // Update column visibility
  const setColumnVisibility = (columnId: string, visible: boolean) => {
    const currentColumns = columns.filter(c => c.visible).map(c => c.id);
    const newColumns = visible
      ? [...currentColumns, columnId]
      : currentColumns.filter(id => id !== columnId);

    saveMutation.mutate({
      columns: newColumns,
      column_widths: savedPrefs?.column_widths ?? {},
    });
  };

  // Update column width
  const setColumnWidth = (columnId: string, width: number) => {
    const newWidths = {
      ...(savedPrefs?.column_widths ?? {}),
      [columnId]: width,
    };

    saveMutation.mutate({
      columns: savedPrefs?.columns ?? columns.filter(c => c.visible).map(c => c.id),
      column_widths: newWidths,
    });
  };

  // Reorder columns
  const reorderColumns = (newOrder: string[]) => {
    saveMutation.mutate({
      columns: newOrder,
      column_widths: savedPrefs?.column_widths ?? {},
    });
  };

  // Reset to defaults
  const resetToDefaults = () => {
    saveMutation.mutate({
      columns: DEFAULT_DEFECT_COLUMNS.filter(c => c.visible).map(c => c.id),
      column_widths: {},
    });
  };

  return {
    columns,
    isLoading,
    isSaving: saveMutation.isPending,
    setColumnVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
  };
}
