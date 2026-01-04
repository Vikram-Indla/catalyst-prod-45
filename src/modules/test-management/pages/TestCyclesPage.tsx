/**
 * Test Cycles Page
 * Displays test cycles with grid/list view, filters, and management
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  RefreshCw, 
  Plus, 
  Search, 
  LayoutGrid,
  List,
  CalendarRange
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useTestCycles, useCreateTestCycle, useUpdateTestCycle, useDeleteTestCycle, useDuplicateCycle } from '../hooks/useCycles';
import { CycleCard, CycleRow, CreateCycleModal } from '../components/cycles';
import { useProjectStore } from '../stores/projectStore';
import type { TestCycle, CycleStatus } from '../api/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function TestCyclesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CycleStatus | 'all'>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<TestCycle | null>(null);
  const [deleteConfirmCycle, setDeleteConfirmCycle] = useState<TestCycle | null>(null);

  // Get project ID from store or search params
  const selectedProjectId = useProjectStore(s => s.selectedProjectId);
  const projectId = selectedProjectId || searchParams.get('projectId') || 'test-project-1';

  // Fetch cycles
  const { data: cyclesData, isLoading, refetch } = useTestCycles({
    project_id: projectId,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchQuery || undefined,
  });

  // Mutations
  const createCycle = useCreateTestCycle();
  const updateCycle = useUpdateTestCycle();
  const deleteCycle = useDeleteTestCycle();
  const duplicateCycle = useDuplicateCycle();

  const cycles = cyclesData?.data || [];

  // Client-side filtering for environment and date range
  const filteredCycles = useMemo(() => {
    let result = cycles;
    
    if (environmentFilter !== 'all') {
      result = result.filter(c => c.environment_id === environmentFilter);
    }
    
    if (dateRange.from) {
      result = result.filter(c => {
        if (!c.planned_start) return true;
        return new Date(c.planned_start) >= dateRange.from!;
      });
    }
    
    if (dateRange.to) {
      result = result.filter(c => {
        if (!c.planned_end) return true;
        return new Date(c.planned_end) <= dateRange.to!;
      });
    }
    
    return result;
  }, [cycles, environmentFilter, dateRange]);

  // Get unique environments for filter
  const environments = useMemo(() => {
    const envMap = new Map<string, { id: string; name: string }>();
    cycles.forEach(c => {
      if (c.environment) {
        envMap.set(c.environment.id, c.environment);
      }
    });
    return Array.from(envMap.values());
  }, [cycles]);

  // Summary stats
  const stats = useMemo(() => ({
    total: cycles.length,
    inProgress: cycles.filter(c => c.status === 'active').length,
    completed: cycles.filter(c => c.status === 'completed').length,
    avgPassRate: cycles.length > 0 
      ? Math.round(
          cycles.reduce((acc, c) => {
            const stats = c.statistics;
            if (!stats || stats.total_cases === 0) return acc;
            const executed = stats.total_cases - stats.not_run_count;
            return acc + (executed > 0 ? (stats.passed_count / executed) * 100 : 0);
          }, 0) / cycles.filter(c => c.statistics?.total_cases).length
        ) || 0
      : 0,
  }), [cycles]);

  // Handlers
  const handleCreate = async (data: any) => {
    try {
      await createCycle.mutateAsync({
        ...data,
        project_id: projectId,
        case_ids: [], // Will add cases after creation
      });
      setCreateModalOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEdit = (cycle: TestCycle) => {
    setEditingCycle(cycle);
    setCreateModalOpen(true);
  };

  const handleUpdate = async (data: any) => {
    if (!editingCycle) return;
    try {
      await updateCycle.mutateAsync({
        id: editingCycle.id,
        ...data,
      });
      setEditingCycle(null);
      setCreateModalOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClone = async (cycle: TestCycle) => {
    try {
      await duplicateCycle.mutateAsync({ 
        id: cycle.id, 
        newTitle: `${cycle.title} (Copy)` 
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmCycle) return;
    try {
      await deleteCycle.mutateAsync(deleteConfirmCycle.id);
      setDeleteConfirmCycle(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
    setEditingCycle(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Test Cycles</h1>
          <p className="text-sm text-muted-foreground">
            Manage test execution cycles and track progress
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Cycle
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPassRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cycles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select 
          value={statusFilter} 
          onValueChange={(v) => setStatusFilter(v as CycleStatus | 'all')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="active">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            {environments.map((env) => (
              <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn(
              "gap-2",
              (dateRange.from || dateRange.to) && "border-primary text-primary"
            )}>
              <CalendarRange className="h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                ) : (
                  format(dateRange.from, 'MMM d, yyyy')
                )
              ) : (
                'Date Range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
              initialFocus
            />
            {(dateRange.from || dateRange.to) && (
              <div className="border-t p-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setDateRange({})}
                >
                  Clear dates
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        <div className="flex-1" />
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')}
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full mb-4" />
                <div className="flex gap-4">
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-8 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No test cycles yet</h3>
          <p className="text-muted-foreground mb-4">
            Create a cycle to start organizing your test execution
          </p>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Cycle
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCycles.map((cycle) => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              onEdit={handleEdit}
              onClone={handleClone}
              onDelete={setDeleteConfirmCycle}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-40">Progress</TableHead>
                <TableHead className="w-16">Passed</TableHead>
                <TableHead className="w-16">Failed</TableHead>
                <TableHead className="w-16">Blocked</TableHead>
                <TableHead className="w-24">Due Date</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCycles.map((cycle) => (
                <CycleRow
                  key={cycle.id}
                  cycle={cycle}
                  onEdit={handleEdit}
                  onClone={handleClone}
                  onDelete={setDeleteConfirmCycle}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreateCycleModal
        open={createModalOpen}
        onOpenChange={handleCloseModal}
        cycle={editingCycle}
        environments={environments as any}
        onSubmit={editingCycle ? handleUpdate : handleCreate}
        isLoading={createCycle.isPending || updateCycle.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deleteConfirmCycle} 
        onOpenChange={(open) => !open && setDeleteConfirmCycle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Cycle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmCycle?.title}"? 
              This will remove all execution history and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
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

export default TestCyclesPage;
