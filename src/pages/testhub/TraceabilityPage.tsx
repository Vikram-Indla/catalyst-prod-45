/**
 * Traceability Page — TestHub Module
 * Route: /testhub/traceability
 * End-to-end requirement-to-test-case traceability matrix.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, Search, CheckCircle2, XCircle, AlertTriangle, Clock,
  ChevronRight, ChevronDown, Target, FileText, ArrowRight,
} from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface Requirement {
  id: string;
  req_key: string;
  title: string;
  type: string;
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
}

const statusIcon: Record<string, { Icon: any; color: string }> = {
  passed: { Icon: CheckCircle2, color: 'text-emerald-600' },
  failed: { Icon: XCircle, color: 'text-destructive' },
  blocked: { Icon: AlertTriangle, color: 'text-amber-600' },
  skipped: { Icon: Clock, color: 'text-muted-foreground' },
  not_run: { Icon: Clock, color: 'text-muted-foreground/60' },
};

const coverageBadge = (pct: number) => {
  if (pct === 100) return { label: 'Full', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (pct > 0) return { label: 'Partial', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'None', className: 'bg-red-50 text-destructive border-red-200' };
};

export default function TraceabilityPage() {
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [coverageFilter, setCoverageFilter] = useState<string>('all');
  const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());
  const [linkedTests, setLinkedTests] = useState<Record<string, LinkedTest[]>>({});
  const [loadingTests, setLoadingTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await typedQuery('tm_requirements')
        .select('id, req_key, title, type, status')
        .neq('status', 'deprecated')
        .order('req_key');
      if (error) throw error;
      setRequirements((data || []).map((r: any) => ({
        ...r,
        coverage_percent: r.coverage_percent ?? 0,
        total_linked_tests: r.total_linked_tests ?? 0,
        passed_tests: r.passed_tests ?? 0,
        failed_tests: r.failed_tests ?? 0,
        not_run_tests: r.not_run_tests ?? 0,
      })));
    } catch (err) {
      console.error('Failed to load requirements', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = async (reqId: string) => {
    const next = new Set(expandedReqs);
    if (next.has(reqId)) {
      next.delete(reqId);
      setExpandedReqs(next);
      return;
    }
    next.add(reqId);
    setExpandedReqs(next);

    if (!linkedTests[reqId]) {
      setLoadingTests(prev => new Set(prev).add(reqId));
      try {
        const { data, error } = await supabase.rpc('get_requirement_tests', { p_requirement_id: reqId });
        if (error) throw error;
        setLinkedTests(prev => ({ ...prev, [reqId]: (data as any) || [] }));
      } catch {
        setLinkedTests(prev => ({ ...prev, [reqId]: [] }));
      } finally {
        setLoadingTests(prev => { const n = new Set(prev); n.delete(reqId); return n; });
      }
    }
  };

  const filtered = useMemo(() => {
    return requirements.filter(r => {
      if (coverageFilter === 'full' && r.coverage_percent !== 100) return false;
      if (coverageFilter === 'partial' && (r.coverage_percent === 0 || r.coverage_percent === 100)) return false;
      if (coverageFilter === 'none' && r.coverage_percent !== 0) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.req_key.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [requirements, coverageFilter, searchQuery]);

  // Summary stats
  const summary = useMemo(() => {
    const total = requirements.length;
    const full = requirements.filter(r => r.coverage_percent === 100).length;
    const partial = requirements.filter(r => r.coverage_percent > 0 && r.coverage_percent < 100).length;
    const none = requirements.filter(r => r.coverage_percent === 0).length;
    return { total, full, partial, none };
  }, [requirements]);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <TestHubPageHeader title="Traceability" subtitle="Requirements-to-test traceability view" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Requirements', value: summary.total, color: 'text-foreground', icon: Target },
          { label: 'Fully Covered', value: summary.full, color: 'text-emerald-600', icon: CheckCircle2 },
          { label: 'Partially Covered', value: summary.partial, color: 'text-amber-600', icon: AlertTriangle },
          { label: 'No Coverage', value: summary.none, color: 'text-destructive', icon: XCircle },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search requirements..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'full', 'partial', 'none'].map(f => (
            <button
              key={f}
              onClick={() => setCoverageFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                coverageFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Traceability List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<GitBranch className="h-7 w-7" />}
          title="No requirements found"
          description={requirements.length === 0
            ? "Add requirements to start building traceability."
            : "No requirements match the current filter."
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(req => {
            const isExpanded = expandedReqs.has(req.id);
            const badge = coverageBadge(req.coverage_percent);
            const tests = linkedTests[req.id] || [];
            const isLoadingReq = loadingTests.has(req.id);

            return (
              <div key={req.id} className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Requirement Row */}
                <button
                  onClick={() => toggleExpand(req.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0">
                    {req.req_key}
                  </span>
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{req.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${badge.className}`}>
                    {badge.label} ({req.coverage_percent}%)
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {req.total_linked_tests} test{req.total_linked_tests !== 1 ? 's' : ''}
                  </span>
                  {/* Mini status indicators */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    {req.passed_tests > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />{req.passed_tests}
                      </span>
                    )}
                    {req.failed_tests > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-destructive">
                        <XCircle className="h-3 w-3" />{req.failed_tests}
                      </span>
                    )}
                    {req.not_run_tests > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />{req.not_run_tests}
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded: Linked Tests */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/10 px-4 py-3">
                    {isLoadingReq ? (
                      <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground text-sm">
                        <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
                        Loading linked tests...
                      </div>
                    ) : tests.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-3 text-center">
                        No test cases linked to this requirement.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Linked Test Cases
                          </span>
                        </div>
                        {tests.map(tc => {
                          const st = statusIcon[tc.latest_status || 'not_run'] || statusIcon.not_run;
                          return (
                            <button
                              key={tc.link_id || tc.test_case_id}
                              onClick={() => navigate(`/testhub/repository?view=${tc.test_case_id}`)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors text-left"
                            >
                              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs font-semibold text-primary">{tc.case_key}</span>
                              <span className="text-sm text-foreground flex-1 truncate">{tc.title}</span>
                              <st.Icon className={`h-3.5 w-3.5 ${st.color} flex-shrink-0`} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/testhub/requirements/${req.id}`)}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      View Requirement Details →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
