/**
 * AIExecutiveBrief — Chunk 2: Full AI intelligence product
 * Scope: [data-sri] — ring-fenced --sri-* tokens, zero global leak
 * Color: BLUE-DOMINANT. Semantic status colors only on severity badges.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePublishedBrief, useDraftBrief, usePublishBrief, useGenerateBrief, useDiscardBrief } from '@/hooks/useAIBrief';
import { useStrategyRoomIntelligence } from '@/hooks/useStrategyRoomIntelligence';
import { generateExecutiveBrief, type ExecutiveBriefAI } from '@/utils/generateExecutiveBrief';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

/* ═══════════════════════════════════════════════════════════════════════════
   TOKENS — scoped to [data-sri], zero global leak
   ═══════════════════════════════════════════════════════════════════════════ */
const TOKENS = `
[data-sri] {
  --sri-ink:#09090B; --sri-ink-2:#18181B; --sri-ink-3:#3F3F46;
  --sri-ink-m:#71717A;
  --sri-bg:#FFFFFF; --sri-bg-2:#FAFAFA; --sri-bg-3:#F4F4F5;
  --sri-bdr:#E4E4E7; --sri-bdr-s:#D4D4D8;
  --sri-ai:#2563EB; --sri-ai-d:#1E40AF; --sri-ai-bg:#EFF6FF;
  --sri-ai-bg2:#DBEAFE; --sri-ai-bdr:#93C5FD; --sri-ai-m:#3B82F6;
  --sri-green:#16A34A; --sri-green-t:#11853D; --sri-green-bg:#F0FDF4;
  --sri-teal-t:#0A8277;
  --sri-red:#DC2626; --sri-red-t:#D92525; --sri-red-bg:#FEF2F2;
  --sri-r:4px; --sri-r2:6px; --sri-r3:8px; --sri-r4:12px; --sri-pill:9999px;
  font-family:'Inter',system-ui,sans-serif; color:var(--sri-ink);
  -webkit-font-smoothing:antialiased; line-height:1.5;
}
@media print {
  [data-sri] .sri-actions { display:none !important; }
  .sri-root-container {
    position: static !important;
    inset: auto !important;
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
    background: #fff !important;
  }
  [data-sri] { background:white !important; }
  [data-sri], [data-sri] * {
    overflow: visible !important;
    max-height: none !important;
  }
}
`;

/* ─── style helpers ─── */
const S = (sz: number, wt = 700): React.CSSProperties => ({ fontFamily: "'Sora',sans-serif", fontSize: sz, fontWeight: wt });
const M = (sz = 11): React.CSSProperties => ({ fontFamily: "'JetBrains Mono',monospace", fontSize: sz });
const F = (g = 8): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: g });
const D = (c: string, s = 8): React.CSSProperties => ({ width: s, height: s, borderRadius: "50%", background: c, flexShrink: 0 });
const BT = (h = 8): React.CSSProperties => ({ height: h, background: "var(--sri-bg-3)", borderRadius: "var(--sri-pill)", overflow: "hidden" });
const BF = (c: string, p: number): React.CSSProperties => ({ height: "100%", width: `${p}%`, background: c, borderRadius: "var(--sri-pill)", transition: "width .8s" });
const SECT: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--sri-ai-d)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };

/* ─── card shell (blue left accent) ─── */
const Card = ({ title, badge, badgeBg, badgeColor, children, full }: {
  title: string; badge?: string; badgeBg?: string; badgeColor?: string; children: React.ReactNode; full?: boolean;
}) => (
  <div style={{ background: "var(--sri-bg)", border: "1px solid var(--sri-bdr)", borderRadius: "var(--sri-r4)", overflow: "hidden", ...(full ? { gridColumn: "1 / -1" } : {}) }}>
    <div style={{ padding: "16px 24px 12px", ...F(8), justifyContent: "space-between", borderBottom: "1px solid var(--sri-bdr)", borderInlineStart: "3px solid var(--sri-ai)" }}>
      <span style={{ ...S(14), color: "var(--sri-ai-d)", textTransform: "uppercase", letterSpacing: ".03em" }}>{title}</span>
      {badge && <span style={{ ...M(11), fontWeight: 700, padding: "3px 10px", borderRadius: "var(--sri-pill)", background: badgeBg || "var(--sri-ai-bg)", color: badgeColor || "var(--sri-ai-d)" }}>{badge}</span>}
    </div>
    <div style={{ padding: "20px 24px" }}>{children}</div>
  </div>
);

/* ─── static data (will be replaced by AI-generated content in Stage D) ─── */
const KPI_DATA = [
  { l: "Goals On Track", v: "0", u: "/12", c: "var(--sri-red-t)", d: "↓ 2 vs Q4", dc: "var(--sri-red-t)" },
  { l: "Avg Progress", v: "48", u: "%", c: "var(--sri-ai-d)", d: "↓ 7% vs Q4", dc: "var(--sri-red-t)" },
  { l: "Overdue Risks", v: "0", u: "", c: "var(--sri-green-t)", d: "→ same as Q4", dc: "var(--sri-green-t)" },
  { l: "Unlinked Items", v: "21", u: "", c: "var(--sri-red-t)", d: "↑ 6 vs Q4", dc: "var(--sri-red-t)" },
];

const CHAIN_DATA = [
  { l: "Themes → Goals", v: "0", u: "Count", desc: "Zero active strategic themes defined for the portfolio.", p: 0, c: "var(--sri-red)" },
  { l: "Goals → Success Measures", v: "48", u: "%", desc: "Average goal progress is stalled below the midpoint.", p: 48, c: "var(--sri-ai)" },
  { l: "Success Measures → Work Items", v: "31", u: "%", desc: "9 of 29 success measures are performing below 40%.", p: 31, c: "var(--sri-red)" },
  { l: "Work → People", v: "0", u: "Count", desc: "Zero personnel or resource allocations recorded.", p: 0, c: "var(--sri-red)" },
  { l: "People → Budget", v: "21", u: "Unlinked", desc: "21 work items have no link to strategic goals.", p: 7, c: "var(--sri-red)" },
  { l: "Budget → Risk", v: "4", u: "Critical", desc: "Four critical risks remain unowned and unmitigated.", p: 13, c: "var(--sri-red)" },
];

const CONTRADICTIONS_DATA = [
  { t: "Average progress is 48% despite zero active strategic themes.", e: "Work is being done in a silo without knowing which national pillar it supports.", src: "Themes vs. Goals Progress" },
  { t: "60 work items exist but zero people are allocated.", e: "The data is either incomplete or the work is being performed by unmonitored third parties.", src: "Work Items vs. People" },
  { t: "4 critical risks exist with zero recorded owners or actions.", e: "The portfolio has identified threats but has no mechanism to prevent them from occurring.", src: "Risks Data" },
];

const DECISIONS_DATA = [
  { id: "D1", pr: "Critical", dt: "2024-05-24", title: "Mandate immediate assignment of owners to all 4 critical risks.", rat: "Critical risks without owners cannot be mitigated. Each unowned risk increases portfolio exposure and delays the Ministry's transformation timeline.", ev: ["4 critical risks identified", "0 risks owned", "0 risks mitigated", "AI Health Score 47/100"], owner: "Chief Risk Officer", crit: true },
  { id: "D2", pr: "High", dt: "2024-06-07", title: "Decommission or re-align the 21 unlinked work items.", rat: "Work items without strategic links consume resources without contributing to Ministry goals.", ev: ["21 unlinked work items", "35% misalignment rate", "0 active themes"], owner: "Portfolio Director", crit: false },
];

const RECOVERY_DATA = [
  { phase: "Week 1–2", tag: "Stop the Bleeding", c: "var(--sri-red)", tasks: ["Assign executive owners to the 4 critical unmitigated risks", "Freeze all 21 unlinked work items pending strategic review"] },
  { phase: "Month 1", tag: "Restore Governance", c: "var(--sri-ai)", tasks: ["Define 3–5 Strategic Themes to anchor the 12 goals", "Upload resource allocation data for all 60 work items"] },
  { phase: "Month 2–3", tag: "Accelerate Results", c: "var(--sri-green)", tasks: ["Target 80% progress for the 9 lagging success measures", "Achieve 95% strategic alignment across the work portfolio"] },
];

const GRADING_DATA = [
  { g: "A+", r: "95–100", d: "World-class execution", c: "var(--sri-green-t)" },
  { g: "A", r: "90–94", d: "Exceptional performance", c: "var(--sri-green-t)" },
  { g: "A-", r: "85–89", d: "Strong execution", c: "var(--sri-green-t)" },
  { g: "B+", r: "80–84", d: "Above expectations", c: "var(--sri-teal-t)" },
  { g: "B", r: "75–79", d: "Solid performance", c: "var(--sri-teal-t)" },
  { g: "B-", r: "70–74", d: "Adequate with concerns", c: "var(--sri-teal-t)" },
  { g: "C+", r: "65–69", d: "Below expectations", c: "var(--sri-ai)" },
  { g: "C", r: "60–64", d: "Underperforming", c: "var(--sri-ai)" },
  { g: "C-", r: "55–59", d: "Significant weakness", c: "var(--sri-ai)" },
  { g: "D+", r: "50–54", d: "Critical underperformance", c: "var(--sri-red-t)" },
  { g: "D", r: "40–49", d: "Severe governance failure", c: "var(--sri-red-t)" },
  { g: "D-", r: "30–39", d: "Near-total breakdown", c: "var(--sri-red-t)", active: true },
  { g: "F", r: "0–29", d: "Strategic failure", c: "var(--sri-ink-m)" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AIExecutiveBrief({ open, onClose }: Props) {
  const { isAdmin, isSuperAdmin } = useUserRole();
  const isAdminUser = isAdmin || isSuperAdmin;

  // Brief governance hooks
  const { data: publishedBrief, isLoading: publishedLoading } = usePublishedBrief('strategy_room');
  const { data: draftBrief } = useDraftBrief('strategy_room');
  const publishMutation = usePublishBrief();
  const generateMutation = useGenerateBrief();
  const discardMutation = useDiscardBrief();
  const { data: metrics, isLoading: metricsLoading } = useStrategyRoomIntelligence(open && isAdminUser);

  const [previewingDraft, setPreviewingDraft] = useState(false);
  const activeBriefRecord = previewingDraft && draftBrief ? draftBrief : publishedBrief;
  const brief: ExecutiveBriefAI | null = activeBriefRecord?.brief_json || null;

  useEffect(() => { if (open) setPreviewingDraft(false); }, [open]);

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

  const handleDownload = useCallback(() => { window.print(); }, []);

  const publishedDateStr = activeBriefRecord?.published_at
    ? new Date(activeBriefRecord.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Feb 20, 2026, 09:17 PM';
  const versionStr = activeBriefRecord?.version ? `v${activeBriefRecord.version}` : 'v2';
  const isLoading = publishedLoading || (isAdminUser && generateMutation.isPending);

  if (!open) return null;

  // Use brief data when available, fallback to static showcase data
  const kpiData = KPI_DATA;
  const chainData = CHAIN_DATA;
  const contradictions = CONTRADICTIONS_DATA;
  const decisions = DECISIONS_DATA;
  const recovery = RECOVERY_DATA;
  const grading = GRADING_DATA;

  return (
    <div className="sri-root-container" style={{ position: 'relative', background: '#FFFFFF', zIndex: 300, overflowY: 'visible' }}>
      <div data-sri style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 0 60px" }}>
        <style>{TOKENS}</style>

        {/* ═══ HEADER ═══ */}
        <header style={{ background: "var(--sri-bg)", border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", padding: "20px 28px", margin: "0 24px", ...F(14), justifyContent: "space-between" }}>
          <div style={F(14) as React.CSSProperties}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, var(--sri-ai-d), var(--sri-ai))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10" /></svg>
            </div>
            <div>
              <div style={{ ...S(20), color: "var(--sri-ink)" }}>Executive Brief</div>
              <div style={{ fontSize: 13, color: "var(--sri-ink-m)", marginTop: 1 }}>Strategy Room · Published <b style={{ color: "var(--sri-ink-3)", fontWeight: 600 }}>{publishedDateStr}</b> · {versionStr}</div>
            </div>
          </div>
          <div className="sri-actions" style={F(8) as React.CSSProperties}>
            {isAdminUser && (
              <button onClick={handleGenerate} disabled={isLoading || metricsLoading}
                style={{ height: 32, padding: "0 14px", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500, borderRadius: "var(--sri-r2)", cursor: "pointer", ...F(6), border: "1px solid var(--sri-bdr)", background: "var(--sri-bg)", color: "var(--sri-ink-3)" }}>
                <RefreshCw size={14} className={generateMutation.isPending ? 'animate-spin' : ''} />
                Generate
              </button>
            )}
            <button onClick={handleDownload} style={{ height: 32, padding: "0 14px", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500, borderRadius: "var(--sri-r2)", cursor: "pointer", ...F(6), border: "1px solid var(--sri-bdr)", background: "var(--sri-bg)", color: "var(--sri-ink-3)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Download
            </button>
            <button onClick={onClose} style={{ height: 32, padding: "0 14px", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500, borderRadius: "var(--sri-r2)", cursor: "pointer", ...F(6), border: "1px solid var(--sri-bdr)", background: "var(--sri-bg)", color: "var(--sri-ink-3)" }}>✕ Close</button>
          </div>
        </header>

        {/* ═══ ADMIN DRAFT BANNER ═══ */}
        {isAdminUser && draftBrief && (
          <div style={{ margin: "12px 24px 0", padding: "12px 20px", background: "var(--sri-ai-bg)", border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r3)", ...F(12) as React.CSSProperties, justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sri-ai-d)" }}>New draft available</div>
              <div style={{ fontSize: 11, color: "var(--sri-ink-m)" }}>Generated {new Date(draftBrief.generated_at).toLocaleTimeString()} — review before publishing</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => setPreviewingDraft(!previewingDraft)}
                style={{ padding: "4px 10px", borderRadius: "var(--sri-r2)", border: "1px solid var(--sri-bdr)", background: "var(--sri-bg)", fontSize: 11, fontWeight: 600, color: "var(--sri-ink-3)", cursor: "pointer" }}>
                {previewingDraft ? 'View Published' : 'Preview Draft'}
              </button>
              <button onClick={handleDiscard} disabled={discardMutation.isPending}
                style={{ padding: "4px 10px", borderRadius: "var(--sri-r2)", border: "1px solid var(--sri-red)", background: "var(--sri-red-bg)", fontSize: 11, fontWeight: 600, color: "var(--sri-red-t)", cursor: "pointer" }}>
                Discard
              </button>
              <button onClick={handlePublish} disabled={publishMutation.isPending}
                style={{ padding: "4px 10px", borderRadius: "var(--sri-r2)", border: "1px solid var(--sri-green)", background: "var(--sri-green-bg)", fontSize: 11, fontWeight: 700, color: "var(--sri-green-t)", cursor: "pointer" }}>
                {publishMutation.isPending ? 'Publishing...' : 'Publish to All'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ KPI STRIP ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, margin: "16px 24px 0" }}>
          {kpiData.map((k, i) => (
            <div key={i} style={{ background: "var(--sri-bg)", border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", padding: "16px 20px", borderTop: "3px solid var(--sri-ai)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--sri-ai)", textTransform: "uppercase", letterSpacing: ".04em" }}>{k.l}</div>
              <div style={{ ...S(28, 800), marginTop: 4, lineHeight: 1.1, color: k.c }}>{k.v}<span style={{ fontSize: 16, color: "var(--sri-ink-m)", fontWeight: 500 }}>{k.u}</span></div>
              <div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 4 }}><span style={{ color: k.dc, fontWeight: 600 }}>{k.d}</span></div>
            </div>
          ))}
        </div>

        {/* ═══ BODY GRID ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "16px 24px 0" }}>

          {/* ─── VERDICT + WHY + GRADING ─── */}
          <Card title="Executive Verdict">
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "3px solid var(--sri-ai)", background: "var(--sri-ai-bg)" }}>
                <span style={{ ...S(24, 800), color: "var(--sri-ai-d)", lineHeight: 1 }}>D-</span>
                <span style={{ ...M(10), fontWeight: 600, color: "var(--sri-ai)", marginTop: 1 }}>47/100</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...S(16), color: "var(--sri-ink)", lineHeight: 1.4 }}>Strategic Alignment Failure Threatens Ministry Industrial Transformation Goals</div>
                <div style={{ ...F(12) as React.CSSProperties, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{ ...M(11), fontWeight: 600, color: "var(--sri-red-t)", background: "var(--sri-red-bg)", padding: "3px 10px", borderRadius: "var(--sri-pill)" }}>↓ 8 pts vs Q4 2025</span>
                  <span style={{ fontSize: 12, color: "var(--sri-ink-m)" }}>Trajectory:</span>
                  <span style={{ ...M(11), color: "var(--sri-ink-3)" }}>Q2 <b>C-</b> → Q3 <b>D+</b> → Q4 <b>D</b> → Q1 <b style={{ color: "var(--sri-red-t)" }}>D-</b></span>
                </div>
                <div style={{ fontSize: 14, color: "var(--sri-ink-2)", marginTop: 10, lineHeight: 1.7 }}>
                  The portfolio suffers from a complete absence of strategic anchoring and critical risk oversight.
                  A 35% misalignment rate across work items combined with four unmanaged critical risks indicates
                  a breakdown in governance. The score has declined for three consecutive quarters.
                </div>
              </div>
            </div>

            {/* Why D-? */}
            <div style={{ ...S(13), color: "var(--sri-ink-m)", marginTop: 20, marginBottom: 10 }}>Why D-?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { v: "0/12", t: "Goals on track", sev: "high" }, { v: "0/30", t: "Risks overdue", sev: "low" },
                { v: "21", t: "Unlinked work items", sev: "high" }, { v: "48%", t: "Avg progress", sev: "mid" },
                { v: "9", t: "Success measures below 40%", sev: "high" }, { v: "0/30", t: "Risks resolved", sev: "high" },
              ].map((w, i) => (
                <div key={i} style={{ ...F(10) as React.CSSProperties, padding: "10px 14px", borderRadius: "var(--sri-r3)", borderInlineStart: `3px solid ${w.sev === "high" ? "var(--sri-red)" : w.sev === "mid" ? "var(--sri-ai)" : "var(--sri-green)"}`, background: "var(--sri-ai-bg)" }}>
                  <span style={{ ...S(16, 800), color: "var(--sri-ai-d)", flexShrink: 0, minWidth: 36 }}>{w.v}</span>
                  <span style={{ fontWeight: 500, color: "var(--sri-ink-2)", fontSize: 13 }}>{w.t}</span>
                </div>
              ))}
            </div>

            {/* Grading Scale */}
            <div style={{ ...S(13), color: "var(--sri-ink-m)", marginTop: 24, marginBottom: 10 }}>Portfolio Grading Scale</div>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 3px" }}>
              <tbody>
                {grading.map((g, i) => (
                  <tr key={i} style={g.active ? { background: "var(--sri-ai-bg)", borderRadius: "var(--sri-r2)" } : {}}>
                    <td style={{ ...S(14, 800), width: 32, textAlign: "center", color: g.c, padding: "6px 12px" }}>{g.g}</td>
                    <td style={{ ...M(12), fontWeight: 500, color: "var(--sri-ink-m)", width: 50, padding: "6px 12px" }}>{g.r}</td>
                    <td style={{ color: g.active ? "var(--sri-ai-d)" : "var(--sri-ink-2)", fontWeight: g.active ? 700 : 500, padding: "6px 12px", fontSize: 12 }}>
                      {g.d}{g.active && <span style={{ ...(D("var(--sri-ai)", 6) as React.CSSProperties), display: "inline-block", marginInlineStart: 6 }} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* ─── STRATEGY-TO-EXECUTION CHAIN ─── */}
          <Card title="Strategy-to-Execution Chain">
            <div style={{ margin: "-20px -24px" }}>
              {chainData.map((c, i) => (
                <div key={i} style={{ padding: "16px 24px", borderBottom: i < chainData.length - 1 ? "1px solid var(--sri-bdr)" : "none", display: "flex", alignItems: "flex-start", gap: 16, cursor: "pointer" }}>
                  <span style={D(c.c, 10) as React.CSSProperties} />
                  <div style={{ flex: 1 }}>
                    <div style={{ ...S(13), color: "var(--sri-ink)", textTransform: "uppercase", letterSpacing: ".02em" }}>{c.l}</div>
                    <div style={{ ...S(24, 800), color: "var(--sri-ink)", marginTop: 2 }}>{c.v} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--sri-ink-m)" }}>{c.u}</span></div>
                    <div style={{ fontSize: 13, color: "var(--sri-ink-m)", marginTop: 4 }}>{c.desc}</div>
                    <div style={{ marginTop: 8 }}><div style={BT() as React.CSSProperties}><div style={BF(c.c, c.p) as React.CSSProperties} /></div></div>
                  </div>
                  <span style={{ color: "var(--sri-ink-m)", fontSize: 18, marginTop: 4 }}>›</span>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── CONTRADICTIONS — BLUE borders ─── */}
          <Card title="Contradictions Detected" badge="3 found">
            {contradictions.map((c, i) => (
              <div key={i} style={{ padding: "14px 18px", borderInlineStart: "3px solid var(--sri-ai)", background: "var(--sri-ai-bg)", borderRadius: "0 var(--sri-r2) var(--sri-r2) 0", marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sri-ink)" }}>{c.t}</div>
                <div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 4 }}>→ {c.e}</div>
                <div style={{ fontSize: 11, color: "var(--sri-ai-d)", marginTop: 4, fontWeight: 600, ...F(4) as React.CSSProperties }}>⚡ {c.src}</div>
              </div>
            ))}
          </Card>

          {/* ─── DECISIONS ─── */}
          <Card title="Decisions Required" badge="2 Pending" badgeBg="var(--sri-red-bg)" badgeColor="var(--sri-red-t)">
            <div style={{ margin: "-20px -24px" }}>
              {decisions.map((d, i) => (
                <div key={i} style={{ border: "1px solid var(--sri-bdr)", borderRadius: "var(--sri-r4)", margin: "12px 20px", overflow: "hidden" }}>
                  <div style={{ ...F(12) as React.CSSProperties, padding: "14px 18px", borderBottom: "1px solid var(--sri-bdr)" }}>
                    <div style={{ ...S(14, 800), width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "var(--sri-ai-bg)", color: "var(--sri-ai-d)", border: `2px solid ${d.crit ? "var(--sri-red)" : "var(--sri-ai)"}` }}>{d.id}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: d.crit ? "var(--sri-red-t)" : "var(--sri-ai-d)" }}>{d.pr}</span>
                    <span style={{ ...M(11), color: "var(--sri-ink-m)" }}>{d.dt}</span>
                    <span style={{ ...S(14), color: "var(--sri-ink)", flex: 1 }}>{d.title}</span>
                  </div>
                  <div style={{ padding: "14px 18px" }}>
                    <div style={SECT}>Rationale</div>
                    <div style={{ fontSize: 13, color: "var(--sri-ink-2)", marginBottom: 10 }}>{d.rat}</div>
                    <div style={SECT}>Evidence</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {d.ev.map((e, j) => <span key={j} style={{ fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: "var(--sri-pill)", background: "var(--sri-ai-bg)", color: "var(--sri-ai-d)", border: "1px solid var(--sri-ai-bdr)" }}>{e}</span>)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 10 }}>Owner: <b style={{ color: "var(--sri-ink-3)" }}>{d.owner}</b></div>
                  </div>
                </div>
              ))}
              {/* Export bar */}
              <div style={{ ...F(8) as React.CSSProperties, justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--sri-bdr)", background: "var(--sri-ai-bg)" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--sri-ai-d)" }}>Ready to act? → Export Decision Pack</span>
                <button style={{ height: 30, padding: "0 14px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, borderRadius: "var(--sri-r2)", cursor: "pointer", ...F(6), border: "none", background: "var(--sri-ai-d)", color: "#fff" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Export
                </button>
              </div>
            </div>
          </Card>

          {/* ─── RECOVERY CLOCK ─── */}
          <Card title="Recovery Clock">
            {/* Projected Score */}
            <div style={{ border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", padding: "14px 18px", marginBottom: 20, background: "var(--sri-ai-bg)" }}>
              <div style={{ ...SECT, marginBottom: 8 }}>Projected Score Recovery</div>
              <div style={{ ...F(16) as React.CSSProperties }}>
                {[
                  { g: "D-", t: "Now", c: "var(--sri-red-t)" },
                  { g: "C", t: "+4 wks", c: "var(--sri-ai)" },
                  { g: "B-", t: "+12 wks", c: "var(--sri-teal-t)" },
                  { g: "B+", t: "+24 wks", c: "var(--sri-green-t)" },
                ].map((p, i) => (
                  <React.Fragment key={i}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ ...S(16, 800), color: p.c }}>{p.g}</div>
                      <div style={{ fontSize: 10, color: "var(--sri-ink-m)" }}>{p.t}</div>
                    </div>
                    {i < 3 && <div style={{ flex: 1, height: 4, background: i === 0 ? "var(--sri-ai)" : "var(--sri-bg-3)", borderRadius: "var(--sri-pill)" }} />}
                  </React.Fragment>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--sri-ink-m)", marginTop: 8 }}>Assumes full execution of recovery plan. Week 1–2 actions alone could move score to D+.</div>
            </div>

            {/* Timeline */}
            {recovery.map((r, i) => (
              <div key={i} style={{ position: "relative", paddingInlineStart: 28, marginBottom: i < 2 ? 20 : 0 }}>
                {i < 2 && <div style={{ position: "absolute", insetInlineStart: 9, top: 26, bottom: -8, width: 2, background: "var(--sri-ai-bdr)" }} />}
                <div style={{ position: "absolute", insetInlineStart: 0, top: 4, width: 20, height: 20, borderRadius: "50%", border: `2px solid ${r.c}`, background: "var(--sri-ai-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={D(r.c) as React.CSSProperties} />
                </div>
                <div style={{ ...F(8) as React.CSSProperties, marginBottom: 6 }}>
                  <span style={{ ...S(14), color: "var(--sri-ink)" }}>{r.phase}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", padding: "3px 8px", borderRadius: "var(--sri-pill)", background: "var(--sri-ai-bg)", color: r.c }}>{r.tag}</span>
                </div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4, padding: 0, margin: 0 }}>
                  {r.tasks.map((t, j) => <li key={j} style={{ fontSize: 13, color: "var(--sri-ink-2)", paddingInlineStart: 4 }}>→ {t}</li>)}
                </ul>
              </div>
            ))}
          </Card>

          {/* ─── DATA TRUST ─── */}
          <Card title="Data Trust Assessment">
            <div style={{ ...F(12) as React.CSSProperties, marginBottom: 12 }}>
              <span style={{ ...(D("var(--sri-ai)", 12) as React.CSSProperties), border: "2px solid var(--sri-ai)" }} />
              <span style={{ ...S(16, 800), color: "var(--sri-ink)" }}>Trust Level: <span style={{ color: "var(--sri-red-t)" }}>LOW</span></span>
            </div>
            <div style={{ fontSize: 13, color: "var(--sri-ink-m)", lineHeight: 1.6, marginBottom: 16 }}>
              Critical data gaps in resource management and strategic hierarchy render the current progress metrics unreliable.
            </div>
            {/* Confidence */}
            <div style={{ border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", padding: "14px 18px", marginBottom: 16, background: "var(--sri-ai-bg)" }}>
              <div style={SECT}>AI Confidence in This Assessment</div>
              <div style={{ ...F(8) as React.CSSProperties }}>
                <span style={{ ...S(22, 800), color: "var(--sri-ai-d)" }}>62%</span>
                <span style={{ fontSize: 12, color: "var(--sri-ink-m)" }}>confident</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 4, lineHeight: 1.5 }}>
                Score range: <b style={{ color: "var(--sri-ink-3)" }}>38–56 / 100</b> (D- to D+). Closing 3 data gaps would narrow this significantly.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ textAlign: "center", padding: 16, border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", background: "var(--sri-ai-bg)" }}>
                <div style={{ ...S(28, 800), color: "var(--sri-ai-d)" }}>4</div>
                <div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 2 }}>Sources Used</div>
              </div>
              <div style={{ textAlign: "center", padding: 16, border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", background: "var(--sri-ai-bg)" }}>
                <div style={{ ...S(28, 800), color: "var(--sri-red-t)" }}>3</div>
                <div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 2 }}>Data Gaps</div>
              </div>
            </div>
          </Card>

        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{ margin: "20px 24px 0", padding: "14px 24px", borderTop: "1px solid var(--sri-bdr)", ...F(8) as React.CSSProperties, justifyContent: "space-between" }}>
          <div style={{ ...F(8) as React.CSSProperties, fontSize: 12, color: "var(--sri-ink-m)" }}><span style={D("var(--sri-ai)", 6) as React.CSSProperties} />Powered by AI · Steercom-grade</div>
          <div style={{ fontSize: 12, color: "var(--sri-ink-m)", fontWeight: 500 }}>Ministry of Industry</div>
        </div>
      </div>
    </div>
  );
}
