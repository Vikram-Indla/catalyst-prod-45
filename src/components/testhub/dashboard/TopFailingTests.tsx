/**
 * TopFailingTests — G5-06
 * Shows tests that fail most frequently across all cycles
 */

import { useNavigate } from 'react-router-dom';
import { XCircle, Eye, AlertTriangle, TrendingDown } from 'lucide-react';
import { formatTimeAbbreviated } from '@/lib/formatTimeAgo';

export interface FailingTest {
  test_case_id: string;
  case_key: string;
  title: string;
  priority: string;
  failure_count: number;
  last_failed: string;
}

interface Props {
  tests: FailingTest[];
}

const PRIORITY_CFG: Record<string, { color: string; bg: string }> = {
  critical: { color: 'var(--sem-danger)', bg: 'var(--ds-background-danger, #FEF2F2)' },
  high:     { color: '#EA580C', bg: '#FFF7ED' },
  medium:   { color: 'var(--sem-warning)', bg: '#FFFBEB' },
  low:      { color: 'var(--sem-success)', bg: '#ECFDF5' },
};

export function TopFailingTests({ tests }: Props) {
  const navigate = useNavigate();

  if (tests.length === 0) return null;

  return (
    <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--divider)', borderRadius: 12, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 50, borderRadius: 12, backgroundColor: 'var(--ds-background-danger, #FEF2F2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingDown size={18} color="var(--sem-danger)" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>Top Failing Tests</p>
          <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>Tests that fail most frequently across all cycles</p>
        </div>
      </div>

      {/* Warning banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', backgroundColor: '#FFFBEB', border: '1px solid color-mix(in srgb, var(--sem-warning) 30%, transparent)', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#92400E' }}>
        <AlertTriangle size={15} color="var(--sem-warning)" style={{ flexShrink: 0 }} />
        These tests have failed multiple times. Consider reviewing them for recurring issues or updating the test cases.
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tests.map((test, index) => {
          const pri = PRIORITY_CFG[test.priority?.toLowerCase()] || PRIORITY_CFG.medium;
          return (
            <div
              key={test.test_case_id}
              onClick={() => navigate(`/testhub/repository?view=${test.test_case_id}`)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', backgroundColor: 'var(--ds-background-danger, #FEF2F2)', borderRadius: 12, cursor: 'pointer', border: '1px solid color-mix(in srgb, var(--sem-danger) 20%, transparent)', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--sem-danger) 30%, transparent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--ds-background-danger, #FEF2F2)'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--sem-danger) 20%, transparent)'; }}
            >
              {/* Left */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--sem-danger)', flexShrink: 0 }}>
                  {index + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sem-danger)', backgroundColor: '#FEE2E2', padding: '1px 8px', borderRadius: 6 }}>{test.case_key}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: pri.color, backgroundColor: pri.bg, padding: '1px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{test.priority || 'medium'}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--fg-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.title}</p>
                </div>
              </div>

              {/* Right */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0, marginLeft: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <XCircle size={14} color="var(--sem-danger)" />
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--sem-danger)' }}>{test.failure_count}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#92400E', margin: 0 }}>{test.failure_count === 1 ? 'failure' : 'failures'}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>
                    {test.last_failed ? formatTimeAbbreviated(test.last_failed) : '—'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--fg-3)', margin: 0 }}>last failed</p>
                </div>
                <Eye size={16} color="var(--fg-3)" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
