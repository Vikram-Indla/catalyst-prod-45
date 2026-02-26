/**
 * Department Intelligence Panel — STEERCOM Weekly Events
 * Nuked & rebuilt from scratch. Matches dept-weekly-events-steercom.html 1:1.
 * Zero KPI grids. Zero leaderboards. Zero purple headers. Zero building emojis.
 */
import { useEffect } from 'react';
import { useDeptWeeklyEventsAI, type HubGroup, type HubEvent } from '@/hooks/useDeptWeeklyEventsAI';
import '@/styles/dept-intelligence.css';

interface Props {
  departmentName: string;
  onClose: () => void;
}

/* ═══ Inline SVG Icons — no external deps ═══ */
const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
);
const Sparkle = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636L5.636 18.364"/></svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
);
const DocIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 13h6"/></svg>
);
const SpinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="di-spin"><path d="M21 12a9 9 0 11-6.219-8.56"/><polyline points="21 3 21 9 15 9"/></svg>
);

/* ═══ Callout helpers ═══ */
function calloutClass(c: string | null): string {
  if (!c) return '';
  if (c === 'escalation' || c === 'risk') return 'di-ev-esc';
  if (c === 'action' || c === 'delivery_gap') return 'di-ev-rec';
  if (c === 'observation') return 'di-ev-obs';
  return '';
}
function tagClass(c: string | null): string {
  if (c === 'escalation' || c === 'risk') return 'tag-esc';
  if (c === 'action' || c === 'delivery_gap') return 'tag-rec';
  return 'tag-obs';
}

/* ═══ Component ═══ */
export default function DepartmentIntelligenceOverlay({ departmentName, onClose }: Props) {
  const {
    hubGroups, stats, isLoadingStats, isGenerating, hasEvents,
    weekLabel, weekRange, weekOffset, dataAge, meta,
    prevWeek, nextWeek, generateEvents,
  } = useDeptWeeklyEventsAI(departmentName);

  /* Escape key to close */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className="di-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="di-panel">

        {/* ═══ TOP BAR ═══ */}
        <div className="di-topbar">
          <div className="di-topbar-l">
            <button className="di-back" onClick={onClose}>
              <ChevronLeft /> Back
            </button>
            <div className="di-sep" />
            <div className="di-title-bar">
              <div className="di-dept-icon"><DocIcon /></div>
              <span className="di-dept-name">{departmentName}</span>
            </div>
          </div>
          <div className="di-topbar-r">
            {dataAge && <span className="di-age">{dataAge}</span>}
            <button className="di-btn-p" onClick={generateEvents} disabled={isGenerating}>
              {isGenerating ? <SpinIcon /> : <Sparkle size={13} />}
              <span>{isGenerating ? 'Generating…' : 'Refresh AI'}</span>
            </button>
            <button className="di-btn-g">Export PDF</button>
            <button className="di-close" onClick={onClose}><XIcon /></button>
          </div>
        </div>

        {/* ═══ SCROLLABLE BODY ═══ */}
        <div className="di-body">

          {/* ─── Section Header ─── */}
          <div className="di-header">
            <div className="di-h-top">
              <div className="di-h-title">
                <span className="di-h-t">This Week's Significant Events</span>
                <span className="di-ai"><Sparkle /> AI</span>
              </div>
              <div className="di-wk-sel">
                <button className="di-wk-nav" onClick={prevWeek}><ChevronLeft /></button>
                <span className="di-wk-lbl">{weekLabel}</span>
                <span className="di-wk-rng">{weekRange}</span>
                <button className="di-wk-nav" onClick={nextWeek} disabled={weekOffset === 0}><ChevronRight /></button>
              </div>
            </div>

            {/* ─── Stats Strip (pure DB, not AI) ─── */}
            {isLoadingStats ? (
              <div className="di-stats">
                {[1,2,3,4].map(i => (
                  <div key={i} className="di-stat">
                    <div className="skeleton-bar" style={{ height: 20, width: 40, margin: '0 auto 4px' }} />
                    <div className="skeleton-bar" style={{ height: 10, width: 60, margin: '0 auto' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="di-stats">
                <div className="di-stat">
                  <div className="di-stat-v" style={{ color: '#09090B' }}>{stats.transitions}</div>
                  <div className="di-stat-l">Transitions</div>
                </div>
                <div className="di-stat">
                  <div className="di-stat-v" style={{ color: '#16A34A' }}>{stats.closed}</div>
                  <div className="di-stat-l">Closed</div>
                </div>
                <div className="di-stat">
                  <div className="di-stat-v" style={{ color: '#D97706' }}>{stats.inReview}</div>
                  <div className="di-stat-l">In Review</div>
                </div>
                <div className="di-stat">
                  <div className="di-stat-v" style={{ color: '#09090B' }}>{stats.activeResources}</div>
                  <div className="di-stat-l">Active Resources</div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Hub Groups ─── */}
          {isGenerating ? (
            <div style={{ padding: '16px 24px' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ marginBottom: 24 }}>
                  <div className="skeleton-bar" style={{ height: 36, width: '100%', marginBottom: 8 }} />
                  <div className="skeleton-bar" style={{ height: 18, width: '90%', marginBottom: 6 }} />
                  <div className="skeleton-bar" style={{ height: 18, width: '85%', marginBottom: 6 }} />
                  <div className="skeleton-bar" style={{ height: 18, width: '70%', marginBottom: 6 }} />
                  <div className="skeleton-bar" style={{ height: 18, width: '80%' }} />
                </div>
              ))}
            </div>
          ) : hasEvents ? (
            hubGroups.map((group, gi) => (
              <div className="di-grp" key={gi}>
                <div className="di-grp-hdr">
                  <span className="di-grp-dot" style={{ background: group.hubColor }} />
                  <span className="di-grp-name">{group.hub}</span>
                  <span className="di-grp-ct">
                    {group.hub === 'Executive Summary'
                      ? `${weekLabel} · ${weekRange}`
                      : `${group.events.length} event${group.events.length !== 1 ? 's' : ''}${group.totalItems != null ? ` · ${group.totalItems} items` : ''}`
                    }
                  </span>
                  {group.rag && (
                    <span className={`di-rag rag-${group.rag.toLowerCase()[0]}`}>{group.rag}</span>
                  )}
                </div>
                <div className="di-grp-body">
                  {group.events.map((ev, ei) => {
                    const cc = calloutClass(ev.callout);
                    const isExec = group.hub === 'Executive Summary';
                    return (
                      <div
                        key={ei}
                        className={`di-ev${cc ? ` ${cc}` : ''}`}
                        style={isExec ? { borderBottom: 'none' } : undefined}
                      >
                        <span className="di-ev-n">{String(ev.number).padStart(2, '0')}</span>
                        <span className={`di-ev-day ${ev.dayClass}`}>{ev.day}</span>
                        <span className="di-ev-txt">
                          {ev.calloutLabel && (
                            <><span className={tagClass(ev.callout)}>{ev.calloutLabel}</span>{' '}</>
                          )}
                          <span dangerouslySetInnerHTML={{ __html: ev.body }} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="di-empty">
              <Sparkle size={24} />
              <div className="di-empty-t">No AI analysis yet</div>
              <div className="di-empty-s">Click <strong>✦ Refresh AI</strong> to generate the STEERCOM briefing for {weekLabel}.</div>
              {stats.transitions > 0 && (
                <div className="di-empty-h">{stats.transitions} transitions detected — ready for analysis.</div>
              )}
            </div>
          )}
        </div>

        {/* ═══ FOOTER (outside scroll, pinned bottom) ═══ */}
        <div className="di-foot">
          <span>{dataAge ? `Generated: ${dataAge}` : 'Not yet generated'}</span>
          <span className="di-foot-d" />
          <span>{meta?.resourceCount ?? '…'} resources</span>
          <span className="di-foot-d" />
          <span>{meta?.itemCount ?? '…'} items</span>
          <span className="di-foot-d" />
          <span>{weekLabel} · {weekRange}</span>
        </div>

      </div>
    </>
  );
}
