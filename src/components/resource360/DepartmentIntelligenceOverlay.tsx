/**
 * Department Intelligence Panel V5 — Role-Based Executive Briefing
 * 3-Tab: Executive Summary (default) → Weekly Digest → Recommendations
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Sparkles, X, FileText, Trophy, Code, CheckSquare, BookOpen, PenTool, Users, Server, ChevronRightIcon } from 'lucide-react';
import { useDeptIntelligenceAI, type DigestEvent, type ExecSummaryV5, type Recommendation, type RoleContribution, type ProjectActivity } from '@/hooks/useDeptIntelligenceAI';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import ClaimDrillInPanel from './ClaimDrillInPanel';
import '@/styles/dept-intelligence.css';

/* ═══ Resource Avatar ═══ */
const AVATAR_COLORS = ["#6b7a8d", "#7a8b6b", "#8b7a6b", "#6b6b8b", "#6b8b8b", "#8b6b7a", "#7a6b8b", "#6b8b7a"];
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function ResAvatar({ name, avatarMap, size = 28 }: { name: string; avatarMap: Map<string, string>; size?: number }) {
  const url = avatarMap.get(name.toLowerCase());
  const px = `${size}px`;
  if (url) {
    return <img src={url} alt={name} style={{ width: px, height: px, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: px, height: px, borderRadius: '50%', background: hashColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size <= 24 ? '9px' : '10px', fontWeight: 600, flexShrink: 0, fontFamily: 'var(--di-font-body)' }}>
      {getInitials(name)}
    </div>
  );
}

interface Props {
  departmentName: string;
  onClose: () => void;
}

/* ═══ Inject chevron claims into descriptions (client-side fallback) ═══ */
function injectClaims(html: string): string {
  // First, fix any AI-generated over-wrapped claims: <span class="di-claim">25 defects</span> → <span class="di-claim">25</span> defects
  let fixed = html.replace(/<span class="di-claim">(\d+%?)\s+([^<]+?)<\/span>/gi,
    '<span class="di-claim">$1</span> $2'
  );
  // Then inject claims for any remaining un-wrapped numeric+noun pairs
  if (!fixed.includes('di-claim')) {
    fixed = fixed.replace(/\b(\d+%?)\s+(defects?|items?|transitions?|closures?|bugs?|incidents?|stories|sub-tasks?|designs?|deployments?|rollbacks?|escalations?|sign-offs?|BRDs?|tasks?|projects?)\b/gi,
      '<span class="di-claim">$1</span> $2'
    );
  }
  return fixed;
}

/* ═══ Day helpers ═══ */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU'];
const DAY_CSS = ['day-sun', 'day-mon', 'day-tue', 'day-wed', 'day-thu'];

/* ═══ Role icon map ═══ */
const ROLE_ICONS: Record<string, React.ReactNode> = {
  'role-dev': <Code size={16} />,
  'role-qa': <CheckSquare size={16} />,
  'role-po': <BookOpen size={16} />,
  'role-ux': <PenTool size={16} />,
  'role-mgmt': <Users size={16} />,
  'role-devops': <Server size={16} />,
};

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

/* ═══ Tab 1: Executive Summary V5 (Role-Based) ═══ */
function ExecutiveSummaryV5({ data, avatarMap, roleMap }: { data: ExecSummaryV5 | null; avatarMap: Map<string, string>; roleMap: Map<string, string> }) {
  if (!data) return (
    <div className="di-empty">
      <Sparkles size={24} />
      <div className="di-empty-t">No executive summary yet</div>
      <div className="di-empty-s">Executive summary data will appear here when available.</div>
    </div>
  );

  const tc = data.topContributor;

  return (
    <div className="di-exec">
      {/* Top Contributor Spotlight */}
      {tc && (
        <div className="di-spotlight">
          <div className="di-trophy">
            <Trophy size={24} />
          </div>
          <div className="di-spot-info">
            <div className="di-spot-pre">W{tc.consecutiveWeeks > 1 ? '' : ''} TOP CONTRIBUTOR</div>
            <div className="di-spot-name">{tc.name}</div>
            <div className="di-spot-role">{tc.role} · {tc.projects.join(', ')}</div>
            <div className="di-spot-stats">
              {(Array.isArray(tc.kpis) ? tc.kpis : []).map((kpi, i) => (
                <div key={i} className="di-spot-stat">
                  <div className="di-spot-stat-v">{kpi.value}</div>
                  <div className="di-spot-stat-l">{kpi.label}</div>
                </div>
              ))}
            </div>
          </div>
          {tc.consecutiveWeeks > 1 && (
            <span className="di-spot-streak">🏆 {tc.consecutiveWeeks}{tc.consecutiveWeeks === 2 ? 'nd' : tc.consecutiveWeeks === 3 ? 'rd' : 'th'} consecutive week</span>
          )}
        </div>
      )}

      {/* Contribution by Role */}
      {data.roleContributions.length > 0 && (
        <div className="di-exec-section">
          <div className="di-exec-label">CONTRIBUTION BY ROLE</div>
          {data.roleContributions.map((rc, i) => (
            <div className={`di-role-card ${rc.roleCss}`} key={i}>
              <div className="di-role-hdr">
                <div className="di-role-icon">{ROLE_ICONS[rc.roleCss] || <Code size={16} />}</div>
                <span className="di-role-title">{rc.role}</span>
                <span className="di-role-count">{rc.resourceCount} resources · {rc.projects.join(', ')}</span>
              </div>
              <div className="di-role-kpis">
                {(Array.isArray(rc.kpis) ? rc.kpis : []).map((kpi, ki) => (
                  <div className="di-role-kpi" key={ki}>
                    <span className="di-role-kpi-v">{kpi.value}</span>
                    <span className="di-role-kpi-l">{kpi.label}</span>
                  </div>
                ))}
              </div>
              {rc.resources
                .filter(res => !/no recorded transitions|zero activity|no contributions?|no tracked activity/i.test(res.desc))
                .map((res, ri) => (
                <div className="di-res-row" key={ri}>
                  <ResAvatar name={res.name} avatarMap={avatarMap} size={28} />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span className="di-res-name">{res.name}</span>
                    {roleMap.get(res.name.toLowerCase()) && (
                      <span style={{ fontSize: 10, color: 'var(--di-ink-muted)', fontWeight: 500, lineHeight: 1.2 }}>
                        {roleMap.get(res.name.toLowerCase())}
                      </span>
                    )}
                  </div>
                  <span className="di-res-desc" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(injectClaims(res.desc)) }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Requires Attention */}
      {data.requiresAttention.length > 0 && (
        <div className="di-exec-section">
          <div className="di-exec-label">REQUIRES ATTENTION</div>
          {data.requiresAttention.map((item, i) => (
            <div key={i} className="di-attn-item" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item) }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ Tab 2: Weekly Digest ═══ */
function WeeklyDigest({ events, weekStart }: { events: DigestEvent[]; weekStart: Date }) {
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
                    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ev.body) }} />
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

/* ═══ Tab 3: Recommendations ═══ */
function Recommendations({ items }: { items: Recommendation[] }) {
  if (items.length === 0) return (
    <div className="di-empty">
      <Sparkles size={24} />
      <div className="di-empty-t">No recommendations yet</div>
      <div className="di-empty-s">Recommendations will appear here when available.</div>
    </div>
  );

  return (
    <div className="di-recs">
      {items.map((rec) => (
        <div className="di-rec-item" key={rec.number}>
          <span className="di-rec-num">{rec.number}</span>
          <div className="di-rec-body">
            <div className="di-rec-title">{rec.title}</div>
            {(rec.roleTag || rec.project) && (
              <div className="di-rec-meta">
                {rec.roleTag && (
                  <span className="di-rec-role-tag" style={rec.roleTagCss ? parseCssStyle(rec.roleTagCss) : undefined}>{rec.roleTag}</span>
                )}
                {rec.project && <span>{rec.project}</span>}
              </div>
            )}
            <div className="di-rec-desc" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rec.description) }} />
          </div>
          <span className={`di-rec-pri pri-${rec.priority}`}>
            {rec.priority === 'high' ? 'HIGH' : 'MEDIUM'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══ Tab: Project Activity ═══ */
function ProjectActivityTab({ projects }: { projects: ProjectActivity[] }) {
  if (projects.length === 0) return (
    <div className="di-empty">
      <Sparkles size={24} />
      <div className="di-empty-t">No project activity yet</div>
      <div className="di-empty-s">Project activity data will appear here when available.</div>
    </div>
  );

  // Sort: by velocity transitions descending, stalled last
  const sorted = [...projects].sort((a, b) => {
    if (a.status === 'stalled' && b.status !== 'stalled') return 1;
    if (b.status === 'stalled' && a.status !== 'stalled') return -1;
    return (b.velocity?.transitions || 0) - (a.velocity?.transitions || 0);
  });

  return (
    <div className="di-exec">
      <div className="di-exec-section" style={{ paddingTop: 0 }}>
        {sorted.map((prj, i) => (
          <ProjectCard key={i} prj={prj} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ prj }: { prj: ProjectActivity }) {
  const statusClass = prj.status === 'risk' ? 'prj-s-risk' : prj.status === 'stalled' ? 'prj-s-stalled' : 'prj-s-active';
  const statusLabel = prj.status === 'risk' ? 'AT RISK' : prj.status === 'stalled' ? 'STALLED' : 'ACTIVE';

  // Legacy fallback: if no kpis, render old style
  if (!prj.kpis || prj.kpis.length === 0) {
    return (
      <div className="di-prj-card">
        <div className="di-prj-hdr">
          {prj.keyPrefix && <span className="di-prj-key">{prj.keyPrefix}</span>}
          <span className="di-prj-name">{prj.name}</span>
          <span className={`di-prj-status ${statusClass}`}>{statusLabel}</span>
        </div>
        {prj.desc && (
          <div className="di-prj-body">
            <div className="di-prj-narrative">{prj.desc}</div>
          </div>
        )}
      </div>
    );
  }

  const barColorClass = `bar-f-${prj.barColor || 'primary'}`;

  return (
    <div className="di-prj-card">
      {/* Header */}
      <div className="di-prj-hdr">
        <span className="di-prj-key">{prj.keyPrefix || prj.name.split(' ')[0]?.substring(0, 4).toUpperCase()}</span>
        <span className="di-prj-name">{prj.name}</span>
        <span className={`di-prj-status ${statusClass}`}>{statusLabel}</span>
      </div>

      {/* KPI Strip */}
      <div className="di-prj-kpis">
        {(Array.isArray(prj.kpis) ? prj.kpis : []).map((kpi, k) => (
          <div className="di-prj-kpi" key={k}>
            <div className={`di-prj-kpi-v ${kpi.variant === 'danger' ? 'kpi-v-danger' : kpi.variant === 'warning' ? 'kpi-v-warning' : kpi.variant === 'success' ? 'kpi-v-success' : ''}`}>
              {kpi.value}
            </div>
            <div className="di-prj-kpi-l">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="di-prj-body">
        {/* Progress Bar — omit for STALLED */}
        {prj.status !== 'stalled' && prj.velocity && (
          <div className="di-prj-progress">
            <div className="di-prj-progress-hdr">
              <span className="di-prj-progress-lbl">Weekly Velocity</span>
              <span className="di-prj-progress-pct">{prj.velocity.transitions} transitions</span>
            </div>
            <div className="di-prj-bar">
              <div className={`di-prj-bar-fill ${barColorClass}`} style={{ width: `${Math.min(prj.velocity.percentOfMax, 100)}%` }} />
            </div>
          </div>
        )}

        {/* Narrative */}
        {prj.narrative && (
          <div className="di-prj-narrative" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(prj.narrative) }} />
        )}

        {/* Contributors */}
        {prj.contributors && prj.contributors.length > 0 && (
          <div className="di-prj-contribs">
            <span className="di-prj-contribs-lbl">Contributors</span>
            {prj.contributors.map((c, ci) => (
              <span className="di-prj-contrib" key={ci}>
                <span className="di-prj-avatar" style={{ background: c.color || 'rgba(237,237,237,0.40)' }}>
                  {c.initials}
                </span>
                <span className="di-prj-contrib-name">{c.name}</span>
                <span className="di-prj-contrib-stat">· {c.count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Alert Callout */}
        {prj.alert && prj.alert.type === 'blocker' && (
          <div className="di-prj-blocker">
            <svg className="di-prj-blocker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <span className="di-prj-blocker-txt" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(prj.alert.text) }} />
          </div>
        )}
        {prj.alert && prj.alert.type === 'warning' && (
          <div className="di-prj-warning">
            <svg className="di-prj-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span className="di-prj-warning-txt" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(prj.alert.text) }} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Parse inline CSS string like "background:#EDE9FE;color:#A78BFA" to React style */
function parseCssStyle(css: string): React.CSSProperties {
  const style: Record<string, string> = {};
  css.split(';').forEach(pair => {
    const [key, val] = pair.split(':').map(s => s.trim());
    if (key && val) {
      const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      style[camelKey] = val;
    }
  });
  return style;
}

/* ═══ Main Component ═══ */
export default function DepartmentIntelligenceOverlay({ departmentName, onClose }: Props) {
  const {
    digest, summaryV5, recommendations,
    isGenerating, hasData,
    weekLabel, weekRange, weekStart, weekOffset, dataAge, meta,
    prevWeek, nextWeek, generateAll,
  } = useDeptIntelligenceAI(departmentName);
  const avatarMap = useProfileAvatarsByName();

  // Fetch role names from resource_inventory keyed by lowercase name
  const { data: roleMap = new Map<string, string>() } = useQuery({
    queryKey: ['di-resource-roles'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('resource_inventory')
        .select('name, role_name')
        .not('role_name', 'is', null);
      const map = new Map<string, string>();
      (data || []).forEach((r: any) => {
        if (r.name && r.role_name) map.set(r.name.toLowerCase(), r.role_name);
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Tab 1 = Executive Summary (default), Tab 2 = Weekly Digest, Tab 3 = Recommendations
  const [activeTab, setActiveTab] = useState<'summary' | 'digest' | 'projects' | 'recs'>('summary');

  // Drill-in panel state
  const [drillIn, setDrillIn] = useState<{ resourceName: string; claimText: string } | null>(null);

  // Handle clicks on .di-claim elements via event delegation
  const handleBodyClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const claim = target.closest('.di-claim') as HTMLElement | null;
    if (!claim) return;
    e.preventDefault();
    e.stopPropagation();

    // Walk up to find the resource name from .di-res-name sibling
    const resRow = claim.closest('.di-res-row');
    let resourceName = 'Unknown';
    if (resRow) {
      const nameEl = resRow.querySelector('.di-res-name');
      if (nameEl) resourceName = nameEl.textContent?.trim() || 'Unknown';
    }

    // Capture number + full action context (e.g. "1 item to 'Monitor'")
    const num = claim.textContent?.trim() || '';
    // Walk following siblings to capture text until next "and" boundary or next claim span
    let contextText = '';
    let node: Node | null = claim.nextSibling;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        // Stop at ", and " or standalone " and " boundary
        const boundary = text.search(/,?\s+and\s/i);
        if (boundary >= 0) {
          contextText += text.slice(0, boundary);
          break;
        }
        contextText += text;
      } else if ((node as Element).classList?.contains('di-claim')) {
        break; // Next claim span, stop
      }
      node = node.nextSibling;
    }
    const claimText = contextText ? `${num} ${contextText.trim()}` : num;
    if (claimText) {
      setDrillIn({ resourceName, claimText });
    }
  }, []);

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
              <ChevronLeft size={14} /> Back
            </button>
            <div className="di-sep" />
            <div className="di-title-bar">
              <div className="di-dept-icon"><FileText size={15} stroke="white" /></div>
              <span className="di-dept-name">{departmentName}</span>
            </div>
          </div>
          <div className="di-topbar-r">
            {dataAge && <span className="di-age">{dataAge}</span>}
            <button className="di-close" onClick={onClose}><X size={14} /></button>
          </div>
        </div>

        {/* ═══ HEADER (outside scroll) ═══ */}
        <div className="di-header">
          <div className="di-h-top">
            <div className="di-h-title">
              <span className="di-h-t">Department Intelligence</span>
            </div>
            <div className="di-wk-sel">
              <button className="di-wk-nav" onClick={prevWeek}><ChevronLeft size={14} /></button>
              {weekOffset === 0 ? (
                <>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--di-ink)', letterSpacing: '0.3px' }}>THIS WEEK</span>
                  <span style={{ fontSize: 11, color: 'var(--di-ink-muted)', fontWeight: 500, margin: '0 2px' }}>·</span>
                  <span className="di-wk-rng">{weekRange}</span>
                </>
              ) : weekOffset === -1 ? (
                <>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--di-ink-tertiary)' }}>LAST WEEK</span>
                  <span style={{ fontSize: 11, color: 'var(--di-ink-muted)', fontWeight: 500, margin: '0 2px' }}>·</span>
                  <span className="di-wk-rng">{weekRange}</span>
                </>
              ) : (
                <>
                  <span className="di-wk-lbl">{weekLabel}</span>
                  <span className="di-wk-rng">{weekRange}</span>
                </>
              )}
              <button className="di-wk-nav" onClick={nextWeek} disabled={weekOffset === 0}><ChevronRight size={14} /></button>
            </div>
          </div>

          {/* 4 TABS */}
          <div className="di-tabs">
            <button className={`di-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
              Executive Summary
            </button>
            <button className={`di-tab ${activeTab === 'digest' ? 'active' : ''}`} onClick={() => setActiveTab('digest')}>
              Weekly Digest{digest.length > 0 && <span className="di-tab-count">{digest.length}</span>}
            </button>
            <button className={`di-tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
              Project Activity{(summaryV5?.projectActivity?.length ?? 0) > 0 && <span className="di-tab-count">{summaryV5?.projectActivity?.length}</span>}
            </button>
            <button className={`di-tab ${activeTab === 'recs' ? 'active' : ''}`} onClick={() => setActiveTab('recs')}>
              Recommendations{recommendations.length > 0 && <span className="di-tab-count">{recommendations.length}</span>}
            </button>
          </div>
        </div>

        <div className="di-body" onClick={handleBodyClick}>
          {isGenerating ? (
            <DigestSkeleton />
          ) : hasData ? (
            <>
              {activeTab === 'summary' && <ExecutiveSummaryV5 data={summaryV5} avatarMap={avatarMap} roleMap={roleMap} />}
              {activeTab === 'digest' && <WeeklyDigest events={digest} weekStart={weekStart} />}
              {activeTab === 'projects' && <ProjectActivityTab projects={summaryV5?.projectActivity || []} />}
              {activeTab === 'recs' && <Recommendations items={recommendations} />}
            </>
          ) : (
            <div className="di-empty">
              <Sparkles size={24} />
              <div className="di-empty-t">No AI analysis yet</div>
              <div className="di-empty-s">AI briefing for {weekLabel} will generate automatically.</div>
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
          <span>{weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : weekLabel} · {weekRange}</span>
        </div>
      </div>

      {/* Claim Drill-In Panel */}
      {drillIn && (
        <ClaimDrillInPanel
          resourceName={drillIn.resourceName}
          claimText={drillIn.claimText}
          weekStart={weekStart}
          avatarMap={avatarMap}
          onClose={() => setDrillIn(null)}
        />
      )}
    </>
  );
}
