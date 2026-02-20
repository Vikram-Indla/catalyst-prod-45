/**
 * AIExecutiveBrief — CIO Executive Brief slide-in panel
 * 4 tabs: Verdict, Intelligence, Decisions, Recovery
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, RefreshCw, Download, X, ChevronDown, ChevronUp, Link2, Zap, Shield } from 'lucide-react';
import { useStrategyRoomIntelligence } from '@/hooks/useStrategyRoomIntelligence';
import { generateExecutiveBrief, type ExecutiveBriefAI } from '@/utils/generateExecutiveBrief';

// ── Color tokens ──
const C = {
  pri: '#2563EB', pri50: '#EFF6FF', pri100: '#DBEAFE',
  teal: '#0D9488', warn: '#D97706', danger: '#EF4444',
  purple: '#7C3AED', success: '#16A34A',
  ink1: '#0F172A', ink2: '#334155', ink3: '#64748B', ink4: '#94A3B8',
  surf: '#F8FAFC', card: '#FFFFFF', bdr: '#E2E8F0', bdrLt: '#F1F5F9',
};

const RAG = {
  red:   { dot: '#EF4444', bg: '#FEF2F2', bdr: '#FECACA', txt: '#DC2626' },
  amber: { dot: '#D97706', bg: '#FFFBEB', bdr: '#FDE68A', txt: '#B45309' },
  green: { dot: '#16A34A', bg: '#F0FDF4', bdr: '#BBF7D0', txt: '#059669' },
};

type Tab = 'verdict' | 'intelligence' | 'decisions' | 'recovery';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'verdict', label: 'Verdict', icon: '◆' },
  { id: 'intelligence', label: 'Intelligence', icon: '⚡' },
  { id: 'decisions', label: 'Decisions', icon: '▲' },
  { id: 'recovery', label: 'Recovery', icon: '◎' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AIExecutiveBrief({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('verdict');
  const [brief, setBrief] = useState<ExecutiveBriefAI | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const { data: metrics, isLoading: metricsLoading } = useStrategyRoomIntelligence(open);

  // Generate brief when metrics load
  useEffect(() => {
    if (metrics && open && !brief && !isGenerating) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, open]);

  // Reset tab when opening
  useEffect(() => {
    if (open) setTab('verdict');
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleGenerate = useCallback(async () => {
    if (!metrics) return;
    setIsGenerating(true);
    try {
      const result = await generateExecutiveBrief(metrics);
      setBrief(result);
    } finally {
      setIsGenerating(false);
    }
  }, [metrics]);

  const handleRegenerate = useCallback(() => {
    setBrief(null);
    handleGenerate();
  }, [handleGenerate]);

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isLoading = metricsLoading || isGenerating;

  return (
    <div
      className="fixed top-[52px] right-0 bottom-0 flex flex-col"
      style={{
        width: '50vw',
        zIndex: 110,
        background: C.surf,
        borderLeft: `1px solid ${C.bdr}`,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 400ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* ── Header ── */}
      <div className="shrink-0" style={{ padding: '16px 20px 0', background: C.card, borderBottom: `1px solid ${C.bdr}` }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-extrabold" style={{ color: C.ink1 }}>CIO Executive Brief</h2>
            <p className="text-[10.5px]" style={{ color: C.ink3 }}>Strategy Room · {dateStr}</p>
          </div>
          <button onClick={handleRegenerate} disabled={isLoading}
            className="p-1.5 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-40"
            title="Regenerate">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} style={{ color: C.ink3 }} />
          </button>
          <button className="p-1.5 rounded-md hover:bg-slate-100 transition-colors" title="Export PDF">
            <Download size={14} style={{ color: C.ink3 }} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-colors" title="Close">
            <X size={14} style={{ color: C.ink3 }} />
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-0 -mb-px">
          {TABS.map(t => {
            const isActive = tab === t.id;
            const hasRedDot = t.id === 'decisions' && (brief?.decisions?.length ?? 0) > 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative px-3 py-2 text-[11px] font-semibold transition-colors"
                style={{
                  color: isActive ? C.pri : C.ink3,
                  borderBottom: isActive ? `2px solid ${C.pri}` : '2px solid transparent',
                }}
              >
                <span className="mr-1 text-[10px]">{t.icon}</span>
                {t.label}
                {hasRedDot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: C.danger }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto" style={{ padding: '20px' }}>
        {isLoading ? <LoadingSkeleton /> : (
          <>
            {tab === 'verdict' && <VerdictTab brief={brief} metrics={metrics} />}
            {tab === 'intelligence' && <IntelligenceTab brief={brief} />}
            {tab === 'decisions' && <DecisionsTab brief={brief} />}
            {tab === 'recovery' && <RecoveryTab brief={brief} />}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2.5"
        style={{ background: C.card, borderTop: `1px solid ${C.bdr}` }}>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.purple }} />
          <span className="text-[10px]" style={{ color: C.ink4 }}>Powered by AI · Steercom-grade</span>
        </div>
        <span className="text-[10px] font-medium" style={{ color: C.ink4 }}>Ministry of Industry</span>
      </div>
    </div>
  );
}

/* ═══ Loading ═══ */
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 rounded-xl" style={{ background: '#1E293B' }} />
      <div className="h-4 w-3/4 rounded" style={{ background: C.bdr }} />
      <div className="h-4 w-1/2 rounded" style={{ background: C.bdr }} />
      <div className="h-4 w-2/3 rounded" style={{ background: C.bdr }} />
    </div>
  );
}

/* ═══ VERDICT TAB ═══ */
function VerdictTab({ brief, metrics }: { brief: ExecutiveBriefAI | null; metrics: any }) {
  const V = brief?.verdict || { grade: '—', score: 0, headline: 'Generating executive verdict...', detail: '' };
  const score = V.score ?? 0;

  const gradeColor = score >= 80 ? '#16A34A'
    : score >= 65 ? '#0D9488'
    : score >= 50 ? '#D97706'
    : score >= 35 ? '#EA580C'
    : '#DC2626';

  return (
    <div className="space-y-5">
      {/* Verdict Card — Light mode */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '20px 18px',
        borderLeft: `4px solid ${gradeColor}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Grade circle */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: `4px solid ${gradeColor}`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: gradeColor, lineHeight: 1, letterSpacing: '-.03em' }}>
              {V.grade}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', marginTop: 1 }}>
              {score}/100
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 16, fontWeight: 800, color: '#0F172A',
              lineHeight: 1.3, letterSpacing: '-.02em', marginBottom: 6,
            }}>
              {V.headline}
            </div>
            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
              {V.detail}
            </div>
          </div>
        </div>

        {/* Grade reasoning chips */}
        {metrics && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 6,
            }}>
              Why {V.grade}?
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
              {[
                { v: `${metrics.goalsOnTrack}/${metrics.totalGoals}`, l: 'Goals on track', bad: metrics.goalsOnTrack === 0 && metrics.totalGoals > 0, show: metrics.totalGoals > 0 },
                { v: `${metrics.overdueRisks}/${metrics.totalRisks}`, l: 'Risks overdue', bad: metrics.overdueRisks > 0, show: metrics.totalRisks > 0 },
                { v: `${metrics.orphanedWorkItems}`, l: 'Orphaned items', bad: metrics.orphanedWorkItems > 10, show: metrics.totalWorkItems > 0 },
                { v: `${metrics.avgGoalProgress}%`, l: 'Avg progress', bad: metrics.avgGoalProgress < 50, show: true },
                { v: `${metrics.krsBelow40}`, l: 'KRs below 40%', bad: metrics.krsBelow40 > 3, show: metrics.totalKRs > 0 },
                { v: `${metrics.resolvedRisks}/${metrics.totalRisks}`, l: 'Risks resolved', bad: metrics.resolvedRisks === 0 && metrics.totalRisks > 0, show: metrics.totalRisks > 0 },
              ].filter(s => s.show).map((s, i) => (
                <div key={i} style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: s.bad ? '#FEF2F2' : '#F0FDF4',
                  border: `1px solid ${s.bad ? '#FECACA' : '#BBF7D0'}`,
                  display: 'flex', alignItems: 'baseline', gap: 4,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: s.bad ? '#DC2626' : '#16A34A' }}>{s.v}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B' }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chain Dials */}
      <div>
        <h4 className="text-[12px] font-extrabold uppercase tracking-wider mb-3" style={{ color: '#0F172A', letterSpacing: '.04em' }}>
          Strategy-to-Execution Chain
        </h4>
        <div className="space-y-2">
          {(brief?.chainDials || []).map((dial, i) => (
            <ChainDial key={i} dial={dial} />
          ))}
        </div>
      </div>
    </div>
  );
}




function ChainDial({ dial }: { dial: ExecutiveBriefAI['chainDials'][0] }) {
  const [expanded, setExpanded] = useState(false);
  const rag = RAG[dial.rag];

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${C.bdr}`, background: C.card }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex text-left cursor-pointer"
        style={{ transition: 'border-color .15s' }}
      >
        {/* RAG color strip */}
        <div className="shrink-0" style={{ width: 4, background: rag.dot }} />
        <div className="flex-1 px-3.5 py-2.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: rag.dot }} />
              <span className="text-[10.5px] font-bold" style={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '.04em' }}>{dial.label}</span>
            </div>
            {expanded
              ? <ChevronUp size={12} style={{ color: C.ink4 }} />
              : <ChevronDown size={12} style={{ color: C.ink4 }} />}
          </div>
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className="text-[22px] font-black" style={{ color: C.ink1 }}>{dial.metric}</span>
            <span className="text-[10px]" style={{ color: C.ink4 }}>{dial.unit}</span>
          </div>
          <p className="text-[12px] mb-2" style={{ color: '#334155', lineHeight: 1.45, fontWeight: 500 }}>{dial.tell}</p>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: C.bdrLt }}>
            <div className="h-full rounded-full" style={{ width: `${dial.barPct}%`, background: rag.dot, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-3.5 pb-3 pt-0" style={{ borderTop: `1px solid ${C.bdrLt}` }}>
          <p className="text-[10.5px] italic leading-relaxed pt-2" style={{ color: C.purple }}>
            <span className="font-semibold not-italic" style={{ color: C.ink2 }}>AI Insight:</span>{' '}
            {dial.insight}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══ INTELLIGENCE TAB ═══ */
function IntelligenceTab({ brief }: { brief: ExecutiveBriefAI | null }) {
  const contradictions = brief?.contradictions || [];

  return (
    <div className="space-y-5">
      {/* Contradictions */}
      <div>
        <h4 className="text-[12px] font-extrabold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: '#0F172A', letterSpacing: '.04em' }}>
          <Zap size={12} style={{ color: C.warn }} /> Contradictions Detected ({contradictions.length})
        </h4>
        {contradictions.length === 0 ? (
          <p className="text-[12px]" style={{ color: C.ink3 }}>No contradictions detected — data is consistent.</p>
        ) : (
          <div className="space-y-2">
            {contradictions.map((c, i) => (
              <div key={i} className="rounded-lg p-3.5" style={{ background: '#FFF3E0', border: '1px solid #FFCC80' }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: '#1E293B', lineHeight: 1.4 }}>{c.finding}</p>
                <p className="text-[12px] mb-1" style={{ color: '#78350F', lineHeight: 1.5 }}>→ {c.implication}</p>
                <p className="text-[10px] flex items-center gap-1" style={{ color: C.ink4 }}>
                  <Link2 size={9} /> {c.source}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity — only show if data exists */}
    </div>
  );
}

/* ═══ DECISIONS TAB ═══ */
function DecisionsTab({ brief }: { brief: ExecutiveBriefAI | null }) {
  const decisions = brief?.decisions || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h4 className="text-[12px] font-extrabold uppercase tracking-wider" style={{ color: '#0F172A', letterSpacing: '.04em' }}>
          Decisions Required from You
        </h4>
        {decisions.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: C.danger }}>
            {decisions.length} PENDING
          </span>
        )}
      </div>

      {decisions.length === 0 ? (
        <p className="text-[12px]" style={{ color: C.ink3 }}>No decisions pending — AI analysis will generate actionable items.</p>
      ) : (
        <div className="space-y-2.5">
          {decisions.map((d, i) => (
            <DecisionCard key={d.id} decision={d} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {decisions.length > 0 && (
        <div className="rounded-lg p-3.5 flex items-center justify-between"
          style={{ background: C.pri50, border: `1px solid ${C.pri100}` }}>
          <span className="text-[12px] font-bold" style={{ color: C.pri }}>
            Ready to act? → Export Decision Pack
          </span>
          <Download size={16} className="text-blue-600" />
        </div>
      )}
    </div>
  );
}

function DecisionCard({ decision, defaultOpen = false }: { decision: ExecutiveBriefAI['decisions'][0]; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const isCritical = decision.priority === 'CRITICAL';
  const pbBg = isCritical ? '#DC2626' : '#B45309';

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${C.bdr}`, background: C.card }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 px-3.5 py-3 text-left cursor-pointer"
      >
        {/* Decision number badge */}
        <span className="shrink-0 text-[12px] font-black px-2.5 py-1 rounded mt-0.5 flex items-center justify-center" style={{
          minWidth: 30, height: 30,
          background: isCritical ? '#FEF2F2' : C.pri50,
          color: isCritical ? C.danger : C.pri,
        }}>
          {decision.id}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded" style={{
              background: isCritical ? '#FEF2F2' : '#FFFBEB',
              color: pbBg,
            }}>
              {decision.priority}
            </span>
            <span className="text-[10px] font-semibold" style={{ color: '#64748B' }}>{decision.deadline}</span>
          </div>
          <p className="text-[14px] font-extrabold leading-snug" style={{ color: '#0F172A' }}>{decision.ask}</p>
        </div>
        {expanded
          ? <ChevronUp size={12} className="shrink-0 mt-1" style={{ color: C.ink4 }} />
          : <ChevronDown size={12} className="shrink-0 mt-1" style={{ color: C.ink4 }} />}
      </button>
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0 space-y-2.5" style={{ borderTop: `1px solid ${C.bdrLt}` }}>
          <div className="pt-2">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.ink4 }}>Rationale</span>
            <p className="text-[10.5px] leading-relaxed mt-0.5" style={{ color: C.ink2 }}>{decision.rationale}</p>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.ink4 }}>Evidence</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {decision.evidence.map((e, i) => (
                <span key={i} className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: C.bdrLt, color: C.ink3 }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
          <div className="pt-1">
            <span className="text-[10px]" style={{ color: C.ink4 }}>
              Owner: <strong style={{ color: C.ink2 }}>{decision.owner}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ RECOVERY TAB ═══ */
function RecoveryTab({ brief }: { brief: ExecutiveBriefAI | null }) {
  const recovery = brief?.recovery || [];
  const dt = brief?.dataTrust;

  return (
    <div className="space-y-5">
      {/* Recovery Clock */}
      <div>
        <h4 className="text-[12px] font-extrabold uppercase tracking-wider mb-3" style={{ color: '#0F172A', letterSpacing: '.04em' }}>
          Recovery Clock
        </h4>
        <div className="relative pl-5">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: C.bdr }} />
          <div className="space-y-4">
            {recovery.map((r, i) => {
              const rag = RAG[r.ragColor];
              return (
                <div key={i} className="relative">
                  {/* Node dot */}
                  <div className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2"
                    style={{ background: rag.bg, borderColor: rag.dot }} />
                  <div className="ml-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[13px] font-extrabold" style={{ color: '#0F172A' }}>{r.horizon}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: rag.bg, color: rag.txt, border: `1px solid ${rag.bdr}` }}>
                        {r.tag}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {r.actions.map((a, j) => (
                        <div key={j} className="flex items-start gap-2 pl-2"
                          style={{ borderLeft: `2px solid ${rag.bdr}` }}>
                          <span className="text-[12px] leading-relaxed" style={{ color: '#334155', fontWeight: 500 }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Trust */}
      {dt && (
        <div className="rounded-lg p-3.5" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Shield size={13} style={{ color: C.warn }} />
            <span className="text-[12px] font-extrabold" style={{ color: '#92400E' }}>Data Trust: {dt.level}</span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[11px] font-medium" style={{ color: '#78350F' }}>{dt.sourcesUsed} sources used</span>
            <span className="text-[11px] font-medium" style={{ color: '#78350F' }}>{dt.gaps} gaps</span>
          </div>
          <p className="text-[12px]" style={{ color: '#78350F', lineHeight: 1.6 }}>{dt.note}</p>
        </div>
      )}

    </div>
  );
}
