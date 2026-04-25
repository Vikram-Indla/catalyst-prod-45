/**
 * ReleaseHealthSection — Mini release health cards
 * Phase 8
 */
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ReleaseProgress } from '@/types/workhub.types';
import { StackedProgressBar, releaseProgressSegments } from '../shared/StackedProgressBar';

interface ReleaseHealthSectionProps {
  releases: ReleaseProgress[];
}

export function ReleaseHealthSection({ releases }: ReleaseHealthSectionProps) {
  const navigate = useNavigate();
  const active = releases.filter(r => r.status === 'Active' || r.status === 'At Risk');

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{
          fontFamily: 'var(--ds-font-family-body)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--fg-1)',
          margin: 0,
        }}>
          Release Health
        </h2>
        <button
          onClick={() => navigate('/projecthub/releases')}
          style={{
            fontFamily: 'var(--ds-font-family-body)',
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
          View All <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {active.length === 0 ? (
        <p style={{
          fontFamily: 'var(--ds-font-family-body)',
          fontSize: 13,
          color: 'var(--fg-4)',
        }}>
          No active releases
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}
          className="max-[700px]:grid-cols-1">
          {active.map(release => {
            const isOverdue = release.target_date && new Date(release.target_date) < new Date() && release.status !== 'Completed';
            return (
              <div
                key={release.id}
                onClick={() => navigate(`/projecthub/releases/${release.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/projecthub/releases/${release.id}`)}
                style={{
                  background: 'var(--cp-float)',
                  border: '1px solid var(--divider)',
                  borderLeft: `3px solid ${release.color}`,
                  borderRadius: 'var(--wh-radius-lg, 12px)',
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                className="hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {/* Name + title */}
                <div style={{
                  fontFamily: 'var(--ds-font-family-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--fg-1)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: 6,
                }}>
                  {release.name} · {release.title}
                </div>

                {/* Status + percent */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: release.status === 'At Risk' ? 'var(--sem-danger)' : 'var(--cp-blue)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: release.status === 'At Risk' ? 'var(--sem-danger)' : 'var(--cp-blue)',
                      display: 'inline-block',
                    }} />
                    {release.status}
                  </span>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--fg-1)',
                  }}>
                    {release.completion_percent}%
                  </span>
                </div>

                {/* Progress bar */}
                <StackedProgressBar
                  segments={releaseProgressSegments(release)}
                  total={release.total_items}
                  height={6}
                  showLegend={false}
                  showPercent={false}
                />

                {/* Bottom: items + due */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 8,
                  fontFamily: 'var(--ds-font-family-body)',
                  fontSize: 12,
                  color: 'var(--fg-4)',
                }}>
                  <span>{release.total_items} items</span>
                  <span style={{ color: isOverdue ? 'var(--sem-danger)' : undefined, fontWeight: isOverdue ? 600 : undefined }}>
                    {isOverdue ? 'Overdue' : `Due ${release.target_date}`}
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
