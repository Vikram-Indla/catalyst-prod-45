import { useState } from 'react';
import { ChevronRight, Pin } from 'lucide-react';
import type { ProductionEvent } from '../hooks/useProductionEvents';
import { formatDeploymentDate } from '../utils/period-helpers';
import { getClassifiedColors, type ClassifiedEventType } from '../utils/event-colors';

interface Props {
  event: ProductionEvent & { eventType: string };
  index: number;
  expanded: boolean;
  onToggle: () => void;
}

const JIRA_BASE = 'https://jira.example.com/browse/';

// Fix 7: Smart impact text
function generateImpactText(event: ProductionEvent & { eventType: string }): string {
  const count = event.stories.length;
  const epicName = event.parentSummary || event.title;
  if (event.eventType === 'incident') {
    return `This fix resolves ${event.title.toLowerCase()}, ensuring uninterrupted service and data integrity for all platform users.`;
  }
  return `This ${count > 1 ? count + '-story' : ''} enhancement to ${epicName} strengthens the platform's capabilities for investors and stakeholders.`;
}

// Fix 8: Clean narrative text
function formatNarrative(stories: ProductionEvent['stories']): string {
  const summaries = stories
    .map(s => s.summary?.trim())
    .filter(Boolean)
    .map(s => s!.replace(/\.\s*$/, '').replace(/-CR\s*\.?/g, '').trim())
    .map(s => s.endsWith('.') ? s : s + '.');

  if (summaries.length === 0) return '';
  if (summaries.length === 1) return summaries[0];
  return `This update encompasses ${summaries.length} changes: ${summaries.join(' ')}`;
}

// Fix 3: Event type label
const EVENT_TYPE_LABELS: Record<string, string> = {
  feature: 'Feature',
  incident: 'Incident',
  improvement: 'Improvement',
  security: 'Security',
};

export function ProductionEventRow({ event, index, expanded, onToggle }: Props) {
  const [hovered, setHovered] = useState(false);
  const colors = getClassifiedColors(event.eventType as ClassifiedEventType);

  // Fix 2: Impact label
  const impactLabel = event.eventType === 'incident' ? 'Resolution Impact' : 'Investor Impact';

  return (
    <>
      {/* Summary Row — Fix 22: 4px left border, Fix 30: hover bg-blue-50 */}
      <tr
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          cursor: 'pointer',
          background: hovered ? '#EFF6FF' : expanded ? '#FAFBFD' : '#FFFFFF',
          transition: 'background 120ms ease',
          borderBottom: expanded ? 'none' : '1px solid #F1F5F9',
        }}
      >
        {/* # — Fix 16: padding, Fix 22: 4px left border via box-shadow */}
        <td style={{
          width: 48, padding: '14px 16px', paddingLeft: 20, textAlign: 'center',
          fontSize: 13, fontWeight: 500, color: '#64748B',
          fontFamily: "'Inter', sans-serif", verticalAlign: 'top',
          boxShadow: `inset 4px 0 0 ${colors.border}`,
        }}>
          {index + 1}
          {event.stories.length > 3 && (
            <div style={{ marginTop: 4 }}>
              <Pin size={12} color="#B45309" style={{ transform: 'rotate(45deg)' }} />
            </div>
          )}
        </td>

        {/* Event — Fix 17: 14px/650, Fix 18: subtitle distinct */}
        <td style={{ padding: '14px 16px', maxWidth: 380, verticalAlign: 'top' }}>
          <div className="flex items-start gap-2">
            <ChevronRight
              size={14}
              color="#94A3B8"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
                transition: 'transform 150ms ease',
                flexShrink: 0,
                marginTop: 3,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 650, color: '#0F172A',
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.35,
              }}>
                {event.title}
              </div>
              {event.subtitle && (
                <div style={{
                  fontSize: 12.5, fontWeight: 400, color: '#475569', marginTop: 2,
                  lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {event.subtitle}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Type pill — Fix 3: classified type, exact pill colors */}
        <td style={{ width: 130, padding: '14px 16px', verticalAlign: 'top' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', fontSize: 11.5, fontWeight: 700,
            borderRadius: 4,
            background: colors.pillBg, color: colors.pillText,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: colors.dot, flexShrink: 0,
            }} />
            {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
          </span>
        </td>

        {/* Release — Fix 29: styled tag */}
        <td style={{ width: 130, padding: '14px 16px', verticalAlign: 'top' }}>
          {event.release ? (
            <span style={{
              display: 'inline-block',
              padding: '3px 10px', fontSize: 12, fontWeight: 600,
              borderRadius: 4, border: '1px solid #E2E8F0',
              color: '#1E293B', background: '#F8FAFC',
              fontFamily: "'Inter', sans-serif",
            }}>
              {event.release}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: '#64748B' }}>—</span>
          )}
        </td>

        {/* Deployed */}
        <td style={{
          width: 160, padding: '14px 16px', verticalAlign: 'top',
          fontSize: 13, fontWeight: 400, color: '#475569',
        }}>
          {formatDeploymentDate(event.deployedAt)}
        </td>

        {/* Stories count */}
        <td style={{
          width: 80, padding: '14px 16px', textAlign: 'center', verticalAlign: 'top',
          fontSize: 13, fontWeight: 600, color: '#334155',
        }}>
          {event.stories.length}
        </td>
      </tr>

      {/* Expanded Detail Panel */}
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid #E2E8F0' }}>
            {/* Fix 22: 4px left border, Fix 23: bg #FAFBFD, Fix 24: 68px left pad */}
            <div style={{
              padding: '28px 32px 28px 68px',
              background: '#FAFBFD',
              boxShadow: `inset 4px 0 0 ${colors.border}`,
            }}>

              {/* Fix 10: Georgia serif 20px title */}
              <h2 style={{
                fontSize: 20, fontWeight: 700, color: '#020617',
                fontFamily: "Georgia, 'Times New Roman', serif",
                margin: '0 0 20px',
                lineHeight: 1.3, letterSpacing: '-0.01em',
              }}>
                {event.title}
              </h2>

              {/* WHAT CHANGED — Fix 25: section label, Fix 11: Georgia 15px, Fix 20: 22px spacing */}
              <div style={{ marginBottom: 22 }}>
                <h3 style={{
                  fontSize: 11.5, fontWeight: 700, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  margin: '0 0 8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  What Changed
                </h3>
                <p style={{
                  fontSize: 15, color: '#1E293B', lineHeight: 1.72,
                  fontFamily: "Georgia, 'Times New Roman', serif", margin: 0,
                }}>
                  {formatNarrative(event.stories)}
                </p>
              </div>

              {/* IMPACT BLOCK — Fix 2: label, Fix 12: Georgia 14.5px, Fix 19: asymmetric radius */}
              <div style={{
                borderLeft: `3px solid ${colors.border}`,
                background: '#F8FAFC',
                padding: '16px 20px',
                borderRadius: '2px 8px 8px 2px',
                marginBottom: 22,
              }}>
                <h4 style={{
                  fontSize: 11.5, fontWeight: 700, color: colors.border,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  margin: '0 0 8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {impactLabel}
                </h4>
                <p style={{
                  fontSize: 14.5, color: '#0F172A', lineHeight: 1.65,
                  fontFamily: "Georgia, 'Times New Roman', serif", margin: 0,
                }}>
                  {generateImpactText(event)}
                </p>
              </div>

              {/* CONSOLIDATED TICKETS — Fix 25: section label */}
              <div style={{ marginBottom: 22 }}>
                <h3 style={{
                  fontSize: 11.5, fontWeight: 700, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  margin: '0 0 8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Consolidated Tickets
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {event.stories.map(story => (
                    <div key={story.issue_key} className="flex items-center gap-4" style={{ fontSize: 14 }}>
                      <a
                        href={`${JIRA_BASE}${story.issue_key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13, fontWeight: 700,
                          color: colors.ticketColor, textDecoration: 'none',
                          minWidth: 120,
                        }}
                      >
                        {story.issue_key}
                      </a>
                      <span style={{ color: '#334155', fontFamily: "'Inter', sans-serif" }}>
                        {story.summary}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fix 9: Metadata bar — Epic | Release | Change | Status */}
              {/* Fix 21: exact styling */}
              <div style={{
                display: 'flex',
                background: '#F8FAFC',
                border: '1px solid #F1F5F9',
                borderRadius: 6,
                overflow: 'hidden',
                marginTop: 24,
              }}>
                {[
                  { label: 'Epic', value: event.parentKey ? `${event.parentSummary} (${event.parentKey})` : '—' },
                  { label: 'Release', value: event.release || '—', isLink: !!event.release },
                  { label: 'Change', value: '—' },
                  { label: 'Status', value: 'In Production' },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    style={{
                      padding: '10px 16px',
                      borderRight: i < 3 ? '1px solid #F1F5F9' : 'none',
                      flex: 1,
                    }}
                  >
                    <strong style={{
                      display: 'block',
                      fontWeight: 700, color: '#0F172A',
                      fontSize: 12, marginBottom: 1,
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {item.label}
                    </strong>
                    <div style={{
                      fontSize: 12.5, fontWeight: 500,
                      color: item.isLink ? '#2563EB' : '#1E293B',
                      fontFamily: "'Inter', sans-serif",
                      lineHeight: 1.4,
                    }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Fix 15: Regenerate Narrative button */}
              <button
                onClick={e => e.stopPropagation()}
                style={{
                  marginTop: 16,
                  fontSize: 11.5, fontWeight: 500,
                  color: '#94A3B8', background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 6, padding: '4px 12px',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLButtonElement).style.background = '#F8FAFC';
                  (e.target as HTMLButtonElement).style.color = '#475569';
                  (e.target as HTMLButtonElement).style.borderColor = '#E2E8F0';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLButtonElement).style.background = 'transparent';
                  (e.target as HTMLButtonElement).style.color = '#94A3B8';
                  (e.target as HTMLButtonElement).style.borderColor = 'transparent';
                }}
              >
                ↻ Regenerate Narrative
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
