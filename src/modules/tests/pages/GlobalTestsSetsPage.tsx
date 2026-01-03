/**
 * GLOBAL TESTS SETS PAGE
 * Enterprise-grade test set management with folder tree, grid, CRUD, bulk actions
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Package,
  AlertCircle,
  MoreHorizontal,
  Archive,
  RefreshCw,
  FolderOutput,
  RefreshCcw,
  Trash2,
  Eye,
  Edit,
  Copy,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGlobalTestSets } from '../hooks/useGlobalTestMetrics';
import { ScopeType } from '../hooks/useGlobalTestScope';
import { CreateTestSetModal } from '../components/CreateTestSetModal';
import { TestSetDetailDrawer } from '../components/TestSetDetailDrawer';
import { AddSetsToCycleModal } from '../components/AddSetsToCycleModal';
import { MoveToFolderModal } from '../components/MoveToFolderModal';
import { TestFolderTree } from '../components/TestFolderTree';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { runMutationWithAudit, createPipelineContext } from '../lib/actionPipeline';

export function GlobalTestsSetsPage() {
  const [searchParams] = useSearchParams();
  const scopeType = (searchParams.get('scopeType') as ScopeType) || 'global';
  const scopeId = searchParams.get('scopeId');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addToCycleOpen, setAddToCycleOpen] = useState(false);
  const [moveToFolderOpen, setMoveToFolderOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderPanelOpen, setFolderPanelOpen] = useState(true);

  // Extract programId for folder tree
  const programId = scopeType === 'program' ? scopeId : searchParams.get('programId');

  // Data
  const { data: sets, isLoading, error, refetch } = useGlobalTestSets(scopeType, scopeId);

  // Filter sets
  const filteredSets = useMemo(() => {
    let result = sets || [];
    
    // Filter by folder
    if (selectedFolderId) {
      result = result.filter((s: any) => s.folder_id === selectedFolderId);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.key?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [sets, searchQuery, selectedFolderId]);

  // Archive mutation using pipeline
  const archiveMutation = useMutation({
    mutationFn: async (setIds: string[]) => {
      if (!user) throw new Error('Not authenticated');
      
      const context = createPipelineContext(
        user.id,
        scopeType === 'project' ? 'project' : scopeType === 'program' ? 'program' : 'global',
        scopeId,
        scopeType === 'program' ? scopeId : null,
        scopeType === 'project' ? scopeId : null
      );

      for (const setId of setIds) {
        await runMutationWithAudit(
          { setId },
          {
            context,
            action: 'delete',
            entityType: 'test_sets',
            mutationFn: async () => {
              const { error } = await supabase
                .from('test_sets')
                .update({ status: 'archived' })
                .eq('id', setId);
              if (error) throw error;
              return { id: setId };
            },
            getAuditInfo: () => ({
              entityId: setId,
              description: `Archived test set`,
            }),
            activityType: 'archived',
            queryClient,
            invalidateKeys: [['global-test-sets', scopeType, scopeId]],
            successMessage: setIds.length === 1 ? 'Test set archived' : undefined,
          }
        );
      }
      
      return setIds;
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      if (selectedIds.size > 1) {
        toast.success(`${selectedIds.size} test sets archived`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleRowClick = (setId: string) => {
    setSelectedSetId(setId);
    setDrawerOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSets.map((s: any) => s.id)));
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load test sets: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex h-full">
      {/* Folder Tree Panel */}
      <div
        className={cn(
          'border-r border-border-default bg-surface-1 transition-all duration-200 flex flex-col shrink-0',
          folderPanelOpen ? 'w-56' : 'w-0 overflow-hidden'
        )}
      >
        {folderPanelOpen && programId && (
          <TestFolderTree
            programId={programId}
            entityType="test_sets"
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            className="flex-1"
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4 p-4">
        {/* Folder toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setFolderPanelOpen(!folderPanelOpen)}
          >
            {folderPanelOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
          {selectedFolderId && (
            <span className="text-xs text-text-tertiary">Filtered by folder</span>
          )}
        </div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search sets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default h-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-9 bg-surface-2 border-border-default">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-default">
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">{filteredSets.length} sets</span>
          <Button
            size="sm"
            className="bg-accent-primary text-white hover:bg-accent-primary/90"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Set
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent-subtle/30 rounded-lg border border-accent-primary/20">
          <span className="text-sm font-medium text-text-primary">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddToCycleOpen(true)}
          >
            <RefreshCcw className="h-4 w-4 mr-1.5" />
            Add to Cycle
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMoveToFolderOpen(true)}
          >
            <FolderOutput className="h-4 w-4 mr-1.5" />
            Move to Folder
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-status-error hover:bg-status-error/10"
            onClick={() => archiveMutation.mutate(Array.from(selectedIds))}
            disabled={archiveMutation.isPending}
          >
            <Archive className="h-4 w-4 mr-1.5" />
            Archive
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Grid - Always show table structure */}
      {isLoading ? (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <div className="bg-surface-3 border-b border-border-default">
            <div className="grid grid-cols-[40px_1fr_80px_100px_100px_80px_48px] gap-1 px-3 py-2 text-[10px] font-black tracking-widest text-text-muted uppercase">
              <span></span><span>Set Name</span><span>Cases</span><span>Coverage</span><span>Last Exec</span><span>Status</span><span></span>
            </div>
          </div>
          <div className="divide-y divide-border-subtle">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <div className="bg-surface-3 border-b border-border-default">
            <div className="grid grid-cols-[40px_1fr_80px_100px_100px_80px_48px] gap-1 px-3 py-2 text-[10px] font-black tracking-widest text-text-muted uppercase">
              <span></span><span>Set Name</span><span>Cases</span><span>Coverage</span><span>Last Exec</span><span>Status</span><span></span>
            </div>
          </div>
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-text-muted">No test sets found</p>
            <Button size="sm" variant="ghost" onClick={() => setCreateModalOpen(true)} className="mt-2 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Create Set
            </Button>
          </div>
        </div>
      ) : (
        <div className="border border-border-default rounded-lg overflow-hidden text-xs">
          <table className="w-full">
            <thead className="bg-surface-3 border-b border-border-default sticky top-0 z-10">
              <tr className="text-[10px] font-black tracking-widest text-text-muted uppercase">
                <th className="px-3 py-2 w-10 text-left">
                  <Checkbox
                    checked={selectedIds.size === filteredSets.length && filteredSets.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-2 text-left">Set Name</th>
                <th className="px-3 py-2 w-20 text-right">Cases</th>
                <th className="px-3 py-2 w-24 text-left">Status</th>
                <th className="px-3 py-2 w-28 text-left">Created</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredSets.map((set: any) => (
                <tr
                  key={set.id}
                  className={cn(
                    'hover:bg-surface-2 cursor-pointer transition-colors',
                    selectedIds.has(set.id) && 'bg-accent-subtle/20'
                  )}
                  onClick={() => handleRowClick(set.id)}
                >
                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(set.id)}
                      onCheckedChange={() => toggleSelect(set.id)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-brand-primary flex-shrink-0" />
                      <span className="font-bold text-text-primary truncate">{set.name}</span>
                      {set.is_smart_set && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">Smart</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <span className="font-bold tabular-nums text-text-primary">{set.test_set_cases?.length || 0}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">Active</Badge>
                  </td>
                  <td className="px-3 py-1.5 text-text-muted tabular-nums">
                    {format(new Date(set.created_at), 'MMM d, yy')}
                  </td>
                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-surface-elevated border-border-default">
                        <DropdownMenuItem onClick={() => handleRowClick(set.id)} className="text-xs">
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedIds(new Set([set.id]));
                          setAddToCycleOpen(true);
                        }} className="text-xs">
                          <RefreshCcw className="h-3.5 w-3.5 mr-2" />
                          Add to Cycle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border-subtle" />
                        <DropdownMenuItem
                          className="text-xs text-danger"
                          onClick={() => archiveMutation.mutate([set.id])}
                        >
                          <Archive className="h-3.5 w-3.5 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <CreateTestSetModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        scopeType={scopeType}
        scopeId={scopeId}
      />

      <TestSetDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        setId={selectedSetId}
        scopeType={scopeType}
        scopeId={scopeId}
      />

      <AddSetsToCycleModal
        open={addToCycleOpen}
        onOpenChange={setAddToCycleOpen}
        setIds={Array.from(selectedIds)}
        scopeType={scopeType as 'program' | 'project'}
        scopeId={scopeId || ''}
        onSuccess={() => setSelectedIds(new Set())}
      />

      <MoveToFolderModal
        open={moveToFolderOpen}
        onOpenChange={setMoveToFolderOpen}
        caseIds={Array.from(selectedIds)}
        scopeType={scopeType as 'program' | 'project'}
        scopeId={scopeId || ''}
        onSuccess={() => setSelectedIds(new Set())}
      />
      </div>
    </div>
  );
}

export default GlobalTestsSetsPage;
