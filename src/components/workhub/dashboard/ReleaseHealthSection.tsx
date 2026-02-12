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
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--wh-text-primary, #0f172a)',
          margin: 0,
        }}>
          Release Health
        </h2>
        <button
          onClick={() => navigate('/workhub/releases')}
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
          View All <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {active.length === 0 ? (
        <p style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 13,
          color: 'var(--wh-text-tertiary, #94a3b8)',
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
                onClick={() => navigate(`/workhub/releases/${release.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/workhub/releases/${release.id}`)}
                style={{
                  background: 'var(--wh-surface, #fff)',
                  border: '1px solid var(--wh-border, #e2e8f0)',
                  borderLeft: `3px solid ${release.color}`,
                  borderRadius: 'var(--wh-radius-lg, 12px)',
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'var(--wh-transition-fast, all 150ms ease)',
                }}
                className="hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {/* Name + title */}
                <div style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--wh-text-primary, #0f172a)',
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
                    color: release.status === 'At Risk' ? '#ef4444' : '#2563eb',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: release.status === 'At Risk' ? '#ef4444' : '#2563eb',
                      display: 'inline-block',
                    }} />
                    {release.status}
                  </span>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--wh-text-primary, #0f172a)',
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
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 12,
                  color: 'var(--wh-text-tertiary, #94a3b8)',
                }}>
                  <span>{release.total_items} items</span>
                  <span style={{ color: isOverdue ? '#ef4444' : undefined, fontWeight: isOverdue ? 600 : undefined }}>
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
