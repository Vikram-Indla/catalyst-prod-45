/**
 * EpicTable - Uses CatalystEnterpriseTable for Epic Backlog
 * Maintains drag-drop functionality while using the new table styling
 */

import { useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { CatalystEnterpriseTable, CatalystColumn } from '@/components/industry/CatalystEnterpriseTable';
import { BacklogItem, BacklogMeta } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lozenge } from '@/components/ads';
import { useBacklogState } from '../hooks/useBacklogState';
import { getEpicStatusConfigFromList, getEpicStatusStyles } from '@/components/items/epics/drawer';
import { useActiveEpicStatuses } from '@/hooks/useEpicStatuses';

interface EpicTableProps {
  items: BacklogItem[];
  meta?: BacklogMeta;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
}

export function EpicTable({
  items,
  meta,
  selectedItems,
  onItemClick,
  onItemSelect,
}: EpicTableProps) {
  const queryClient = useQueryClient();
  const { programId, isEpicBacklog, columnsShown } = useBacklogState();
  
  // Fetch epic statuses from database for proper label/color rendering
  const { data: epicStatuses = [] } = useActiveEpicStatuses();

  // Fetch program key for epic numbering
  const { data: programData } = useQuery({
    queryKey: ['program-key', programId],
    queryFn: async () => {
      if (!programId) return null;
      const { data, error } = await supabase
        .from('programs')
        .select('key, name')
        .eq('id', programId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!programId && isEpicBacklog,
  });

  // Mutation for updating ranks after reorder
  const updateRanksMutation = useMutation({
    mutationFn: async ({ updates }: { updates: Array<{ id: string; rank: number }> }) => {
      const promises = updates.map(item =>
        supabase
          .from('epics')
          .update({ global_rank: item.rank })
          .eq('id', item.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Rank updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update rank: ${error.message}`);
    },
  });

  // Handle reorder from drag-drop
  const handleReorder = (reorderedData: BacklogItem[], sourceIndex: number, destIndex: number) => {
    const updates = reorderedData.map((item, index) => ({
      id: item.id,
      rank: index + 1,
    }));
    updateRanksMutation.mutate({ updates });
  };

  // Handle selection changes
  const handleSelectionChange = (ids: string[]) => {
    // Sync with parent selection state
    const currentSet = new Set(selectedItems);
    const newSet = new Set(ids);
    
    // Find items that changed
    ids.forEach(id => {
      if (!currentSet.has(id)) {
        onItemSelect(id, true);
      }
    });
    
    selectedItems.forEach(id => {
      if (!newSet.has(id)) {
        onItemSelect(id, false);
      }
    });
  };

  // Format quarters for display
  const formatQuarters = (quarters?: string[]) => {
    if (!quarters || quarters.length === 0) return '—';
    return (
      <div className="flex items-center gap-1">
        {quarters.slice(0, 2).map((q, i) => (
          <Lozenge key={i} appearance="default">{q}</Lozenge>
        ))}
      </div>
    );
  };

  // Format status for human-readable display with color from database
  const getStatusInfo = (status?: string) => {
    if (!status) return { label: '—', color: null };
    const config = getEpicStatusConfigFromList(status, epicStatuses);
    return config;
  };

  const buildEpicKey = (row: BacklogItem) => {
    const existing = (row as any).epic_key || row.epicKey;
    if (existing) return existing;
    if (programData?.key) {
      const n = row.rank || row.globalRank || 1;
      return `${programData.key}-${String(n).padStart(3, '0')}`;
    }
    return String(row.displayId || '—');
  };

  // Define columns for the epic backlog (filtered by columnsShown)
  const allColumns: CatalystColumn<BacklogItem>[] = useMemo(() => [
    {
      id: 'epic',
      header: 'Summary',
      accessor: (row) => row.name,
      width: '360px',
      sortable: true,
      editable: true,
      type: 'text',
      render: (value, row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-muted-foreground shrink-0">{buildEpicKey(row)}</span>
            <span className="text-sm font-medium truncate">{value || '—'}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'themeName',
      header: 'Theme',
      accessor: 'themeName',
      width: '160px',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground truncate block">{value || '—'}</span>
      ),
    },
    {
      id: 'quarters',
      header: 'Quarters',
      accessor: 'quarters',
      width: '140px',
      render: (value) => formatQuarters(value),
    },
    {
      id: 'mvp',
      header: 'MVP',
      accessor: 'mvp',
      width: '70px',
      editable: true,
      type: 'select',
      options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' },
      ],
      render: (value) => (
        <span className="text-sm text-center">{value ? 'Yes' : 'No'}</span>
      ),
    },
    {
      id: 'processStep',
      header: 'Status',
      accessor: (row) => (row as any).status ?? row.processStep ?? row.state,
      width: '160px',
      sortable: true,
      render: (value) => {
        const statusInfo = getStatusInfo(value);
        const styles = getEpicStatusStyles(statusInfo.color);
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
            style={{
              background: styles.bg,
              color: styles.text,
              border: `1px solid ${styles.border}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: styles.dot }}
            />
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      id: 'assignee',
      header: 'Assignee',
      accessor: 'assigneeName',
      width: '160px',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground truncate block">{value || '—'}</span>
      ),
    },
    {
      id: 'owner',
      header: 'Owner',
      accessor: 'ownerName',
      width: '160px',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground truncate block">{value || '—'}</span>
      ),
    },
    {
      id: 'health',
      header: 'Health',
      accessor: (row) => (row as any).health,
      width: '110px',
      sortable: true,
      render: (value) => (
        <Lozenge appearance="default">{value || '—'}</Lozenge>
      ),
    },
    {
      id: 'progress',
      header: 'Progress %',
      accessor: (row) => (row as any).progress ?? (row as any).progress_pct,
      width: '120px',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-medium">{typeof value === 'number' ? `${value}%` : (value ?? '—')}</span>
      ),
    },
    {
      id: 'featureCount',
      header: 'Feature Count',
      accessor: (row) => (row as any).featureCount ?? (row as any).feature_count_total,
      width: '140px',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-medium">{value ?? '—'}</span>
      ),
    },
    {
      id: 'points',
      header: 'Points',
      accessor: (row) => (row as any).points_estimate ?? row.points,
      width: '90px',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-medium text-right block">{value ?? '—'}</span>
      ),
    },
    {
      id: 'labels',
      header: 'Labels',
      accessor: (row) => (row as any).tags,
      width: '160px',
      render: (value) => {
        const tags = Array.isArray(value) ? value : [];
        if (tags.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((t: string) => (
              <Lozenge key={t} appearance="default">{t}</Lozenge>
            ))}
          </div>
        );
      },
    },
  ], [programData?.key, epicStatuses]);

  const columns: CatalystColumn<BacklogItem>[] = useMemo(() => {
    if (!isEpicBacklog) return allColumns;
    const allowed = new Set(columnsShown || []);
    return allColumns.filter((c) => allowed.has(c.id));
  }, [allColumns, columnsShown, isEpicBacklog]);

  // Handle row update for inline editing
  const handleRowUpdate = async (rowId: string, columnId: string, newValue: any) => {
    try {
      let updateData: Record<string, any> = {};
      
      if (columnId === 'name') {
        updateData = { name: newValue };
      } else if (columnId === 'mvp') {
        updateData = { mvp: newValue === 'true' || newValue === true };
      }
      
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('epics')
          .update(updateData)
          .eq('id', rowId);
          
        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      }
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  return (
    <CatalystEnterpriseTable
      data={items}
      columns={columns}
      enableDragDrop={true}
      onReorder={handleReorder}
      droppableId="epic-backlog"
      onRowClick={(row) => onItemClick(row.id)}
      onRowUpdate={handleRowUpdate}
      selectedRows={selectedItems}
      onSelectionChange={handleSelectionChange}
      showCheckboxes={true}
      showActionsColumn={true}
    />
  );
}
