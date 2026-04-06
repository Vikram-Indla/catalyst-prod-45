/**
 * ActiveCyclesList — G5-05
 * Shows active test cycles with progress bars and stats
 */

import { useNavigate } from 'react-router-dom';
import { Play, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';

export interface ActiveCycle {
  id: string;
  cycle_key: string;
  name: string;
  status: string | null;
  progress_percent: number | null;
  total_cases: number | null;
  passed_count: number | null;
  failed_count: number | null;
  blocked_count: number | null;
  not_run_count: number | null;
}

interface Props {
  cycles: ActiveCycle[];
}

export function ActiveCyclesList({ cycles }: Props) {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--divider)', borderRadius: 12, padding: 24, minHeight: 260 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 50, borderRadius: 12, backgroundColor: 'rgba(74,222,128,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Play size={18} color="var(--sem-success)" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>Active Cycles</p>
            <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>{cycles.length} in progress</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/testhub/cycles')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: 'none', borderRadius: 6, backgroundColor: 'transparent', color: 'var(--cp-blue)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          View All <ChevronRight size={14} />
        </button>
      </div>

      {/* List */}
      {cycles.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cycles.map((cycle) => {
            const pct = cycle.progress_percent ?? 0;
            const pctColor = pct >= 80 ? 'var(--sem-success)' : pct >= 50 ? 'var(--cp-blue)' : 'var(--fg-3)';
            const barGrad = pct >= 80
              ? 'linear-gradient(90deg, #10B981, #059669)'
              : pct >= 50
              ? 'linear-gradient(90deg, #3B82F6, #2563EB)'
              : 'linear-gradient(90deg, rgba(237,237,237,0.40), rgba(237,237,237,0.40))';

            return (
              <div
                key={cycle.id}
                onClick={() => navigate(`/testhub/cycles/${cycle.id}`)}
                style={{ padding: 14, backgroundColor: 'color-mix(in srgb, var(--bg-2) 35%, transparent)', borderRadius: 12, cursor: 'pointer', transition: 'background-color 0.15s', border: '1px solid transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EBF0FF'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--cp-blue) 25%, transparent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--bg-2) 35%, transparent)'; e.currentTarget.style.borderColor = 'transparent'; }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cp-blue)', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{cycle.cycle_key}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cycle.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: pctColor, whiteSpace: 'nowrap', marginLeft: 8 }}>{pct}%</span>
                </div>

                {/* Progress bar */}
                <div style={{ height: 5, backgroundColor: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: barGrad, borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--fg-3)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={12} color="var(--sem-success)" />{cycle.passed_count ?? 0}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><XCircle size={12} color="var(--sem-danger)" />{cycle.failed_count ?? 0}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={12} color="var(--fg-4)" />{cycle.not_run_count ?? 0}</span>
                  <span>of {cycle.total_cases ?? 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--fg-3)' }}>
            <Play size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ fontSize: 13, margin: '0 0 12px' }}>No active cycles</p>
            <button
              onClick={() => navigate('/testhub/cycles')}
              style={{ padding: '8px 16px', border: 'none', borderRadius: 6, backgroundColor: 'var(--cp-blue)', color: 'var(--cp-float)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Create Cycle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
