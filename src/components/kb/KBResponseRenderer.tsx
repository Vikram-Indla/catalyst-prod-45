import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Clock, ArrowUpRight } from 'lucide-react';
import type { KBQueryResponse } from '@/services/knowledgeBase';

interface KBResponseRendererProps {
  response: KBQueryResponse;
  language: 'en';
  onFeedback?: (helpful: boolean) => void;
  feedbackGiven?: boolean;
  onExtend?: (query: string) => void;
  onItemClick?: (issueKey: string) => void;
}

/* ── helpers ── */
const ISSUE_HEADERS = ['issues & risks', 'issues', 'risks', 'blockers'];

const F = {
  inter: "'Inter', -apple-system, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

/* ── V12 Status Lozenge Detection ── */
const STATUS_PATTERNS: Record<string, { bg: string; color: string }> = {
  'done': { bg: '#1B7F37', color: '#FFFFFF' },
  'to do': { bg: '#DFE1E6', color: '#42526E' },
  'todo': { bg: '#DFE1E6', color: '#42526E' },
  'available': { bg: '#1B7F37', color: '#FFFFFF' },
  'open': { bg: '#DFE1E6', color: '#42526E' },
  'ready': { bg: '#0C66E4', color: '#FFFFFF' },
  'fixed': { bg: '#1B7F37', color: '#FFFFFF' },
  'in progress': { bg: '#0C66E4', color: '#FFFFFF' },
  're-open': { bg: '#0C66E4', color: '#FFFFFF' },
  'reopen': { bg: '#0C66E4', color: '#FFFFFF' },
  're-opened': { bg: '#0C66E4', color: '#FFFFFF' },
  'blocked': { bg: '#DFE1E6', color: '#42526E' },
  'under review': { bg: '#0C66E4', color: '#FFFFFF' },
  'in review': { bg: '#0C66E4', color: '#FFFFFF' },
  'analysis': { bg: '#0C66E4', color: '#FFFFFF' },
  'deferred': { bg: '#DFE1E6', color: '#42526E' },
  'closed': { bg: '#DFE1E6', color: '#42526E' },
  'resolved': { bg: '#1B7F37', color: '#FFFFFF' },
  'at capacity': { bg: '#DFE1E6', color: '#42526E' },
  'critical': { bg: '#DFE1E6', color: '#42526E' },
  'high': { bg: '#DFE1E6', color: '#42526E' },
  'medium': { bg: '#DFE1E6', color: '#42526E' },
  'low': { bg: '#DFE1E6', color: '#42526E' },
  'backlog': { bg: '#DFE1E6', color: '#42526E' },
};

function isStatusText(text: string): { bg: string; color: string } | null {
  const clean = text.replace(/^\*+|\*+$/g, '').trim().toLowerCase();
  return STATUS_PATTERNS[clean] || null;
}

const ISSUE_KEY_RE = /^`?([A-Z]{2,10}-\d{1,6})`?$/;

function isIssueKey(text: string): string | null {
  const match = text.trim().match(ISSUE_KEY_RE);
  return match ? match[1] : null;
}

const AGE_RE = /^[⏱\s]*<?(\d+\.?\d*)\s*(h|d|m|hr|hrs|day|days)>?$/i;

function isAgeing(text: string): { value: string; color: string } | null {
  const clean = text.replace(/[⏱\s]/g, '').trim();
  const match = clean.match(AGE_RE);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  let color = '#16A34A';
  if (unit.startsWith('d')) {
    color = num > 3 ? '#DC2626' : '#D97706';
  } else if ((unit === 'h' || unit === 'hr' || unit === 'hrs') && num > 12) {
    color = '#D97706';
  }
  return { value: clean, color };
}

function isHeader(line: string) {
  return /^\*\*[A-Za-z &/]+\*\*$/.test(line.trim());
}
function headerLabel(line: string) {
  return line.replace(/\*\*/g, '').trim();
}
function isDangerHeader(label: string) {
  return ISSUE_HEADERS.some((h) => label.toLowerCase().includes(h));
}

function renderInline(text: string): React.ReactNode[] {
  const COMBINED = /`([A-Z]+-\d+)`|\*\*([^*]+)\*\*|\[SOURCE-(\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = COMBINED.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(
        <code key={key++} style={{
          fontFamily: F.mono,
          color: 'var(--cp-blue)', background: 'var(--cp-blue-wash)', border: '1px solid #DBEAFE',
          borderRadius: 4, padding: '1px 6px', fontSize: 12, fontWeight: 600,
        }}>{match[1]}</code>
      );
    } else if (match[2]) {
      parts.push(<strong key={key++} style={{ color: '#1D4ED8', fontWeight: 700, fontFamily: 'system-ui' }}>{match[2]}</strong>);
    } else if (match[3]) {
      // Hide inline source citations
      // parts.push(<sup>...</sup>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  return parts;
}

function renderSmartCell(cellText: string, colIndex: number): React.ReactNode {
  const trimmed = cellText.trim();

  const key = isIssueKey(trimmed);
  if (key) {
    return (
      <span style={{
        fontSize: 12, fontWeight: 500, color: 'var(--cp-blue)', fontFamily: F.mono,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}>{key}</span>
    );
  }

  const status = isStatusText(trimmed);
  if (status) {
    const label = trimmed.replace(/^\*+|\*+$/g, '').trim();
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', height: 20,
        padding: '0 6px', borderRadius: 4,
        background: status.bg, color: status.color,
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.03em', fontFamily: F.inter,
        lineHeight: '20px', whiteSpace: 'nowrap',
      }}>{label.toUpperCase()}</span>
    );
  }

  const age = isAgeing(trimmed);
  if (age) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: age.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontFamily: F.mono, color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>{age.value}</span>
      </span>
    );
  }

  return <>{renderInline(trimmed)}</>;
}

/* ── Scope Bar Component ── */
function ScopeBar({ totalShown, totalAvailable, scopeLabel, extendLabel, extendHint, onExtend }: {
  totalShown: number;
  totalAvailable: number;
  scopeLabel: string;
  extendLabel?: string;
  extendHint?: string;
  onExtend?: () => void;
}) {
  return (
    <div style={{
      padding: '12px 20px', background: 'var(--bg-1)',
      borderTop: '0.75px solid rgba(15,23,42,0.06)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Scope label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-3)' }}>
        <Clock size={14} strokeWidth={2} color="#64748B" />
        <span>Showing {totalShown} of {totalAvailable} · {scopeLabel}</span>
      </div>

      {/* Extend action */}
      {extendLabel && onExtend && (
        <button
          onClick={onExtend}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', background: 'var(--bg-app)',
            border: '1.5px solid rgba(15,23,42,0.08)', borderRadius: 8,
            cursor: 'pointer', transition: 'all 150ms',
            width: '100%', textAlign: 'left',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#2563EB';
            e.currentTarget.style.background = 'var(--tint-blue, #EFF6FF)';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(37,99,235,0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(15,23,42,0.08)';
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            width: 32, height: 32, minWidth: 32, background: 'var(--cp-blue-wash)',
            borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ArrowUpRight size={16} strokeWidth={2} color="#2563EB" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1D4ED8' }}>{extendLabel}</span>
            {extendHint && <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{extendHint}</span>}
          </div>
        </button>
      )}
    </div>
  );
}

export const KBResponseRenderer: React.FC<KBResponseRendererProps> = ({
  response, language, onFeedback, feedbackGiven, onExtend, onItemClick,
}) => {
  const dir = 'ltr';
  const lines = (response.answer || '').split('\n');
  const [feedbackState, setFeedbackState] = useState<'none' | 'up' | 'down'>('none');
  const [showThanks, setShowThanks] = useState(false);

  const isLiveData = response.category === 'live_data' || response._meta?.source === 'live_query';

  const elements: React.ReactNode[] = [];
  let idx = 0;
  let lastHeaderDanger = false;
  let tableRowCount = 0;

  const isTableRow = (l: string) => l.trim().startsWith('|') && l.trim().endsWith('|');

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) { i++; continue; }

    if (isTableRow(trimmed)) {
      const tableRows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        const cells = lines[i].trim().split('|').filter(Boolean).map(c => c.trim());
        tableRows.push(cells);
        i++;
      }
      tableRowCount += tableRows.length;

      if (isLiveData && tableRows.length > 0) {
        elements.push(
          <div key={idx} style={{
            border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6,
            overflow: 'hidden', margin: '8px 0',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                {tableRows.map((row, ri) => {
                  // Detect if this row has an issue key (for clickability)
                  const rowIssueKey = ri > 0 ? row.reduce<string | null>((found, cell) => {
                    if (found) return found;
                    return isIssueKey(cell.trim());
                  }, null) : null;

                  return (
                  <tr
                    key={ri}
                    style={{
                      height: 50,
                      borderBottom: ri < tableRows.length - 1 ? '0.75px solid rgba(15,23,42,0.06)' : 'none',
                      background: ri === 0 ? var(--bg-2, '#F1F5F9') : 'transparent',
                      transition: 'background 80ms',
                      cursor: rowIssueKey && onItemClick ? 'pointer' : undefined,
                    }}
                    onClick={rowIssueKey && onItemClick ? () => onItemClick(rowIssueKey) : undefined}
                    onMouseEnter={ri > 0 ? (e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.04)'; } : undefined}
                    onMouseLeave={ri > 0 ? (e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; } : undefined}
                  >
                    {row.map((cell, ci) => {
                      if (ri === 0) {
                        return (
                          <th key={ci} style={{
                            padding: '10px 12px', fontSize: 11, fontWeight: 650,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            color: 'var(--fg-3)', fontFamily: F.inter, textAlign: 'left',
                            whiteSpace: 'nowrap',
                            borderBottom: '1.5px solid rgba(15,23,42,0.12)',
                          }}>{cell}</th>
                        );
                      }
                      return (
                        <td key={ci} style={{
                          padding: '8px 12px', fontSize: 13, color: 'var(--fg-1)',
                          fontFamily: F.inter, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          verticalAlign: 'middle',
                        }}>
                          {renderSmartCell(cell, ci)}
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      } else {
        elements.push(
          <div key={idx} style={{ overflowX: 'auto', margin: '8px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, fontFamily: F.inter }}>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={ri} style={{
                    borderBottom: '1px solid #F4F4F5',
                    background: ri % 2 === 0 ? '#FAFAFA' : 'var(--bg-app)',
                  }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: '6px 10px', verticalAlign: 'top',
                        whiteSpace: ci === 0 ? 'nowrap' : 'normal',
                        color: ci === 0 ? 'var(--cp-blue)' : '#374151',
                        fontFamily: ci === 0 ? F.mono : 'inherit',
                        fontWeight: ci === 0 ? 600 : 400,
                        fontSize: ci === 0 ? 11.5 : 12.5,
                        lineHeight: 1.6,
                      }}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      idx++;
      continue;
    }

    if (isHeader(trimmed)) {
      const label = headerLabel(trimmed);
      const danger = isDangerHeader(label);
      lastHeaderDanger = danger;
      elements.push(
        <div key={idx} style={{ marginTop: 20, marginBottom: 6 }}>
          <div style={{ width: 24, height: 2, background: danger ? 'var(--sem-danger)' : 'var(--cp-blue)', borderRadius: 1, marginBottom: 8 }} />
          <h4 style={{
            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px',
            color: danger ? 'var(--sem-danger)' : 'var(--cp-blue)', margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>{label}</h4>
        </div>
      );
      i++; idx++; continue;
    }

    if (trimmed === '---') { i++; continue; }

    if (trimmed.startsWith('####')) {
      const label = trimmed.replace(/^#{1,4}\s*/, '').trim();
      elements.push(
        <div key={idx} style={{ marginTop: 16, marginBottom: 6 }}>
          <div style={{ width: 24, height: 2, background: 'var(--cp-blue)', borderRadius: 1, marginBottom: 8 }} />
          <h4 style={{
            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px',
            color: 'var(--cp-blue)', margin: 0, fontFamily: "system-ui, -apple-system, sans-serif",
          }}>{label}</h4>
        </div>
      );
      i++; idx++; continue;
    }

    if (trimmed.startsWith('- ')) {
      const content = trimmed.slice(2);
      elements.push(
        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4, fontSize: 13.5, lineHeight: 1.7 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: lastHeaderDanger ? 'var(--sem-danger)' : 'var(--cp-blue)', flexShrink: 0, marginTop: 9 }} />
          <span style={{ color: '#374151' }}>{renderInline(content)}</span>
        </div>
      );
      i++; idx++; continue;
    }

    elements.push(
      <p key={idx} style={{
        fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14.5, lineHeight: 1.8,
        color: '#1F2937', margin: '6px 0', letterSpacing: '0.01em',
      }}>{renderInline(trimmed)}</p>
    );
    i++; idx++;
  }

  // Confidence
  const confidence = (response as any).confidence_level || (
    response.confidence >= 0.8 ? 'high' : response.confidence >= 0.5 ? 'medium' : 'low'
  );
  const confConfig = {
    high: { color: '#0D7331', label: 'High confidence' },
    medium: { color: '#D97706', label: 'Medium confidence' },
    low: { color: '#DC2626', label: 'Low confidence — verify with sources' },
    insufficient: { color: '#DC2626', label: 'Insufficient data' },
  }[confidence] || { color: '#71717A', label: '' };

  // Parse "Showing X of Y" from the response text for scope bar
  const showingMatch = (response.answer || '').match(/Showing\s+(\d+)\s+of\s+(\d+)/i);
  const totalShown = showingMatch ? parseInt(showingMatch[1]) : tableRowCount;
  const totalAvailable = showingMatch ? parseInt(showingMatch[2]) : tableRowCount;
  const scopeLabel = isLiveData ? 'Active in last 6 weeks' : 'From indexed sources';

  const handleFeedbackClick = (helpful: boolean) => {
    setFeedbackState(helpful ? 'up' : 'down');
    setShowThanks(true);
    onFeedback?.(helpful);
    setTimeout(() => setShowThanks(false), 2000);
  };

  // Build extend query
  const extendQuery = response.title ? `Show all ${response.title} beyond 6 weeks` : undefined;

  return (
    <div dir={dir}>
      {/* Title */}
      {response.title && (
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#09090B', margin: '0 0 6px', fontFamily: "system-ui, sans-serif" }}>
          {response.title}
        </h3>
      )}

      {/* Body */}
      <div>{elements}</div>

      {/* Scope Bar — between table and footer */}
      {tableRowCount > 0 && (
        <ScopeBar
          totalShown={totalShown}
          totalAvailable={totalAvailable}
          scopeLabel={scopeLabel}
          extendLabel={totalAvailable > totalShown ? `Load older items (${totalAvailable - totalShown} items beyond 6 weeks)` : undefined}
          extendHint={totalAvailable > totalShown ? 'Last activity 2–5 months ago' : undefined}
          onExtend={extendQuery && onExtend ? () => onExtend(extendQuery) : undefined}
        />
      )}

      {/* Footer: confidence + date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {confConfig.label && (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: confConfig.color }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: confConfig.color }}>{confConfig.label}</span>
            </>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: F.inter }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Feedback */}
      {!feedbackGiven && feedbackState === 'none' && onFeedback && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          <button
            onClick={() => handleFeedbackClick(true)}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none', background: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 200ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tint-green, #F0FDF4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            <ThumbsUp size={14} color="#A1A1AA" />
          </button>
          <button
            onClick={() => handleFeedbackClick(false)}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none', background: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 200ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tint-red, #FEF2F2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            <ThumbsDown size={14} color="#A1A1AA" />
          </button>
        </div>
      )}
      {(feedbackGiven || feedbackState !== 'none') && (
        <div style={{ fontSize: 10, color: '#71717A', marginTop: 8, transition: 'opacity 200ms' }}>
          {showThanks ? (
            <span style={{ animation: 'kb-feedback-bounce 200ms ease' }}>Thanks for the feedback</span>
          ) : '✓ Feedback recorded'}
        </div>
      )}

      {/* Meta (hover-visible) */}
      <div className="kb-response-meta" style={{
        marginTop: 8, fontSize: 10, color: '#D4D4D8', opacity: 0, transition: 'opacity 200ms',
      }}>
        ⚡ {response._meta.response_time_ms}ms · {response._meta.source}
        {response._meta.similarity != null && ` · ${(response._meta.similarity * 100).toFixed(0)}% match`}
      </div>

      <style>{`
        @keyframes kb-feedback-bounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default KBResponseRenderer;
