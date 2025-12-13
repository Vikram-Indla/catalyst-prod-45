/**
 * BacklogEnterpriseTable - Uses CatalystEnterpriseTable for Epic Backlog
 * Maintains drag-drop functionality while using the new table styling
 */

import { useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { CatalystEnterpriseTable, CatalystColumn } from '@/components/industry/CatalystEnterpriseTable';
import { BacklogItem, BacklogMeta } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useBacklogState } from '../hooks/useBacklogState';

interface BacklogEnterpriseTableProps {
  items: BacklogItem[];
  meta?: BacklogMeta;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
}

export function BacklogEnterpriseTable({
  items,
  meta,
  selectedItems,
  onItemClick,
  onItemSelect,
}: BacklogEnterpriseTableProps) {
  const queryClient = useQueryClient();
  const { programId, isEpicBacklog } = useBacklogState();

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
          <Badge 
            key={i} 
            variant="outline" 
            className="text-[10px] px-1.5 py-0 h-5 border-brand-gold/50 text-brand-gold"
          >
            {q}
          </Badge>
        ))}
      </div>
    );
  };

  // Format status for human-readable display
  const formatStatus = (status?: string) => {
    if (!status) return '—';
    return status.replace(/_/g, ' ').toLowerCase();
  };

  // Define columns for the epic backlog
  const columns: CatalystColumn<BacklogItem>[] = useMemo(() => [
    {
      id: 'key',
      header: 'Key',
      accessor: (row) => row.epicKey || (programData?.key ? `${programData.key}-${String(row.rank || row.globalRank || 1).padStart(3, '0')}` : row.displayId || '—'),
      width: '100px',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      ),
    },
    {
      id: 'name',
      header: 'Summary',
      accessor: 'name',
      width: '300px',
      sortable: true,
      editable: true,
      type: 'text',
      render: (value) => (
        <span className="text-sm font-medium">{value}</span>
      ),
    },
    {
      id: 'themeName',
      header: 'Theme',
      accessor: 'themeName',
      width: '150px',
      sortable: true,
      filterable: true,
      filterOptions: [], // Could be populated from meta
      render: (value) => (
        <span className="text-sm text-muted-foreground truncate">{value || '—'}</span>
      ),
    },
    {
      id: 'quarters',
      header: 'Quarters',
      accessor: 'quarters',
      width: '120px',
      render: (value) => formatQuarters(value),
    },
    {
      id: 'mvp',
      header: 'MVP',
      accessor: 'mvp',
      width: '60px',
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
      id: 'state',
      header: 'Status',
      accessor: (row) => row.processStep || row.state,
      width: '120px',
      sortable: true,
      filterable: true,
      filterOptions: [
        { value: 'not_started', label: 'Not Started' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'done', label: 'Done' },
        { value: 'blocked', label: 'Blocked' },
      ],
      render: (value) => (
        <span className="text-sm">{formatStatus(value)}</span>
      ),
    },
    {
      id: 'technicalScore',
      header: 'Score',
      accessor: (row) => row.technicalScore ?? row.businessScore,
      width: '80px',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-medium text-right block">{value ?? '—'}</span>
      ),
    },
  ], [programData?.key]);

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
