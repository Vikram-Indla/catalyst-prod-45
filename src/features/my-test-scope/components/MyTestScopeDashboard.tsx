/**
 * My Test Scope Dashboard
 * Main dashboard component with all tabs and features
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
// No @atlaskit/icon equivalent — inline SVG
const PartyPopperIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M5.8 11.3 2 22l10.7-3.79" /><path d="M4 3h.01" /><path d="M22 8h.01" /><path d="M15 2h.01" /><path d="M22 20h.01" /><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" /><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" /><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" /><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
  </svg>
);
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useMyTestScope, myTestScopeKeys } from '../hooks/useMyTestScope';
import { useQuickExecute } from '../hooks/useQuickExecute';
import { ScopeHeader } from './ScopeHeader';
import { ProgressGauge } from './ProgressGauge';
import { AIStartMyDay } from './AIStartMyDay';
import { AttentionCards } from './AttentionCards';
import { ScopeTabs } from './ScopeTabs';
import { ScopeFilterBar } from './ScopeFilterBar';
import { TestsTable } from './TestsTable';
import { DefectsPanel } from './DefectsPanel';
import { IncidentsPanel } from './IncidentsPanel';
import { TraceabilityPanel } from './TraceabilityPanel';
import { WorkloadPanel } from './WorkloadPanel';
import type { TestScopeTab, TestScopeFilters } from '../types';

interface MyTestScopeDashboardProps {
  userName?: string;
}

export function MyTestScopeDashboard({ userName = 'Tester' }: MyTestScopeDashboardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useMyTestScope();
  const quickExecute = useQuickExecute();
  const [activeTab, setActiveTab] = useState<TestScopeTab>('tests');
  const [filters, setFilters] = useState<TestScopeFilters>({
    status: [],
    priority: [],
    urgency: [],
    cycleId: 'all',
    releaseId: 'all',
    search: '',
    groupBy: 'none',
    sortBy: 'score',
    sortOrder: 'desc',
  });

  // Real-time subscription for assignment changes
  useEffect(() => {
    const channel = supabase
      .channel(`my-scope-realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tm_cycle_scope' },
        () => {
          queryClient.invalidateQueries({ queryKey: myTestScopeKeys.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const uniqueCycles = useMemo(() => {
    if (!data?.tests) return [];
    const seen = new Map<string, string>();
    data.tests.forEach(t => {
      if (t.cycleId && !seen.has(t.cycleId)) {
        seen.set(t.cycleId, t.cycleName);
      }
    });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [data?.tests]);

  const uniqueReleases = useMemo(() => {
    if (!data?.tests) return [];
    const seen = new Map<string, string>();
    data.tests.forEach(t => {
      if (t.releaseId && !seen.has(t.releaseId)) {
        seen.set(t.releaseId, t.releaseName || t.releaseVersion || 'Unknown Release');
      }
    });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [data?.tests]);

  const handleExport = useCallback(() => {
    if (!data?.tests || data.tests.length === 0) return;
    const headers = ['Key', 'Title', 'Priority', 'Status', 'Cycle', 'Due Date', 'Est. Minutes'];
    const rows = data.tests.map(t => [
      t.key, t.title, t.priority, t.status, t.cycleName,
      t.dueDate || 'N/A', String(t.estimatedMinutes),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-scope-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data?.tests]);

  const handleExecuteAll = useCallback(() => {
    if (!data?.tests) return;
    const firstNotRun = data.tests.find(t => t.status === 'not_run');
    if (firstNotRun) {
      navigate(`/releases/execute/${firstNotRun.cycleId}/${firstNotRun.id}`);
    }
  }, [navigate, data?.tests]);

  const handleStartTest = useCallback((scopeId: string) => {
    const test = data?.tests.find(t => t.scopeId === scopeId);
    if (test) {
      navigate(`/releases/execute/${test.cycleId}/${test.id}`);
    }
  }, [navigate, data?.tests]);

  const handleSkipRecommendation = useCallback(() => {
    // Skip to next recommended test - no-op for now
  }, []);

  const handleAttentionCardClick = useCallback((type: 'overdue' | 'today' | 'defects' | 'incidents') => {
    switch (type) {
      case 'overdue':
        setFilters(prev => ({ ...prev, urgency: ['overdue'] }));
        setActiveTab('tests');
        break;
      case 'today':
        setFilters(prev => ({ ...prev, urgency: ['due_today'] }));
        setActiveTab('tests');
        break;
      case 'defects':
        setActiveTab('defects');
        break;
      case 'incidents':
        setActiveTab('incidents');
        break;
    }
  }, []);

  const handleViewTestDetails = useCallback((testId: string) => {
    navigate(`/releases/test-cases/${testId}`);
  }, [navigate]);

  const handleQuickPass = useCallback((scopeId: string) => {
    quickExecute.mutate({ cycleTestCaseId: scopeId, action: 'passed' });
  }, [quickExecute]);

  const handleQuickFail = useCallback((scopeId: string, reason: string) => {
    quickExecute.mutate({ cycleTestCaseId: scopeId, action: 'failed', reason });
  }, [quickExecute]);

  const handleQuickBlock = useCallback((scopeId: string, reason: string) => {
    quickExecute.mutate({ cycleTestCaseId: scopeId, action: 'blocked', reason });
  }, [quickExecute]);

  const handleUnblock = useCallback((scopeId: string) => {
    quickExecute.mutate({ cycleTestCaseId: scopeId, action: 'not_run' });
  }, [quickExecute]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="medium" label="Loading" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96 text-center">
        <div>
          <p className="text-lg font-medium text-foreground">Failed to load test scope</p>
          <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const allComplete = data.summary.totalTests > 0 && data.summary.notRunTests === 0 && data.summary.failedTests === 0 && data.summary.blockedTests === 0;

  return (
    <div className="flex flex-col h-full bg-muted/50 font-['Inter']">
      <ScopeHeader
        userName={userName}
        summary={data.summary}
        onExport={handleExport}
        onExecuteAll={handleExecuteAll}
      />

      <div className="grid grid-cols-[1fr_2fr] gap-3 px-6 py-3 border-b border-border shrink-0">
        <ProgressGauge summary={data.summary} />
        <div>
          <AIStartMyDay
            recommendation={data.aiRecommendation}
            onStartTest={handleStartTest}
            onSkip={handleSkipRecommendation}
          />
        </div>
      </div>

      {allComplete && (
        <div className="flex items-center gap-3 px-6 py-3 bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-800">
          <PartyPopperIcon size={20} className="text-green-600" />
          <div>
            <p className="font-semibold text-green-600 text-sm m-0">All tests complete!</p>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Great job, {userName}! All {data.summary.totalTests} tests have been executed successfully.
            </p>
          </div>
        </div>
      )}

      <AttentionCards summary={data.summary} onCardClick={handleAttentionCardClick} />

      <ScopeTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          tests: data.tests.length,
          defects: data.defects.length,
          incidents: data.incidents.length,
        }}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'tests' && (
          <>
            <ScopeFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              cycles={uniqueCycles}
              releases={uniqueReleases}
            />
            <div className="flex-1 overflow-auto">
              <TestsTable
                tests={data.tests}
                filters={filters}
                onFiltersChange={setFilters}
                onExecute={handleStartTest}
                onViewDetails={handleViewTestDetails}
                onQuickPass={handleQuickPass}
                onQuickFail={handleQuickFail}
                onQuickBlock={handleQuickBlock}
                onUnblock={handleUnblock}
              />
            </div>
          </>
        )}

        {activeTab === 'defects' && (
          <div className="flex-1 overflow-auto px-6 py-4">
            <DefectsPanel defects={data.defects} />
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="flex-1 overflow-auto px-6 py-4">
            <IncidentsPanel incidents={data.incidents} />
          </div>
        )}

        {activeTab === 'traceability' && (
          <div className="flex-1 overflow-auto px-6 py-4">
            <TraceabilityPanel tests={data.tests} />
          </div>
        )}

        {activeTab === 'workload' && (
          <div className="flex-1 overflow-auto px-6 py-4">
            <WorkloadPanel workload={data.workload} />
          </div>
        )}
      </div>
    </div>
  );
}
