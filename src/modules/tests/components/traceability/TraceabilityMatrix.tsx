/**
 * Traceability Matrix Component
 * Full end-to-end traceability visualization with coverage gaps and risk highlighting
 */

import React, { useState, useMemo, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  GitBranch,
  Link2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Bug,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  FileText,
  Loader2,
  Download,
  RefreshCw,
  Eye,
  Lightbulb,
  Plus,
  FileCode2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  useTraceabilityMatrix,
  TraceabilityChain,
  CoverageGap,
} from '../../hooks/useTraceabilityMatrix';
import { TraceabilityDetailPanel } from './TraceabilityDetailPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface TraceabilityMatrixProps {
  programId: string | null;
  projectId?: string;
}

const RISK_COLORS = {
  critical: 'text-status-error bg-status-error/10 border-status-error/30',
  high: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200',
  medium: 'text-status-warning bg-status-warning/10 border-status-warning/30',
  low: 'text-status-success bg-status-success/10 border-status-success/30',
};

const GAP_SEVERITY_COLORS = {
  critical: 'text-status-error bg-status-error/10',
  high: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  medium: 'text-status-warning bg-status-warning/10',
  low: 'text-text-tertiary bg-surface-3',
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-status-error" />;
    case 'blocked':
      return <MinusCircle className="h-3.5 w-3.5 text-status-warning" />;
    case 'in_progress':
      return <Clock className="h-3.5 w-3.5 text-accent-primary" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-text-quaternary" />;
  }
}

function CoverageBar({ passRate, failRate, blockedRate }: {
  passRate: number;
  failRate: number;
  blockedRate: number;
}) {
  const notRunRate = 100 - passRate - failRate - blockedRate;

  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface-3">
      {passRate > 0 && (
        <div
          className="bg-status-success transition-all"
          style={{ width: `${passRate}%` }}
        />
      )}
      {failRate > 0 && (
        <div
          className="bg-status-error transition-all"
          style={{ width: `${failRate}%` }}
        />
      )}
      {blockedRate > 0 && (
        <div
          className="bg-status-warning transition-all"
          style={{ width: `${blockedRate}%` }}
        />
      )}
      {notRunRate > 0 && (
        <div
          className="bg-surface-4 transition-all"
          style={{ width: `${notRunRate}%` }}
        />
      )}
    </div>
  );
}

export function TraceabilityMatrix({ programId, projectId }: TraceabilityMatrixProps) {
  const { matrixData, isLoading, refetch } = useTraceabilityMatrix(programId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedChain, setSelectedChain] = useState<TraceabilityChain | null>(null);
  const [showGapsPanel, setShowGapsPanel] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Create test from gap dialog state
  const [createFromGapOpen, setCreateFromGapOpen] = useState(false);
  const [selectedGap, setSelectedGap] = useState<CoverageGap | null>(null);
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestDescription, setNewTestDescription] = useState('');
  
  // Create test case mutation
  const createTestCaseMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedGap || !newTestTitle.trim()) {
        throw new Error('Missing required fields');
      }
      
      const { data, error } = await supabase
        .from('test_cases')
        .insert({
          title: newTestTitle.trim(),
          description: newTestDescription.trim() || `Auto-generated test case from coverage gap for ${selectedGap.entityKey}`,
          program_id: programId,
          project_id: projectId || null,
          created_by: user.id,
          status: 'draft',
          priority: selectedGap.severity === 'critical' ? 'critical' : selectedGap.severity === 'high' ? 'high' : 'medium',
          test_type: 'manual',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Link to the requirement if the gap is for a requirement
      if (selectedGap.entityType === 'requirement') {
        await supabase.from('test_case_work_item_links').insert({
          case_id: data.id,
          work_item_id: selectedGap.entityId,
          work_item_type: 'story',
          link_type: 'validates',
        });
      }
      
      // Log activity
      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'test_case_created',
        entity_type: 'test_cases',
        entity_id: data.id,
        entity_title: data.title,
        program_id: programId,
        description: `Created test case from coverage gap: ${selectedGap.title}`,
      });
      
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Test case "${data.title}" created`);
      setCreateFromGapOpen(false);
      setSelectedGap(null);
      setNewTestTitle('');
      setNewTestDescription('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
  
  const handleCreateFromGap = (gap: CoverageGap) => {
    setSelectedGap(gap);
    setNewTestTitle(`Test for ${gap.entityKey}`);
    setNewTestDescription(`This test case validates the requirements for ${gap.entityKey}.\n\n${gap.description}`);
    setCreateFromGapOpen(true);
  };

  // Filter chains
  const filteredChains = useMemo(() => {
    if (!matrixData?.chains) return [];
    
    let chains = matrixData.chains;

    // Search filter
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      chains = chains.filter(c =>
        c.requirement.key.toLowerCase().includes(q) ||
        c.requirement.title.toLowerCase().includes(q) ||
        c.testCases.some(tc => tc.title.toLowerCase().includes(q))
      );
    }

    // Risk filter
    if (riskFilter) {
      chains = chains.filter(c => c.riskLevel === riskFilter);
    }

    return chains;
  }, [matrixData?.chains, deferredSearch, riskFilter]);

  // Sort by risk (highest first)
  const sortedChains = useMemo(() => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...filteredChains].sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
  }, [filteredChains]);

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-surface-1">
        <div className="px-6 py-4 border-b border-border-default">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const summary = matrixData?.summary;
  const gaps = matrixData?.gaps || [];

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-surface-1">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-default">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Traceability Matrix</h1>
              <p className="text-sm text-text-tertiary mt-0.5">
                End-to-end requirements coverage with forward & backward traceability
              </p>
            </div>
            <div className="flex items-center gap-2">
              {gaps.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGapsPanel(true)}
                  className="text-status-warning border-status-warning/50"
                >
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  {gaps.length} Coverage Gaps
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1.5" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="px-6 py-4 border-b border-border-default">
          <div className="grid grid-cols-6 gap-3">
            <Card className="bg-surface-2 border-border-default">
              <CardContent className="p-3">
                <div className="text-xs text-text-tertiary">Requirements</div>
                <div className="text-xl font-bold text-text-primary mt-1">
                  {summary?.totalRequirements || 0}
                </div>
                <div className="text-xs text-text-quaternary mt-1">
                  {summary?.coveragePercentage || 0}% covered
                </div>
              </CardContent>
            </Card>
            <Card className="bg-surface-2 border-border-default">
              <CardContent className="p-3">
                <div className="text-xs text-text-tertiary">Test Cases</div>
                <div className="text-xl font-bold text-text-primary mt-1">
                  {summary?.totalTestCases || 0}
                </div>
                <div className="text-xs text-text-quaternary mt-1">
                  {summary?.executedTestCases || 0} executed
                </div>
              </CardContent>
            </Card>
            <Card className="bg-surface-2 border-border-default">
              <CardContent className="p-3">
                <div className="text-xs text-status-success">Passed</div>
                <div className="text-xl font-bold text-status-success mt-1">
                  {summary?.passedTestCases || 0}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-surface-2 border-border-default">
              <CardContent className="p-3">
                <div className="text-xs text-status-error">Failed</div>
                <div className="text-xl font-bold text-status-error mt-1">
                  {summary?.failedTestCases || 0}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-surface-2 border-border-default">
              <CardContent className="p-3">
                <div className="text-xs text-text-tertiary">Defects</div>
                <div className="text-xl font-bold text-text-primary mt-1">
                  {summary?.totalDefects || 0}
                </div>
                <div className="text-xs text-status-error mt-1">
                  {summary?.openDefects || 0} open
                </div>
              </CardContent>
            </Card>
            <Card className="bg-surface-2 border-border-default">
              <CardContent className="p-3">
                <div className="text-xs text-text-tertiary">Risk Score</div>
                <div className={cn(
                  'text-xl font-bold mt-1',
                  summary?.avgRisk && summary.avgRisk >= 60 ? 'text-status-error' :
                  summary?.avgRisk && summary.avgRisk >= 40 ? 'text-status-warning' :
                  'text-status-success'
                )}>
                  {summary?.avgRisk || 0}
                </div>
                <div className="text-xs text-status-error mt-1">
                  {summary?.criticalRiskCount || 0} critical
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-border-default flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
            <Input
              placeholder="Search requirements or test cases..."
              className="pl-9 bg-surface-2 border-border-default"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">Risk:</span>
            {['critical', 'high', 'medium', 'low'].map(risk => (
              <Button
                key={risk}
                variant={riskFilter === risk ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-7 text-xs',
                  riskFilter !== risk && RISK_COLORS[risk as keyof typeof RISK_COLORS]
                )}
                onClick={() => setRiskFilter(riskFilter === risk ? null : risk)}
              >
                {risk.charAt(0).toUpperCase() + risk.slice(1)}
                <Badge variant="secondary" className="ml-1.5 h-4 text-[10px]">
                  {matrixData?.chains.filter(c => c.riskLevel === risk).length || 0}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Matrix Table */}
        <div className="flex-1 overflow-auto">
          {sortedChains.length === 0 ? (
            <div className="text-center py-16 text-text-tertiary">
              <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No requirements found</p>
              <p className="text-sm mt-1">Create stories and link test cases to see traceability</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-surface-1 z-10">
                <TableRow className="border-border-default hover:bg-transparent">
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-text-tertiary font-medium min-w-[200px]">
                    Requirement
                  </TableHead>
                  <TableHead className="text-text-tertiary font-medium text-center">
                    Test Cases
                  </TableHead>
                  <TableHead className="text-text-tertiary font-medium text-center">
                    Executions
                  </TableHead>
                  <TableHead className="text-text-tertiary font-medium min-w-[150px]">
                    Execution Status
                  </TableHead>
                  <TableHead className="text-text-tertiary font-medium text-center">
                    Defects
                  </TableHead>
                  <TableHead className="text-text-tertiary font-medium text-center">
                    Risk
                  </TableHead>
                  <TableHead className="text-text-tertiary font-medium w-20">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedChains.map((chain) => {
                  const isExpanded = expandedRows.has(chain.requirement.id);
                  
                  return (
                    <React.Fragment key={chain.requirement.id}>
                      <TableRow 
                        className={cn(
                          'border-border-default hover:bg-surface-hover cursor-pointer',
                          chain.riskLevel === 'critical' && 'bg-status-error/5',
                          chain.riskLevel === 'high' && 'bg-orange-50/50 dark:bg-orange-900/10'
                        )}
                        onClick={() => toggleRowExpand(chain.requirement.id)}
                      >
                        <TableCell className="w-8 px-2">
                          {chain.testCases.length > 0 ? (
                            isExpanded ? 
                              <ChevronDown className="h-4 w-4 text-text-quaternary" /> :
                              <ChevronRight className="h-4 w-4 text-text-quaternary" />
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-accent-primary shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs font-mono text-accent-primary block">
                                {chain.requirement.key}
                              </span>
                              <p className="text-sm text-text-primary truncate max-w-[250px]">
                                {chain.requirement.title}
                              </p>
                              {chain.requirement.parentKey && (
                                <span className="text-xs text-text-quaternary">
                                  {chain.requirement.parentKey}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link2 className="h-3.5 w-3.5 text-text-quaternary" />
                            <span className={cn(
                              'font-medium',
                              chain.coverage.testCount === 0 ? 'text-status-error' : 'text-text-primary'
                            )}>
                              {chain.coverage.testCount}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            'font-medium',
                            chain.coverage.executionCount === 0 && chain.coverage.testCount > 0 
                              ? 'text-status-warning' 
                              : 'text-text-primary'
                          )}>
                            {chain.coverage.executionCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          {chain.coverage.executionCount > 0 ? (
                            <div className="space-y-1">
                              <CoverageBar
                                passRate={chain.coverage.passRate}
                                failRate={chain.coverage.failRate}
                                blockedRate={chain.coverage.blockedRate}
                              />
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className="text-status-success">
                                  {Math.round(chain.coverage.passRate)}%
                                </span>
                                <span className="text-status-error">
                                  {Math.round(chain.coverage.failRate)}%
                                </span>
                                <span className="text-status-warning">
                                  {Math.round(chain.coverage.blockedRate)}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-text-quaternary">No executions</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {chain.coverage.defectCount > 0 ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center justify-center gap-1">
                                  <Bug className="h-3.5 w-3.5 text-status-error" />
                                  <span className="text-status-error font-medium">
                                    {chain.coverage.defectCount}
                                  </span>
                                  {chain.coverage.openDefectCount > 0 && (
                                    <Badge className="text-status-error bg-status-error/10 text-[10px] h-4">
                                      {chain.coverage.openDefectCount} open
                                    </Badge>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {chain.coverage.openDefectCount} open, {chain.coverage.defectCount - chain.coverage.openDefectCount} resolved
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-text-quaternary">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className={cn('text-xs', RISK_COLORS[chain.riskLevel])}>
                                {chain.riskLevel.charAt(0).toUpperCase() + chain.riskLevel.slice(1)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px]">
                              {chain.riskFactors.length > 0 ? (
                                <ul className="text-xs space-y-1">
                                  {chain.riskFactors.map((f, i) => (
                                    <li key={i}>• {f}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span>No risk factors identified</span>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChain(chain);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Expanded row - show test cases */}
                      {isExpanded && chain.testCases.length > 0 && (
                        <TableRow className="bg-surface-2/50">
                          <TableCell colSpan={8} className="p-0">
                            <div className="px-8 py-3">
                              <div className="text-xs font-medium text-text-tertiary mb-2 flex items-center gap-2">
                                <ArrowRight className="h-3 w-3" />
                                Linked Test Cases
                              </div>
                              <div className="space-y-1.5">
                                {chain.testCases.map(tc => {
                                  const tcExecs = chain.executions.filter(e => e.caseId === tc.id);
                                  const latestExec = tcExecs.sort((a, b) => 
                                    new Date(b.executedAt || 0).getTime() - new Date(a.executedAt || 0).getTime()
                                  )[0];
                                  const tcDefects = chain.defects.filter(d => 
                                    tcExecs.some(e => e.id === d.linkedExecutionId)
                                  );

                                  return (
                                    <div 
                                      key={tc.id}
                                      className="flex items-center gap-4 p-2 bg-surface-1 rounded-md border border-border-default text-sm"
                                    >
                                      <div className="flex items-center gap-2 min-w-[200px]">
                                        <Link2 className="h-3.5 w-3.5 text-text-quaternary" />
                                        <span className="font-mono text-xs text-accent-primary">
                                          {tc.caseKey}
                                        </span>
                                        <span className="text-text-primary truncate max-w-[180px]">
                                          {tc.title}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {latestExec ? (
                                          <>
                                            <StatusIcon status={latestExec.status} />
                                            <span className="text-xs text-text-secondary">
                                              {latestExec.status}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-xs text-text-quaternary">Not run</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-text-tertiary">
                                        {tcExecs.length} execution{tcExecs.length !== 1 ? 's' : ''}
                                      </div>
                                      {tcDefects.length > 0 && (
                                        <div className="flex items-center gap-1 text-status-error">
                                          <Bug className="h-3 w-3" />
                                          <span className="text-xs">{tcDefects.length}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Detail Panel */}
        {selectedChain && (
          <TraceabilityDetailPanel
            chain={selectedChain}
            onClose={() => setSelectedChain(null)}
          />
        )}

        {/* Coverage Gaps Panel */}
        {showGapsPanel && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowGapsPanel(false)}>
            <div
              className="absolute right-0 top-0 h-full w-[450px] bg-surface-1 border-l border-border-default flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-status-warning" />
                  <h2 className="text-lg font-semibold text-text-primary">Coverage Gaps</h2>
                  <Badge variant="secondary">{gaps.length}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowGapsPanel(false)}>
                  ×
                </Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {gaps.map(gap => (
                    <Card key={gap.id} className="bg-surface-2 border-border-default">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-start gap-2">
                            <Badge className={cn('text-xs shrink-0', GAP_SEVERITY_COLORS[gap.severity])}>
                              {gap.severity}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {gap.type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          {gap.type === 'no_tests' && (
                            <Button
                              size="sm"
                              className="h-6 text-[10px] gap-1 bg-accent-primary hover:bg-accent-primary/90"
                              onClick={() => handleCreateFromGap(gap)}
                            >
                              <Plus className="h-3 w-3" />
                              Create Test
                            </Button>
                          )}
                        </div>
                        <p className="text-sm font-medium text-text-primary mb-1">
                          {gap.title}
                        </p>
                        <p className="text-xs text-text-tertiary mb-2">
                          {gap.description}
                        </p>
                        <div className="flex items-start gap-1.5 text-xs text-accent-primary bg-accent-subtle/50 p-2 rounded">
                          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{gap.suggestion}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
        
        {/* Create Test from Gap Dialog */}
        <Dialog open={createFromGapOpen} onOpenChange={setCreateFromGapOpen}>
          <DialogContent className="sm:max-w-[500px] bg-surface-1 border-border-default">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-text-primary">
                <FileCode2 className="h-5 w-5 text-accent-primary" />
                Create Test from Gap
              </DialogTitle>
              <DialogDescription className="text-text-tertiary">
                Create a new test case to address the coverage gap for{' '}
                <span className="font-medium text-accent-primary">{selectedGap?.entityKey}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-text-secondary">Test Case Title</Label>
                <Input
                  value={newTestTitle}
                  onChange={(e) => setNewTestTitle(e.target.value)}
                  placeholder="Enter test case title"
                  className="bg-surface-2 border-border-default"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-text-secondary">Description</Label>
                <Textarea
                  value={newTestDescription}
                  onChange={(e) => setNewTestDescription(e.target.value)}
                  placeholder="Describe what this test case validates"
                  className="bg-surface-2 border-border-default min-h-[100px]"
                />
              </div>
              {selectedGap && (
                <div className="p-3 bg-surface-3 rounded-lg border border-border-default">
                  <p className="text-xs text-text-tertiary mb-1">Linked Requirement</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{selectedGap.entityKey}</Badge>
                    <span className="text-sm text-text-primary truncate">{selectedGap.title}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateFromGapOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createTestCaseMutation.mutate()}
                disabled={!newTestTitle.trim() || createTestCaseMutation.isPending}
                className="bg-accent-primary hover:bg-accent-primary/90"
              >
                {createTestCaseMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1.5" />
                )}
                Create Test Case
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default TraceabilityMatrix;
