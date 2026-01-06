/**
 * TMDefectsPage - Module 6 Defect Management
 * Enterprise-grade defects management with full Supabase integration
 * Route: /tests/defects
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Bug, 
  Plus, 
  Search, 
  LayoutGrid,
  List,
  Download,
  Settings,
  Filter,
  PanelLeftClose,
  PanelLeft,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Enterprise components
import {
  DefectsTableView,
  DefectFiltersPanel,
  DefectMetricsHeader,
  CreateDefectDialogEnterprise,
  DefectDetailPanelEnhanced,
  DEFAULT_DEFECT_COLUMNS,
  type ColumnConfig,
  type DefectFilters,
} from '../components/defects';

// Supabase hooks
import {
  useDefectsList,
  useDefectStats,
  useDeleteDefect,
  useBulkUpdateDefects,
  useUpdateDefect,
} from '../hooks/useDefectsSupabase';

import { useDefectColumnPreferences } from '../hooks/useDefectColumnPreferences';

// Types
import type { DefectWithRelations, DefectWorkflowStatus, DefectPriority, DefectSeverity } from '../types/defects';

// ─────────────────────────────────────────────────────────────────────────────
// Default Filter State
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: DefectFilters = {
  statuses: [],
  severities: [],
  priorities: [],
  assigneeId: null,
  reporterId: null,
  dateRange: 'all',
  environment: null,
  component: null,
  hasExternalLink: null,
  showMineOnly: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function TMDefectsPage() {
  const [searchParams] = useSearchParams();
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [filters, setFilters] = useState<DefectFilters>(DEFAULT_FILTERS);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeDefect, setActiveDefect] = useState<DefectWithRelations | null>(null);
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState<DefectWithRelations | null>(null);
  const [deleteConfirmDefect, setDeleteConfirmDefect] = useState<DefectWithRelations | null>(null);
  
  // Sorting
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  
  // Get project ID from URL
  const projectId = searchParams.get('projectId') || 'default-project';
  
  // Column preferences
  const {
    columns,
    isLoading: columnsLoading,
    setColumnVisibility,
    setColumnWidth,
    resetToDefaults,
  } = useDefectColumnPreferences();
  
  // Build API filters from component filters
  const apiFilters = useMemo(() => ({
    project_id: projectId,
    workflow_status: filters.statuses.length > 0 ? filters.statuses : undefined,
    severity: filters.severities.length > 0 ? filters.severities : undefined,
    priority: filters.priorities.length > 0 ? filters.priorities : undefined,
    assignee_id: filters.assigneeId,
    search: searchQuery || undefined,
    created_after: filters.dateRange !== 'all' 
      ? new Date(Date.now() - parseInt(filters.dateRange) * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
  }), [projectId, filters, searchQuery]);
  
  // Fetch defects
  const { 
    data: defectsResponse, 
    isLoading: defectsLoading,
    refetch: refetchDefects,
  } = useDefectsList(
    apiFilters,
    { 
      page, 
      limit, 
      sort: { field: sortColumn as keyof DefectWithRelations, direction: sortDirection } 
    }
  );
  
  // Fetch stats
  const { data: statsData, isLoading: statsLoading } = useDefectStats(projectId);
  
  // Mutations
  const deleteDefectMutation = useDeleteDefect();
  const bulkUpdateMutation = useBulkUpdateDefects();
  const updateDefectMutation = useUpdateDefect();
  
  // Derived data
  const defects = defectsResponse?.data || [];
  const pagination = defectsResponse?.pagination;
  
  // Metrics
  const metrics = useMemo(() => {
    if (statsData) {
      return {
        total: statsData.total || 0,
        open: statsData.open_count || 0,
        inProgress: statsData.by_workflow_status?.in_progress || 0,
        resolved: statsData.resolved_count || 0,
        closed: statsData.by_workflow_status?.closed || 0,
        blockers: statsData.by_severity?.blocker || 0,
        criticals: statsData.by_severity?.critical || 0,
        openedThisWeek: 0, // Would need additional query
        closedThisWeek: 0,
      };
    }
    // Fallback to local calculation
    return {
      total: defects.length,
      open: defects.filter(d => d.workflow_status === 'open' || d.workflow_status === 'new').length,
      inProgress: defects.filter(d => d.workflow_status === 'in_progress').length,
      resolved: defects.filter(d => d.workflow_status === 'resolved').length,
      closed: defects.filter(d => d.workflow_status === 'closed').length,
      blockers: defects.filter(d => d.severity === 'blocker').length,
      criticals: defects.filter(d => d.severity === 'critical').length,
      openedThisWeek: 0,
      closedThisWeek: 0,
    };
  }, [statsData, defects]);
  
  // Handlers
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  }, [sortColumn]);
  
  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === defects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(defects.map(d => d.id)));
    }
  }, [selectedIds.size, defects]);
  
  const handleRowClick = useCallback((defect: DefectWithRelations) => {
    setActiveDefect(defect);
  }, []);
  
  const handleEdit = useCallback((defect: DefectWithRelations) => {
    setEditingDefect(defect);
    setCreateModalOpen(true);
  }, []);
  
  const handleDelete = useCallback((defect: DefectWithRelations) => {
    setDeleteConfirmDefect(defect);
  }, []);
  
  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmDefect) return;
    
    try {
      await deleteDefectMutation.mutateAsync(deleteConfirmDefect.id);
      toast.success(`Defect ${deleteConfirmDefect.defect_key} deleted`);
      if (activeDefect?.id === deleteConfirmDefect.id) {
        setActiveDefect(null);
      }
    } catch (error) {
      toast.error('Failed to delete defect');
    } finally {
      setDeleteConfirmDefect(null);
    }
  }, [deleteConfirmDefect, deleteDefectMutation, activeDefect]);
  
  const handleBulkStatusChange = useCallback(async (status: DefectWorkflowStatus) => {
    if (selectedIds.size === 0) return;
    
    try {
      await bulkUpdateMutation.mutateAsync({
        ids: Array.from(selectedIds),
        changes: { workflow_status: status },
      });
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Failed to update defects');
    }
  }, [selectedIds, bulkUpdateMutation]);
  
  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  }, []);
  
  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumnWidth(columnId, width);
  }, [setColumnWidth]);
  
  const handleStatusChange = useCallback(async (status: string) => {
    if (!activeDefect) return;
    
    try {
      await updateDefectMutation.mutateAsync({
        id: activeDefect.id,
        workflow_status: status as DefectWorkflowStatus,
      });
      // Update local state
      setActiveDefect(prev => prev ? { ...prev, workflow_status: status as DefectWorkflowStatus } : null);
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  }, [activeDefect, updateDefectMutation]);
  
  const isLoading = defectsLoading || columnsLoading;
  
  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Filters Panel */}
      {showFilters && (
        <DefectFiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClearAll={handleClearFilters}
        />
      )}
      
      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden transition-all duration-300",
        activeDefect && "mr-[480px]"
      )}>
        {/* Metrics Header */}
        <DefectMetricsHeader
          metrics={metrics}
          isLoading={statsLoading}
          variant="compact"
        />
        
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8"
            >
              {showFilters ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search defects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[280px] pl-9 h-9"
              />
            </div>
            
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-md">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetchDefects()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            {/* Column Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Settings className="h-4 w-4 mr-1.5" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.visible}
                    disabled={col.fixed}
                    onCheckedChange={(checked) => setColumnVisibility(col.id, checked)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem onClick={resetToDefaults}>
                  Reset to Defaults
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* View Toggle */}
            <div className="flex bg-muted rounded-md p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewMode === 'list' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewMode === 'board' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            
            <Button variant="outline" size="sm" className="h-8">
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
            
            <Button 
              size="sm" 
              className="h-8 bg-destructive hover:bg-destructive/90"
              onClick={() => setCreateModalOpen(true)}
            >
              <Bug className="h-4 w-4 mr-1.5" />
              Log Defect
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {viewMode === 'list' ? (
            <DefectsTableView
              defects={defects}
              isLoading={isLoading}
              selectedIds={selectedIds}
              activeDefectId={activeDefect?.id}
              columns={columns}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onRowClick={handleRowClick}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSort={handleSort}
              onColumnResize={handleColumnResize}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Board View</p>
                <p className="text-sm">Coming soon...</p>
              </div>
            </div>
          )}
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, pagination.total)} of {pagination.total} defects
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Detail Panel */}
      {activeDefect && (
        <div className="fixed top-0 right-0 h-full z-40">
          <DefectDetailPanelEnhanced
            defect={activeDefect}
            onClose={() => setActiveDefect(null)}
            onEdit={() => handleEdit(activeDefect)}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}
      
      {/* Create/Edit Modal */}
      <CreateDefectDialogEnterprise
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setEditingDefect(null);
        }}
        projectId={projectId}
        defect={editingDefect}
        onSuccess={() => {
          setCreateModalOpen(false);
          setEditingDefect(null);
          refetchDefects();
        }}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deleteConfirmDefect} 
        onOpenChange={(open) => !open && setDeleteConfirmDefect(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Defect</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmDefect?.defect_key}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TMDefectsPage;
