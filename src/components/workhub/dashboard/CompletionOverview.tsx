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
    { label: 'Done', value: kpis.done_work_items, color: '#16a34a' },
    { label: 'Active', value: Math.max(active, 0), color: '#2563eb' },
    { label: 'Blocked', value: kpis.blocked_items, color: '#ef4444' },
  ];

  return (
    <div style={{
      background: 'var(--wh-surface, #fff)',
      border: '1px solid var(--wh-border, #e2e8f0)',
      borderRadius: 'var(--wh-radius-xl, 16px)',
      padding: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--wh-text-primary, #0f172a)',
          margin: 0,
        }}>
          Overall Completion
        </h2>
        <button
          onClick={() => navigate('/workhub/workitems')}
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
            color: 'var(--wh-primary, #2563eb)',
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
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
        color: 'var(--wh-text-secondary, #64748b)',
        flexWrap: 'wrap',
      }}>
        <span>{kpis.total_work_items} total</span>
        <span>·</span>
        <span>{kpis.done_work_items} done</span>
        <span>·</span>
        <span>{Math.max(active, 0)} active</span>
        <span>·</span>
        <span style={{ color: kpis.blocked_items > 0 ? '#ef4444' : undefined }}>
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
        borderTop: '1px solid var(--wh-border-light, #f1f5f9)',
      }}>
        <ProgressRing
          percent={kpis.overall_completion_percent}
          size={60}
          strokeWidth={5}
          color="#2563eb"
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => navigate('/workhub/themes')}
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 13,
              color: 'var(--wh-text-secondary, #64748b)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
            }}
            className="hover:text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded"
          >
            Active Themes: <strong style={{ color: 'var(--wh-text-primary, #0f172a)' }}>{kpis.active_themes}</strong>
          </button>
          <button
            onClick={() => navigate('/workhub/resource360')}
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 13,
              color: 'var(--wh-text-secondary, #64748b)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
            }}
            className="hover:text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded"
          >
            Resources: <strong style={{ color: 'var(--wh-text-primary, #0f172a)' }}>{kpis.total_resources}</strong>
          </button>
          <span style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
            color: kpis.blocked_items > 0 ? '#ef4444' : 'var(--wh-text-secondary, #64748b)',
          }}>
            Blocked: <strong>{kpis.blocked_items}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
