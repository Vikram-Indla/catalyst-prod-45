/**
 * GLOBAL TESTS CYCLES PAGE
 * Test cycle management with scope filtering
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  RefreshCcw,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  Play,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGlobalTestCycles } from '../hooks/useGlobalTestMetrics';
import { ScopeType } from '../hooks/useGlobalTestScope';
import { CreateCycleModal } from '../components/CreateCycleModal';

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
    case 'in_progress': return 'text-status-success bg-status-success/10 border-status-success/20';
    case 'planned': return 'text-accent-primary bg-accent-subtle border-accent-primary/20';
    case 'completed': return 'text-text-tertiary bg-surface-3 border-border-default';
    case 'cancelled': return 'text-status-error bg-status-error/10 border-status-error/20';
    default: return 'text-text-tertiary bg-surface-3 border-border-default';
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GlobalTestsCyclesPage() {
  const [searchParams] = useSearchParams();
  const scopeType = (searchParams.get('scopeType') as ScopeType) || 'global';
  const scopeId = searchParams.get('scopeId');

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Data
  const { data: cycles, isLoading, error, refetch } = useGlobalTestCycles(scopeType, scopeId);

  // Process cycles with execution stats
  const processedCycles = useMemo(() => {
    let result = (cycles || []).map((cycle: any) => {
      const execs = cycle.test_cycle_executions || [];
      const total = execs.length;
      const passed = execs.filter((e: any) => e.status === 'passed').length;
      const failed = execs.filter((e: any) => e.status === 'failed').length;
      const blocked = execs.filter((e: any) => e.status === 'blocked').length;
      const notRun = total - passed - failed - blocked;
      const progress = total > 0 ? Math.round(((passed + failed + blocked) / total) * 100) : 0;
      return { ...cycle, total, passed, failed, blocked, notRun, progress };
    });
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.key?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [cycles, searchQuery]);

  const buildUrl = (cycleId: string) => {
    const params = new URLSearchParams();
    params.set('scopeType', scopeType);
    if (scopeId) params.set('scopeId', scopeId);
    params.set('cycleId', cycleId);
    return `/tests/executions?${params.toString()}`;
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load test cycles: {(error as Error).message}
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
              placeholder="Search cycles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default h-9"
            />
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">{processedCycles.length} cycles</span>
          <Button
            size="sm"
            className="bg-accent-primary text-white hover:bg-accent-primary/90"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Cycle
          </Button>
        </div>
      </div>

      {/* Cycles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-surface-2 border-border-default">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48 mb-4" />
                <Skeleton className="h-2 w-full mb-3" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : processedCycles.length === 0 ? (
        <div className="text-center py-16 text-text-tertiary">
          <RefreshCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No test cycles found</h3>
          <p className="text-sm mb-4">Create your first test cycle to start organizing test executions</p>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Cycle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedCycles.map((cycle: any) => (
            <Card 
              key={cycle.id} 
              className="bg-surface-2 border-border-default hover:border-accent-primary/30 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{cycle.key}</Badge>
                      <Badge variant="outline" className={cn('text-xs', getStatusColor(cycle.status))}>
                        {cycle.status}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-text-primary truncate">{cycle.name}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surface-1 border-border-default">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Add Cases</DropdownMenuItem>
                      <DropdownMenuItem>Clone</DropdownMenuItem>
                      <DropdownMenuItem className="text-status-error">Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {cycle.description && (
                  <p className="text-sm text-text-tertiary mb-3 line-clamp-2">
                    {cycle.description}
                  </p>
                )}

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-tertiary">Progress</span>
                    <span className="text-text-primary font-medium">{cycle.progress}%</span>
                  </div>
                  <Progress value={cycle.progress} className="h-1.5" />
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
                  <div>
                    <p className="text-status-success font-medium">{cycle.passed}</p>
                    <p className="text-text-quaternary">Pass</p>
                  </div>
                  <div>
                    <p className="text-status-error font-medium">{cycle.failed}</p>
                    <p className="text-text-quaternary">Fail</p>
                  </div>
                  <div>
                    <p className="text-status-warning font-medium">{cycle.blocked}</p>
                    <p className="text-text-quaternary">Block</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary font-medium">{cycle.notRun}</p>
                    <p className="text-text-quaternary">Pend</p>
                  </div>
                </div>

                {(cycle.start_date || cycle.end_date) && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary mb-3">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {cycle.start_date && format(new Date(cycle.start_date), 'MMM d')}
                      {cycle.start_date && cycle.end_date && ' - '}
                      {cycle.end_date && format(new Date(cycle.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Link
                    to={buildUrl(cycle.id)}
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Play className="h-3 w-3" />
                      Execute
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateCycleModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        projectId={scopeType === 'project' ? scopeId || undefined : undefined}
      />
    </div>
  );
}

export default GlobalTestsCyclesPage;
