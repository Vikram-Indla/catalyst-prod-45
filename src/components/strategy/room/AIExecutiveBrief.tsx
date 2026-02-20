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
  const v = brief?.verdict;
  const grade = v?.grade || '—';
  const score = v?.score ?? 0;

  const gradeColor = score >= 70 ? C.success : score >= 45 ? C.warn : C.danger;

  // SVG arc params
  const r = 42, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * r * 0.75; // 75% arc
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-5">
      {/* Hero Card */}
      <div className="rounded-xl p-5" style={{ background: 'linear-gradient(145deg, #1E293B, #273548)' }}>
        <div className="flex items-start gap-5">
          {/* Grade Arc */}
          <div className="shrink-0 relative" style={{ width: 100, height: 100 }}>
            <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-225deg)' }}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6}
                strokeDasharray={`${circumference} ${2 * Math.PI * r * 0.25}`} strokeLinecap="round" />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={gradeColor} strokeWidth={6}
                strokeDasharray={`${circumference} ${2 * Math.PI * r * 0.25}`}
                strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black" style={{ color: gradeColor }}>{grade}</span>
              <span className="text-[10px] font-bold" style={{ color: C.ink4 }}>{score}/100</span>
            </div>
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-sm font-extrabold text-white leading-snug mb-1.5">
              {v?.headline || 'Generating executive verdict...'}
            </h3>
            <p className="text-[10.5px] leading-relaxed" style={{ color: C.ink4 }}>
              {v?.detail || ''}
            </p>
          </div>
        </div>

        {/* Stats row */}
        {metrics && (
          <>
            <div className="mt-4 mb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
            <div className="grid grid-cols-4 gap-3">
              <MiniStat label="Goals On Track" value={metrics.goalsOnTrack} total={metrics.totalGoals} color={C.success} />
              <MiniStat label="Risks Overdue" value={metrics.overdueRisks} total={metrics.totalRisks} color={C.danger} />
              <MiniStat label="Over-Allocated" value={metrics.overAllocated} total={metrics.totalPeople} color={C.warn} />
              <MiniStat label="Avg Progress" value={`${metrics.avgGoalProgress}%`} color={C.pri} />
            </div>
          </>
        )}
      </div>

      {/* Chain Dials */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: C.ink3 }}>
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

function MiniStat({ label, value, total, color }: { label: string; value: any; total?: number; color: string }) {
  return (
    <div className="text-center">
      <div className="text-base font-extrabold" style={{ color }}>
        {value}{total !== undefined && typeof value === 'number' ? <span className="text-[10px] font-normal" style={{ color: C.ink4 }}>/{total}</span> : null}
      </div>
      <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
    </div>
  );
}

function ChainDial({ dial }: { dial: ExecutiveBriefAI['chainDials'][0] }) {
  const [expanded, setExpanded] = useState(false);
  const rag = RAG[dial.rag];

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: C.bdr, background: C.card }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: rag.dot }} />
        <span className="text-[11px] font-semibold flex-1" style={{ color: C.ink2 }}>{dial.label}</span>
        <span className="text-[12px] font-bold" style={{ color: C.ink1 }}>{dial.metric}</span>
        <span className="text-[10px]" style={{ color: C.ink4 }}>{dial.unit}</span>
        <div className="w-16 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: C.bdrLt }}>
          <div className="h-full rounded-full" style={{ width: `${dial.barPct}%`, background: rag.dot, transition: 'width 0.6s ease' }} />
        </div>
        {expanded ? <ChevronUp size={12} style={{ color: C.ink4 }} /> : <ChevronDown size={12} style={{ color: C.ink4 }} />}
      </button>
      {expanded && (
        <div className="px-3.5 pb-3 pt-0">
          <p className="text-[10.5px] mb-1" style={{ color: C.ink3 }}>{dial.tell}</p>
          <p className="text-[11px] leading-relaxed" style={{ color: C.ink2 }}>{dial.insight}</p>
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
        <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: C.ink3 }}>
          <Zap size={12} style={{ color: C.warn }} /> Contradictions Detected ({contradictions.length})
        </h4>
        {contradictions.length === 0 ? (
          <p className="text-[12px]" style={{ color: C.ink3 }}>No contradictions detected — data is consistent.</p>
        ) : (
          <div className="space-y-2">
            {contradictions.map((c, i) => (
              <div key={i} className="rounded-lg p-3.5" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <p className="text-[11.5px] font-bold mb-0.5" style={{ color: C.ink1 }}>{c.finding}</p>
                <p className="text-[10.5px] italic mb-1" style={{ color: C.ink2 }}>{c.implication}</p>
                <p className="text-[10px] flex items-center gap-1" style={{ color: C.ink4 }}>
                  <Link2 size={9} /> {c.source}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: C.ink3 }}>
          Recent Activity
        </h4>
        <p className="text-[12px]" style={{ color: C.ink3 }}>No recent activity tracked yet.</p>
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
        <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.ink3 }}>
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
          {decisions.map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </div>
      )}

      {decisions.length > 0 && (
        <div className="rounded-lg p-3.5 flex items-center justify-between"
          style={{ background: C.pri50, border: `1px solid ${C.pri100}` }}>
          <span className="text-[11.5px] font-semibold" style={{ color: C.pri }}>
            Ready to act? → Export Decision Pack
          </span>
          <Download size={14} style={{ color: C.pri }} />
        </div>
      )}
    </div>
  );
}

function DecisionCard({ decision }: { decision: ExecutiveBriefAI['decisions'][0] }) {
  const [expanded, setExpanded] = useState(false);
  const isCritical = decision.priority === 'CRITICAL';

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: C.bdr, background: C.card }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{
          background: isCritical ? '#FEF2F2' : C.pri50,
          color: isCritical ? C.danger : C.pri,
        }}>
          {decision.id}
        </span>
        <span className="text-[11.5px] font-semibold flex-1" style={{ color: C.ink1 }}>{decision.ask}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
          background: isCritical ? '#FEF2F2' : '#FFFBEB',
          color: isCritical ? C.danger : C.warn,
        }}>
          {decision.priority}
        </span>
        {expanded ? <ChevronUp size={12} style={{ color: C.ink4 }} /> : <ChevronDown size={12} style={{ color: C.ink4 }} />}
      </button>
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0 space-y-2">
          <p className="text-[10.5px] leading-relaxed" style={{ color: C.ink2 }}>{decision.rationale}</p>
          <div className="flex flex-wrap gap-1.5">
            {decision.evidence.map((e, i) => (
              <span key={i} className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: C.bdrLt, color: C.ink3 }}>
                {e}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-1">
            <span className="text-[10px]" style={{ color: C.ink4 }}>Deadline: <strong style={{ color: C.ink2 }}>{decision.deadline}</strong></span>
            <span className="text-[10px]" style={{ color: C.ink4 }}>Owner: <strong style={{ color: C.ink2 }}>{decision.owner}</strong></span>
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
        <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: C.ink3 }}>
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
                      <span className="text-[11px] font-bold" style={{ color: C.ink1 }}>{r.horizon}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: rag.bg, color: rag.txt, border: `1px solid ${rag.bdr}` }}>
                        {r.tag}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {r.actions.map((a, j) => (
                        <div key={j} className="flex items-start gap-2 pl-2"
                          style={{ borderLeft: `2px solid ${rag.bdr}` }}>
                          <span className="text-[10.5px] leading-relaxed" style={{ color: C.ink2 }}>{a}</span>
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
            <span className="text-[11px] font-bold" style={{ color: C.ink1 }}>Data Trust: {dt.level}</span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[10px]" style={{ color: C.ink3 }}>{dt.sourcesUsed} sources used</span>
            <span className="text-[10px]" style={{ color: C.ink3 }}>{dt.gaps} gaps</span>
          </div>
          <p className="text-[10.5px]" style={{ color: C.ink2 }}>{dt.note}</p>
        </div>
      )}

      {/* Brief Metadata */}
      <div className="rounded-lg p-3.5" style={{ background: C.bdrLt }}>
        <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: C.ink4 }}>Brief Metadata</h4>
        <div className="grid grid-cols-2 gap-y-1.5 text-[10px]" style={{ color: C.ink3 }}>
          <span>Model</span><span className="font-medium" style={{ color: C.ink2 }}>Gemini Flash</span>
          <span>Scope</span><span className="font-medium" style={{ color: C.ink2 }}>Full portfolio</span>
          <span>Output</span><span className="font-medium" style={{ color: C.ink2 }}>Structured JSON</span>
          <span>Guardrails</span><span className="font-medium" style={{ color: C.ink2 }}>Steercom-grade</span>
        </div>
      </div>
    </div>
  );
}
