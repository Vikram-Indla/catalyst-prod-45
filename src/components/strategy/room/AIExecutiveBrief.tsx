/**
 * AIExecutiveBrief — Chunk 2 v3: Full AI intelligence product
 * ZERO MOCK DATA. Uses brief governance data or shows Empty states.
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

const Empty = ({ msg }: { msg?: string }) => (
  <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--sri-ink-m)", fontStyle: "italic" }}>{msg || "No data available"}</div>
);

/* Static reference — grading scale is a fixed standard, not mock data */
const GRADING_SCALE = [
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
  { g: "D-", r: "30–39", d: "Near-total breakdown", c: "var(--sri-red-t)" },
  { g: "F", r: "0–29", d: "Strategic failure", c: "var(--sri-ink-m)" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

export function AIExecutiveBrief({ open, onClose, onDownload }: Props) {
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

  const handleDownload = useCallback(() => { (onDownload ?? window.print)(); }, [onDownload]);

  const publishedDateStr = activeBriefRecord?.published_at
    ? new Date(activeBriefRecord.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
  const versionStr = activeBriefRecord?.version ? `v${activeBriefRecord.version}` : '—';

  if (!open) return null;

  // Extract structured data from brief_json when available
  const verdict = brief?.verdict || null;
  const kpis: any[] | null = null; // KPIs are computed, not stored in brief_json
  const chain = brief?.chainDials || null;
  const contradictions = brief?.contradictions || null;
  const decisions = brief?.decisions || null;
  const recovery = brief?.recovery || null;
  const dataTrust = brief?.dataTrust || null;

  return (
    <div className="sri-root-container" style={{ position: 'relative', background: '#FFFFFF', zIndex: 300, overflowY: 'visible' }}>
      <div data-sri style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 0 60px" }}>
        <style>{TOKENS}</style>

        {/* HEADER */}
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
              <button onClick={handleGenerate} disabled={generateMutation.isPending || metricsLoading}
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

        {/* ADMIN DRAFT BANNER */}
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

        {/* KPI STRIP */}
        {kpis && (kpis as any[]).length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${(kpis as any[]).length}, 1fr)`, gap: 12, margin: "16px 24px 0" }}>
            {(kpis as any[]).map((k: any, i: number) => (
              <div key={i} style={{ background: "var(--sri-bg)", border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", padding: "16px 20px", borderTop: "3px solid var(--sri-ai)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--sri-ai)", textTransform: "uppercase", letterSpacing: ".04em" }}>{k.label || k.l}</div>
                <div style={{ ...S(28, 800), marginTop: 4, lineHeight: 1.1, color: k.color || k.c }}>{k.value || k.v}<span style={{ fontSize: 16, color: "var(--sri-ink-m)", fontWeight: 500 }}>{k.unit || k.u}</span></div>
                <div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 4 }}><span style={{ color: k.deltaColor || k.dc, fontWeight: 600 }}>{k.delta || k.d}</span></div>
              </div>
            ))}
          </div>
        ) : null}

        {/* BODY GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "16px 24px 0" }}>

          {/* VERDICT */}
          <Card title="Executive Verdict">
            {verdict ? (<>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "3px solid var(--sri-ai)", background: "var(--sri-ai-bg)" }}>
                  <span style={{ ...S(24, 800), color: "var(--sri-ai-d)", lineHeight: 1 }}>{(verdict as any).grade}</span>
                  <span style={{ ...M(10), fontWeight: 600, color: "var(--sri-ai)", marginTop: 1 }}>{(verdict as any).score}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...S(16), color: "var(--sri-ink)", lineHeight: 1.4 }}>{(verdict as any).headline}</div>
                  {(verdict as any).deltaText && <div style={{ ...F(12) as React.CSSProperties, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ ...M(11), fontWeight: 600, color: "var(--sri-red-t)", background: "var(--sri-red-bg)", padding: "3px 10px", borderRadius: "var(--sri-pill)" }}>{(verdict as any).deltaText}</span>
                    {(verdict as any).trajectory?.length > 0 && (<>
                      <span style={{ fontSize: 12, color: "var(--sri-ink-m)" }}>Trajectory:</span>
                      <span style={{ ...M(11), color: "var(--sri-ink-3)" }}>{(verdict as any).trajectory.map((t: any, i: number) => <React.Fragment key={i}>{i > 0 && " → "}{t.quarter} <b style={t.current ? { color: "var(--sri-red-t)" } : {}}>{t.grade}</b></React.Fragment>)}</span>
                    </>)}
                  </div>}
                  <div style={{ fontSize: 14, color: "var(--sri-ink-2)", marginTop: 10, lineHeight: 1.7 }}>{(verdict as any).narrative}</div>
                </div>
              </div>
              {(verdict as any).whyItems?.length > 0 && (<>
                <div style={{ ...S(13), color: "var(--sri-ink-m)", marginTop: 20, marginBottom: 10 }}>Why {(verdict as any).grade}?</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(verdict as any).whyItems.map((w: any, i: number) => (
                    <div key={i} style={{ ...F(10) as React.CSSProperties, padding: "10px 14px", borderRadius: "var(--sri-r3)", borderInlineStart: `3px solid ${w.severity === "high" ? "var(--sri-red)" : w.severity === "mid" ? "var(--sri-ai)" : "var(--sri-green)"}`, background: "var(--sri-ai-bg)" }}>
                      <span style={{ ...S(16, 800), color: "var(--sri-ai-d)", flexShrink: 0, minWidth: 36 }}>{w.value}</span>
                      <span style={{ fontWeight: 500, color: "var(--sri-ink-2)", fontSize: 13 }}>{w.label}</span>
                    </div>
                  ))}
                </div>
              </>)}
              {/* Grading scale — static reference, not data */}
              <div style={{ ...S(13), color: "var(--sri-ink-m)", marginTop: 24, marginBottom: 10 }}>Portfolio Grading Scale</div>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 3px" }}>
                <tbody>{GRADING_SCALE.map((g, i) => { const active = g.g === (verdict as any).grade; return (
                  <tr key={i} style={active ? { background: "var(--sri-ai-bg)" } : {}}>
                    <td style={{ ...S(14, 800), width: 32, textAlign: "center", color: g.c, padding: "6px 12px" }}>{g.g}</td>
                    <td style={{ ...M(12), fontWeight: 500, color: "var(--sri-ink-m)", width: 50, padding: "6px 12px" }}>{g.r}</td>
                    <td style={{ color: active ? "var(--sri-ai-d)" : "var(--sri-ink-2)", fontWeight: active ? 700 : 500, padding: "6px 12px", fontSize: 12 }}>
                      {g.d}{active && <span style={{ ...(D("var(--sri-ai)", 6) as React.CSSProperties), display: "inline-block", marginInlineStart: 6 }} />}
                    </td>
                  </tr>
                ); })}</tbody>
              </table>
            </>) : <Empty msg="Verdict data not loaded" />}
          </Card>

          {/* CHAIN */}
          <Card title="Strategy-to-Execution Chain">
            {chain && (chain as any[]).length > 0 ? <div style={{ margin: "-20px -24px" }}>{(chain as any[]).map((c: any, i: number) => (
              <div key={i} style={{ padding: "16px 24px", borderBottom: i < (chain as any[]).length - 1 ? "1px solid var(--sri-bdr)" : "none", display: "flex", alignItems: "flex-start", gap: 16, cursor: "pointer" }}>
                <span style={D(c.color || c.c, 10) as React.CSSProperties} />
                <div style={{ flex: 1 }}>
                  <div style={{ ...S(13), color: "var(--sri-ink)", textTransform: "uppercase", letterSpacing: ".02em" }}>{c.label || c.l}</div>
                  <div style={{ ...S(24, 800), color: "var(--sri-ink)", marginTop: 2 }}>{c.value || c.v} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--sri-ink-m)" }}>{c.unit || c.u}</span></div>
                  <div style={{ fontSize: 13, color: "var(--sri-ink-m)", marginTop: 4 }}>{c.desc}</div>
                  <div style={{ marginTop: 8 }}><div style={BT() as React.CSSProperties}><div style={BF(c.color || c.c, c.pct || c.p) as React.CSSProperties} /></div></div>
                </div>
                <span style={{ color: "var(--sri-ink-m)", fontSize: 18, marginTop: 4 }}>›</span>
              </div>
            ))}</div> : <Empty msg="Chain data not loaded" />}
          </Card>

          {/* CONTRADICTIONS */}
          <Card title="Contradictions Detected" badge={contradictions && (contradictions as any[]).length > 0 ? `${(contradictions as any[]).length} found` : undefined}>
            {contradictions && (contradictions as any[]).length > 0 ? (contradictions as any[]).map((c: any, i: number) => (
              <div key={i} style={{ padding: "14px 18px", borderInlineStart: "3px solid var(--sri-ai)", background: "var(--sri-ai-bg)", borderRadius: "0 var(--sri-r2) var(--sri-r2) 0", marginBottom: i < (contradictions as any[]).length - 1 ? 10 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sri-ink)" }}>{c.text || c.t}</div>
                <div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 4 }}>→ {c.explanation || c.e}</div>
                <div style={{ fontSize: 11, color: "var(--sri-ai-d)", marginTop: 4, fontWeight: 600, ...F(4) as React.CSSProperties }}>⚡ {c.source || c.src}</div>
              </div>
            )) : <Empty msg="No contradictions detected" />}
          </Card>

          {/* DECISIONS */}
          <Card title="Decisions Required" badge={decisions && (decisions as any[]).length > 0 ? `${(decisions as any[]).length} Pending` : undefined} badgeBg="var(--sri-red-bg)" badgeColor="var(--sri-red-t)">
            {decisions && (decisions as any[]).length > 0 ? <div style={{ margin: "-20px -24px" }}>
              {(decisions as any[]).map((d: any, i: number) => (
                <div key={i} style={{ border: "1px solid var(--sri-bdr)", borderRadius: "var(--sri-r4)", margin: "12px 20px", overflow: "hidden" }}>
                  <div style={{ ...F(12) as React.CSSProperties, padding: "14px 18px", borderBottom: "1px solid var(--sri-bdr)" }}>
                    <div style={{ ...S(14, 800), width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "var(--sri-ai-bg)", color: "var(--sri-ai-d)", border: `2px solid ${(d.isCritical || d.crit) ? "var(--sri-red)" : "var(--sri-ai)"}` }}>{d.id}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: (d.isCritical || d.crit) ? "var(--sri-red-t)" : "var(--sri-ai-d)" }}>{d.priority || d.pr}</span>
                    <span style={{ ...M(11), color: "var(--sri-ink-m)" }}>{d.date || d.dt}</span>
                    <span style={{ ...S(14), color: "var(--sri-ink)", flex: 1 }}>{d.title}</span>
                  </div>
                  <div style={{ padding: "14px 18px" }}>
                    <div style={SECT}>Rationale</div>
                    <div style={{ fontSize: 13, color: "var(--sri-ink-2)", marginBottom: 10 }}>{d.rationale || d.rat}</div>
                    <div style={SECT}>Evidence</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{(d.evidence || d.ev || []).map((e: string, j: number) => <span key={j} style={{ fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: "var(--sri-pill)", background: "var(--sri-ai-bg)", color: "var(--sri-ai-d)", border: "1px solid var(--sri-ai-bdr)" }}>{e}</span>)}</div>
                    <div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 10 }}>Owner: <b style={{ color: "var(--sri-ink-3)" }}>{d.owner}</b></div>
                  </div>
                </div>
              ))}
              <div style={{ ...F(8) as React.CSSProperties, justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--sri-bdr)", background: "var(--sri-ai-bg)" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--sri-ai-d)" }}>Ready to act? → Export Decision Pack</span>
                <button style={{ height: 30, padding: "0 14px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, borderRadius: "var(--sri-r2)", cursor: "pointer", ...F(6), border: "none", background: "var(--sri-ai-d)", color: "#fff" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Export
                </button>
              </div>
            </div> : <Empty msg="No decisions pending" />}
          </Card>

          {/* RECOVERY */}
          <Card title="Recovery Clock">
            {recovery ? (<>
              {(recovery as any).projectedScores?.length > 0 && (
                <div style={{ border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", padding: "14px 18px", marginBottom: 20, background: "var(--sri-ai-bg)" }}>
                  <div style={{ ...SECT, marginBottom: 8 }}>Projected Score Recovery</div>
                  <div style={{ ...F(16) as React.CSSProperties }}>{(recovery as any).projectedScores.map((p: any, i: number) => (
                    <React.Fragment key={i}>
                      <div style={{ textAlign: "center" }}><div style={{ ...S(16, 800), color: p.color || p.c }}>{p.grade || p.g}</div><div style={{ fontSize: 10, color: "var(--sri-ink-m)" }}>{p.time || p.t}</div></div>
                      {i < (recovery as any).projectedScores.length - 1 && <div style={{ flex: 1, height: 4, background: i === 0 ? "var(--sri-ai)" : "var(--sri-bg-3)", borderRadius: "var(--sri-pill)" }} />}
                    </React.Fragment>
                  ))}</div>
                  {(recovery as any).projectedNote && <div style={{ fontSize: 11, color: "var(--sri-ink-m)", marginTop: 8 }}>{(recovery as any).projectedNote}</div>}
                </div>
              )}
              {(recovery as any).phases?.map((r: any, i: number) => (
                <div key={i} style={{ position: "relative", paddingInlineStart: 28, marginBottom: i < (recovery as any).phases.length - 1 ? 20 : 0 }}>
                  {i < (recovery as any).phases.length - 1 && <div style={{ position: "absolute", insetInlineStart: 9, top: 26, bottom: -8, width: 2, background: "var(--sri-ai-bdr)" }} />}
                  <div style={{ position: "absolute", insetInlineStart: 0, top: 4, width: 20, height: 20, borderRadius: "50%", border: `2px solid ${r.color || r.c}`, background: "var(--sri-ai-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={D(r.color || r.c) as React.CSSProperties} /></div>
                  <div style={{ ...F(8) as React.CSSProperties, marginBottom: 6 }}>
                    <span style={{ ...S(14), color: "var(--sri-ink)" }}>{r.phase}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", padding: "3px 8px", borderRadius: "var(--sri-pill)", background: "var(--sri-ai-bg)", color: r.color || r.c }}>{r.tag}</span>
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4, padding: 0, margin: 0 }}>
                    {(r.tasks || []).map((t: string, j: number) => <li key={j} style={{ fontSize: 13, color: "var(--sri-ink-2)", paddingInlineStart: 4 }}>→ {t}</li>)}
                  </ul>
                </div>
              ))}
            </>) : <Empty msg="Recovery plan not loaded" />}
          </Card>

          {/* DATA TRUST */}
          <Card title="Data Trust Assessment">
            {dataTrust ? (<>
              <div style={{ ...F(12) as React.CSSProperties, marginBottom: 12 }}>
                <span style={{ ...(D("var(--sri-ai)", 12) as React.CSSProperties), border: "2px solid var(--sri-ai)" }} />
                <span style={{ ...S(16, 800), color: "var(--sri-ink)" }}>Trust Level: <span style={{ color: (dataTrust as any).level === "LOW" ? "var(--sri-red-t)" : (dataTrust as any).level === "HIGH" ? "var(--sri-green-t)" : "var(--sri-ai)" }}>{(dataTrust as any).level}</span></span>
              </div>
              <div style={{ fontSize: 13, color: "var(--sri-ink-m)", lineHeight: 1.6, marginBottom: 16 }}>{(dataTrust as any).description}</div>
              <div style={{ border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", padding: "14px 18px", marginBottom: 16, background: "var(--sri-ai-bg)" }}>
                <div style={SECT}>AI Confidence in This Assessment</div>
                <div style={{ ...F(8) as React.CSSProperties }}>
                  <span style={{ ...S(22, 800), color: "var(--sri-ai-d)" }}>{(dataTrust as any).confidence}%</span>
                  <span style={{ fontSize: 12, color: "var(--sri-ink-m)" }}>confident</span>
                </div>
                {(dataTrust as any).scoreRange && <div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 4, lineHeight: 1.5 }}>Score range: <b style={{ color: "var(--sri-ink-3)" }}>{(dataTrust as any).scoreRange}</b></div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ textAlign: "center", padding: 16, border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", background: "var(--sri-ai-bg)" }}><div style={{ ...S(28, 800), color: "var(--sri-ai-d)" }}>{(dataTrust as any).sources}</div><div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 2 }}>Sources Used</div></div>
                <div style={{ textAlign: "center", padding: 16, border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", background: "var(--sri-ai-bg)" }}><div style={{ ...S(28, 800), color: "var(--sri-red-t)" }}>{(dataTrust as any).gaps}</div><div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 2 }}>Data Gaps</div></div>
              </div>
            </>) : <Empty msg="Trust assessment not loaded" />}
          </Card>
        </div>

        {/* FOOTER */}
        <div style={{ margin: "20px 24px 0", padding: "14px 24px", borderTop: "1px solid var(--sri-bdr)", ...F(8) as React.CSSProperties, justifyContent: "space-between" }}>
          <div style={{ ...F(8) as React.CSSProperties, fontSize: 12, color: "var(--sri-ink-m)" }}><span style={D("var(--sri-ai)", 6) as React.CSSProperties} />Powered by AI · Steercom-grade</div>
        </div>
      </div>
    </div>
  );
}
