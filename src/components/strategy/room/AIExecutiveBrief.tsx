/**
 * AIExecutiveBrief — CIO Executive Brief slide-in panel
 * 4 tabs: Verdict, Intelligence, Decisions, Recovery
 * "Boardroom Neutral" palette — no colored backgrounds, color only as signal dots/borders
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, RefreshCw, Download, X, ChevronDown, ChevronUp, Link2, Shield } from 'lucide-react';
import { useStrategyRoomIntelligence } from '@/hooks/useStrategyRoomIntelligence';
import { generateExecutiveBrief, type ExecutiveBriefAI } from '@/utils/generateExecutiveBrief';

// ── Boardroom Neutral tokens ──
const C = {
  panel: '#FAFBFC',
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

type Tab = 'verdict' | 'intelligence' | 'decisions' | 'recovery';

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

  useEffect(() => {
    if (metrics && open && !brief && !isGenerating) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, open]);

  useEffect(() => {
    if (open) setTab('verdict');
  }, [open]);

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

  const hasDecisions = (brief?.decisions?.length ?? 0) > 0;

  return (
    <>
      {/* ── Backdrop overlay ── */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.35)',
            zIndex: 100,
            transition: 'opacity 300ms ease',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Panel ── */}
      <div
        className="fixed top-[52px] right-0 bottom-0 flex flex-col"
        style={{
          width: '50vw',
          zIndex: 110,
          background: C.panel,
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
              <h2 style={{ fontSize: 14, fontWeight: 800, color: C.ink1 }}>CIO Executive Brief</h2>
              <p style={{ fontSize: 11, color: C.ink3 }}>Strategy Room · {dateStr}</p>
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

          {/* ── Tab bar — NO icons, strong text, black underline ── */}
          <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
            {([
              { id: 'verdict' as Tab, label: 'Verdict' },
              { id: 'intelligence' as Tab, label: 'Intelligence' },
              { id: 'decisions' as Tab, label: 'Decisions' },
              { id: 'recovery' as Tab, label: 'Recovery' },
            ]).map(t => {
              const active = tab === t.id;
              const showDot = t.id === 'decisions' && hasDecisions;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '14px 20px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? C.ink1 : C.ink3,
                    borderBottom: active ? `3px solid ${C.ink1}` : '3px solid transparent',
                    transition: 'all .15s',
                    position: 'relative' as const,
                    letterSpacing: active ? '-.01em' : '0',
                  }}
                >
                  {t.label}
                  {showDot && (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: C.critical,
                      position: 'absolute' as const, top: 8, right: 6,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
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
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.purple }} />
            <span style={{ fontSize: 10, color: C.ink4 }}>Powered by AI · Steercom-grade</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 500, color: C.ink4 }}>Ministry of Industry</span>
        </div>
      </div>
    </>
  );
}

/* ═══ Loading ═══ */
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 rounded-xl" style={{ background: C.bdr }} />
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
      {/* Verdict Card — Light mode, white bg, accent left border */}
      <div style={{
        background: C.card,
        border: `1px solid ${C.bdr}`,
        borderRadius: 12,
        padding: '20px 18px',
        borderLeft: `4px solid ${gradeColor}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Grade circle — simple border */}
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
            <div style={{ fontSize: 9, fontWeight: 700, color: C.ink4, marginTop: 1 }}>
              {score}/100
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 16, fontWeight: 800, color: C.ink1,
              lineHeight: 1.3, letterSpacing: '-.02em', marginBottom: 6,
            }}>
              {V.headline}
            </div>
            <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>
              {V.detail}
            </div>
          </div>
        </div>

        {/* Grade reasoning chips */}
        {metrics && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.bdrLt}` }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.ink4,
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
                  <span style={{ fontSize: 13, fontWeight: 800, color: s.bad ? C.critical : C.healthy }}>{s.v}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.ink3 }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chain Dials */}
      <div>
        <SectionHeader>Strategy-to-Execution Chain</SectionHeader>
        <div className="space-y-2">
          {(brief?.chainDials || []).map((dial, i) => (
            <ChainDial key={i} dial={dial} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Section Header — reusable ── */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{
      fontSize: 13, fontWeight: 800, color: C.ink1,
      textTransform: 'uppercase' as const, letterSpacing: '.04em',
      marginBottom: 12,
    }}>
      {children}
    </h4>
  );
}

/* ── Chain Dial ── */
function ChainDial({ dial }: { dial: ExecutiveBriefAI['chainDials'][0] }) {
  const [expanded, setExpanded] = useState(false);
  const dotColor = dial.rag === 'red' ? C.critical : dial.rag === 'amber' ? C.warn : C.healthy;

  return (
    <div style={{ border: `1px solid ${C.bdr}`, background: C.card, borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex text-left cursor-pointer"
        style={{ transition: 'border-color .15s' }}
      >
        <div className="shrink-0" style={{ width: 4, background: dotColor }} />
        <div className="flex-1 px-3.5 py-2.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: C.ink2, textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>{dial.label}</span>
            </div>
            {expanded
              ? <ChevronUp size={12} style={{ color: C.ink4 }} />
              : <ChevronDown size={12} style={{ color: C.ink4 }} />}
          </div>
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span style={{ fontSize: 22, fontWeight: 900, color: C.ink1 }}>{dial.metric}</span>
            <span style={{ fontSize: 10, color: C.ink4 }}>{dial.unit}</span>
          </div>
          <p style={{ fontSize: 12, color: C.ink2, lineHeight: 1.45, fontWeight: 500, marginBottom: 8 }}>{dial.tell}</p>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: C.bdrLt }}>
            <div className="h-full rounded-full" style={{ width: `${dial.barPct}%`, background: dotColor, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-3.5 pb-3 pt-0" style={{ borderTop: `1px solid ${C.bdrLt}` }}>
          <p className="italic leading-relaxed pt-2" style={{ fontSize: 12, color: C.purple }}>
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
      <div>
        <SectionHeader>Contradictions Detected ({contradictions.length})</SectionHeader>
        {contradictions.length === 0 ? (
          <p style={{ fontSize: 13, color: C.ink3 }}>No contradictions detected — data is consistent.</p>
        ) : (
          <div className="space-y-2.5">
            {contradictions.map((c, i) => (
              <div key={i} style={{
                background: C.card,
                border: `1px solid ${C.bdr}`,
                borderLeft: `4px solid ${C.warn}`,
                borderRadius: 8,
                padding: '14px 16px',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink1, lineHeight: 1.4, marginBottom: 6 }}>
                  {c.finding}
                </div>
                <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>
                  → {c.implication}
                </div>
                <div style={{ fontSize: 11, color: C.ink4, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Link2 style={{ width: 10, height: 10 }} />
                  {c.source}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ DECISIONS TAB ═══ */
function DecisionsTab({ brief }: { brief: ExecutiveBriefAI | null }) {
  const decisions = brief?.decisions || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <SectionHeader>Decisions Required from You</SectionHeader>
        {decisions.length > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: C.critical,
            background: '#FEF2F2', padding: '2px 8px', borderRadius: 10,
            marginBottom: 12,
          }}>
            {decisions.length} PENDING
          </span>
        )}
      </div>

      {decisions.length === 0 ? (
        <p style={{ fontSize: 13, color: C.ink3 }}>No decisions pending — AI analysis will generate actionable items.</p>
      ) : (
        <div className="space-y-2.5">
          {decisions.map((d, i) => (
            <DecisionCard key={d.id} decision={d} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {decisions.length > 0 && (
        <div style={{
          background: C.bdrLt,
          border: `1px solid ${C.bdr}`,
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink2 }}>
            Ready to act? → Export Decision Pack
          </div>
          <button style={{
            padding: '6px 14px', borderRadius: 6,
            border: `1px solid ${C.bdr}`,
            background: C.card, color: C.ink1,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Download style={{ width: 14, height: 14 }} /> Export
          </button>
        </div>
      )}
    </div>
  );
}

function DecisionCard({ decision, defaultOpen = false }: { decision: ExecutiveBriefAI['decisions'][0]; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const isCritical = decision.priority === 'CRITICAL';

  return (
    <div style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left cursor-pointer"
        style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}
      >
        {/* D-number badge — dark */}
        <div style={{
          minWidth: 32, height: 32, borderRadius: 8,
          background: isCritical ? C.ink1 : C.ink2,
          color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 900, flexShrink: 0,
        }}>{decision.id}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: isCritical ? C.critical : C.warn,
              textTransform: 'uppercase' as const, letterSpacing: '.04em',
            }}>{decision.priority}</span>
            <span style={{ fontSize: 11, color: C.ink3, fontWeight: 600 }}>{decision.deadline}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink1, lineHeight: 1.35 }}>{decision.ask}</div>
        </div>
        <ChevronDown style={{
          width: 16, height: 16, color: C.ink4, marginTop: 4, flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }} />
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 16px 60px', borderTop: `1px solid ${C.bdrLt}` }}>
          <div style={{ paddingTop: 12 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.ink3,
              textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 4,
            }}>Rationale</div>
            <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>
              {decision.rationale}
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.ink3,
              textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 6,
            }}>Evidence</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
              {decision.evidence.map((e, j) => (
                <span key={j} style={{
                  fontSize: 11, fontWeight: 600, color: C.ink2,
                  background: C.bdrLt, padding: '4px 8px', borderRadius: 5,
                  border: `1px solid ${C.bdr}`,
                }}>{e}</span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: C.ink3 }}>
            <span style={{ fontWeight: 700, color: C.ink2 }}>Owner:</span> {decision.owner}
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
        <SectionHeader>Recovery Clock</SectionHeader>
        <div className="space-y-4">
          {recovery.map((h, i) => {
            const dotColor = h.ragColor === 'red' ? C.critical
              : h.ragColor === 'amber' ? C.warn : C.healthy;
            return (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                {/* Timeline dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0, paddingTop: 3 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    border: `2.5px solid ${dotColor}`,
                    background: C.card,
                  }} />
                  {i < recovery.length - 1 && <div style={{ width: 1.5, flex: 1, background: C.bdr, marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.ink1 }}>{h.horizon}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: C.ink3,
                      background: C.bdrLt, padding: '2px 8px', borderRadius: 4,
                      textTransform: 'uppercase' as const, letterSpacing: '.04em',
                      border: `1px solid ${C.bdr}`,
                    }}>{h.tag}</span>
                  </div>
                  {h.actions.map((a, j) => (
                    <div key={j} style={{
                      fontSize: 13, color: C.ink2, lineHeight: 1.6,
                      marginBottom: 5, paddingLeft: 10,
                      borderLeft: `2px solid ${C.bdr}`,
                    }}>{a}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Trust */}
      {dt && (
        <div style={{
          background: C.card,
          border: `1px solid ${C.bdr}`,
          borderLeft: `4px solid ${C.warn}`,
          borderRadius: 8,
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Shield style={{ width: 14, height: 14, color: C.ink2 }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: C.ink1 }}>
              Data Trust: {dt.level}
            </span>
            <span style={{ fontSize: 11, color: C.ink3, marginLeft: 'auto' }}>
              {dt.sourcesUsed} sources · {dt.gaps} gaps
            </span>
          </div>
          <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>
            {dt.note}
          </div>
        </div>
      )}
    </div>
  );
}
