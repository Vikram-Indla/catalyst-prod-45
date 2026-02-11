/**
 * Execution Hub Page — TestHub Module
 * Route: /testhub/execution
 * Central dashboard for launching and monitoring test execution across cycles.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, CheckCircle2, XCircle, AlertTriangle, Clock,
  RefreshCw, ChevronRight, Zap, BarChart3, Target,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/ui/EmptyState';

interface CycleWithStats {
  id: string;
  cycle_key: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  progress_percent: number;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
  owner: { full_name: string } | null;
}

const statusStyles: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  draft: { label: 'Draft', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
  completed: { label: 'Completed', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  archived: { label: 'Archived', color: 'text-muted-foreground', bg: 'bg-muted/50 border-border' },
};

export default function ExecutionHubPage() {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<CycleWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<string>('active');

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('th_test_cycles')
        .select(`*, owner:profiles!th_test_cycles_owner_id_fkey ( full_name )`)
        .order('start_date', { ascending: false });
      if (error) throw error;
      setCycles((data as any) || []);
    } catch (err) {
      console.error('Failed to load cycles', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (viewFilter === 'all') return cycles;
    return cycles.filter(c => c.status === viewFilter);
  }, [cycles, viewFilter]);

  // Aggregate stats
  const globalStats = useMemo(() => {
    const activeCycles = cycles.filter(c => c.status === 'active');
    const totalCases = activeCycles.reduce((s, c) => s + c.total_cases, 0);
    const passed = activeCycles.reduce((s, c) => s + c.passed_count, 0);
    const failed = activeCycles.reduce((s, c) => s + c.failed_count, 0);
    const blocked = activeCycles.reduce((s, c) => s + c.blocked_count, 0);
    const notRun = activeCycles.reduce((s, c) => s + c.not_run_count, 0);
    const executed = totalCases - notRun;
    return {
      activeCycles: activeCycles.length,
      totalCases,
      executed,
      passed,
      failed,
      blocked,
      passRate: executed > 0 ? Math.round((passed / executed) * 100) : 0,
    };
  }, [cycles]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Play className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Execution Hub</h1>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Active Cycles', value: globalStats.activeCycles, Icon: RefreshCw, color: 'text-primary' },
          { label: 'Total Cases', value: globalStats.totalCases, Icon: Target, color: 'text-foreground' },
          { label: 'Executed', value: globalStats.executed, Icon: Zap, color: 'text-primary' },
          { label: 'Passed', value: globalStats.passed, Icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Failed', value: globalStats.failed, Icon: XCircle, color: 'text-destructive' },
          { label: 'Blocked', value: globalStats.blocked, Icon: AlertTriangle, color: 'text-amber-600' },
          { label: 'Pass Rate', value: `${globalStats.passRate}%`, Icon: BarChart3, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.Icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
        {['active', 'draft', 'completed', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setViewFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewFilter === f
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({cycles.filter(c => c.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cycle Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Play className="h-7 w-7" />}
          title="No cycles found"
          description={cycles.length === 0
            ? "Create a test cycle to start executing tests."
            : "No cycles match the selected filter."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(cycle => {
            const st = statusStyles[cycle.status] || statusStyles.draft;
            const executed = cycle.total_cases - cycle.not_run_count;
            return (
              <div
                key={cycle.id}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/testhub/cycles/${cycle.id}`)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {cycle.cycle_key}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground truncate">{cycle.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}
                      {cycle.owner && <span className="ml-2">• {cycle.owner.full_name}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cycle.status === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/testhub/cycles/${cycle.id}/execute`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Execute
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">{executed} / {cycle.total_cases} executed</span>
                    <span className="font-semibold text-foreground">{cycle.progress_percent}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${cycle.progress_percent}%` }}
                    />
                  </div>
                </div>

                {/* Status pills */}
                <div className="flex gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> {cycle.passed_count}
                  </span>
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <XCircle className="h-3 w-3" /> {cycle.failed_count}
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" /> {cycle.blocked_count}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" /> {cycle.not_run_count} remaining
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
