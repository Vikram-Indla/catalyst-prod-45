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
  planned_start: string | null;
  planned_end: string | null;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
  in_progress_count: number;
}

const CYCLE_STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  in_progress:  { bg: '#DEEBFF', text: '#0747A6', label: 'IN PROGRESS' },
  active:       { bg: '#DEEBFF', text: '#0747A6', label: 'ACTIVE' },
  planned:      { bg: '#DFE1E6', text: '#253858', label: 'PLANNED' },
  draft:        { bg: '#DFE1E6', text: '#253858', label: 'DRAFT' },
  on_hold:      { bg: '#DFE1E6', text: '#253858', label: 'ON HOLD' },
  completed:    { bg: '#E3FCEF', text: '#006644', label: 'COMPLETED' },
  closed:       { bg: '#E3FCEF', text: '#006644', label: 'CLOSED' },
  done:         { bg: '#E3FCEF', text: '#006644', label: 'DONE' },
  archived:     { bg: '#DFE1E6', text: '#253858', label: 'ARCHIVED' },
};

export default function ExecutionHubPage() {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<CycleWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<string>('all');

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('tm_test_cycles')
        .select('id, cycle_key, name, description, status, planned_start, planned_end, environment_id, project_id, total_cases, passed_count, failed_count, blocked_count, skipped_count, not_run_count, in_progress_count, created_at, updated_at')
        .eq('project_id', '00000000-0000-0000-0000-000000000001')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCycles((data) || []);
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
    const activeCycles = cycles.filter(c => ['active'].includes((c.status || '').toLowerCase()));
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
            const cfg = CYCLE_STATUS_MAP[(cycle.status || 'draft').toLowerCase()] ?? CYCLE_STATUS_MAP['draft'];
            const executed = cycle.total_cases - cycle.not_run_count;
            const progressPercent = cycle.total_cases > 0 ? Math.round((executed / cycle.total_cases) * 100) : 0;
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
                      <span style={{
                        backgroundColor: cfg.bg, color: cfg.text,
                        fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em',
                        textTransform: 'uppercase', borderRadius: '4px', padding: '2px 6px',
                        height: '20px', display: 'inline-flex', alignItems: 'center',
                      }}>
                        {cfg.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground truncate">{cycle.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cycle.planned_start ? formatDate(cycle.planned_start) : '—'} — {cycle.planned_end ? formatDate(cycle.planned_end) : '—'}
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
                    <span className="font-semibold text-foreground">{progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
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
