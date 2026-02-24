import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { ProductionIssue } from '../hooks/useProductionEvents';
import { formatDeploymentDate } from '../utils/period-helpers';
import { getIssueTypeColor } from '../utils/event-colors';

interface Props {
  event: ProductionIssue;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}

const JIRA_BASE = 'https://jira.example.com/browse/';

export function ProductionEventRow({ event, index, expanded, onToggle }: Props) {
  const [hovered, setHovered] = useState(false);
  const typeColor = getIssueTypeColor(event.issue_type);
  const releaseLabel = event.fix_versions?.[0]?.name ?? null;

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
          borderLeft: `3px solid ${typeColor}`,
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        {/* # */}
        <td style={{
          width: 44, padding: '8px 12px', textAlign: 'center',
          fontSize: 12, fontWeight: 500, color: '#64748B',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {index + 1}
        </td>

        {/* Ticket Key */}
        <td style={{ width: 110, padding: '8px 12px' }}>
          <a
            href={`${JIRA_BASE}${event.issue_key}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
              color: typeColor, textDecoration: 'none',
            }}
          >
            {event.issue_key}
          </a>
        </td>

        {/* Type */}
        <td style={{ width: 120, padding: '8px 12px' }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', fontSize: 11, fontWeight: 600,
              borderRadius: 12,
              background: `${typeColor}14`, color: typeColor,
            }}
          >
            {event.type_icon_url && (
              <img src={event.type_icon_url} alt="" style={{ width: 13, height: 13 }} />
            )}
            {event.issue_type}
          </span>
        </td>

        {/* Project */}
        <td style={{ width: 140, padding: '8px 12px', fontSize: 12, fontWeight: 500, color: '#475569' }}>
          <span style={{
            background: '#F1F5F9', padding: '2px 8px', borderRadius: 4,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
          }}>
            {event.project_key}
          </span>
        </td>

        {/* Summary */}
        <td style={{ padding: '8px 12px' }}>
          <div className="flex items-center gap-2">
            <ChevronRight
              size={13}
              color="#94A3B8"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
                transition: 'transform 150ms ease',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: '#0F172A',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 400,
              }}>
                {event.summary}
              </div>
              {event.parent_summary && (
                <div style={{
                  fontSize: 11.5, color: '#64748B', marginTop: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: 400,
                }}>
                  {event.parent_key}: {event.parent_summary}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Assignee */}
        <td style={{
          width: 150, padding: '8px 12px',
          fontSize: 12, fontWeight: 400, color: '#475569',
        }}>
          {event.assignee_display_name || '—'}
        </td>

        {/* Deployed */}
        <td style={{
          width: 140, padding: '8px 12px',
          fontSize: 12, fontWeight: 400, color: '#475569',
        }}>
          {formatDeploymentDate(event.jira_updated_at)}
        </td>
      </tr>

      {/* Expanded Detail */}
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: 0 }}>
            <div style={{
              background: '#FAFBFD', padding: '20px 32px 20px 68px',
              borderTop: '1px solid #F1F5F9',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</span>
                  <div style={{ fontWeight: 500, color: '#0F172A', marginTop: 2 }}>{event.priority || '—'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Release</span>
                  <div style={{ fontWeight: 500, color: '#0F172A', marginTop: 2 }}>{releaseLabel || '—'}</div>
                </div>
                {event.parent_summary && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parent Epic</span>
                    <div style={{ fontWeight: 500, color: '#0F172A', marginTop: 2 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#2563EB', marginRight: 6 }}>{event.parent_key}</span>
                      {event.parent_summary}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
