/**
 * Module 4C-5: Enhanced Execution Hub Page
 * Integrated dashboard for run management, assignments, live execution, and analytics
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Bug,
  Settings,
  Plus,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExecutionRuns } from '../hooks/useExecutionRuns';
import { useDefaultProject } from '@/hooks/useProjects';

// Module 4C imports - using relative paths from pages folder
import { RunAssignmentsPanel } from '../components/assignments/RunAssignmentsPanel';
import { LiveSessionDashboard } from '../components/live/LiveSessionDashboard';
import { RunAnalyticsDashboard } from '../components/analytics';
import { ProgressDashboard } from '../components/dashboard/ProgressDashboard';
import { useRunDefects } from '../hooks/useRunDefects';
import { RunDefectsSummaryCard, RunDefectsList } from '../components/defects';

// Defects tab wrapper component
function DefectsTabContent({ runId }: { runId: string }) {
  const { defects, summary, isLoading } = useRunDefects(runId);
  return (
    <div className="space-y-6">
      <RunDefectsSummaryCard summary={summary} isLoading={isLoading} />
      <RunDefectsList defects={defects} isLoading={isLoading} />
    </div>
  );
}

interface ExecutionHubPageProps {
  cycleId?: string;
  runId?: string;
}

export function ExecutionHubPage({ cycleId: propCycleId, runId: propRunId }: ExecutionHubPageProps) {
  const params = useParams<{ cycleId?: string; runId?: string }>();
  const navigate = useNavigate();
  
  const cycleId = propCycleId || params.cycleId;
  const [selectedRunId, setSelectedRunId] = useState<string | null>(propRunId || params.runId || null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const { data: project } = useDefaultProject();
  const { runs, isLoading: runsLoading } = useExecutionRuns({ project_id: project?.id || undefined });

  // Filter runs by cycle if cycleId is provided
  const filteredRuns = cycleId 
    ? runs.filter(r => (r as any).cycle_id === cycleId)
    : runs;

  const selectedRun = filteredRuns.find(r => r.id === selectedRunId);

  const handleRunSelect = (runId: string) => {
    setSelectedRunId(runId);
  };

  const handleStartExecution = () => {
    if (selectedRunId) {
      navigate(`/releases/execute/${cycleId || 'run'}/${selectedRunId}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          {cycleId && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-foreground">Execution Hub</h1>
            <p className="text-sm text-muted-foreground">
              {selectedRun ? `Run #${selectedRun.run_number}: ${selectedRun.name}` : 'Select a run to begin'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedRunId && (
            <Button onClick={handleStartExecution} className="gap-2">
              <Play className="h-4 w-4" />
              Start Execution
            </Button>
          )}
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Run Selector Sidebar */}
        <div className="w-64 border-r bg-muted/30 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">Test Runs</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {runsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No runs available
              </p>
            ) : (
              <div className="space-y-2">
                {filteredRuns.map(run => (
                  <button
                    key={run.id}
                    onClick={() => handleRunSelect(run.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      selectedRunId === run.id
                        ? "bg-primary/10 border-primary"
                        : "bg-card border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        Run #{run.run_number}
                      </span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        run.status === 'in_progress' && "bg-primary/20 text-primary",
                        run.status === 'completed' && "bg-success/20 text-success",
                        run.status === 'draft' && "bg-muted text-muted-foreground"
                      )}>
                        {run.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {run.name}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {!selectedRunId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <LayoutDashboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-medium text-foreground mb-2">Select a Test Run</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a run from the sidebar to view details and manage execution
                </p>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b px-6">
                <TabsList className="h-12 bg-transparent">
                  <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-muted">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="assignments" className="gap-2 data-[state=active]:bg-muted">
                    <Users className="h-4 w-4" />
                    Assignments
                  </TabsTrigger>
                  <TabsTrigger value="live" className="gap-2 data-[state=active]:bg-muted">
                    <Play className="h-4 w-4" />
                    Live Session
                  </TabsTrigger>
                  <TabsTrigger value="defects" className="gap-2 data-[state=active]:bg-muted">
                    <Bug className="h-4 w-4" />
                    Defects
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-muted">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <TabsContent value="dashboard" className="m-0 h-full">
                  <ProgressDashboard runId={selectedRunId} />
                </TabsContent>

                <TabsContent value="assignments" className="m-0 h-full">
                  <RunAssignmentsPanel 
                    runId={selectedRunId} 
                    projectId={project?.id || ''} 
                    runStatus={selectedRun?.status || 'draft'}
                  />
                </TabsContent>

                <TabsContent value="live" className="m-0 h-full">
                  <LiveSessionDashboard 
                    runId={selectedRunId} 
                    runName={selectedRun?.name || `Run #${selectedRun?.run_number || ''}`}
                  />
                </TabsContent>

                <TabsContent value="defects" className="m-0 h-full">
                  <DefectsTabContent runId={selectedRunId} />
                </TabsContent>

                <TabsContent value="analytics" className="m-0 h-full">
                  <RunAnalyticsDashboard runId={selectedRunId} />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExecutionHubPage;
