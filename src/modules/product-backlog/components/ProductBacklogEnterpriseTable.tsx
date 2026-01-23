/**
 * ProductBacklogEnterpriseTable - Uses CatalystEnterpriseTable for Business Requests
 * Enterprise-grade styling with enhanced badges, tooltips, and visual hierarchy
 */

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CatalystEnterpriseTable, CatalystColumn } from '@/components/industry/CatalystEnterpriseTable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  onCreateNew?: () => void;
}

// Get initials from name
const getInitials = (name: string | null) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Priority badge styles - stronger colors for visibility
const getPriorityStyles = (priority: string) => {
  const normalizedValue = priority?.toLowerCase() || 'unscored';
  
  const styles: Record<string, string> = {
    'critical': 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    'high': 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    'medium': 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    'low': 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    'rejected': 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    'unscored': 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  };
  
  return styles[normalizedValue] || styles['unscored'];
};

// Status badge styles with colored dot
const getStatusStyles = (status: string) => {
  const normalizedValue = status?.toLowerCase().replace(/\s+/g, '_') || 'new_request';
  
  const styles: Record<string, { dot: string; bg: string; text: string }> = {
    'new_request': {
      dot: 'bg-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-400',
    },
    'new': {
      dot: 'bg-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-400',
    },
    'analyse': {
      dot: 'bg-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-700 dark:text-purple-400',
    },
    'in_review': {
      dot: 'bg-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
    },
    'approved': {
      dot: 'bg-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-400',
    },
    'implement': {
      dot: 'bg-[#2563eb]',
      bg: 'bg-[#2563eb]/10 dark:bg-[#3b82f6]/20',
      text: 'text-[#1d4ed8] dark:text-[#60a5fa]',
    },
    'closed': {
      dot: 'bg-gray-500',
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
    },
    'rejected': {
      dot: 'bg-red-500',
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
    },
    'on_hold': {
      dot: 'bg-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
    },
  };
  
  return styles[normalizedValue] || styles['new_request'];
};

// Format status for human-readable display
const formatStatus = (status?: string) => {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function ProductBacklogEnterpriseTable({
  items,
  isLoading,
  selectedItems,
  onItemClick,
  onItemSelect,
  onFieldUpdate,
  onCreateNew,
}: ProductBacklogEnterpriseTableProps) {
  const queryClient = useQueryClient();

  // Mutation for updating ranks after reorder
  const updateRanksMutation = useMutation({
    mutationFn: async ({ updates }: { updates: Array<{ id: string; rank: number }> }) => {
      const promises = updates.map(item =>
        (supabase as any)
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

  // Define columns with enterprise styling
  const columns: CatalystColumn<BusinessRequestRow>[] = useMemo(() => [
    // ID Column - Enhanced with gold accent
    {
      id: 'id',
      header: 'Request ID',
      accessor: 'id',
      width: '110px',
      sortable: true,
      render: (value, row) => (
        <span 
          className={cn(
            "font-mono text-sm font-medium cursor-pointer",
            "text-[#2563eb] dark:text-[#60a5fa]",
            "hover:text-[#1d4ed8] dark:hover:text-[#93c5fd] hover:underline"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onItemClick(value);
          }}
        >
          {value}
        </span>
      ),
    },
    // Summary with tooltip for truncated text
    {
      id: 'summary',
      header: 'Summary',
      accessor: 'summary',
      width: '300px',
      sortable: true,
      editable: true,
      type: 'text',
      render: (value) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span 
              className="text-sm font-medium truncate block max-w-[280px] text-gray-900 dark:text-gray-100"
            >
              {value || '—'}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p>{value}</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    // Status with colored dot badge
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
        const statusStyle = getStatusStyles(value);
        return (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
            statusStyle.bg,
            statusStyle.text
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
            {formatStatus(value)}
          </span>
        );
      },
    },
    // Score
    {
      id: 'score',
      header: 'Score',
      accessor: 'score',
      width: '80px',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-medium text-right block tabular-nums text-gray-900 dark:text-gray-100">
          {value ?? <span className="text-gray-400 dark:text-gray-500">—</span>}
        </span>
      ),
    },
    // Priority with stronger badge colors
    {
      id: 'autoPriority',
      header: 'Priority',
      accessor: 'autoPriority',
      width: '100px',
      sortable: true,
      filterable: true,
      filterOptions: PRIORITY_OPTIONS,
      render: (value) => (
        <span className={cn(
          "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium capitalize",
          getPriorityStyles(value)
        )}>
          {value || 'Unscored'}
        </span>
      ),
    },
    // Rank
    {
      id: 'rank',
      header: 'Rank',
      accessor: 'rank',
      width: '70px',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {value ? `#${value}` : <span className="text-gray-400 dark:text-gray-500">—</span>}
        </span>
      ),
    },
    // Department with tooltip
    {
      id: 'department',
      header: 'Department',
      accessor: 'department',
      width: '140px',
      sortable: true,
      filterable: true,
      render: (value) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate block max-w-[120px]">
              {value || <span className="text-gray-400 dark:text-gray-500">—</span>}
            </span>
          </TooltipTrigger>
          {value && (
            <TooltipContent side="top">
              <p>{value}</p>
            </TooltipContent>
          )}
        </Tooltip>
      ),
    },
    // Business Owner with avatar and tooltip
    {
      id: 'businessOwner',
      header: 'Business Owner',
      accessor: 'businessOwner',
      width: '150px',
      sortable: true,
      render: (value) => value ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                "bg-[#2563eb]/20 text-[#1d4ed8]",
                "dark:bg-[#3b82f6]/30 dark:text-[#60a5fa]"
              )}>
                {getInitials(value)}
              </div>
              <span className="text-sm truncate max-w-[100px] text-gray-900 dark:text-gray-100">
                {value}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-medium">{value}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
      ),
    },
    // Quarter with badge styling
    {
      id: 'quarter',
      header: 'Quarter',
      accessor: 'quarter',
      width: '100px',
      sortable: true,
      filterable: true,
      render: (value) => value ? (
        <span className={cn(
          "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium",
          "bg-blue-50 text-blue-700 border border-blue-200",
          "dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
        )}>
          {value.toUpperCase().replace('_', ' ')}
        </span>
      ) : (
        <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
      ),
    },
  ], [onItemClick]);

  // Handle row update for inline editing
  const handleRowUpdate = async (rowId: string, columnId: string, newValue: any) => {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]"></div>
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
      onCreateNew={onCreateNew}
    />
  );
}
