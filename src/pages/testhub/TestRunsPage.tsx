/**
 * Test Runs Page — TestHub Module
 * Route: /testhub/runs
 * Shows execution history across all cycles with filtering and navigation.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Beaker, Search, Filter, Clock, CheckCircle2, XCircle,
  AlertTriangle, SkipForward, ChevronRight, Calendar, User, Timer,
} from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/ui/EmptyState';

interface ExecutionRecord {
  id: string;
  cycle_id: string;
  test_case_id: string;
  current_status: string;
  executed_at: string | null;
  executed_by: string | null;
  assigned_to: string | null;
  execution_time_seconds: number;
  failure_reason: string | null;
  notes: string | null;
  test_case: { id: string; case_key: string; title: string; priority_id: string | null; priority: { id: string; name: string; color: string } | null } | null;
  cycle: { id: string; cycle_key: string; name: string } | null;
  executor: { full_name: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  not_run: { label: 'Not Run', color: 'text-muted-foreground', bg: 'bg-muted', Icon: Clock },
  passed: { label: 'Passed', color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-destructive', bg: 'bg-red-50', Icon: XCircle },
  blocked: { label: 'Blocked', color: 'text-amber-600', bg: 'bg-amber-50', Icon: AlertTriangle },
  skipped: { label: 'Skipped', color: 'text-muted-foreground', bg: 'bg-muted/50', Icon: SkipForward },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'text-destructive' },
  high: { label: 'High', color: 'text-orange-600' },
  medium: { label: 'Medium', color: 'text-amber-600' },
  low: { label: 'Low', color: 'text-muted-foreground' },
};

export default function TestRunsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ExecutionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [cycles, setCycles] = useState<{ id: string; cycle_key: string; name: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [execRes, cycleRes] = await Promise.all([
        typedQuery('tm_cycle_scope')
           .select(`
            id, cycle_id, test_case_id, assigned_to, current_status, sort_order, priority, due_date, added_at, updated_at,
            test_case:tm_test_cases ( id, case_key, title, priority_id, priority:tm_case_priorities ( id, name, color ) )
          `)
          .order('updated_at', { ascending: false, nullsFirst: false }),
        typedQuery('tm_test_cycles')
          .select('id, cycle_key, name')
          .order('created_at', { ascending: false }),
      ]);
      if (execRes.error) throw execRes.error;
      setRecords((execRes.data) || []);
      setCycles((cycleRes.data) || []);
    } catch (err) {
      console.error('Failed to load test runs', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (statusFilter !== 'all' && r.current_status !== statusFilter) return false;
      if (cycleFilter !== 'all' && r.cycle_id !== cycleFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCase = r.test_case?.title?.toLowerCase().includes(q) || r.test_case?.case_key?.toLowerCase().includes(q);
        const matchCycle = r.cycle?.name?.toLowerCase().includes(q);
        if (!matchCase && !matchCycle) return false;
      }
      return true;
    });
  }, [records, statusFilter, cycleFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const executed = records.filter(r => r.current_status !== 'not_run');
    const passed = records.filter(r => r.current_status === 'passed').length;
    const failed = records.filter(r => r.current_status === 'failed').length;
    const blocked = records.filter(r => r.current_status === 'blocked').length;
    return {
      total: records.length,
      executed: executed.length,
      passed,
      failed,
      blocked,
      passRate: executed.length > 0 ? Math.round((passed / executed.length) * 100) : 0,
    };
  }, [records]);

  const formatTime = (seconds: number) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Beaker className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Test Runs</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Executed', value: stats.executed, color: 'text-primary' },
          { label: 'Passed', value: stats.passed, color: 'text-emerald-600' },
          { label: 'Failed', value: stats.failed, color: 'text-destructive' },
          { label: 'Blocked', value: stats.blocked, color: 'text-amber-600' },
          { label: 'Pass Rate', value: `${stats.passRate}%`, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
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
            placeholder="Search test cases or cycles..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 border border-border rounded-lg text-sm bg-background text-foreground"
        >
          <option value="all">All Status</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="blocked">Blocked</option>
          <option value="skipped">Skipped</option>
          <option value="not_run">Not Run</option>
        </select>
        <select
          value={cycleFilter}
          onChange={e => setCycleFilter(e.target.value)}
          className="h-9 px-3 border border-border rounded-lg text-sm bg-background text-foreground"
        >
          <option value="all">All Cycles</option>
          {cycles.map(c => (
            <option key={c.id} value={c.id}>{c.cycle_key} — {c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Beaker className="h-7 w-7" />}
          title="No test runs found"
          description={records.length === 0
            ? "Execute test cases from a cycle to see run history here."
            : "No results match your current filters. Try adjusting your search."
          }
        />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Test Case</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cycle</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Priority</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Executed By</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Duration</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Executed At</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const st = statusConfig[r.current_status] || statusConfig.not_run;
                const pri = priorityConfig[r.test_case?.priority?.name?.toLowerCase() || 'medium'] || priorityConfig.medium;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => navigate(`/testhub/cycles/${r.cycle_id}/execute?testId=${r.id}`)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">{r.test_case?.case_key}</span>
                        <span className="text-foreground truncate max-w-[200px]">{r.test_case?.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {r.cycle?.cycle_key}
                      </span>
                      <span className="ml-2 text-muted-foreground text-xs">{r.cycle?.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${st.bg} ${st.color}`}>
                        <st.Icon className="h-3 w-3" />
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium ${pri.color}`}>{pri.label}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {r.executor?.full_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {formatTime(r.execution_time_seconds)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {formatDate(r.executed_at)}
                    </td>
                    <td className="py-3 px-4">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
