/**
 * GLOBAL TESTS SETS PAGE
 * Enterprise-grade test set management with grid, CRUD, bulk actions
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

  // Data
  const { data: sets, isLoading, error, refetch } = useGlobalTestSets(scopeType, scopeId);

  // Filter sets
  const filteredSets = useMemo(() => {
    let result = sets || [];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.key?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [sets, searchQuery]);

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
    <div className="space-y-4">
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

      {/* Grid */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="text-center py-16 text-text-tertiary">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No test sets found</h3>
          <p className="text-sm mb-4">Create test sets to organize your test cases</p>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Set
          </Button>
        </div>
      ) : (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-border-default">
              <tr className="text-left text-xs text-text-tertiary uppercase tracking-wide">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={selectedIds.size === filteredSets.length && filteredSets.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Set</th>
                <th className="px-4 py-3 font-medium w-24">Cases</th>
                <th className="px-4 py-3 font-medium w-32">Created</th>
                <th className="px-4 py-3 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {filteredSets.map((set: any) => (
                <tr
                  key={set.id}
                  className={cn(
                    'hover:bg-surface-hover cursor-pointer transition-colors',
                    selectedIds.has(set.id) && 'bg-accent-subtle/30'
                  )}
                  onClick={() => handleRowClick(set.id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(set.id)}
                      onCheckedChange={() => toggleSelect(set.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-surface-3 rounded">
                        <Package className="h-4 w-4 text-accent-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">{set.name}</span>
                          {set.is_smart_set && (
                            <Badge variant="outline" className="text-xs">Smart</Badge>
                          )}
                        </div>
                        {set.description && (
                          <p className="text-sm text-text-tertiary truncate max-w-md">
                            {set.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">
                      {set.test_set_cases?.length || 0}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-tertiary">
                    {format(new Date(set.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-surface-1 border-border-default">
                        <DropdownMenuItem onClick={() => handleRowClick(set.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedSetId(set.id);
                          setDrawerOpen(true);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedIds(new Set([set.id]));
                          setAddToCycleOpen(true);
                        }}>
                          <RefreshCcw className="h-4 w-4 mr-2" />
                          Add to Cycle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedIds(new Set([set.id]));
                          setMoveToFolderOpen(true);
                        }}>
                          <FolderOutput className="h-4 w-4 mr-2" />
                          Move to Folder
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border-default" />
                        <DropdownMenuItem
                          className="text-status-error"
                          onClick={() => archiveMutation.mutate([set.id])}
                        >
                          <Archive className="h-4 w-4 mr-2" />
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
  );
}

export default GlobalTestsSetsPage;
