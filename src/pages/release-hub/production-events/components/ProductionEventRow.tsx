import { useState } from 'react';
import { ChevronRight, Pin } from 'lucide-react';
import type { PcEvent } from '../types/production-events.types';
import { getEventColors, PINNED_BORDER } from '../utils/event-colors';
import { formatDeploymentDate } from '../utils/period-helpers';
import { ProductionEventDetail } from './ProductionEventDetail';

interface Props {
  event: PcEvent;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}

export function ProductionEventRow({ event, index, expanded, onToggle }: Props) {
  const colors = getEventColors(event.event_type, event.is_pinned);
  const [hovered, setHovered] = useState(false);

  // Build subtitle from epic summary
  const subtitle = event.source_epic_summary ?? '';

  return (
    <>
      <tr
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          cursor: 'pointer',
          background: hovered ? '#EFF6FF' : expanded ? '#FAFBFD' : '#FFFFFF',
          transition: 'background 120ms ease',
          borderLeft: `4px solid ${colors.border}`,
        }}
      >
        {/* # */}
        <td style={{
          width: 48, padding: '10px 12px', textAlign: 'center',
          fontSize: 12, fontWeight: 500, color: '#64748B',
          fontFamily: "'JetBrains Mono', monospace",
          verticalAlign: 'middle',
        }}>
          <div className="flex items-center justify-center gap-1">
            {event.is_pinned && <Pin size={11} color={PINNED_BORDER} strokeWidth={2.5} />}
            <span>{index + 1}</span>
          </div>
        </td>

        {/* Event */}
        <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
          <div className="flex items-center gap-2">
            <ChevronRight
              size={14}
              color="#94A3B8"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
                transition: 'transform 150ms ease',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 650, color: '#0F172A',
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {event.event_title}
              </div>
              {subtitle && (
                <div style={{
                  fontSize: 12.5, fontWeight: 400, color: '#475569',
                  fontFamily: "'Inter', sans-serif", marginTop: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Type */}
        <td style={{ width: 120, padding: '10px 12px', verticalAlign: 'middle' }}>
          <span
            className="inline-flex items-center gap-1.5 rounded-full"
            style={{
              padding: '3px 10px', fontSize: 11, fontWeight: 600,
              background: colors.pillBg, color: colors.pillText,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.border, flexShrink: 0 }} />
            {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
          </span>
        </td>

        {/* Release */}
        <td style={{ width: 110, padding: '10px 12px', verticalAlign: 'middle' }}>
          {event.linked_release_versions.length > 0 ? (
            <span style={{
              fontSize: 11.5, fontWeight: 600, color: '#475569',
              fontFamily: "'JetBrains Mono', monospace",
              background: '#F1F5F9', padding: '2px 8px', borderRadius: 4,
            }}>
              {event.linked_release_versions[0]}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>
          )}
        </td>

        {/* Deployed */}
        <td style={{
          width: 160, padding: '10px 12px', verticalAlign: 'middle',
          fontSize: 12.5, fontWeight: 400, color: '#475569',
          fontFamily: "'Inter', sans-serif",
        }}>
          {formatDeploymentDate(event.deployment_date)}
        </td>

        {/* Stories */}
        <td style={{
          width: 90, padding: '10px 12px', verticalAlign: 'middle',
          fontSize: 12.5, fontWeight: 500, color: '#64748B',
          fontFamily: "'Inter', sans-serif",
        }}>
          {event.linked_ticket_count} {event.linked_ticket_count === 1 ? 'story' : 'stories'}
        </td>
      </tr>

      {/* Expanded Detail */}
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <ProductionEventDetail event={event} />
          </td>
        </tr>
      )}
    </>
  );
}
