/**
 * DefectStatsWidget — G6 Defect Stats for TestHub Dashboard
 * Displays defect statistics from get_defect_stats RPC
 */

import { Bug, AlertCircle, CheckCircle2, Clock, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface DefectStats {
  total_defects: number;
  open_defects: number;
  in_progress_defects: number;
  fixed_defects: number;
  closed_defects: number;
  verified_defects: number;
  critical_defects: number;
  high_defects: number;
  medium_defects: number;
  low_defects: number;
}

interface Props {
  stats: DefectStats | null;
}

const SEVERITY_BARS = [
  { key: 'critical_defects', label: 'Critical', color: 'var(--sem-danger)' },
  { key: 'high_defects', label: 'High', color: '#EA580C' },
  { key: 'medium_defects', label: 'Medium', color: 'var(--sem-warning)' },
  { key: 'low_defects', label: 'Low', color: 'var(--sem-success)' },
] as const;

export function DefectStatsWidget({ stats }: Props) {
  const navigate = useNavigate();
  const total = stats?.total_defects ?? 0;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-app)',
        border: '1px solid var(--divider)',
        borderRadius: 12,
        padding: 24,
        cursor: 'pointer',
        transition: 'box-shadow .15s',
      }}
      onClick={() => navigate('/testhub/defects')}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 50, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--sem-danger) 0%, #B91C1C 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bug size={18} color="var(--ds-text-inverse, #FFFFFF)" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>
              Defect Tracker
            </h3>
            <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>
              {total} total defects
            </p>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)',
          cursor: 'pointer',
        }}>
          View All →
        </span>
      </div>

      {/* Status Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
        marginBottom: 20,
      }}>
        {[
          { label: 'Open', value: stats?.open_defects ?? 0, icon: AlertCircle, color: 'var(--sem-danger)' },
          { label: 'In Progress', value: stats?.in_progress_defects ?? 0, icon: Clock, color: 'var(--cp-blue)' },
          { label: 'Fixed', value: stats?.fixed_defects ?? 0, icon: CheckCircle2, color: 'var(--sem-success)' },
          { label: 'Closed', value: stats?.closed_defects ?? 0, icon: TrendingDown, color: 'var(--fg-3)' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} style={{
              textAlign: 'center', padding: '10px 4px',
              backgroundColor: 'color-mix(in srgb, var(--bg-2) 30%, transparent)', borderRadius: 8,
            }}>
              <Icon size={14} color={item.color} style={{ marginBottom: 4 }} />
              <p style={{
                fontSize: 18, fontWeight: 700, color: item.color,
                margin: '2px 0', fontVariantNumeric: 'tabular-nums',
              }}>
                {item.value}
              </p>
              <p style={{ fontSize: 10, color: 'var(--fg-3)', margin: 0, fontWeight: 500 }}>
                {item.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Severity Breakdown */}
      <div>
        <p style={{
          fontSize: 11, fontWeight: 600, color: 'var(--fg-3)',
          margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em',
        }}>
          By Severity
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SEVERITY_BARS.map(bar => {
            const count = stats?.[bar.key] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={bar.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 500, color: 'var(--fg-3)',
                  width: 52, flexShrink: 0,
                }}>
                  {bar.label}
                </span>
                <div style={{
                  flex: 1, height: 6, borderRadius: 4,
                  backgroundColor: 'color-mix(in srgb, var(--bg-2) 40%, transparent)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 4,
                    backgroundColor: bar.color,
                    transition: 'width .3s ease',
                    minWidth: count > 0 ? 4 : 0,
                  }} />
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--fg-1)',
                  width: 24, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
