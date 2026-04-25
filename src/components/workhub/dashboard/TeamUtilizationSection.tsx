/**
 * TeamUtilizationSection — Utilization bars for all resources
 * Phase 8
 */
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ResourceUtilization } from '@/types/workhub.types';
import { AvatarChip } from '../shared/AvatarChip';
import { UtilizationBar } from '../shared/UtilizationBar';
import { DepartmentBadge } from '../shared/DepartmentBadge';

interface TeamUtilizationSectionProps {
  resources: ResourceUtilization[];
}

function truncateName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  return parts[0] || '';
}

const LEGEND = [
  { label: '>80% Over-utilized', color: 'var(--sem-danger)' },
  { label: '60-80% Busy', color: 'var(--sem-warning)' },
  { label: '40-60% Healthy', color: 'var(--sem-success)' },
  { label: '<40% Under-utilized', color: 'var(--fg-4)' },
];

export function TeamUtilizationSection({ resources }: TeamUtilizationSectionProps) {
  const navigate = useNavigate();
  const sorted = [...resources].sort((a, b) => b.utilization_percent - a.utilization_percent);

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
          fontFamily: 'var(--ds-font-family-body)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--fg-1)',
          margin: 0,
        }}>
          Team Utilization
        </h2>
        <button
          onClick={() => navigate('/project-hub/resource360')}
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
          View Resource 360 <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map(resource => (
          <div
            key={resource.id}
            onClick={() => navigate(`/project-hub/resource360/${resource.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate(`/project-hub/resource360/${resource.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 4px',
              borderRadius: 'var(--wh-radius-md, 8px)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            className="hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {/* Avatar + Name */}
            <div style={{
              width: 140,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <AvatarChip name={resource.name} color={resource.color} size={28} />
              <span style={{
                fontFamily: 'var(--ds-font-family-body)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--fg-1)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {truncateName(resource.name)}
              </span>
            </div>

            {/* Bar */}
            <div style={{ flex: 1 }}>
              <UtilizationBar
                percent={resource.utilization_percent}
                height={8}
                compact
                showWarning={false}
              />
            </div>

            {/* Department */}
            {resource.department && (
              <div style={{ flexShrink: 0 }}>
                <DepartmentBadge department={resource.department} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginTop: 16,
        paddingTop: 12,
        borderTop: '1px solid var(--bg-1)',
        flexWrap: 'wrap',
      }}>
        {LEGEND.map(item => (
          <span key={item.label} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--ds-font-family-body)',
            fontSize: 11,
            color: 'var(--fg-4)',
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: item.color,
              display: 'inline-block',
            }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
