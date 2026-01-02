/**
 * Traceability Page
 * Requirements to test coverage matrix - WIRED TO REAL DATA
 */

import React, { useState, useMemo, useDeferredValue } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  GitBranch,
  Link2,
  Sparkles,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTraceability, StoryCoverage } from '../../hooks/useTraceability';
import { usePermission } from '@/hooks/usePermission';

function getCoverageColor(coverage: number) {
  if (coverage >= 80) return 'text-status-success';
  if (coverage >= 50) return 'text-status-warning';
  return 'text-status-error';
}

function getResultBadge(passRate: number, total: number) {
  if (total === 0) return <Badge className="text-text-tertiary bg-surface-3">Not Run</Badge>;
  if (passRate >= 90) return <Badge className="text-status-success bg-status-success/10">Passed</Badge>;
  if (passRate >= 50) return <Badge className="text-status-warning bg-status-warning/10">Mixed</Badge>;
  return <Badge className="text-status-error bg-status-error/10">Failed</Badge>;
}

export function TraceabilityPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get('programId');
  
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [findingsPanelOpen, setFindingsPanelOpen] = useState(false);

  // Permission check
  const { hasPermission: canRunAI } = usePermission('test_cases', 'create', 'program', programId || undefined);

  // Real data hooks
  const { 
    coverageData, 
    isLoading, 
    gaps,
    findings: traceabilityFindings,
    resolveFinding,
    dismissFinding,
  } = useTraceability(programId);

  const storyCoverages = coverageData?.storyCoverages || [];
  const overallStats = coverageData?.totals;

  // Track findings in local state (from AI gap detection)
  const [detectedFindings, setDetectedFindings] = useState<any[]>([]);
  const [isDetectingGaps, setIsDetectingGaps] = useState(false);

  // Filtered data with deferred search for performance
  const filteredItems = useMemo(() => {
    if (!deferredSearchQuery) return storyCoverages;
    const q = deferredSearchQuery.toLowerCase();
    return storyCoverages.filter(item =>
      item.story.title.toLowerCase().includes(q) ||
      item.story.story_key?.toLowerCase().includes(q) ||
      item.story.name?.toLowerCase().includes(q)
    );
  }, [storyCoverages, deferredSearchQuery]);

  // AI Gap Detection
  const handleAISuggest = async () => {
    if (!canRunAI) {
      toast.error('You do not have permission to run AI analysis');
      return;
    }

    setIsDetectingGaps(true);
    try {
      // Use the gaps computed by useTraceability
      if (gaps.length > 0) {
        setDetectedFindings(gaps);
        setFindingsPanelOpen(true);
        toast.success(`Found ${gaps.length} coverage gaps`);
      } else {
        toast.info('No coverage gaps detected');
      }
    } catch (error) {
      console.error('Gap detection error:', error);
      toast.error('Failed to analyze coverage gaps');
    } finally {
      setIsDetectingGaps(false);
    }
  };

  const handleLinkTests = (storyKey: string, storyId: string) => {
    toast.info(`Link tests to ${storyKey} - opening dialog`);
    // TODO: Open linking dialog
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

  const avgCoverage = overallStats?.passRate || 0;
  const totalItems = storyCoverages.length;
  const fullyCovered = storyCoverages.filter(i => i.testCaseCount > 0).length;
  const noCoverage = storyCoverages.filter(i => i.testCaseCount === 0).length;

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-border-default">
        <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
          <span>{projectKey}</span>
          <span>/</span>
          <span>Tests</span>
          <span>/</span>
          <span className="text-text-primary font-medium">Traceability</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Traceability Autopilot</h1>
            <p className="text-sm text-text-tertiary mt-0.5">
              Requirements to test coverage matrix
            </p>
          </div>
          <div className="flex items-center gap-2">
            {detectedFindings.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFindingsPanelOpen(true)}
                className="text-status-warning border-status-warning"
              >
                <AlertTriangle className="h-4 w-4 mr-1.5" />
                {detectedFindings.length} Findings
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={handleAISuggest}
              disabled={isDetectingGaps || !canRunAI}
            >
              {isDetectingGaps ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              AI Suggest Coverage
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4 border-b border-border-default">
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-surface-2 border-border-default">
            <CardContent className="p-4">
              <p className="text-sm text-text-tertiary">Total Stories</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">{totalItems}</p>
            </CardContent>
          </Card>
          <Card className="bg-surface-2 border-border-default">
            <CardContent className="p-4">
              <p className="text-sm text-text-tertiary">Average Coverage</p>
              <p className={cn('text-2xl font-semibold mt-1', getCoverageColor(avgCoverage))}>
                {Math.round(avgCoverage)}%
              </p>
            </CardContent>
          </Card>
          <Card className="bg-surface-2 border-border-default">
            <CardContent className="p-4">
              <p className="text-sm text-text-tertiary">With Tests</p>
              <p className="text-2xl font-semibold text-status-success mt-1">
                {fullyCovered}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-surface-2 border-border-default">
            <CardContent className="p-4">
              <p className="text-sm text-text-tertiary">No Coverage</p>
              <p className="text-2xl font-semibold text-status-error mt-1">
                {noCoverage}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
          <Input
            placeholder="Search stories..."
            className="pl-9 bg-surface-2 border-border-default"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-1.5" />
          Filters
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-text-tertiary">
            <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No stories found</p>
            <p className="text-sm mt-1">Create stories and link test cases to see traceability</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-surface-1 z-10">
              <TableRow className="border-border-default hover:bg-transparent">
                <TableHead className="text-text-tertiary font-medium">Story</TableHead>
                <TableHead className="text-text-tertiary font-medium">Feature</TableHead>
                <TableHead className="text-text-tertiary font-medium">Linked Tests</TableHead>
                <TableHead className="text-text-tertiary font-medium">Coverage</TableHead>
                <TableHead className="text-text-tertiary font-medium">Last Result</TableHead>
                <TableHead className="text-text-tertiary font-medium">Risk</TableHead>
                <TableHead className="text-text-tertiary font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const passRate = item.executionStats.total > 0
                  ? (item.executionStats.passed / item.executionStats.total) * 100
                  : 0;
                const coverage = item.testCaseCount > 0 ? 100 : 0; // Binary for now
                
                return (
                  <TableRow 
                    key={item.storyId} 
                    className="border-border-default hover:bg-surface-hover"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-text-quaternary" />
                        <div>
                          <span className="text-sm font-mono text-accent-primary">
                            {item.story.story_key || item.storyId.slice(0, 8)}
                          </span>
                          <p className="text-sm text-text-primary line-clamp-1">
                            {item.story.title || item.story.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-text-secondary">
                        {item.story.feature?.name || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-text-quaternary" />
                        <span className="text-text-primary">{item.testCaseCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={getCoverageColor(coverage)}>{coverage}%</span>
                        </div>
                        <Progress value={coverage} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {getResultBadge(passRate, item.executionStats.total)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={cn(
                          item.riskScore >= 70 && 'text-status-error bg-status-error/10',
                          item.riskScore >= 40 && item.riskScore < 70 && 'text-status-warning bg-status-warning/10',
                          item.riskScore < 40 && 'text-status-success bg-status-success/10',
                        )}
                      >
                        {item.riskScore >= 70 ? 'High' : item.riskScore >= 40 ? 'Medium' : 'Low'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleLinkTests(item.story.story_key || '', item.storyId)}
                      >
                        <Link2 className="h-4 w-4 mr-1.5" />
                        Link Tests
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Findings Drawer - Simple list */}
      {findingsPanelOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setFindingsPanelOpen(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-[400px] bg-surface-1 border-l border-border-default p-6 overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Coverage Findings</h2>
              <Button variant="ghost" size="sm" onClick={() => setFindingsPanelOpen(false)}>×</Button>
            </div>
            {detectedFindings.length === 0 ? (
              <p className="text-text-tertiary">No findings to display</p>
            ) : (
              <div className="space-y-3">
                {detectedFindings.map((f: any) => (
                  <div key={f.id} className="p-3 bg-surface-2 rounded-lg border border-border-default">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn(
                        f.severity === 'critical' && 'text-status-error bg-status-error/10',
                        f.severity === 'high' && 'text-status-warning bg-status-warning/10',
                        f.severity === 'medium' && 'text-accent-primary bg-accent-subtle',
                        f.severity === 'low' && 'text-text-tertiary bg-surface-3',
                      )}>
                        {f.severity}
                      </Badge>
                      <span className="text-xs text-text-quaternary">{f.type}</span>
                    </div>
                    <p className="text-sm font-medium text-text-primary">{f.title}</p>
                    <p className="text-xs text-text-tertiary mt-1">{f.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TraceabilityPage;
