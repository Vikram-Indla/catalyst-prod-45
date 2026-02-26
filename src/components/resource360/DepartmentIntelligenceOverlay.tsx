/**
 * Department Intelligence Panel — STEERCOM Weekly Events
 * Single section: Hub-grouped weekly events with RAG badges and callout variants.
 * No KPIs, no workload bars, no distribution cards, no leaderboard.
 */
import React, { useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, X, RefreshCw, FileDown } from 'lucide-react';
import { useDeptWeeklyEventsAI, type HubGroup, type HubEvent } from '@/hooks/useDeptWeeklyEventsAI';
import '@/styles/dept-intelligence.css';

interface Props {
  departmentName: string;
  onClose: () => void;
}

export default function DepartmentIntelligenceOverlay({ departmentName, onClose }: Props) {
  const {
    hubGroups, stats, isLoadingStats, isLoadingEvents, isGenerating, hasEvents,
    weekLabel, weekRange, weekOffset, dataAge, meta,
    prevWeek, nextWeek, generateEvents,
  } = useDeptWeeklyEventsAI(departmentName);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Total event count for display
  const totalEvents = hubGroups.reduce((s, g) => s + g.events.length, 0);

  return (
    <div className="di-root">
      <div className="di-backdrop" onClick={onClose} />
      <div className="di-panel">
        {/* TOP BAR */}
        <div className="di-topbar">
          <button className="di-back-btn" onClick={onClose}>← Back</button>
          <div className="di-topbar-sep" />
          <div className="di-topbar-dept-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 13h6"/></svg>
          </div>
          <span className="di-topbar-dept-name">{departmentName}</span>
          <div style={{ flex: 1 }} />
          {dataAge && <span className="di-data-age">{dataAge}</span>}
          <button className="di-refresh-btn" onClick={generateEvents} disabled={isGenerating}>
            {isGenerating ? <RefreshCw size={13} className="di-spin" /> : <Sparkles size={13} strokeWidth={2.2} />}
            <span>{isGenerating ? 'Generating…' : 'Refresh AI'}</span>
          </button>
          <button className="di-ghost-btn"><FileDown size={13} /><span>Export PDF</span></button>
          <button className="di-close-btn" onClick={onClose}><X size={14} /></button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="di-body">
          {/* SECTION HEADER + STATS */}
          <div className="di-section">
            <div className="di-section-header">
              <span>THIS WEEK'S SIGNIFICANT EVENTS</span>
              <span className="di-ai-badge"><Sparkles size={9} strokeWidth={2.5} style={{ marginRight: 3 }} />AI</span>
              <div style={{ flex: 1 }} />
              <div className="di-week-nav">
                <button className="di-week-arrow" onClick={prevWeek}><ChevronLeft size={14} /></button>
                <span className="di-week-label">{weekLabel}</span>
                <span className="di-week-range">{weekRange}</span>
                <button className="di-week-arrow" onClick={nextWeek} disabled={weekOffset === 0}><ChevronRight size={14} /></button>
              </div>
            </div>

            {/* Stats strip */}
            {isLoadingStats ? (
              <div className="di-stats-strip">
                {[1,2,3,4].map(i => (
                  <div key={i} className="di-stats-cell">
                    <div className="di-skeleton-bar" style={{ height: 20, width: 40, margin: '0 auto 4px' }} />
                    <div className="di-skeleton-bar" style={{ height: 10, width: 60, margin: '0 auto' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="di-stats-strip">
                <div className="di-stats-cell">
                  <div className="di-stats-val" style={{ color: '#09090B' }}>{stats.transitions}</div>
                  <div className="di-stats-label">TRANSITIONS</div>
                </div>
                <div className="di-stats-cell">
                  <div className="di-stats-val" style={{ color: '#16A34A' }}>{stats.closed}</div>
                  <div className="di-stats-label">CLOSED</div>
                </div>
                <div className="di-stats-cell">
                  <div className="di-stats-val" style={{ color: '#D97706' }}>{stats.inReview}</div>
                  <div className="di-stats-label">IN REVIEW</div>
                </div>
                <div className="di-stats-cell">
                  <div className="di-stats-val" style={{ color: '#09090B' }}>{stats.activeResources}</div>
                  <div className="di-stats-label">ACTIVE RESOURCES</div>
                </div>
              </div>
            )}
          </div>

          {/* HUB GROUPS */}
          {isGenerating ? (
            <div className="di-section" style={{ paddingTop: 0 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ marginBottom: 24 }}>
                  <div className="di-skeleton-bar" style={{ height: 36, width: '100%', marginBottom: 8 }} />
                  <div className="di-skeleton-bar" style={{ height: 18, width: '90%', marginBottom: 6 }} />
                  <div className="di-skeleton-bar" style={{ height: 18, width: '85%', marginBottom: 6 }} />
                  <div className="di-skeleton-bar" style={{ height: 18, width: '70%', marginBottom: 6 }} />
                  <div className="di-skeleton-bar" style={{ height: 18, width: '80%' }} />
                </div>
              ))}
            </div>
          ) : hasEvents ? (
            hubGroups.map((group, gi) => (
              <HubGroupSection key={gi} group={group} />
            ))
          ) : (
            <div className="di-empty-state">
              <Sparkles size={24} strokeWidth={1.5} style={{ color: '#7C3AED', marginBottom: 8 }} />
              <div className="di-empty-title">No AI analysis yet</div>
              <div className="di-empty-sub">Click <strong>✦ Refresh AI</strong> to generate the STEERCOM briefing for {weekLabel}.</div>
              {stats.transitions > 0 && (
                <div className="di-empty-hint">{stats.transitions} transitions detected — ready for analysis.</div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="di-footer">
          {dataAge ? `Generated: ${dataAge}` : 'Not yet generated'} · {meta?.resourceCount || '…'} resources · {meta?.itemCount || '…'} items · {weekLabel} · {weekRange}
        </div>
      </div>
    </div>
  );
}

/* ═══ Hub Group ═══ */
function HubGroupSection({ group }: { group: HubGroup }) {
  const totalEvents = group.events.length;
  return (
    <div className="di-hub-group">
      <div className="di-grp-hdr">
        <span className="di-grp-dot" style={{ background: group.hubColor }} />
        <span className="di-grp-name">{group.hub.toUpperCase()}</span>
        <span className="di-grp-count">
          {totalEvents} event{totalEvents !== 1 ? 's' : ''}
          {group.totalItems != null && ` · ${group.totalItems} items`}
        </span>
        {group.rag && (
          <span className={`di-rag rag-${group.rag.toLowerCase()[0]}`}>{group.rag}</span>
        )}
      </div>
      <div className="di-grp-body">
        {group.events.map((ev, i) => (
          <EventRow key={i} event={ev} />
        ))}
      </div>
    </div>
  );
}

/* ═══ Event Row ═══ */
function EventRow({ event }: { event: HubEvent }) {
  const calloutClass = getCalloutClass(event.callout);

  return (
    <div className={`di-ev ${calloutClass}`}>
      {event.calloutLabel && (
        <div className={`di-ev-tag ${getTagColorClass(event.callout)}`}>
          {event.calloutLabel}
        </div>
      )}
      <div className="di-ev-main">
        <span className="di-ev-num">{String(event.number).padStart(2, '0')}</span>
        <span className={`di-ev-day ${event.dayClass}`}>{event.day}</span>
        <span className="di-ev-body" dangerouslySetInnerHTML={{ __html: event.body }} />
      </div>
    </div>
  );
}

/* ═══ Helpers ═══ */
function getCalloutClass(callout: string | null): string {
  if (!callout) return '';
  switch (callout) {
    case 'escalation': case 'risk': return 'di-ev-esc';
    case 'action': case 'delivery_gap': return 'di-ev-rec';
    case 'observation': return 'di-ev-obs';
    default: return '';
  }
}

function getTagColorClass(callout: string | null): string {
  switch (callout) {
    case 'escalation': case 'risk': return 'di-tag-red';
    case 'action': case 'delivery_gap': return 'di-tag-blue';
    case 'observation': return 'di-tag-gray';
    default: return 'di-tag-gray';
  }
}
