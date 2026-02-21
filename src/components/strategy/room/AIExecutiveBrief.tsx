/**
 * AIExecutiveBrief — Full-screen CIO Executive Brief overlay
 * All sections visible at once: Verdict, Strategy-to-Execution Chain,
 * Intelligence (Contradictions), Decisions, Recovery + Data Trust
 * Matches the Ideation Intelligence Hub full-screen pattern.
 */
import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Download, X, ChevronDown, ChevronUp, Link2, Shield } from 'lucide-react';
import { useStrategyRoomIntelligence } from '@/hooks/useStrategyRoomIntelligence';
import { generateExecutiveBrief, type ExecutiveBriefAI } from '@/utils/generateExecutiveBrief';
import { usePublishedBrief, useDraftBrief, usePublishBrief, useGenerateBrief, useDiscardBrief } from '@/hooks/useAIBrief';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

const C = {
  panel: '#FFFFFF',
  card: '#FFFFFF',
  bdr: '#E2E8F0',
  bdrLt: '#F1F5F9',
  ink1: '#0F172A',
  ink2: '#334155',
  ink3: '#64748B',
  ink4: '#94A3B8',
  critical: '#DC2626',
  warn: '#D97706',
  healthy: '#16A34A',
  purple: '#7C3AED',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AIExecutiveBrief({ open, onClose }: Props) {
  const { isAdmin, isSuperAdmin } = useUserRole();
  const isAdminUser = isAdmin || isSuperAdmin;

  const { data: publishedBrief, isLoading: publishedLoading } = usePublishedBrief('strategy_room');
  const { data: draftBrief } = useDraftBrief('strategy_room');
  const publishMutation = usePublishBrief();
  const generateMutation = useGenerateBrief();
  const discardMutation = useDiscardBrief();

  const { data: metrics, isLoading: metricsLoading } = useStrategyRoomIntelligence(open && isAdminUser);

  const [previewingDraft, setPreviewingDraft] = useState(false);
  const activeBriefRecord = previewingDraft && draftBrief ? draftBrief : publishedBrief;
  const brief: ExecutiveBriefAI | null = activeBriefRecord?.brief_json || null;

  useEffect(() => {
    if (open) setPreviewingDraft(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleGenerate = () => {
    if (!metrics) return;
    generateMutation.mutate(
      { scope: 'strategy_room', metricsJson: metrics, generateFn: generateExecutiveBrief },
      {
        onSuccess: () => { toast.success('Draft generated — review before publishing'); setPreviewingDraft(true); },
        onError: () => toast.error('Failed to generate brief'),
      }
    );
  };

  const handlePublish = () => {
    if (!draftBrief) return;
    publishMutation.mutate(draftBrief.id, {
      onSuccess: () => { toast.success('Brief published to all users'); setPreviewingDraft(false); },
      onError: () => toast.error('Failed to publish brief'),
    });
  };

  const handleDiscard = () => {
    if (!draftBrief) return;
    discardMutation.mutate(draftBrief.id, {
      onSuccess: () => { toast.success('Draft discarded'); setPreviewingDraft(false); },
      onError: () => toast.error('Failed to discard draft'),
    });
  };

  const publishedDateStr = activeBriefRecord?.published_at
    ? new Date(activeBriefRecord.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;
  const versionStr = activeBriefRecord?.version ? `v${activeBriefRecord.version}` : '';
  const isLoading = publishedLoading || (isAdminUser && generateMutation.isPending);

  if (!open) return null;

  const metricsData = activeBriefRecord?.metrics_json as any;

  // Stats row data from metrics
  const statsCards = metricsData ? [
    { value: `${metricsData.goalsOnTrack ?? 0}/${metricsData.totalGoals ?? 0}`, label: 'goals on track', color: metricsData.goalsOnTrack === 0 && metricsData.totalGoals > 0 ? C.critical : C.healthy, title: 'Goals On Track' },
    { value: `${metricsData.avgGoalProgress ?? 0}%`, label: 'average progress', color: (metricsData.avgGoalProgress ?? 0) < 50 ? C.warn : C.healthy, title: 'Avg Progress' },
    { value: `${metricsData.overdueRisks ?? 0}`, label: `of ${metricsData.totalRisks ?? 0} risks overdue`, color: (metricsData.overdueRisks ?? 0) > 0 ? C.critical : C.healthy, title: 'Overdue Risks' },
    { value: `${metricsData.orphanedWorkItems ?? 0}`, label: 'orphaned work items', color: (metricsData.orphanedWorkItems ?? 0) > 10 ? C.warn : '#2563EB', title: 'Orphaned Items' },
  ] : [
    { value: '—', label: 'goals on track', color: C.ink3, title: 'Goals On Track' },
    { value: '—', label: 'average progress', color: C.ink3, title: 'Avg Progress' },
    { value: '—', label: 'risks overdue', color: C.ink3, title: 'Overdue Risks' },
    { value: '—', label: 'orphaned items', color: C.ink3, title: 'Orphaned Items' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#FFFFFF', zIndex: 300, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{
        padding: '20px 32px', borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.ink1 }}>CIO Executive Brief</div>
            <div style={{ fontSize: 12, color: C.ink4 }}>
              Strategy Room · {publishedDateStr ? `Published ${publishedDateStr}` : 'No brief published'} {versionStr && `· ${versionStr}`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdminUser && (
            <button onClick={handleGenerate} disabled={isLoading || metricsLoading}
              className="p-2 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-40" title="Generate New Draft">
              <RefreshCw size={16} className={generateMutation.isPending ? 'animate-spin' : ''} style={{ color: C.ink3 }} />
            </button>
          )}
          <button className="p-2 rounded-md hover:bg-slate-100 transition-colors" title="Export PDF">
            <Download size={16} style={{ color: C.ink3 }} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px',
              fontSize: 14, fontWeight: 600, color: '#64748B', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F4F4F5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <X size={16} /> Close
          </button>
        </div>
      </div>

      {/* Admin Draft Banner */}
      {isAdminUser && draftBrief && (
        <div style={{
          padding: '10px 32px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>New draft available</div>
            <div style={{ fontSize: 11, color: '#A16207' }}>
              Generated {new Date(draftBrief.generated_at).toLocaleTimeString()} — review before publishing
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setPreviewingDraft(!previewingDraft)}
              style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.bdr}`, background: C.card, fontSize: 11, fontWeight: 600, color: C.ink2, cursor: 'pointer' }}>
              {previewingDraft ? 'View Published' : 'Preview Draft'}
            </button>
            <button onClick={handleDiscard} disabled={discardMutation.isPending}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', fontSize: 11, fontWeight: 600, color: '#DC2626', cursor: 'pointer' }}>
              Discard
            </button>
            <button onClick={handlePublish} disabled={publishMutation.isPending}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #BBF7D0', background: '#F0FDF4', fontSize: 11, fontWeight: 700, color: '#16A34A', cursor: 'pointer' }}>
              {publishMutation.isPending ? 'Publishing...' : 'Publish to All'}
            </button>
          </div>
        </div>
      )}

      {isLoading && !brief ? (
        <div style={{ padding: 32 }}>
          <div className="space-y-4 animate-pulse">
            <div className="h-32 rounded-xl" style={{ background: C.bdr }} />
            <div className="h-4 w-3/4 rounded" style={{ background: C.bdr }} />
            <div className="h-4 w-1/2 rounded" style={{ background: C.bdr }} />
          </div>
        </div>
      ) : !brief ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Sparkles size={36} style={{ color: C.ink4, margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink2, marginBottom: 6 }}>No brief published yet</div>
          <div style={{ fontSize: 14, color: C.ink3, lineHeight: 1.6 }}>
            {isAdminUser
              ? 'Click the refresh icon to generate a new draft, then publish it for all users.'
              : 'An executive brief will appear here once published by your administrator.'}
          </div>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div style={{ padding: '16px 32px', display: 'flex', gap: 16 }}>
            {statsCards.map(s => (
              <div key={s.title} style={{
                flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', marginBottom: 2 }}>{s.title}</div>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Full content grid - all sections visible */}
          <div style={{ padding: '0 32px 32px' }}>
            {/* Row 1: Verdict + Chain Dials side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <VerdictCard brief={brief} metrics={metricsData} />
              <ChainDialsCard brief={brief} />
            </div>

            {/* Row 2: Intelligence + Decisions side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <IntelligenceCard brief={brief} />
              <DecisionsCard brief={brief} />
            </div>

            {/* Row 3: Recovery + Data Trust side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <RecoveryCard brief={brief} />
              <DataTrustCard brief={brief} />
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{
        padding: '12px 32px', borderTop: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.purple }} />
          <span style={{ fontSize: 10, color: C.ink4 }}>Powered by AI · Steercom-grade</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 500, color: C.ink4 }}>Ministry of Industry</span>
      </div>
    </div>
  );
}

/* ═══ GRADING SCALE ═══ */
const GRADE_SCALE = [
  { grade: 'A+', range: '95–100', color: '#16A34A', meaning: 'World-class execution', desc: 'All strategic objectives on track, risks fully mitigated, full alignment across portfolio.' },
  { grade: 'A',  range: '90–94',  color: '#16A34A', meaning: 'Exceptional performance', desc: 'Near-complete goal attainment with proactive risk management and strong OKR velocity.' },
  { grade: 'A-', range: '85–89',  color: '#16A34A', meaning: 'Strong execution', desc: 'Most goals on track with minor gaps. Strategic alignment is high across all themes.' },
  { grade: 'B+', range: '80–84',  color: '#0D9488', meaning: 'Above expectations', desc: 'Good progress with a few at-risk items. Recovery plans in place and being actioned.' },
  { grade: 'B',  range: '75–79',  color: '#0D9488', meaning: 'Solid performance', desc: 'Majority of KRs progressing. Some orphaned work items but governance is functional.' },
  { grade: 'B-', range: '70–74',  color: '#0D9488', meaning: 'Adequate with concerns', desc: 'Noticeable gaps in risk resolution or alignment. Requires leadership attention within 30 days.' },
  { grade: 'C+', range: '65–69',  color: '#D97706', meaning: 'Below expectations', desc: 'Multiple goals at risk. KR velocity declining. Overdue risks emerging across themes.' },
  { grade: 'C',  range: '60–64',  color: '#D97706', meaning: 'Underperforming', desc: 'Less than half of goals on track. Significant orphaned work and misalignment detected.' },
  { grade: 'C-', range: '55–59',  color: '#D97706', meaning: 'Significant weakness', desc: 'Strategic coherence breaking down. Multiple themes off-track. Immediate intervention needed.' },
  { grade: 'D+', range: '50–54',  color: '#EA580C', meaning: 'Critical underperformance', desc: 'Majority of goals off-track. Risk backlog growing. Workforce misaligned to strategy.' },
  { grade: 'D',  range: '40–49',  color: '#EA580C', meaning: 'Severe governance failure', desc: 'Portfolio lacks strategic anchoring. Critical risks unmanaged. OKR framework non-functional.' },
  { grade: 'D-', range: '30–39',  color: '#DC2626', meaning: 'Near-total breakdown', desc: 'No goals on track. Risk posture critical. Requires full strategic reset and escalation.' },
  { grade: 'F',  range: '0–29',   color: '#DC2626', meaning: 'Strategic failure', desc: 'Complete absence of execution governance. Immediate board-level intervention required.' },
];

/* ═══ VERDICT CARD ═══ */
function VerdictCard({ brief, metrics }: { brief: ExecutiveBriefAI; metrics: any }) {
  const V = brief.verdict || { grade: '—', score: 0, headline: '', detail: '' };
  const score = V.score ?? 0;
  const gradeColor = score >= 80 ? '#16A34A' : score >= 65 ? '#0D9488' : score >= 50 ? '#D97706' : score >= 35 ? '#EA580C' : '#DC2626';

  // Find the current grade row
  const currentGradeRow = GRADE_SCALE.find(g => g.grade === V.grade);

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, minHeight: 280, display: 'flex', flexDirection: 'column' }}>
      <SectionHeader>Executive Verdict</SectionHeader>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', border: `4px solid ${gradeColor}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: gradeColor, lineHeight: 1, letterSpacing: '-.03em' }}>{V.grade}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.ink4, marginTop: 1 }}>{score}/100</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.ink1, lineHeight: 1.3, letterSpacing: '-.02em', marginBottom: 6 }}>{V.headline}</div>
          <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>{V.detail}</div>
        </div>
      </div>

      {/* Why Grade? — Vertical metric tiles */}
      {metrics && (
        <div style={{ paddingTop: 12, borderTop: '1px solid #F1F5F9', marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
            Why {V.grade}?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { v: `${metrics.goalsOnTrack}/${metrics.totalGoals}`, l: 'Goals on track', bad: metrics.goalsOnTrack === 0 && metrics.totalGoals > 0, show: metrics.totalGoals > 0 },
              { v: `${metrics.overdueRisks}/${metrics.totalRisks}`, l: 'Risks overdue', bad: metrics.overdueRisks > 0, show: metrics.totalRisks > 0 },
              { v: `${metrics.orphanedWorkItems}`, l: 'Orphaned items', bad: metrics.orphanedWorkItems > 10, show: metrics.totalWorkItems > 0 },
              { v: `${metrics.avgGoalProgress}%`, l: 'Avg progress', bad: metrics.avgGoalProgress < 50, show: true },
              { v: `${metrics.krsBelow40}`, l: 'KRs below 40%', bad: metrics.krsBelow40 > 3, show: metrics.totalKRs > 0 },
              { v: `${metrics.resolvedRisks}/${metrics.totalRisks}`, l: 'Risks resolved', bad: metrics.resolvedRisks === 0 && metrics.totalRisks > 0, show: metrics.totalRisks > 0 },
            ].filter(s => s.show).map((s, i) => (
              <div key={i} style={{
                padding: '6px 10px', borderRadius: 6,
                background: s.bad ? '#FEF2F2' : '#F0FDF4',
                border: `1px solid ${s.bad ? '#FECACA' : '#BBF7D0'}`,
                display: 'flex', alignItems: 'baseline', gap: 4,
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: s.bad ? C.critical : C.healthy }}>{s.v}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.ink3 }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grading Scale Reference — fills remaining white space */}
      <div style={{ flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', overflow: 'hidden' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.ink4, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
          Portfolio Grading Scale
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {GRADE_SCALE.map(g => {
            const isActive = g.grade === V.grade;
            return (
              <div key={g.grade} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6,
                background: isActive ? `${g.color}10` : 'transparent',
                border: isActive ? `1.5px solid ${g.color}40` : '1.5px solid transparent',
                transition: 'all 0.2s',
              }}>
                <div style={{
                  width: 28, textAlign: 'center',
                  fontSize: 12, fontWeight: 900, color: g.color, fontFamily: "'JetBrains Mono', monospace",
                }}>{g.grade}</div>
                <div style={{
                  width: 42, fontSize: 10, fontWeight: 600, color: C.ink4, fontFamily: "'JetBrains Mono', monospace",
                }}>{g.range}</div>
                <div style={{ flex: 1, fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? C.ink1 : C.ink3 }}>
                  {g.meaning}
                </div>
                {isActive && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══ CHAIN DIALS CARD ═══ */
function ChainDialsCard({ brief }: { brief: ExecutiveBriefAI }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, minHeight: 280 }}>
      <SectionHeader>Strategy-to-Execution Chain</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(brief.chainDials || []).map((dial, i) => (
          <ChainDial key={i} dial={dial} />
        ))}
      </div>
    </div>
  );
}

/* ═══ INTELLIGENCE CARD ═══ */
function IntelligenceCard({ brief }: { brief: ExecutiveBriefAI }) {
  const contradictions = brief.contradictions || [];
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, minHeight: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <SectionHeader>Contradictions Detected</SectionHeader>
        <span style={{ background: contradictions.length > 0 ? '#FEF3C7' : '#DCFCE7', color: contradictions.length > 0 ? '#B45309' : '#15803D', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, marginBottom: 12 }}>
          {contradictions.length} found
        </span>
      </div>
      {contradictions.length === 0 ? (
        <p style={{ fontSize: 13, color: C.ink3, lineHeight: 1.6 }}>No contradictions detected — data is consistent across all portfolio dimensions.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contradictions.map((c, i) => (
            <div key={i} style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: `4px solid ${C.warn}`,
              borderRadius: 8, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink1, lineHeight: 1.4, marginBottom: 6 }}>{c.finding}</div>
              <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>→ {c.implication}</div>
              <div style={{ fontSize: 11, color: C.ink4, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Link2 style={{ width: 10, height: 10 }} /> {c.source}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ DECISIONS CARD ═══ */
function DecisionsCard({ brief }: { brief: ExecutiveBriefAI }) {
  const decisions = brief.decisions || [];
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, minHeight: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <SectionHeader>Decisions Required</SectionHeader>
        {decisions.length > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: C.critical, background: '#FEF2F2', padding: '2px 8px', borderRadius: 10, marginBottom: 12 }}>
            {decisions.length} PENDING
          </span>
        )}
      </div>
      {decisions.length === 0 ? (
        <p style={{ fontSize: 13, color: C.ink3, lineHeight: 1.6 }}>No decisions pending — AI analysis will generate actionable items when data is available.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {decisions.map((d, i) => (
            <DecisionCard key={d.id} decision={d} defaultOpen={i === 0} />
          ))}
          <div style={{
            background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8,
            padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink2 }}>Ready to act? → Export Decision Pack</span>
            <button style={{
              padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.bdr}`,
              background: C.card, color: C.ink1, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Download style={{ width: 14, height: 14 }} /> Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ RECOVERY CARD ═══ */
function RecoveryCard({ brief }: { brief: ExecutiveBriefAI }) {
  const recovery = brief.recovery || [];
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, minHeight: 280 }}>
      <SectionHeader>Recovery Clock</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {recovery.map((h, i) => {
          const dotColor = h.ragColor === 'red' ? C.critical : h.ragColor === 'amber' ? C.warn : C.healthy;
          return (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0, paddingTop: 3 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2.5px solid ${dotColor}`, background: C.card }} />
                {i < recovery.length - 1 && <div style={{ width: 1.5, flex: 1, background: C.bdr, marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.ink1 }}>{h.horizon}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: C.ink3, background: '#F1F5F9',
                    padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.04em', border: '1px solid #E2E8F0',
                  }}>{h.tag}</span>
                </div>
                {h.actions.map((a, j) => (
                  <div key={j} style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6, marginBottom: 5, paddingLeft: 10, borderLeft: '2px solid #E2E8F0' }}>{a}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ DATA TRUST CARD ═══ */
function DataTrustCard({ brief }: { brief: ExecutiveBriefAI }) {
  const dt = brief.dataTrust;
  if (!dt) return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, minHeight: 280 }}>
      <SectionHeader>Data Trust</SectionHeader>
      <p style={{ fontSize: 13, color: C.ink3 }}>Data trust assessment will appear when brief data is generated.</p>
    </div>
  );

  const trustColor = dt.level === 'HIGH' ? C.healthy : dt.level === 'MODERATE' ? C.warn : C.critical;

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, minHeight: 280 }}>
      <SectionHeader>Data Trust Assessment</SectionHeader>

      <div style={{
        background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: `4px solid ${trustColor}`,
        borderRadius: 8, padding: '16px 18px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Shield size={16} style={{ color: trustColor }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: C.ink1 }}>Trust Level: {dt.level}</span>
        </div>
        <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>{dt.note}</div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, color: '#2563EB' }}>{dt.sourcesUsed}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: C.ink4, marginTop: 2 }}>Sources Used</div>
        </div>
        <div style={{ flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, color: dt.gaps > 0 ? C.warn : C.healthy }}>{dt.gaps}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: C.ink4, marginTop: 2 }}>Data Gaps</div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Helpers ═══ */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{
      fontSize: 13, fontWeight: 800, color: C.ink1,
      textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12,
    }}>{children}</h4>
  );
}

function ChainDial({ dial }: { dial: ExecutiveBriefAI['chainDials'][0] }) {
  const [expanded, setExpanded] = useState(false);
  const dotColor = dial.rag === 'red' ? C.critical : dial.rag === 'amber' ? C.warn : C.healthy;

  return (
    <div style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex text-left cursor-pointer"
      >
        <div style={{ width: 4, background: dotColor, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '8px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: C.ink2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{dial.label}</span>
            </div>
            {expanded ? <ChevronUp size={12} style={{ color: C.ink4 }} /> : <ChevronDown size={12} style={{ color: C.ink4 }} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: C.ink1, fontFamily: "'JetBrains Mono', monospace" }}>{dial.metric}</span>
            <span style={{ fontSize: 10, color: C.ink4 }}>{dial.unit}</span>
          </div>
          <div style={{ fontSize: 11, color: C.ink2, lineHeight: 1.4, marginBottom: 6 }}>{dial.tell}</div>
          <div style={{ width: '100%', height: 4, borderRadius: 2, background: '#E2E8F0', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${dial.barPct}%`, background: dotColor, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </button>
      {expanded && (
        <div style={{ padding: '0 12px 10px 22px', borderTop: '1px solid #F1F5F9' }}>
          <p style={{ fontSize: 12, color: C.purple, lineHeight: 1.5, paddingTop: 8, fontStyle: 'italic' }}>
            <span style={{ fontWeight: 600, fontStyle: 'normal', color: C.ink2 }}>AI Insight:</span> {dial.insight}
          </p>
        </div>
      )}
    </div>
  );
}

function DecisionCard({ decision, defaultOpen = false }: { decision: ExecutiveBriefAI['decisions'][0]; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const isCritical = decision.priority === 'CRITICAL';

  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left cursor-pointer"
        style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          minWidth: 28, height: 28, borderRadius: 6, background: isCritical ? C.ink1 : C.ink2,
          color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 900, flexShrink: 0,
        }}>{decision.id}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: isCritical ? C.critical : C.warn, textTransform: 'uppercase', letterSpacing: '.04em' }}>{decision.priority}</span>
            <span style={{ fontSize: 11, color: C.ink3, fontWeight: 600 }}>{decision.deadline}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink1, lineHeight: 1.35 }}>{decision.ask}</div>
        </div>
        <ChevronDown style={{ width: 14, height: 14, color: C.ink4, marginTop: 4, flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 14px 52px', borderTop: '1px solid #F1F5F9' }}>
          <div style={{ paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Rationale</div>
            <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>{decision.rationale}</div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Evidence</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {decision.evidence.map((e, j) => (
                <span key={j} style={{ fontSize: 11, fontWeight: 600, color: C.ink2, background: '#F1F5F9', padding: '4px 8px', borderRadius: 5, border: '1px solid #E2E8F0' }}>{e}</span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: C.ink3 }}>
            <span style={{ fontWeight: 700, color: C.ink2 }}>Owner:</span> {decision.owner}
          </div>
        </div>
      )}
    </div>
  );
}
