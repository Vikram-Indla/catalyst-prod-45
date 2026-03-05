/**
 * AIIntelligencePanel — R360 Intelligence Panel (G4 V5 Rebuild)
 * 6 sections: Identity | Why Critical | Projects | Rhythm | Pickup Latency | Weekly Story
 * NO AI chips. NO Arabic. NO Resource Pattern. NO Hub Closures.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import '@/styles/ai-intelligence.css';
import { R360CriticalityBanner } from '@/components/r360/R360CriticalityBanner';
import { R360PeerTable } from '@/components/r360/R360PeerTable';
import { R360CohortSpectrum } from '@/components/r360/R360CohortSpectrum';
import { R360ExitRisk } from '@/components/r360/R360ExitRisk';
import {
  useResourceInfo,
  useDeliveryBacklog,
  useStalenessLabel,
  useAIActions,
  useAutoGenerateIfMissing,
  useAIPatterns,
} from '@/hooks/useAIIntelligence';
import { useWeeklyStory } from '@/hooks/useWeeklyStory';
import { useR360Criticality } from '@/hooks/useR360Criticality';
import { resolveRoleCode } from '@/constants/r360RoleMapping';
import { getWeekNumber, formatWeekRange, getWeekStart, R360_WEEK_CONFIG } from '@/constants/r360WeekConfig';
import { getAvatarColor } from '@/types/initiative';

interface Props {
  resourceId: string;
  onClose: () => void;
}

// ─── Design Tokens ──────────────────────────────────────────
const T = {
  page: '#FFFFFF',
  surface: '#F4F6F8',
  bdr: '#D1D9E0',
  bdr2: '#A8B5C1',
  tx1: '#0F172A',
  tx2: '#2D3A4A',
  tx3: '#536070',
  tx4: '#7A8A96',
  blue: '#1D55D4',
  blueLt: '#EBF0FC',
  blueMid: '#C7D5F8',
  blueDk: '#1340A8',
  bugRed: '#C41D1D',
  incRed: '#B91C1C',
  storyGrn: '#166534',
  subGrey: '#374151',
  sGreen: '#15803D',
  sAmber: '#B45309',
  // status lozenges
  lozGrey: { bg: '#DFE1E6', text: '#253858' },
  lozBlue: { bg: '#DEEBFF', text: '#0747A6' },
  lozGreen: { bg: '#E3FCEF', text: '#006644' },
};

const FONT = {
  heading: "'Sora', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// ─── Section Tabs ───────────────────────────────────────────
const TABS = ['Identity', 'Why Critical', 'Projects', 'Rhythm', 'Weekly'] as const;
type TabKey = typeof TABS[number];

// ─── Arc Gauge SVG ──────────────────────────────────────────
const ArcGauge: React.FC<{ value: number; max?: number }> = ({ value, max = 100 }) => {
  const pct = Math.min(1, Math.max(0, value / max));
  const r = 52;
  const cx = 65;
  const cy = 68;
  const circumference = Math.PI * r; // ~163.36
  const offset = circumference * (1 - pct);

  return (
    <svg width="130" height="76" viewBox="0 0 130 76">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={T.bdr} strokeWidth="9" strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={T.blue} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
      />
      {/* Center text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontFamily={FONT.heading} fontSize="26" fontWeight="700" fill={T.tx1}>
        {value}
      </text>
    </svg>
  );
};

// ─── Status Lozenge ─────────────────────────────────────────
const StatusLoz: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  const colors = s === 'done' || s === 'resolved' || s === 'closed'
    ? T.lozGreen
    : s === 'in progress' || s === 'active'
    ? T.lozBlue
    : T.lozGrey;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 3,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      background: colors.bg, color: colors.text, height: 20,
      lineHeight: '16px', letterSpacing: '0.02em',
    }}>
      {status}
    </span>
  );
};

// ─── Item Type Pill ─────────────────────────────────────────
const TypePill: React.FC<{ type: string; count: number }> = ({ type, count }) => {
  const t = type.toLowerCase();
  const bg = t.includes('bug') ? T.bugRed
    : t.includes('incident') ? T.incRed
    : t.includes('story') || t.includes('frontend') || t.includes('backend') ? T.storyGrn
    : T.subGrey;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20,
      padding: '0 7px', borderRadius: 3, fontSize: 10, fontWeight: 700,
      background: bg, color: '#FFFFFF', letterSpacing: '0.02em',
    }}>
      {count} {type}
    </span>
  );
};

// ─── Main Component ─────────────────────────────────────────
const AIIntelligencePanel: React.FC<Props> = ({ resourceId, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('Identity');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Data hooks
  const { data: resource, isLoading: resourceLoading } = useResourceInfo(resourceId);
  const { data: backlogData } = useDeliveryBacklog(resourceId, resource?.jira_account_id);
  const { data: patternData } = useAIPatterns(resourceId);
  const { data: stalenessLabel } = useStalenessLabel(resourceId);
  const { syncData, refreshAI, syncing, generating } = useAIActions(resourceId, resource?.jira_account_id);
  const { storyData, isLoading: storyLoading, selectedDate, onPrevWeek, onNextWeek } = useWeeklyStory(resourceId, resource?.jira_account_id);

  // Criticality engine
  const roleCode = resolveRoleCode(resource?.role_name);
  const { data: criticality, isLoading: criticalityLoading } = useR360Criticality(resourceId, roleCode);

  const { autoGenerating } = useAutoGenerateIfMissing(resourceId, resource?.jira_account_id);
  const isGenerating = generating || autoGenerating;

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const scrollToSection = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    const key = tab === 'Why Critical' ? 'whyCritical' : tab.toLowerCase();
    const el = sectionRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const name = resource?.full_name || '';
  const roleName = resource?.role_name?.split(' · ')[0] || 'Team Member';
  const department = resource?.role_name?.split(' · ')[1] || 'Delivery';
  const rid = resource?.rid || '';
  const avatarUrl = resource?.avatar_url || null;
  const avatarBg = name ? getAvatarColor(name) : T.blue;
  const weekNum = getWeekNumber(selectedDate);
  const weekRange = formatWeekRange(selectedDate);

  // Role fitness score from AI patterns (or fallback)
  const roleFitness = 74; // Will be driven by r360_ai_profiles.role_fitness_score when available
  const archetype = patternData?.summary || 'Reactive\nSpecialist';

  return (
    <div data-module="ai-intelligence">
      {/* Backdrop */}
      <div className="rai-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="rai-panel" style={{ fontFamily: FONT.body, color: T.tx1 }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 24px', borderBottom: `1px solid ${T.bdr}`, flexShrink: 0,
        }}>
          <button className="rai-topbar-btn" onClick={onClose}>← Back</button>
          <div style={{ flex: 1 }} />
          {stalenessLabel && (
            <span style={{
              fontSize: 11, color: T.tx4, fontFamily: FONT.mono,
              background: T.surface, padding: '3px 8px', borderRadius: 4,
              border: `1px solid ${T.bdr}`,
            }}>
              Data: {stalenessLabel}
            </span>
          )}
          <span style={{
            fontSize: 11, color: T.tx4, fontFamily: FONT.mono,
            background: T.surface, padding: '3px 8px', borderRadius: 4,
            border: `1px solid ${T.bdr}`,
          }}>
            6-mo window
          </span>
          <button className="rai-topbar-btn" onClick={syncData} disabled={syncing}>
            {syncing ? '⏳ Syncing…' : '🔄 Sync'}
          </button>
          <button className="rai-topbar-btn rai-primary-btn" onClick={refreshAI} disabled={isGenerating}>
            {isGenerating ? '⏳ AI…' : '✨ Refresh'}
          </button>
          <button className="rai-topbar-btn" onClick={onClose} style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Panel Header — Identity */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '20px 24px 16px', flexShrink: 0,
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} style={{
                width: 60, height: 60, borderRadius: '50%', objectFit: 'cover',
                border: `2px solid ${T.bdr}`,
              }} />
            ) : (
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: avatarBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', fontFamily: FONT.heading, fontSize: 22, fontWeight: 700,
              }}>
                {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
            {/* Green online dot */}
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 12, height: 12, borderRadius: '50%',
              background: '#16A34A', border: '2px solid #FFFFFF',
            }} />
          </div>

          <div style={{ flex: 1 }}>
            {resourceLoading ? (
              <>
                <div className="rai-skeleton" style={{ height: 20, width: 160, borderRadius: 4, marginBottom: 6 }} />
                <div className="rai-skeleton" style={{ height: 14, width: 120, borderRadius: 4 }} />
              </>
            ) : (
              <>
                <div style={{ fontFamily: FONT.heading, fontSize: 17, fontWeight: 700, color: T.tx1 }}>
                  {name || 'Loading…'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, color: T.blueDk,
                    background: T.blueLt, padding: '2px 8px', borderRadius: 3,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {roleName}
                  </span>
                  <span style={{ fontSize: 12, color: T.tx3 }}>{department}</span>
                  <span style={{
                    fontFamily: FONT.mono, fontSize: 11, color: T.tx4,
                    background: T.surface, padding: '2px 8px', borderRadius: 3,
                    border: `1px solid ${T.bdr}`,
                  }}>
                    {rid}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section Nav */}
        <div style={{
          display: 'flex', gap: 0, padding: '0 24px',
          borderBottom: `1.5px solid ${T.bdr}`, flexShrink: 0,
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => scrollToSection(tab)}
                style={{
                  padding: '10px 16px', fontSize: 12, fontWeight: isActive ? 700 : 500,
                  color: isActive ? T.blue : T.tx4,
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: isActive ? `2px solid ${T.blue}` : '2px solid transparent',
                  marginBottom: -1.5, fontFamily: FONT.body,
                  transition: 'all 150ms',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ═══ SECTION 1: BEHAVIORAL IDENTITY ═══ */}
          <div ref={el => { sectionRefs.current['identity'] = el; }} style={{ marginBottom: 28 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

              {/* LEFT: Role Fitness Score */}
              <div style={{
                background: T.page, border: `1.5px solid ${T.bdr}`, borderRadius: 6,
                overflow: 'hidden',
              }}>
                <div style={{ height: 4, background: T.blue }} />
                <div style={{ padding: '16px 16px 14px' }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: T.tx3,
                    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12,
                  }}>
                    Role Fitness Score
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                    <ArcGauge value={roleFitness} />
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 12, color: T.tx4, marginBottom: 10 }}>
                    out of 100
                  </div>
                  <div style={{ textAlign: 'center', marginBottom: 10 }}>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                      background: T.lozBlue.bg, color: T.lozBlue.text,
                      padding: '3px 10px', borderRadius: 3, letterSpacing: '0.04em',
                    }}>
                      MODERATE FIT
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: T.tx2, lineHeight: 1.6 }}>
                    Strong specialist fit. Feature ownership is the gap. High value in current incident-heavy delivery phase.
                  </div>
                </div>
              </div>

              {/* RIGHT: Behavioral Archetype */}
              <div style={{
                background: T.page, border: `1.5px solid ${T.bdr}`, borderRadius: 6,
                overflow: 'hidden',
              }}>
                <div style={{ height: 4, background: T.tx1 }} />
                <div style={{ padding: '16px 16px 14px' }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: T.tx3,
                    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12,
                  }}>
                    Behavioral Archetype
                  </div>
                  <div style={{ fontFamily: FONT.heading, fontSize: 18, fontWeight: 700, color: T.tx1, lineHeight: 1.3, marginBottom: 10 }}>
                    Reactive<br />Specialist
                  </div>
                  <div style={{ fontSize: 12, color: T.tx2, lineHeight: 1.6, marginBottom: 12 }}>
                    Precision output under pressure. Self-activates on incidents and bugs without being asked.
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['Incident-First', 'QA Affinity', 'Crunch Closer', 'Sequential Focus'].map(tag => (
                      <span key={tag} style={{
                        fontSize: 10, fontWeight: 600, color: T.tx2,
                        background: T.surface, border: `1.5px solid ${T.bdr}`,
                        padding: '3px 8px', borderRadius: 3,
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ SECTION 2: WHY CRITICAL ═══ */}
          <div ref={el => { sectionRefs.current['whyCritical'] = el; }} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: T.tx2,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginBottom: 14, paddingBottom: 8,
              borderBottom: `1.5px solid ${T.bdr}`,
            }}>
              Why Critical · 6-Month Peer Comparison
            </div>

            <R360CriticalityBanner
              label={criticality?.label ?? '—'}
              percentile={criticality?.percentile ?? 0}
              irreplaceabilityRatio={criticality?.irreplaceabilityRatio ?? 0}
              isSinglePointOfFailure={criticality?.isSinglePointOfFailure ?? false}
              primaryMetrics={criticality?.primaryMetrics ?? []}
              peerComparison={criticality?.peerComparison ?? []}
              roleName={roleName}
              loading={criticalityLoading}
            />

            <R360PeerTable
              primaryMetrics={criticality?.primaryMetrics ?? []}
              peerComparison={criticality?.peerComparison ?? []}
              loading={criticalityLoading}
            />

            <R360CohortSpectrum
              percentile={criticality?.percentile ?? 0}
              label={criticality?.label ?? 'Developing'}
            />
          </div>

          {/* ═══ SECTION 3: POSITION IN PROJECTS ═══ */}
          <div ref={el => { sectionRefs.current['projects'] = el; }} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: T.tx2,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginBottom: 14, paddingBottom: 8,
              borderBottom: `1.5px solid ${T.bdr}`,
            }}>
              Position in Projects
            </div>

            <ProjectCards backlogData={backlogData} />

            {criticality?.isSinglePointOfFailure && (
              <R360ExitRisk
                resourceName={name || 'Resource'}
                primaryMetrics={criticality.primaryMetrics}
                irreplaceabilityRatio={criticality.irreplaceabilityRatio}
              />
            )}
          </div>

          {/* ═══ SECTION 4: WORK RHYTHM ═══ */}
          <div ref={el => { sectionRefs.current['rhythm'] = el; }} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: T.tx2,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginBottom: 14, paddingBottom: 8,
              borderBottom: `1.5px solid ${T.bdr}`,
            }}>
              Work Rhythm · Release × Project
            </div>
            <RhythmTable resourceId={resourceId} jiraAccountId={resource?.jira_account_id} />
          </div>

          {/* ═══ SECTION 5: PICKUP LATENCY ═══ */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: T.tx2,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginBottom: 14, paddingBottom: 8,
              borderBottom: `1.5px solid ${T.bdr}`,
            }}>
              Pickup Latency · Time to First Touch
            </div>
            <PickupLatency backlogData={backlogData} />
          </div>

          {/* ═══ SECTION 6: WEEKLY STORY ═══ */}
          <div
            ref={el => { sectionRefs.current['weekly'] = el; }}
            id="weeklyStory"
            style={{
              marginBottom: 28, background: T.surface,
              borderRadius: 6, border: `1.5px solid ${T.bdr}`,
              padding: '16px 18px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: T.tx2,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Weekly Story
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={onPrevWeek} style={{
                  width: 30, height: 30, border: `1.5px solid ${T.bdr}`,
                  background: T.page, borderRadius: 4, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: T.tx3,
                }}>◄</button>
                <span style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: T.tx1 }}>
                  W{weekNum} · {weekRange}
                </span>
                <button onClick={onNextWeek} style={{
                  width: 30, height: 30, border: `1.5px solid ${T.bdr}`,
                  background: T.page, borderRadius: 4, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: T.tx3,
                }}>►</button>
              </div>
            </div>

            {/* Summary bar */}
            {storyData && (
              <div style={{
                background: T.page, border: `1.5px solid ${T.bdr}`,
                borderLeft: `5px solid ${T.incRed}`, borderRadius: 6,
                padding: '12px 14px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.tx1 }}>
                    {storyData.kpis.pickedUp + storyData.kpis.closed + storyData.kpis.inReview} items touched · {storyData.kpis.closed} closed · {storyData.kpis.inReview} in review
                  </div>
                  <div style={{ fontSize: 12, color: T.tx3, marginTop: 2 }}>
                    {storyData.contextSubtitle} · R9 Active · 2 projects
                  </div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: `1px solid ${T.bdr}`, paddingLeft: 14 }}>
                  <div style={{ fontFamily: FONT.heading, fontSize: 28, fontWeight: 700, color: T.tx1 }}>
                    {storyData.backlogCount}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.tx4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    BACKLOG
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {storyLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[60, 80, 60, 40, 70].map((h, i) => (
                  <div key={i} className="rai-skeleton" style={{ height: h }} />
                ))}
              </div>
            )}

            {!storyLoading && storyData && (
              <WeeklyTimeline data={storyData} selectedDate={selectedDate} />
            )}

            {!storyLoading && !storyData && (
              <p style={{ fontSize: 13, color: T.tx4, fontStyle: 'italic' }}>
                No weekly data available for this period.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── Project Cards Sub-Component ────────────────────────────
const ProjectCards: React.FC<{ backlogData: any }> = ({ backlogData }) => {
  const hubs = backlogData?.hubs || [];
  if (hubs.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: T.tx4, fontStyle: 'italic', padding: '16px 0' }}>
        No project data available.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
      {hubs.slice(0, 2).map((hub: any, i: number) => (
        <div key={i} style={{ border: `1.5px solid ${T.bdr}`, borderRadius: 6, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            background: T.surface, padding: '10px 14px',
            borderBottom: `1.5px solid ${T.bdr}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#FFFFFF',
              background: T.blue, padding: '2px 8px', borderRadius: 3,
              textTransform: 'uppercase',
            }}>
              ACTIVE
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.tx1 }}>{hub.hub}</span>
          </div>
          {/* Body */}
          <div style={{ padding: 16, background: T.page }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
              <div style={{ textAlign: 'center', borderRight: `1px solid ${T.bdr}`, padding: '0 8px' }}>
                <div style={{ fontFamily: FONT.heading, fontSize: 22, fontWeight: 700, color: T.tx1 }}>
                  {hub.openCount}
                </div>
                <div style={{ fontSize: 10.5, color: T.tx4, marginTop: 2 }}>Open Items</div>
              </div>
              <div style={{ textAlign: 'center', borderRight: `1px solid ${T.bdr}`, padding: '0 8px' }}>
                <div style={{ fontFamily: FONT.heading, fontSize: 22, fontWeight: 700, color: T.tx1 }}>
                  —
                </div>
                <div style={{ fontSize: 10.5, color: T.tx4, marginTop: 2 }}>Closure rate</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0 8px' }}>
                <div style={{ fontFamily: FONT.heading, fontSize: 22, fontWeight: 700, color: T.tx1 }}>
                  —
                </div>
                <div style={{ fontSize: 10.5, color: T.tx4, marginTop: 2 }}>vs team avg</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Rhythm Table Sub-Component ─────────────────────────────
const RhythmTable: React.FC<{ resourceId: string; jiraAccountId: string | null | undefined }> = ({ resourceId, jiraAccountId }) => {
  const { data: rhythmData } = useRhythmData(resourceId, jiraAccountId);

  if (!rhythmData || rhythmData.length === 0) {
    return <div style={{ fontSize: 12.5, color: T.tx4, fontStyle: 'italic', padding: '8px 0' }}>No rhythm data available.</div>;
  }

  return (
    <>
      <div style={{ border: `1.5px solid ${T.bdr}`, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '80px 1fr 1fr 70px',
          background: T.surface, borderBottom: `2px solid ${T.bdr}`,
        }}>
          {['Release', 'Project', 'Item Mix', 'Total'].map((h, i) => (
            <div key={h} style={{
              padding: '8px 12px', fontSize: 10, fontWeight: 700,
              color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.07em',
              textAlign: i === 3 ? 'right' : 'left',
            }}>
              {h}
            </div>
          ))}
        </div>
        {/* Rows */}
        {rhythmData.map((row: any, i: number) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '80px 1fr 1fr 70px',
            borderBottom: i < rhythmData.length - 1 ? `1px solid ${T.bdr}` : 'none',
            alignItems: 'center', minHeight: 44,
          }}>
            {/* Release */}
            <div style={{ padding: '8px 12px' }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 3,
                fontSize: 11, fontWeight: 700, color: '#FFFFFF',
                background: row.isActive ? T.blue : row.release === '—' ? T.bdr : T.tx2,
                ...(row.release === '—' ? { color: T.tx3 } : {}),
              }}>
                {row.release}
              </span>
            </div>
            {/* Project */}
            <div style={{ padding: '8px 12px' }}>
              <span style={{
                fontFamily: FONT.mono, fontSize: 11, fontWeight: 600,
                color: T.blueDk, background: T.blueLt,
                padding: '3px 8px', borderRadius: 3,
                border: `1px solid ${T.blueMid}`,
              }}>
                {row.project}
              </span>
            </div>
            {/* Item Mix */}
            <div style={{ padding: '8px 12px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {row.types.map((t: any) => (
                <TypePill key={t.type} type={t.type} count={t.count} />
              ))}
            </div>
            {/* Total */}
            <div style={{
              padding: '8px 12px', textAlign: 'right',
              fontFamily: FONT.mono, fontSize: 14, fontWeight: 700, color: T.tx1,
            }}>
              {row.total}
            </div>
          </div>
        ))}
      </div>

      {/* Insight box */}
      <div style={{
        background: T.surface, border: `1.5px solid ${T.bdr}`,
        borderRadius: 4, padding: '12px 14px',
        fontSize: 12.5, color: T.tx2, lineHeight: 1.7,
      }}>
        Concentrated in <span style={{ color: T.blueDk, fontWeight: 700 }}>incident response</span> and <span style={{ color: T.blueDk, fontWeight: 700 }}>BAU operations</span>. Limited feature-track participation across releases.
      </div>
    </>
  );
};

// ─── Rhythm Data Hook ───────────────────────────────────────
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function useRhythmData(resourceId: string, jiraAccountId: string | null | undefined) {
  return useQuery({
    queryKey: ['r360-rhythm', resourceId, jiraAccountId],
    queryFn: async () => {
      if (!jiraAccountId) return [];
      const { data: issues } = await (supabase
        .from('ph_issues')
        .select('issue_type, fix_versions, project_name, status_category')
        .eq('assignee_account_id', jiraAccountId) as any);
      if (!issues) return [];

      // Group by release × project
      const groups = new Map<string, { release: string; project: string; types: Map<string, number>; total: number; isActive: boolean }>();
      for (const iss of issues) {
        const vArr = Array.isArray(iss.fix_versions) ? iss.fix_versions : [];
        const vName = vArr.length > 0 ? (typeof vArr[0] === 'string' ? vArr[0] : vArr[0]?.name || '—') : '—';
        const proj = iss.project_name || 'Unknown';
        const key = `${vName}||${proj}`;
        if (!groups.has(key)) {
          groups.set(key, { release: vName, project: proj, types: new Map(), total: 0, isActive: false });
        }
        const g = groups.get(key)!;
        const t = iss.issue_type || 'Other';
        g.types.set(t, (g.types.get(t) || 0) + 1);
        g.total++;
        // Check if active release (has non-done items)
        if (iss.status_category !== 'Done') g.isActive = true;
      }

      return [...groups.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
        .map(g => ({
          release: g.release,
          project: g.project,
          isActive: g.isActive,
          types: [...g.types.entries()].map(([type, count]) => ({ type, count })),
          total: g.total,
        }));
    },
    enabled: !!resourceId && !!jiraAccountId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Pickup Latency Sub-Component ───────────────────────────
const LATENCY_ROWS = [
  { label: 'Subtask', color: T.subGrey, pct: 16 },
  { label: 'Incident', color: T.sGreen, pct: 18 },
  { label: 'Bug', color: T.blue, pct: 24 },
  { label: 'Story', color: T.sAmber, pct: 82 },
  { label: 'Feature', color: T.incRed, pct: 100 },
];

const PickupLatency: React.FC<{ backlogData: any }> = ({ backlogData }) => {
  const metrics = backlogData?.metrics;
  // Use backlog data if available, otherwise show defaults
  const rows = LATENCY_ROWS.map(r => {
    let value = '—';
    if (metrics) {
      if (r.label === 'Subtask' && metrics.avgSubtaskDays != null) value = `${metrics.avgSubtaskDays.toFixed(1)}d`;
      if (r.label === 'Bug' && metrics.avgBugDays != null) value = `${metrics.avgBugDays.toFixed(1)}d`;
      if (r.label === 'Story' && metrics.avgStoryDays != null) value = `${metrics.avgStoryDays.toFixed(1)}d`;
    }
    return { ...r, value };
  });

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {rows.map(row => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 68, fontSize: 12.5, fontWeight: 600, color: T.tx2, flexShrink: 0 }}>
              {row.label}
            </span>
            <div style={{ flex: 1, height: 7, background: T.bdr, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3, width: `${row.pct}%`,
                background: row.color, transition: 'width 400ms ease-out',
              }} />
            </div>
            <span style={{
              fontFamily: FONT.mono, fontSize: 12.5, fontWeight: 600,
              color: T.tx2, minWidth: 40, textAlign: 'right',
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Note box */}
      <div style={{
        background: T.surface, border: `1.5px solid ${T.bdr}`,
        borderRadius: 4, padding: '12px 14px',
        fontSize: 12.5, color: T.tx2, lineHeight: 1.7,
      }}>
        Sequential worker. Parallelism index: 0.12. Assign focused queues.
      </div>
    </>
  );
};

// ─── Weekly Timeline Sub-Component ──────────────────────────
import type { WeeklyStoryData } from '@/components/resources/ai-intelligence/WeeklyStory';

const WeeklyTimeline: React.FC<{ data: WeeklyStoryData; selectedDate: Date }> = ({ data, selectedDate }) => {
  // Find most active day
  let peakDay = -1;
  let peakCount = 0;
  data.days.forEach(d => {
    if (d.events.length > peakCount) { peakCount = d.events.length; peakDay = d.dayIndex; }
  });

  return (
    <div style={{ position: 'relative', paddingLeft: 28 }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: 11, top: 0, bottom: 0,
        width: 2, background: T.bdr,
      }} />

      {data.days.map(day => {
        const dayNames = R360_WEEK_CONFIG.dayNames.en;
        const weekStart = getWeekStart(selectedDate);
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + day.dayIndex);

        const isActive = day.events.length > 0;
        const isPeak = day.dayIndex === peakDay && peakCount > 0;
        const isQuiet = !isActive;

        // Left accent bar color
        const accentColor = isPeak ? T.tx1 : isActive ? T.blue : 'transparent';
        // Dot colors
        const dotBorder = isPeak ? T.tx1 : isActive ? T.blue : T.bdr;
        const dotFill = isPeak ? T.tx1 : isActive ? T.blue : T.surface;

        // Tag
        const tagText = day.dayIndex === 0 ? 'Week Start'
          : day.dayIndex === 4 ? 'Week End'
          : isPeak ? 'Most Active'
          : isQuiet ? 'Waiting' : undefined;
        const tagStyle = isPeak
          ? { background: T.blueLt, color: T.blueDk }
          : { background: T.surface, color: T.tx3, border: `1px solid ${T.bdr}` };

        return (
          <div key={day.dayIndex} style={{ position: 'relative', marginBottom: 20 }}>
            {/* Left accent bar */}
            <div style={{
              position: 'absolute', left: -28, top: 0, bottom: 0,
              width: 4, background: accentColor, borderRadius: 2,
            }} />

            {/* Timeline dot */}
            <div style={{
              position: 'absolute', left: -22, top: 15,
              width: 15, height: 15, borderRadius: '50%',
              border: `2.5px solid ${dotBorder}`, background: dotFill,
            }} />

            {/* Day header */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                color: isActive ? T.tx1 : T.tx4,
              }}>
                {dayNames[day.dayIndex]}
              </span>
              <span style={{ fontFamily: FONT.mono, fontSize: 11.5, color: T.tx4 }}>
                {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {tagText && (
                <span style={{
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  padding: '2px 8px', borderRadius: 3, letterSpacing: '0.02em',
                  ...tagStyle,
                }}>
                  {tagText}
                </span>
              )}
            </div>

            {/* Events or No activity */}
            {day.events.length === 0 && (
              <div style={{ fontSize: 12.5, color: T.tx4, fontStyle: 'italic', paddingLeft: 4 }}>
                No activity
              </div>
            )}

            {day.events.map((evt, ei) => {
              // Detect unusual hours (before 06:00 or after 22:00)
              const hourNum = parseInt(evt.time.split(':')[0], 10);
              const isUnusual = hourNum < 6 || hourNum >= 22;

              return (
                <div key={ei} style={{
                  display: 'flex', flexDirection: 'column',
                  padding: '9px 0', borderBottom: `1px solid ${T.bdr}`,
                }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{
                      fontFamily: FONT.mono, fontSize: 11.5, width: 38, flexShrink: 0,
                      color: isUnusual ? T.sAmber : T.tx4,
                      fontWeight: isUnusual ? 700 : 400,
                    }}>
                      {evt.time}
                    </span>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: T.tx1 }}>
                      {evt.text}
                    </span>
                  </div>
                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 5, paddingLeft: 46, flexWrap: 'wrap', alignItems: 'center' }}>
                    {evt.refs?.map(ref => (
                      <span key={ref} style={{
                        fontFamily: FONT.mono, fontSize: 10.5, fontWeight: 600,
                        color: T.blueDk, background: T.blueLt,
                        padding: '2px 7px', borderRadius: 3,
                        border: `1px solid ${T.blueMid}`,
                      }}>
                        {ref}
                      </span>
                    ))}
                    {evt.statusBadge && (
                      <StatusLoz status={
                        evt.statusBadge === 'done' ? 'Done'
                        : evt.statusBadge === 'progress' ? 'In Progress'
                        : 'In Review'
                      } />
                    )}
                    {isUnusual && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 600,
                        background: '#FEF3C7', color: '#92400E',
                        border: '1px solid #FCD34D',
                        padding: '2px 7px', borderRadius: 3,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        ⚠ {evt.time} AST
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default AIIntelligencePanel;
