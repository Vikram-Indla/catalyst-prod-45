/**
 * GoalsKeyResultsPage — Stage A skeleton
 * Route: /strategyhub/goals
 * Renders breadcrumb, title, and "+ New Goal" button. No data UI yet.
 */

import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useGoals, useAllKeyResults } from '@/hooks/useGoals';

export default function GoalsKeyResultsPage() {
  const navigate = useNavigate();
  const { data: goals, isLoading: goalsLoading } = useGoals();
  const { data: allKRs, isLoading: krsLoading } = useAllKeyResults();

  // Stage B verification — remove after confirming
  console.log('[Goals Page] Goals:', goals?.length, 'KRs:', allKRs?.length, 'Loading:', goalsLoading || krsLoading);

  return (
    <div style={{ padding: '16px 24px 0' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/strategyhub')}
        >
          StrategyHub
        </span>
        <span style={{ margin: '0 4px', color: '#94A3B8' }}>›</span>
        <span style={{ fontWeight: 600, color: '#0F172A' }}>
          Goals &amp; Key Results
        </span>
      </nav>

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--foreground, #0F172A)',
            margin: 0,
          }}
        >
          Goals &amp; Key Results
        </h1>

        <button
          onClick={() => {
            /* Will open create-goal modal in next stage */
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: '#2563EB',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          New Goal
        </button>
      </div>

      {/* Empty content placeholder */}
      <div
        style={{
          minHeight: 400,
          border: '1px dashed #E2E8F0',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94A3B8',
          fontSize: 14,
        }}
      >
        Content will be added in the next stage
      </div>
    </div>
  );
}
