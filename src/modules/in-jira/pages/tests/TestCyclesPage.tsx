/**
 * Test Cycles Page - Execution Orchestration Hub
 */

import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, PlayCircle, Calendar, Lock, Unlock, Users, BarChart3, Archive, Settings, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTestCycles, TestCycleWithStats } from '../../hooks/useTestCycles';
import { useCycleExecutions, ExecutionStatus } from '../../hooks/useCycleExecutions';
import { CreateTestCycleModal } from '../../components/tests/CreateTestCycleModal';
import { CycleExecutionBoard } from '../../components/tests/CycleExecutionBoard';

export function TestCyclesPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const programId = searchParams.get('programId');
  const cycleId = searchParams.get('cycleId');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedExecutions, setSelectedExecutions] = useState<Set<string>>(new Set());
  const [detailTab, setDetailTab] = useState('board');

  const { testCycles, isLoading: loadingCycles, canCreate, canDelete, createTestCycle, archiveTestCycle, isCreating } = useTestCycles(programId);
  const { cycle, executionsByStatus, workloadByUser, isLoading: loadingExecutions, canEdit: canEditExec, isTeamLead, isScopeLocked, updateStatus, assignExecution, bulkAssign, toggleLock, isUpdating } = useCycleExecutions(cycleId, programId);

  const filteredCycles = useMemo(() => testCycles.filter(c => (!searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())) && (statusFilter === 'all' || c.status === statusFilter)), [testCycles, searchQuery, statusFilter]);

  const openCycle = (c: TestCycleWithStats) => { setSearchParams({ programId: programId || '', cycleId: c.id }); };
  const closeCycle = () => { setSearchParams({ programId: programId || '' }); setSelectedExecutions(new Set()); };
  const getProgressPercent = (c: TestCycleWithStats) => c.total_cases === 0 ? 0 : Math.round(((c.passed + c.failed + c.blocked) / c.total_cases) * 100);

  // Detail View
  if (cycleId) {
    return (
      <div className="h-full flex flex-col bg-surface-1">
        <div className="px-6 py-4 border-b border-border-default">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={closeCycle}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
            <span className="text-sm text-text-tertiary">{projectKey} / Tests / Cycles</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-text-primary">{cycle?.name || 'Loading...'}</h1>
              {cycle && <Badge variant="outline">{cycle.key}</Badge>}
              {isScopeLocked && <Badge variant="secondary" className="text-status-warning"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
            </div>
            {isTeamLead && <Button variant="outline" size="sm" onClick={() => toggleLock(!isScopeLocked)} disabled={isUpdating}>{isScopeLocked ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}{isScopeLocked ? 'Unlock' : 'Lock'} Scope</Button>}
          </div>
        </div>
        <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b border-border-default"><TabsList><TabsTrigger value="board"><BarChart3 className="h-3.5 w-3.5 mr-1" />Board</TabsTrigger><TabsTrigger value="workload"><Users className="h-3.5 w-3.5 mr-1" />Workload</TabsTrigger></TabsList></div>
          <TabsContent value="board" className="flex-1 overflow-hidden m-0 p-6">
            {loadingExecutions ? <Skeleton className="h-96 w-full" /> : <CycleExecutionBoard executionsByStatus={executionsByStatus} onStatusChange={(id, s) => updateStatus({ executionId: id, status: s })} onAssign={(id, u) => assignExecution({ executionId: id, userId: u })} selectedIds={selectedExecutions} onSelectionChange={setSelectedExecutions} canEdit={canEditExec} isScopeLocked={isScopeLocked} />}
          </TabsContent>
          <TabsContent value="workload" className="flex-1 overflow-auto m-0 p-6">
            {workloadByUser.length === 0 ? <div className="text-center py-12 text-text-tertiary"><Users className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No assignments</p></div> : workloadByUser.map(w => <Card key={w.userId} className="bg-surface-2 mb-3"><CardContent className="p-4 flex items-center justify-between"><div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback>{w.userName.slice(0,2).toUpperCase()}</AvatarFallback></Avatar><div><p className="font-medium">{w.userName}</p><p className="text-sm text-text-tertiary">{w.total} assigned</p></div></div><div className="flex gap-4 text-center"><div><p className="font-semibold text-status-success">{w.passed}</p><p className="text-xs text-text-quaternary">Passed</p></div><div><p className="font-semibold text-status-error">{w.failed}</p><p className="text-xs text-text-quaternary">Failed</p></div></div></CardContent></Card>)}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // List View
  return (
    <div className="h-full flex flex-col bg-surface-1">
      <div className="px-6 py-4 border-b border-border-default">
        <div className="flex items-center justify-between"><h1 className="text-xl font-semibold text-text-primary">Test Cycles</h1>{canCreate && <Button size="sm" onClick={() => setCreateModalOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Create Cycle</Button>}</div>
      </div>
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-3">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" /><Input placeholder="Search..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="planned">Planned</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {loadingCycles ? <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}</div> : filteredCycles.length === 0 ? <div className="text-center py-16"><PlayCircle className="h-12 w-12 mx-auto mb-3 text-text-quaternary" /><p className="text-text-secondary">No cycles</p>{canCreate && <Button className="mt-4" onClick={() => setCreateModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Cycle</Button>}</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCycles.map(c => (
              <Card key={c.id} className="bg-surface-2 hover:border-border-hover cursor-pointer" onClick={() => openCycle(c)}>
                <CardHeader className="pb-2"><div className="flex items-start justify-between"><div className="flex items-center gap-2"><PlayCircle className="h-5 w-5 text-accent-primary" /><CardTitle className="text-base">{c.name}</CardTitle></div><DropdownMenu><DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={e => { e.stopPropagation(); openCycle(c); }}>Open</DropdownMenuItem>{canDelete && <><DropdownMenuSeparator /><DropdownMenuItem className="text-status-error" onClick={e => { e.stopPropagation(); archiveTestCycle(c.id); }}><Archive className="h-4 w-4 mr-2" />Archive</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></div><div className="flex gap-2 mt-1"><Badge variant="outline" className="text-xs">{c.key}</Badge><Badge variant="secondary" className="text-xs">{c.status || 'planned'}</Badge>{c.scope_locked && <Lock className="h-3 w-3 text-status-warning" />}</div></CardHeader>
                <CardContent><Progress value={getProgressPercent(c)} className="h-1.5 mb-3" /><div className="grid grid-cols-4 gap-2 text-center"><div className="p-1.5 bg-surface-3 rounded"><p className="font-semibold">{c.total_cases}</p><p className="text-[10px] text-text-quaternary">Total</p></div><div className="p-1.5 bg-status-success/10 rounded"><p className="font-semibold text-status-success">{c.passed}</p><p className="text-[10px]">Pass</p></div><div className="p-1.5 bg-status-error/10 rounded"><p className="font-semibold text-status-error">{c.failed}</p><p className="text-[10px]">Fail</p></div><div className="p-1.5 bg-surface-3 rounded"><p className="font-semibold text-text-secondary">{c.not_run}</p><p className="text-[10px]">Not Run</p></div></div>{c.start_date && <p className="text-xs text-text-quaternary mt-3 flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(c.start_date), 'MMM d')} - {c.end_date && format(new Date(c.end_date), 'MMM d')}</p>}</CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <CreateTestCycleModal open={createModalOpen} onOpenChange={setCreateModalOpen} programId={programId || ''} onSubmit={async (i) => { await createTestCycle(i); }} isSubmitting={isCreating} />
    </div>
  );
}

export default TestCyclesPage;
