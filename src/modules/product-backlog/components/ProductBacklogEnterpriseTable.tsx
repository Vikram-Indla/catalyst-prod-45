/**
 * ProductBacklogEnterpriseTable - Uses CatalystEnterpriseTable for Business Requests
 * Mirrors the epic backlog table styling and functionality
 */

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CatalystEnterpriseTable, CatalystColumn } from '@/components/industry/CatalystEnterpriseTable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Status options
const STATUS_OPTIONS = [
  { value: 'new_request', label: 'New Request' },
  { value: 'analyse', label: 'Analyse' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'implement', label: 'Implement' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'on_hold', label: 'On-Hold' },
];

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'unscored', label: 'Unscored' },
];

interface BusinessRequestRow {
  id: string;
  _dbId: string;
  summary: string;
  processStep: string;
  score: number | null;
  autoPriority: string;
  rank: number | null;
  reporter: string | null;
  assignee: string | null;
  department: string | null;
  businessOwner: string | null;
  quarter: string | null;
  createdAt: string | null;
}

interface ProductBacklogEnterpriseTableProps {
  items: BusinessRequestRow[];
  isLoading?: boolean;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
  onFieldUpdate?: (requestId: string, field: string, value: any) => Promise<void>;
}

export function ProductBacklogEnterpriseTable({
  items,
  isLoading,
  selectedItems,
  onItemClick,
  onItemSelect,
  onFieldUpdate,
}: ProductBacklogEnterpriseTableProps) {
  const queryClient = useQueryClient();

  // Mutation for updating ranks after reorder
  const updateRanksMutation = useMutation({
    mutationFn: async ({ updates }: { updates: Array<{ id: string; rank: number }> }) => {
      const promises = updates.map(item =>
        supabase
          .from('business_requests')
          .update({ rank: item.rank })
          .eq('id', item.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast.success('Rank updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update rank: ${error.message}`);
    },
  });

  // Handle reorder from drag-drop
  const handleReorder = (reorderedData: BusinessRequestRow[], sourceIndex: number, destIndex: number) => {
    const updates = reorderedData.map((item, index) => ({
      id: item._dbId,
      rank: index + 1,
    }));
    updateRanksMutation.mutate({ updates });
  };

  // Handle selection changes
  const handleSelectionChange = (ids: string[]) => {
    const currentSet = new Set(selectedItems);
    const newSet = new Set(ids);
    
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

  // Format status for human-readable display
  const formatStatus = (status?: string) => {
    if (!status) return '—';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Define columns for the product backlog
  const columns: CatalystColumn<BusinessRequestRow>[] = useMemo(() => [
    {
      id: 'id',
      header: 'Request ID',
      accessor: 'id',
      width: '110px',
      sortable: true,
      render: (value, row) => (
        <span 
          className="font-mono text-xs text-[#c69c6d] dark:text-[#d4a855] hover:text-[#b8894d] dark:hover:text-[#c49545] hover:underline cursor-pointer font-semibold"
          onClick={(e) => {
            e.stopPropagation();
            // Explicitly trigger the row click to open the drawer
            onItemClick(value);
          }}
        >
          {value}
        </span>
      ),
    },
    {
      id: 'summary',
      header: 'Summary',
      accessor: 'summary',
      width: '300px',
      sortable: true,
      editable: true,
      type: 'text',
      render: (value) => (
        <span className="text-sm font-medium truncate block" title={value}>{value}</span>
      ),
    },
    {
      id: 'processStep',
      header: 'Status',
      accessor: 'processStep',
      width: '140px',
      sortable: true,
      filterable: true,
      editable: true,
      type: 'select',
      options: STATUS_OPTIONS,
      filterOptions: STATUS_OPTIONS,
      render: (value) => {
        const statusStyles: Record<string, string> = {
          'new_request': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          'analyse': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          'in_review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          'approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          'implement': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          'closed': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
          'rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          'on_hold': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
        const normalizedValue = value?.toLowerCase().replace(/\s+/g, '_') || 'new_request';
        const styleClass = statusStyles[normalizedValue] || statusStyles['new_request'];
        return (
          <Badge className={`${styleClass} border-0 text-xs font-medium`}>
            {formatStatus(value)}
          </Badge>
        );
      },
    },
    {
      id: 'score',
      header: 'Score',
      accessor: 'score',
      width: '80px',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-medium text-right block tabular-nums">{value ?? '—'}</span>
      ),
    },
    {
      id: 'autoPriority',
      header: 'Priority',
      accessor: 'autoPriority',
      width: '100px',
      sortable: true,
      filterable: true,
      filterOptions: PRIORITY_OPTIONS,
      render: (value) => {
        const priorityStyles: Record<string, string> = {
          'high': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          'medium': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          'low': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          'rejected': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
          'unscored': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
        const normalizedValue = value?.toLowerCase() || 'unscored';
        const styleClass = priorityStyles[normalizedValue] || priorityStyles['unscored'];
        return (
          <Badge className={`${styleClass} border-0 text-xs font-medium capitalize`}>
            {value || 'Unscored'}
          </Badge>
        );
      },
    },
    {
      id: 'rank',
      header: 'Rank',
      accessor: 'rank',
      width: '70px',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-semibold tabular-nums">{value ? `#${value}` : '—'}</span>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      accessor: 'department',
      width: '140px',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground truncate">{value || '—'}</span>
      ),
    },
    {
      id: 'businessOwner',
      header: 'Business Owner',
      accessor: 'businessOwner',
      width: '150px',
      sortable: true,
      render: (value) => (
        <span className="text-sm truncate">{value || '—'}</span>
      ),
    },
    {
      id: 'quarter',
      header: 'Quarter',
      accessor: 'quarter',
      width: '100px',
      sortable: true,
      filterable: true,
      render: (value) => (
        value ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-brand-primary/50 text-brand-primary">
            {value.toUpperCase().replace('_', ' ')}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      ),
    },
  ], [onItemClick]);

  // Handle row update for inline editing
  const handleRowUpdate = async (rowId: string, columnId: string, newValue: any) => {
    // Find the actual DB id
    const row = items.find(r => r.id === rowId);
    const dbId = row?._dbId || rowId;
    
    if (onFieldUpdate) {
      try {
        await onFieldUpdate(rowId, columnId, newValue);
      } catch (error: any) {
        toast.error(`Failed to update: ${error.message}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <CatalystEnterpriseTable
      data={items}
      columns={columns}
      enableDragDrop={true}
      onReorder={handleReorder}
      droppableId="product-backlog"
      onRowClick={(row) => onItemClick(row.id)}
      onRowUpdate={handleRowUpdate}
      selectedRows={selectedItems}
      onSelectionChange={handleSelectionChange}
      showCheckboxes={true}
      showActionsColumn={true}
    />
  );
}
