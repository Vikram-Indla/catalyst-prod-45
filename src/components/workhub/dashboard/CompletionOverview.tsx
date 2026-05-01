/**
 * CompletionOverview — Overall portfolio completion section
 * Phase 8
 */
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { DashboardKPIs } from '@/types/workhub.types';
import { StackedProgressBar } from '../shared/StackedProgressBar';
import { ProgressRing } from '../shared/ProgressRing';

interface CompletionOverviewProps {
  kpis: DashboardKPIs;
}

export function CompletionOverview({ kpis }: CompletionOverviewProps) {
  const navigate = useNavigate();
  const active = kpis.total_work_items - kpis.done_work_items - kpis.blocked_items;

  const segments = [
    { label: 'Done', value: kpis.done_work_items, color: 'var(--sem-success)' },
    { label: 'Active', value: Math.max(active, 0), color: 'var(--cp-blue)' },
    { label: 'Blocked', value: kpis.blocked_items, color: 'var(--sem-danger)' },
  ];

  return (
    <div style={{
      background: 'var(--cp-float)',
      border: '1px solid var(--divider)',
      borderRadius: 'var(--wh-radius-xl, 16px)',
      padding: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{
          fontFamily: 'var(--cp-font-body)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--fg-1)',
          margin: 0,
        }}>
          Overall Completion
        </h2>
        <button
          onClick={() => navigate('/projecthub/workitems')}
          style={{
            fontFamily: 'var(--cp-font-body)',
            fontSize: 13,
            color: 'var(--cp-blue)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
          className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded"
        >
          View Work Items <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Large Progress Bar */}
      <StackedProgressBar
        segments={segments}
        total={kpis.total_work_items}
        height={14}
        showLegend={false}
        showPercent={true}
        percentValue={Math.round(kpis.overall_completion_percent)}
      />

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginTop: 10,
        fontFamily: 'var(--cp-font-body)',
        fontSize: 13,
        color: 'var(--fg-3)',
        flexWrap: 'wrap',
      }}>
        <span>{kpis.total_work_items} total</span>
        <span>·</span>
        <span>{kpis.done_work_items} done</span>
        <span>·</span>
        <span>{Math.max(active, 0)} active</span>
        <span>·</span>
        <span style={{ color: kpis.blocked_items > 0 ? 'var(--sem-danger)' : undefined }}>
          {kpis.blocked_items} blocked
        </span>
      </div>

      {/* Bottom row: Ring + Quick stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid var(--bg-1)',
      }}>
        <ProgressRing
          percent={kpis.overall_completion_percent}
          size={60}
          strokeWidth={5}
          color="var(--ds-text-brand, #2563eb)"
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => navigate('/projecthub/themes')}
            style={{
              fontFamily: 'var(--cp-font-body)',
              fontSize: 13,
              color: 'var(--fg-3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
            }}
            className="hover:text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded"
          >
            Active Themes: <strong style={{ color: 'var(--fg-1)' }}>{kpis.active_themes}</strong>
          </button>
          <button
            onClick={() => navigate('/projecthub/resource360')}
            style={{
              fontFamily: 'var(--cp-font-body)',
              fontSize: 13,
              color: 'var(--fg-3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
            }}
            className="hover:text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded"
          >
            Resources: <strong style={{ color: 'var(--fg-1)' }}>{kpis.total_resources}</strong>
          </button>
          <span style={{
            fontFamily: 'var(--cp-font-body)',
            fontSize: 13,
            color: kpis.blocked_items > 0 ? 'var(--sem-danger)' : 'var(--fg-3)',
          }}>
            Blocked: <strong>{kpis.blocked_items}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
