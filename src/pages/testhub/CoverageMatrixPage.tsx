/**
 * G21: Traceability Matrix Page
 * Route: /testhub/coverage-matrix
 * 3 views: Matrix Table, Coverage Heatmap, Gap Analysis
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import {
  LayoutGrid, ChevronDown, ChevronRight, CheckCircle2, XCircle,
  AlertTriangle, Clock, RefreshCw, FileText, Target, Download,
  Flame, Search, Filter, Plus, ArrowRight, ExternalLink,
} from 'lucide-react';
import { supabase, typedQuery, typedRpc } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { Button } from '@/components/ui/button';
import { Lozenge, Tooltip, type LozengeAppearance } from '@/components/ads';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──

interface Requirement {
  id: string;
  req_key: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  coverage_percent: number;
  total_linked_tests: number;
  passed_tests: number;
  failed_tests: number;
  not_run_tests: number;
}

interface LinkedTest {
  link_id: string;
  test_case_id: string;
  case_key: string;
  title: string;
  priority: string;
  latest_status: string | null;
  last_executed: string | null;
}

type ViewTab = 'matrix' | 'heatmap' | 'gaps';

// ── Helpers ──

const EXEC_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  passed: { icon: CheckCircle2, color: 'text-emerald-600', label: 'Passed' },
  failed: { icon: XCircle, color: 'text-destructive', label: 'Failed' },
  blocked: { icon: AlertTriangle, color: 'text-amber-600', label: 'Blocked' },
  skipped: { icon: Clock, color: 'text-muted-foreground', label: 'Skipped' },
  not_run: { icon: Clock, color: 'text-muted-foreground/60', label: 'Not Run' },
};

function getCoverageLevel(pct: number): { label: string; appearance: LozengeAppearance } {
  if (pct === 100) return { label: 'Full', appearance: 'success' };
  if (pct >= 50) return { label: 'Partial', appearance: 'moved' };
  if (pct > 0) return { label: 'Low', appearance: 'moved' };
  return { label: 'None', appearance: 'removed' };
}

const priorityAppearance: Record<string, LozengeAppearance> = {
  critical: 'removed',
  high: 'removed',
  medium: 'moved',
  low: 'default',
};

function getHeatmapColor(pct: number): string {
  if (pct === 100) return 'bg-emerald-500 dark:bg-emerald-500';
  if (pct >= 75) return 'bg-emerald-300 dark:bg-emerald-600';
  if (pct >= 50) return 'bg-amber-400 dark:bg-amber-500';
  if (pct > 0) return 'bg-orange-400 dark:bg-orange-500';
  return 'bg-red-200 dark:bg-red-500/30';
}

function priorityOrder(p: string) {
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return order[p] ?? 4;
}

function exportCSV(requirements: Requirement[]) {
  const headers = ['Key', 'Title', 'Type', 'Priority', 'Coverage %', 'Linked Tests', 'Passed', 'Failed', 'Not Run'];
  const rows = requirements.map(r => [
    r.req_key, `"${r.title}"`, r.type, r.priority, r.coverage_percent,
    r.total_linked_tests, r.passed_tests, r.failed_tests, r.not_run_tests,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `traceability-matrix-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Page ──

export default function CoverageMatrixPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('matrix');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [releaseFilter, setReleaseFilter] = useState('all');
  const [releases, setReleases] = useState<{ id: string; name: string }[]>([]);

  // Matrix expansion
  const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());
  const [linkedTestsMap, setLinkedTestsMap] = useState<Record<string, LinkedTest[]>>({});
  const [loadingTests, setLoadingTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
    fetchReleases();
  }, []);

  const fetchReleases = async () => {
    try {
      const { data } = await supabase
        .from('releases')
        .select('id, name')
        .neq('status', 'archived')
        .order('name');
      setReleases((data || []) as any[]);
    } catch { /* ignore */ }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let query = typedQuery('tm_requirements')
        .select('id, req_key, title, type, priority, status, release_version')
        .neq('status', 'deprecated')
        .order('req_key');
      const { data, error } = await query;
      if (error) throw error;
      const enriched = await Promise.all(
        ((data as any[]) || []).map(async (r: any) => {
          const { data: tests } = await typedRpc('get_requirement_tests', { p_requirement_id: r.id });
          const linked = tests || [];
          const total = linked.length;
          const passed = linked.filter((t: any) => t.latest_status === 'pass').length;
          const failed = linked.filter((t: any) => t.latest_status === 'fail').length;
          const not_run = linked.filter((t: any) => !t.latest_status).length;
          return {
            ...r,
            total_linked_tests: total,
            passed_tests: passed,
            failed_tests: failed,
            not_run_tests: not_run,
            coverage_percent: total > 0 ? Math.round((passed / total) * 100) : 0,
          };
        })
      );
      setRequirements(enriched);
    } catch (err) {
      console.error('Fetch error:', err);
      catalystToast.error('Failed to load coverage data');
    } finally {
      setIsLoading(false);
    }
  };

  // Unique modules for filter
  const modules = useMemo(() => {
    const types = new Set(requirements.map(r => r.type).filter(Boolean));
    return Array.from(types).sort();
  }, [requirements]);

  // Filtered requirements
  const filtered = useMemo(() => {
    return requirements.filter(r => {
      if (moduleFilter !== 'all' && r.type !== moduleFilter) return false;
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (releaseFilter !== 'all' && (r as any).release_version !== releaseFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.req_key.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [requirements, moduleFilter, priorityFilter, releaseFilter, searchQuery]);

  // Summary stats
  const summary = useMemo(() => {
    const total = filtered.length;
    const full = filtered.filter(r => r.coverage_percent === 100).length;
    const partial = filtered.filter(r => r.coverage_percent > 0 && r.coverage_percent < 100).length;
    const none = filtered.filter(r => r.coverage_percent === 0).length;
    const pct = total > 0 ? Math.round((full / total) * 100) : 0;
    const critGaps = filtered.filter(r => r.coverage_percent === 0 && (r.priority === 'critical' || r.priority === 'high')).length;
    return { total, full, partial, none, pct, critGaps };
  }, [filtered]);

  // Toggle expand a requirement
  const toggleExpand = useCallback(async (reqId: string) => {
    setExpandedReqs(prev => {
      const next = new Set(prev);
      if (next.has(reqId)) {
        next.delete(reqId);
        return next;
      }
      next.add(reqId);
      return next;
    });

    if (!linkedTestsMap[reqId]) {
      setLoadingTests(prev => new Set(prev).add(reqId));
      try {
        const { data } = await supabase.rpc('get_requirement_tests' as any, { p_requirement_id: reqId });
        setLinkedTestsMap(prev => ({ ...prev, [reqId]: (data as any[]) || [] }));
      } catch {
        setLinkedTestsMap(prev => ({ ...prev, [reqId]: [] }));
      } finally {
        setLoadingTests(prev => { const n = new Set(prev); n.delete(reqId); return n; });
      }
    }
  }, [linkedTestsMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col overflow-auto ${isDark ? 'bg-[var(--ds-surface,#0A0A0A)]' : ''}`}>
      <CatalystPageHeader title="Traceability Matrix" actions={
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      } />
      <div className="flex-1 p-6 overflow-auto">

      {/* Coverage Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: summary.total, icon: Target, color: 'text-foreground' },
          { label: 'Fully Covered', value: summary.full, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Partial', value: summary.partial, icon: AlertTriangle, color: 'text-amber-600' },
          { label: 'No Coverage', value: summary.none, icon: XCircle, color: 'text-destructive' },
          { label: 'Critical Gaps', value: summary.critGaps, icon: Flame, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={cn('h-4 w-4', s.color)} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requirements..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={releaseFilter} onValueChange={setReleaseFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Release" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Releases</SelectItem>
            {releases.map(r => (
              <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {modules.map(m => (
              <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || moduleFilter !== 'all' || priorityFilter !== 'all' || releaseFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => { setSearchQuery(''); setModuleFilter('all'); setPriorityFilter('all'); setReleaseFilter('all'); }}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Tab Views */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ViewTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="matrix" className="gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />Matrix
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="gap-1.5">
            <Flame className="h-3.5 w-3.5" />Heatmap
          </TabsTrigger>
          <TabsTrigger value="gaps" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />Gap Analysis
          </TabsTrigger>
        </TabsList>

        {/* ── MATRIX VIEW ── */}
        <TabsContent value="matrix">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-lg">
              <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No requirements match the current filters.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[32px_100px_1fr_100px_60px_60px_60px_90px] px-4 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span></span>
                <span>Key</span>
                <span>Title</span>
                <span>Priority</span>
                <span>Pass</span>
                <span>Fail</span>
                <span>N/R</span>
                <span>Coverage</span>
              </div>

              {filtered.map(req => {
                const isExpanded = expandedReqs.has(req.id);
                const level = getCoverageLevel(req.coverage_percent);
                const tests = linkedTestsMap[req.id] || [];
                const isLoadingReq = loadingTests.has(req.id);

                return (
                  <div key={req.id}>
                    <button
                      onClick={() => toggleExpand(req.id)}
                      className={cn(
                        "w-full grid grid-cols-[32px_100px_1fr_100px_60px_60px_60px_90px] px-4 py-3 items-center border-b border-border hover:bg-muted/30 transition-colors text-left",
                        req.coverage_percent === 0 && 'bg-destructive/5',
                        req.coverage_percent === 100 && req.failed_tests === 0 && 'bg-emerald-500/5',
                      )}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-xs font-semibold text-primary">{req.req_key}</span>
                      <span className="text-sm text-foreground truncate pr-2">{req.title}</span>
                      <span className="w-fit"><Lozenge appearance={priorityAppearance[(req.priority || '').toLowerCase()] || 'default'}>{req.priority}</Lozenge></span>
                      <span className="text-xs font-medium text-emerald-600">{req.passed_tests}</span>
                      <span className="text-xs font-medium text-destructive">{req.failed_tests}</span>
                      <span className="text-xs font-medium text-muted-foreground">{req.not_run_tests}</span>
                      <span className="w-fit"><Lozenge appearance={level.appearance}>{req.coverage_percent}%</Lozenge></span>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-muted/20 border-b border-border px-6 py-3">
                            {isLoadingReq ? (
                              <div className="flex items-center gap-2 py-3 justify-center text-sm text-muted-foreground">
                                <RefreshCw className="h-4 w-4 animate-spin" /> Loading...
                              </div>
                            ) : tests.length === 0 ? (
                              <div className="flex items-center gap-3 py-3">
                                <span className="text-sm text-muted-foreground">No linked test cases</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); navigate(`/testhub/requirements/${req.id}`); }}
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Link Test Case
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Linked Test Cases ({tests.length})
                                  </span>
                                </div>
                                {tests.map(tc => {
                                  const exec = EXEC_ICONS[tc.latest_status || 'not_run'] || EXEC_ICONS.not_run;
                                  const StatusIcon = exec.icon;
                                  return (
                                    <button
                                      key={tc.link_id || tc.test_case_id}
                                      onClick={(e) => { e.stopPropagation(); navigate(`/testhub/repository?view=${tc.test_case_id}`); }}
                                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors text-left"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                      <span className="text-xs font-semibold text-primary">{tc.case_key}</span>
                                      <span className="text-sm text-foreground flex-1 truncate">{tc.title}</span>
                                      <span className={cn('flex items-center gap-1 text-xs font-medium', exec.color)}>
                                        <StatusIcon className="h-3.5 w-3.5" />
                                        {exec.label}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/testhub/requirements/${req.id}`); }}
                              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              View Requirement <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── HEATMAP VIEW ── */}
        <TabsContent value="heatmap">
          <HeatmapView requirements={filtered} onClickReq={(id) => navigate(`/testhub/requirements/${id}`)} />
        </TabsContent>

        {/* ── GAP ANALYSIS ── */}
        <TabsContent value="gaps">
          <GapAnalysisView
            requirements={filtered.filter(r => r.coverage_percent === 0)}
            onNavigateReq={(id) => navigate(`/testhub/requirements/${id}`)}
          />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

// ── Heatmap Sub-Component ──

function HeatmapView({ requirements, onClickReq }: { requirements: Requirement[]; onClickReq: (id: string) => void }) {
  // Group by module (type)
  const grouped = useMemo(() => {
    const map = new Map<string, Requirement[]>();
    for (const req of requirements) {
      const key = req.type || 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(req);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [requirements]);

  if (requirements.length === 0) {
    return (
      <div className="text-center py-16 bg-card border border-border rounded-lg">
        <Flame className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No requirements to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Legend:</span>
        {[
          { label: 'No Tests', cls: 'bg-red-200 dark:bg-red-500/30' },
          { label: 'Failing', cls: 'bg-orange-400 dark:bg-orange-500' },
          { label: 'Partial', cls: 'bg-amber-400 dark:bg-amber-500' },
          { label: '75%+', cls: 'bg-emerald-300 dark:bg-emerald-600' },
          { label: '100%', cls: 'bg-emerald-500 dark:bg-emerald-500' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={cn('w-4 h-4 rounded', l.cls)} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {grouped.map(([module, reqs]) => (
        <div key={module} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground capitalize">{module}</h3>
            <span className="text-xs text-muted-foreground">{reqs.length} requirement{reqs.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {reqs.map(req => (
              <Tooltip
                key={req.id}
                position="top"
                content={
                  <>
                    <p className="font-semibold text-sm">{req.req_key}: {req.title}</p>
                    <p className="text-xs mt-1">
                      Coverage: {req.coverage_percent}% · {req.total_linked_tests} test{req.total_linked_tests !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs">
                      ✓ {req.passed_tests} · ✗ {req.failed_tests} · ○ {req.not_run_tests}
                    </p>
                  </>
                }
              >
                <button
                  onClick={() => onClickReq(req.id)}
                  className={cn(
                    'w-10 h-10 rounded-md transition-transform hover:scale-110 cursor-pointer flex items-center justify-center text-[10px] font-bold text-white',
                    getHeatmapColor(req.coverage_percent),
                  )}
                >
                  {req.coverage_percent}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Gap Analysis Sub-Component ──

function GapAnalysisView({
  requirements,
  onNavigateReq,
}: {
  requirements: Requirement[];
  onNavigateReq: (id: string) => void;
}) {
  const sorted = useMemo(() =>
    [...requirements].sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority)),
    [requirements]
  );

  const criticalHighCount = sorted.filter(r => r.priority === 'critical' || r.priority === 'high').length;

  // Group by priority
  const groups = useMemo(() => {
    const map = new Map<string, Requirement[]>();
    for (const req of sorted) {
      const key = req.priority || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(req);
    }
    return Array.from(map.entries());
  }, [sorted]);

  if (requirements.length === 0) {
    return (
      <div className="text-center py-16 bg-card border border-border rounded-lg">
        <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
        <p className="text-lg font-semibold text-foreground mb-1">All Requirements Covered!</p>
        <p className="text-sm text-muted-foreground">Every requirement has at least one linked test case.</p>
      </div>
    );
  }

  const priorityColors: Record<string, string> = {
    critical: 'text-red-600 dark:text-red-400',
    high: 'text-orange-600 dark:text-orange-400',
    medium: 'text-amber-600 dark:text-amber-400',
    low: 'text-muted-foreground',
  };

  const priorityBg: Record<string, string> = {
    critical: 'bg-red-50 border-red-200 dark:bg-[rgba(248,113,113,0.08)] dark:border-[rgba(248,113,113,0.2)]',
    high: 'bg-orange-50 border-orange-200 dark:bg-[rgba(251,146,60,0.08)] dark:border-[rgba(251,146,60,0.2)]',
    medium: 'bg-amber-50 border-amber-200 dark:bg-[rgba(251,191,36,0.08)] dark:border-[rgba(251,191,36,0.2)]',
    low: 'bg-muted/30 border-border',
  };

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {requirements.length} Uncovered Requirement{requirements.length !== 1 ? 's' : ''}
          </p>
          {criticalHighCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {criticalHighCount} Critical/High priority gap{criticalHighCount !== 1 ? 's' : ''} require immediate attention
            </p>
          )}
        </div>
      </div>

      {groups.map(([priority, reqs]) => (
        <div key={priority}>
          <div className="flex items-center gap-2 mb-3">
            <span className={cn('text-sm font-semibold uppercase', priorityColors[priority] || 'text-foreground')}>
              {priority} Priority
            </span>
            <Lozenge appearance="default">{reqs.length}</Lozenge>
          </div>
          <div className="space-y-2">
            {reqs.map(req => (
              <div
                key={req.id}
                className={cn('flex items-center justify-between p-4 rounded-lg border', priorityBg[priority] || 'bg-card border-border')}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0">
                    {req.req_key}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{req.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{req.type} requirement</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateReq(req.id)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Link Test
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>
  );
}
