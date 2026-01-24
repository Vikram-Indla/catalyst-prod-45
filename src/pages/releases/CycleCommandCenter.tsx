/**
 * Cycle Command Center - Test Cycle Operations Hub
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Gauge, Columns, Table, Calendar, BarChart3,
  Download, RefreshCw, Pause, CheckCircle, ArrowLeft, Plus,
  FileText, FileSpreadsheet, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportTestCycles } from '@/utils/exportTestCycles';

// Command Center Components
import { CycleHeader } from '@/components/releases/cycle-command-center/CycleHeader';
import { CycleTabNavigation } from '@/components/releases/cycle-command-center/CycleTabNavigation';
import { CommandCenterView } from '@/components/releases/cycle-command-center/CommandCenterView';
import { CycleKanbanView } from '@/components/releases/cycle-command-center/CycleKanbanView';
import { CycleTableView } from '@/components/releases/cycle-command-center/CycleTableView';
import { CycleCalendarView } from '@/components/releases/cycle-command-center/CycleCalendarView';
import { CycleReportsView } from '@/components/releases/cycle-command-center/CycleReportsView';
import { AddTestsSlideOver } from '@/components/releases/add-tests';

// Hooks
import { useCycleDetails } from '@/hooks/test-cycles/useCycleDetails';
import { useCycleTestCases } from '@/hooks/test-cycles/useCycleTestCases';
import { useCycleMutations } from '@/hooks/test-cycles/useCycleMutations';

export type CycleViewTab = 'command' | 'kanban' | 'table' | 'calendar' | 'reports';

const TABS = [
  { id: 'command' as const, label: 'Command Center', icon: Gauge },
  { id: 'kanban' as const, label: 'Kanban', icon: Columns },
  { id: 'table' as const, label: 'Table', icon: Table },
  { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
  { id: 'reports' as const, label: 'Reports', icon: BarChart3 },
];

export default function CycleCommandCenter() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CycleViewTab>('command');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isAddTestsOpen, setIsAddTestsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Real Supabase hooks
  const { cycle, stats, isLoading, error, refetch } = useCycleDetails(cycleId || '');
  const { testCases, isLoading: testCasesLoading } = useCycleTestCases(cycleId || '', { status: statusFilter });
  const { pauseCycle, resumeCycle, completeCycle, isPausing, isCompleting } = useCycleMutations(cycleId || '', {
    onSuccess: refetch,
  });

  const handlePauseCycle = () => {
    if (cycle?.status) pauseCycle.mutate(cycle.status as any);
  };

  const handleResumeCycle = () => {
    if (cycle?.status) resumeCycle.mutate(cycle.status as any);
  };

  const handleCompleteCycle = () => {
    if (cycle?.status) completeCycle.mutate(cycle.status as any);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!cycle) return;
    setIsExporting(true);
    try {
      await exportTestCycles([{
        id: cycle.id,
        name: cycle.name,
        status: cycle.status,
        progress: stats?.inProgress || 0,
        passed: stats?.passed || 0,
        failed: stats?.failed || 0,
        blocked: stats?.blocked || 0,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        environment: cycle.environment,
      }], format);
      toast.success(`Exported cycle data as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="p-4 rounded-full bg-red-50 mb-4">
          <BarChart3 className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load cycle</h3>
        <p className="text-sm text-muted-foreground mb-4">
          We couldn't load the cycle details. Please try again.
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Context Bar */}
      <div 
        className="flex items-center justify-between px-6 bg-muted/30 border-b"
        style={{ height: '44px' }}
      >
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2"
            onClick={() => navigate('/releases/test-cycles')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              TEST CYCLES
            </span>
            <span className="text-muted-foreground mx-2">/</span>
            <span className="text-sm font-semibold text-foreground">
              {isLoading ? <Skeleton className="h-4 w-32" /> : cycle?.name || 'Cycle Details'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => setIsAddTestsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tests
          </Button>
          {(cycle?.status === 'in_progress') && (
            <>
              <Button variant="outline" size="sm" onClick={handlePauseCycle} disabled={isPausing}>
                <Pause className="h-4 w-4 mr-2" />
                {isPausing ? 'Pausing...' : 'Pause'}
              </Button>
              <Button size="sm" onClick={handleCompleteCycle} disabled={isCompleting}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {isCompleting ? 'Completing...' : 'Complete'}
              </Button>
            </>
          )}
          {cycle?.status === 'paused' && (
            <Button size="sm" onClick={handleResumeCycle}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
        </div>
      </div>

      {/* Cycle Header with Progress Ring */}
      <CycleHeader cycle={cycle} stats={stats} isLoading={isLoading} />

      {/* Tab Navigation */}
      <CycleTabNavigation 
        tabs={TABS} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Content Area */}
      <div className="p-6">
        {activeTab === 'command' && (
          <CommandCenterView 
            cycle={cycle}
            stats={stats}
            isLoading={isLoading}
            onStatusFilter={handleStatusFilter}
          />
        )}
        
        {activeTab === 'kanban' && (
          <CycleKanbanView 
            cycleId={cycleId || ''}
            testCases={testCases}
            isLoading={testCasesLoading}
          />
        )}
        
        {activeTab === 'table' && (
          <CycleTableView 
            cycleId={cycleId || ''}
            testCases={testCases}
            isLoading={testCasesLoading}
            statusFilter={statusFilter}
            onStatusFilter={handleStatusFilter}
          />
        )}
        
        {activeTab === 'calendar' && (
          <CycleCalendarView 
            cycle={cycle}
            testCases={testCases}
            isLoading={isLoading || testCasesLoading}
          />
        )}
        
        {activeTab === 'reports' && (
          <CycleReportsView 
            cycleId={cycleId || ''}
            cycle={cycle}
            stats={stats}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Add Tests Slide-over */}
      <AddTestsSlideOver
        cycleId={cycleId || ''}
        cycleName={cycle?.name || 'Test Cycle'}
        cycleEndDate={cycle?.endDate}
        projectId={cycle?.projectId}
        isOpen={isAddTestsOpen}
        onClose={() => setIsAddTestsOpen(false)}
        onSuccess={(count) => {
          toast.success(`Added ${count} tests to cycle`);
          refetch();
        }}
      />
    </div>
  );
}
