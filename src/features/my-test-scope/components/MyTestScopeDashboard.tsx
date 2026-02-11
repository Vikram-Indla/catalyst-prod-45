/**
 * My Test Scope Dashboard
 * Main dashboard component with all tabs and features
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useMyTestScope } from '../hooks/useMyTestScope';
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
  const { data, isLoading, error } = useMyTestScope();
  const quickExecute = useQuickExecute();
  const [activeTab, setActiveTab] = useState<TestScopeTab>('tests');
  const [filters, setFilters] = useState<TestScopeFilters>({
    status: [],
    priority: [],
    urgency: [],
    search: '',
    groupBy: 'none',
    sortBy: 'score',
    sortOrder: 'desc',
  });

  const handleExport = useCallback(() => {
    console.log('Export clicked');
  }, []);

  const handleExecuteAll = useCallback(() => {
    console.log('Execute all clicked');
  }, []);

  const handleStartTest = useCallback((scopeId: string) => {
    const test = data?.tests.find(t => t.scopeId === scopeId);
    if (test) {
      navigate(`/releases/execute/${test.cycleId}/${test.id}`);
    }
  }, [navigate, data?.tests]);

  const handleSkipRecommendation = useCallback(() => {
    console.log('Skip recommendation');
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

  return (
    <div className="flex flex-col h-full bg-background">
      <ScopeHeader
        userName={userName}
        summary={data.summary}
        onExport={handleExport}
        onExecuteAll={handleExecuteAll}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-6 py-4 border-b border-border">
        <ProgressGauge summary={data.summary} />
        <div className="lg:col-span-2">
          <AIStartMyDay
            recommendation={data.aiRecommendation}
            onStartTest={handleStartTest}
            onSkip={handleSkipRecommendation}
          />
        </div>
      </div>

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
            <ScopeFilterBar filters={filters} onFiltersChange={setFilters} />
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
