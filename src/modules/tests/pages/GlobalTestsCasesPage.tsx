/**
 * GLOBAL TESTS CASES PAGE
 * Test case library with scope filtering
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  ListChecks,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGlobalTestCases } from '../hooks/useGlobalTestMetrics';
import { ScopeType } from '../hooks/useGlobalTestScope';
import { CreateTestCaseModal } from '@/modules/in-jira/components/tests/CreateTestCaseModal';

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'text-status-error bg-status-error/10 border-status-error/20';
    case 'high': return 'text-status-warning bg-status-warning/10 border-status-warning/20';
    case 'medium': return 'text-accent-primary bg-accent-subtle border-accent-primary/20';
    case 'low': return 'text-text-tertiary bg-surface-3 border-border-default';
    default: return 'text-text-tertiary bg-surface-3 border-border-default';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'published': return 'text-status-success bg-status-success/10 border-status-success/20';
    case 'approved': return 'text-accent-primary bg-accent-subtle border-accent-primary/20';
    case 'under_review': return 'text-status-warning bg-status-warning/10 border-status-warning/20';
    case 'draft': return 'text-text-tertiary bg-surface-3 border-border-default';
    case 'deprecated': return 'text-status-error bg-status-error/10 border-status-error/20';
    default: return 'text-text-tertiary bg-surface-3 border-border-default';
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GlobalTestsCasesPage() {
  const [searchParams] = useSearchParams();
  const scopeType = (searchParams.get('scopeType') as ScopeType) || 'global';
  const scopeId = searchParams.get('scopeId');

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<{ status: string | null; priority: string | null; type: string | null }>({
    status: null,
    priority: null,
    type: null,
  });

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Data
  const { data: testCases, isLoading, error, refetch } = useGlobalTestCases(scopeType, scopeId);

  // Filter and search
  const processedCases = useMemo(() => {
    let result = [...(testCases || [])];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((tc: any) =>
        tc.title?.toLowerCase().includes(q) ||
        tc.description?.toLowerCase().includes(q) ||
        tc.component?.toLowerCase().includes(q)
      );
    }
    
    if (filters.status) {
      result = result.filter((tc: any) => tc.status === filters.status);
    }
    if (filters.priority) {
      result = result.filter((tc: any) => tc.priority === filters.priority);
    }
    if (filters.type) {
      result = result.filter((tc: any) => tc.test_type === filters.type);
    }
    
    return result;
  }, [testCases, searchQuery, filters]);

  // Paginate
  const totalCount = processedCases.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedCases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedCases.slice(start, start + pageSize);
  }, [processedCases, page]);

  // Selection
  const isAllSelected = paginatedCases.length > 0 && paginatedCases.every((tc: any) => selectedIds.has(tc.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedCases.map((tc: any) => tc.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearFilters = () => {
    setFilters({ status: null, priority: null, type: null });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load test cases: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default h-9"
            />
          </div>
          
          {/* Filters */}
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 bg-surface-1 border-border-default" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">Filters</span>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                      Clear all
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-text-tertiary">Status</label>
                  <Select value={filters.status || ''} onValueChange={(v) => setFilters(f => ({ ...f, status: v || null }))}>
                    <SelectTrigger className="h-8 bg-surface-2 border-border-default">
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-1 border-border-default">
                      <SelectItem value="">Any status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-text-tertiary">Priority</label>
                  <Select value={filters.priority || ''} onValueChange={(v) => setFilters(f => ({ ...f, priority: v || null }))}>
                    <SelectTrigger className="h-8 bg-surface-2 border-border-default">
                      <SelectValue placeholder="Any priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-1 border-border-default">
                      <SelectItem value="">Any priority</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-text-tertiary">Type</label>
                  <Select value={filters.type || ''} onValueChange={(v) => setFilters(f => ({ ...f, type: v || null }))}>
                    <SelectTrigger className="h-8 bg-surface-2 border-border-default">
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-1 border-border-default">
                      <SelectItem value="">Any type</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automated">Automated</SelectItem>
                      <SelectItem value="bdd">BDD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5">
              {filters.status && (
                <Badge variant="secondary" className="gap-1 h-6">
                  {filters.status}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, status: null }))} />
                </Badge>
              )}
              {filters.priority && (
                <Badge variant="secondary" className="gap-1 h-6">
                  {filters.priority}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, priority: null }))} />
                </Badge>
              )}
              {filters.type && (
                <Badge variant="secondary" className="gap-1 h-6">
                  {filters.type}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, type: null }))} />
                </Badge>
              )}
            </div>
          )}
          
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">{totalCount} cases</span>
          <Button
            size="sm"
            className="bg-accent-primary text-white hover:bg-accent-primary/90"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Case
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border-default bg-surface-2 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-3 border-b border-border-default">
            <tr>
              <th className="w-10 px-3 py-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-3 py-2 text-left text-text-secondary font-medium">Title</th>
              <th className="px-3 py-2 text-left text-text-secondary font-medium w-24">Status</th>
              <th className="px-3 py-2 text-left text-text-secondary font-medium w-24">Priority</th>
              <th className="px-3 py-2 text-left text-text-secondary font-medium w-24">Type</th>
              <th className="px-3 py-2 text-left text-text-secondary font-medium w-32">Component</th>
              <th className="px-3 py-2 text-left text-text-secondary font-medium w-28">Updated</th>
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-4" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-5 w-16" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-5 w-16" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-6 w-6" /></td>
                </tr>
              ))
            ) : paginatedCases.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-text-tertiary">
                  <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No test cases found</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setCreateModalOpen(true)}
                    className="mt-2"
                  >
                    Create your first test case
                  </Button>
                </td>
              </tr>
            ) : (
              paginatedCases.map((tc: any) => (
                <tr
                  key={tc.id}
                  className="hover:bg-surface-3 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(tc.id)}
                      onCheckedChange={() => toggleSelect(tc.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-text-primary font-medium">{tc.title}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={cn('text-xs', getStatusColor(tc.status))}>
                      {tc.status || 'draft'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={cn('text-xs', getPriorityColor(tc.priority))}>
                      {tc.priority || 'medium'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {tc.test_type || 'manual'}
                  </td>
                  <td className="px-3 py-2 text-text-secondary truncate max-w-[120px]">
                    {tc.component || '—'}
                  </td>
                  <td className="px-3 py-2 text-text-tertiary text-xs">
                    {tc.updated_at ? format(new Date(tc.updated_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-surface-1 border-border-default">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Add to Set</DropdownMenuItem>
                        <DropdownMenuItem>Add to Cycle</DropdownMenuItem>
                        <DropdownMenuItem className="text-status-error">Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-tertiary">
            Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm text-text-secondary">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateTestCaseModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        projectId={scopeType === 'project' ? scopeId || '' : ''}
        programId={scopeType === 'program' ? scopeId || '' : ''}
        onSubmit={async () => {
          setCreateModalOpen(false);
          refetch();
        }}
        isSubmitting={false}
      />
    </div>
  );
}

export default GlobalTestsCasesPage;
