/**
 * Run Session Manager Dashboard
 * Main component for managing test execution runs
 */

import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RunProgressCard } from './RunProgressCard';
import { CreateRunDialog } from './CreateRunDialog';
import { useExecutionRuns } from '../hooks/useExecutionRuns';
import type { RunStatus, RunListFilters } from '../types/test-execution';

interface RunSessionManagerProps {
  projectId: string;
  onRunSelect?: (runId: string) => void;
}

const STATUS_TABS: { value: RunStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Runs' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_progress', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'aborted', label: 'Aborted' },
];

export const RunSessionManager: React.FC<RunSessionManagerProps> = ({
  projectId,
  onRunSelect,
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');

  // Build filters
  const filters: RunListFilters = useMemo(() => ({
    project_id: projectId,
    status: statusFilter !== 'all' ? [statusFilter] : undefined,
    environment: environmentFilter !== 'all' ? [environmentFilter as any] : undefined,
    search: searchQuery || undefined,
  }), [projectId, statusFilter, environmentFilter, searchQuery]);

  const { runs, isLoading, refetch } = useExecutionRuns(filters);

  // Group runs by status for display
  const groupedRuns = useMemo(() => {
    const groups: Record<RunStatus, typeof runs> = {
      draft: [],
      in_progress: [],
      paused: [],
      completed: [],
      aborted: [],
    };

    runs.forEach((run) => {
      if (groups[run.status]) {
        groups[run.status].push(run);
      }
    });

    return groups;
  }, [runs]);

  // Get counts for tabs
  const statusCounts = useMemo(() => ({
    all: runs.length,
    draft: groupedRuns.draft.length,
    in_progress: groupedRuns.in_progress.length,
    paused: groupedRuns.paused.length,
    completed: groupedRuns.completed.length,
    aborted: groupedRuns.aborted.length,
  }), [runs.length, groupedRuns]);

  const displayedRuns = statusFilter === 'all' ? runs : groupedRuns[statusFilter] || [];

  const handleRunCreated = (runId: string) => {
    onRunSelect?.(runId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Execution Runs</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage test execution sessions
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Run
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search runs by name or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Environment Filter */}
        <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            <SelectItem value="development">Development</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        {/* Refresh */}
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as RunStatus | 'all')}
      >
        <TabsList className="grid w-full grid-cols-6">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
              {tab.label}
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                {statusCounts[tab.value]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Runs List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : displayedRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">No execution runs found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Create your first execution run to get started'}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Run
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {displayedRuns.map((run) => (
              <RunProgressCard
                key={run.id}
                run={run}
                onClick={() => onRunSelect?.(run.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Run Dialog */}
      <CreateRunDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projectId={projectId}
        onSuccess={handleRunCreated}
      />
    </div>
  );
};
