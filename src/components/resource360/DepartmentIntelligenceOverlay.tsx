/**
 * Department Intelligence Panel V4 — 3-Tab STEERCOM Briefing
 * Pixel-perfect match to dept-intelligence-steercom-v4.html
 */
import { useState, useEffect } from 'react';
import { useDeptIntelligenceAI, type DigestEvent, type ExecSummary, type Recommendation } from '@/hooks/useDeptIntelligenceAI';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import '@/styles/dept-intelligence.css';

interface Props {
  departmentName: string;
  onClose: () => void;
}

/* ═══ SVG Icons ═══ */
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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 13h6"/></svg>
);
const SpinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="di-spin"><path d="M21 12a9 9 0 11-6.219-8.56"/><polyline points="21 3 21 9 15 9"/></svg>
);

/* ═══ Day helpers ═══ */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU'];
const DAY_CSS = ['day-sun', 'day-mon', 'day-tue', 'day-wed', 'day-thu'];

/* ═══ Skeleton ═══ */
const DigestSkeleton = () => (
  <div style={{ padding: '16px 28px' }}>
    {[0, 1, 2, 3, 4].map(i => (
      <div key={i} style={{ marginBottom: 24 }}>
        <div className="di-skeleton-bar" style={{ height: 42, width: '100%', marginBottom: 12 }} />
        {[0, 1, 2].map(j => (
          <div key={j} className="di-skeleton-bar" style={{ height: 20, width: `${85 - j * 10}%`, marginBottom: 8 }} />
        ))}
      </div>
    ))}
  </div>
);

/* ═══ Tab 1: Weekly Digest ═══ */
function WeeklyDigest({ events, weekStart }: { events: DigestEvent[]; weekStart: Date }) {
  // Group by dayIndex (0=SUN..4=THU)
  const days = [0, 1, 2, 3, 4].map(dayIdx => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + dayIdx);
    const dayEvents = events.filter(e => e.dayIndex === dayIdx);
    return { dayIdx, dayDate, dayEvents };
  });

  return (
    <>
      {days.map(({ dayIdx, dayDate, dayEvents }) => (
        <div className="di-day" key={dayIdx}>
          <div className="di-day-hdr">
            <span className={`di-day-badge ${DAY_CSS[dayIdx]}`}>{DAY_SHORT[dayIdx]}</span>
            <span className="di-day-label">{DAY_NAMES[dayIdx]}</span>
            <span className="di-day-date">{dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span className="di-day-count">{dayEvents.length} events</span>
          </div>
          <div className="di-day-body">
            {dayEvents.map((ev, ei) => (
              <div className="di-ev" key={ei}>
                <span className="di-ev-n">{String(ev.number).padStart(2, '0')}</span>
                <span className="di-ev-hub-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>
                  <JiraIssueTypeIcon type={ev.hub === 'INC' ? 'Incident' : ev.hub === 'PRD' ? 'Story' : ev.hub === 'TST' ? 'Bug' : ev.hub === 'PRJ' ? 'Task' : ev.hub === 'REL' ? 'Epic' : 'Task'} size={16} />
                </span>
                <div className="di-ev-content">
                  <div className="di-ev-txt">
                    {ev.signalLabel && ev.signal && (
                      <span className={`di-ev-signal sig-${ev.signal === 'escalation' ? 'esc' : ev.signal === 'delivery_gap' ? 'gap' : ev.signal === 'action' ? 'action' : ev.signal === 'observation' ? 'observe' : ev.signal}`}>{ev.signalLabel}</span>
                    )}
                    <span dangerouslySetInnerHTML={{ __html: ev.body }} />
                  </div>
                </div>
              </div>
            ))}
            {dayEvents.length === 0 && (
              <div className="di-ev">
                <span className="di-ev-n">—</span>
                <span className="di-ev-hub hub-oth">—</span>
                <div className="di-ev-content">
                  <div className="di-ev-txt" style={{ fontStyle: 'italic', color: 'var(--di-ink-muted)' }}>No significant events recorded</div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

/* ═══ Tab 2: Executive Summary ═══ */
function ExecutiveSummary({ data }: { data: ExecSummary | null }) {
  if (!data) return (
    <div className="di-empty">
      <Sparkle size={24} />
      <div className="di-empty-t">No executive summary yet</div>
      <div className="di-empty-s">Click <strong>✦ Refresh AI</strong> to generate.</div>
    </div>
  );

  return (
    <div className="di-exec">
      <div className="di-exec-hero">
        <span className="di-exec-pct">{data.closureRate.toFixed(1)}%</span>
        <span className="di-exec-pct-sub">
          closure rate — {data.closureNumerator} of {data.closureDenominator} transitions · {data.topContributor} top contributor
        </span>
      </div>

      <div className="di-exec-section">
        <div className="di-exec-label">WHAT WENT WELL</div>
        {data.wentWell.map((item, i) => (
          <div key={i} className="di-exec-item" dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </div>

      <div className="di-exec-section">
        <div className="di-exec-label">WHAT REQUIRES ATTENTION</div>
        {data.requiresAttention.map((item, i) => (
          <div key={i} className="di-exec-item di-exec-risk" dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </div>

      <div className="di-exec-section">
        <div className="di-exec-label">HUB STATUS</div>
        {data.hubStatus.map((h, i) => (
          <div key={i} className="di-hub-row">
            <span className="di-hub-name">
              <span className={`di-rag-dot rag-${h.rag}`} />
              {h.hub}
            </span>
            <span className="di-hub-stat">{h.stat}</span>
            <span className={`di-hub-rag rag-${h.rag}-bg`}>
              {h.rag === 'g' ? 'GREEN' : h.rag === 'a' ? 'AMBER' : 'RED'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Tab 3: Recommendations ═══ */
function Recommendations({ items }: { items: Recommendation[] }) {
  if (items.length === 0) return (
    <div className="di-empty">
      <Sparkle size={24} />
      <div className="di-empty-t">No recommendations yet</div>
      <div className="di-empty-s">Click <strong>✦ Refresh AI</strong> to generate.</div>
    </div>
  );

  return (
    <div className="di-recs">
      {items.map((rec) => (
        <div className="di-rec-item" key={rec.number}>
          <span className="di-rec-num">{rec.number}</span>
          <div className="di-rec-body">
            <div className="di-rec-title">{rec.title}</div>
            <div className="di-rec-desc">{rec.description}</div>
          </div>
          <span className={`di-rec-pri pri-${rec.priority}`}>
            {rec.priority === 'high' ? 'HIGH' : 'MEDIUM'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══ Main Component ═══ */
export default function DepartmentIntelligenceOverlay({ departmentName, onClose }: Props) {
  const {
    digest, summary, recommendations,
    isGenerating, hasData,
    weekLabel, weekRange, weekStart, weekOffset, dataAge, meta,
    prevWeek, nextWeek, generateAll,
  } = useDeptIntelligenceAI(departmentName);

  const [activeTab, setActiveTab] = useState<'digest' | 'summary' | 'recs'>('digest');

  /* Auto-generate on first open if no data */
  const [autoTriggered, setAutoTriggered] = useState(false);
  useEffect(() => {
    if (!autoTriggered && !hasData && !isGenerating) {
      setAutoTriggered(true);
      generateAll();
    }
  }, [autoTriggered, hasData, isGenerating, generateAll]);

  /* Escape to close */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <>
      <div className="di-backdrop" onClick={onClose} />

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
            <button className="di-btn-p" onClick={generateAll} disabled={isGenerating}>
              {isGenerating ? <SpinIcon /> : <Sparkle size={13} />}
              <span>{isGenerating ? 'Generating…' : 'Refresh AI'}</span>
            </button>
            <button className="di-btn-g">Export PDF</button>
            <button className="di-close" onClick={onClose}><XIcon /></button>
          </div>
        </div>

        {/* ═══ HEADER (outside scroll) ═══ */}
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

          {/* 3 TABS */}
          <div className="di-tabs">
            <button className={`di-tab ${activeTab === 'digest' ? 'active' : ''}`} onClick={() => setActiveTab('digest')}>
              Weekly Digest{digest.length > 0 && <span className="di-tab-count">{digest.length}</span>}
            </button>
            <button className={`di-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
              Executive Summary
            </button>
            <button className={`di-tab ${activeTab === 'recs' ? 'active' : ''}`} onClick={() => setActiveTab('recs')}>
              Recommendations{recommendations.length > 0 && <span className="di-tab-count">{recommendations.length}</span>}
            </button>
          </div>
        </div>

        {/* ═══ SCROLLABLE BODY ═══ */}
        <div className="di-body">
          {isGenerating ? (
            <DigestSkeleton />
          ) : hasData ? (
            <>
              {activeTab === 'digest' && <WeeklyDigest events={digest} weekStart={weekStart} />}
              {activeTab === 'summary' && <ExecutiveSummary data={summary} />}
              {activeTab === 'recs' && <Recommendations items={recommendations} />}
            </>
          ) : (
            <div className="di-empty">
              <Sparkle size={24} />
              <div className="di-empty-t">No AI analysis yet</div>
              <div className="di-empty-s">Click <strong>✦ Refresh AI</strong> to generate the STEERCOM briefing for {weekLabel}.</div>
              {(meta?.resourceCount ?? 0) > 0 && (
                <div className="di-empty-h">{meta?.resourceCount} resources detected — ready for analysis.</div>
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
