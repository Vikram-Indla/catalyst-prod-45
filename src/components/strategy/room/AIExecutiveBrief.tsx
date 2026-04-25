/**
 * AIExecutiveBrief — Chunk 2 v3: Full AI intelligence product
 * ZERO MOCK DATA. Uses brief governance data or shows Empty states.
 * Scope: [data-sri] — ring-fenced --sri-* tokens, zero global leak
 * Color: BLUE-DOMINANT. Semantic status colors only on severity badges.
 *
 * TEXT COLOR CHEAT SHEET:
 * #09090B  --sri-ink     → Headlines, titles, grade numbers
 * #18181B  --sri-ink-2   → Body prose, narratives, rationale, task text
 * #3F3F46  --sri-ink-3   → Descriptions, explanations, notes, subtitles, footer
 * #71717A  --sri-ink-m   → ONLY: unit suffixes, micro-labels, timestamps, scale ranges
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
  font-family:var(--ds-font-family-body); color:var(--sri-ink);
  -webkit-font-smoothing:antialiased; line-height:1.5;
}

/* ── DARK MODE — Nocturne overrides ── */
[data-theme="dark"] [data-sri] {
  --sri-ink: rgba(255,255,255,0.96);
  --sri-ink-2: rgba(255,255,255,0.82);
  --sri-ink-3: rgba(255,255,255,0.75);
  --sri-ink-m: rgba(255,255,255,0.70);
  --sri-bg: #1A1A1A;
  --sri-bg-2: #1F1F1F;
  --sri-bg-3: #2E2E2E;
  --sri-bdr: #2E2E2E;
  --sri-bdr-s: #454545;
  --sri-ai: #3B82F6;
  --sri-ai-d: #60A5FA;
  --sri-ai-bg: rgba(59,130,246,0.08);
  --sri-ai-bg2: rgba(59,130,246,0.12);
  --sri-ai-bdr: rgba(59,130,246,0.16);
  --sri-ai-m: #60A5FA;
  --sri-green: #4ADE80;
  --sri-green-t: #4ADE80;
  --sri-green-bg: rgba(74,222,128,0.08);
  --sri-teal-t: #5EEAD4;
  --sri-red: #FCA5A5;
  --sri-red-t: #FCA5A5;
  --sri-red-bg: rgba(239,68,68,0.10);
}

[data-sri] .sri-chain-row:hover { background: var(--sri-bg-2); }
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
const S = (sz: number, wt = 700): React.CSSProperties => ({ fontFamily: 'var(--ds-font-family-heading)', fontSize: sz, fontWeight: wt });
const M = (sz = 11): React.CSSProperties => ({ fontFamily: 'var(--ds-font-family-monospaced)', fontSize: sz });
const F = (g = 8): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: g });
const D = (c: string, s = 8): React.CSSProperties => ({ width: s, height: s, borderRadius: "50%", background: c, flexShrink: 0 });
const BT = (h = 8): React.CSSProperties => ({ height: h, background: "var(--sri-bg-3)", borderRadius: "var(--sri-pill)", overflow: "hidden" });
const BF = (c: string, p: number): React.CSSProperties => ({ height: "100%", width: `${p}%`, background: c, borderRadius: "var(--sri-pill)", transition: "width .8s" });
const SECT: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--sri-ai-d)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };

/* FIX #14 — date formatting helper */
const fmtDate = (iso: string | undefined | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
};

/* FIX #11 — Card component with optional left border removal */
const Card = ({ title, badge, badgeBg, badgeColor, children, full, noLeftBorder }: {
  title: string; badge?: string; badgeBg?: string; badgeColor?: string; children: React.ReactNode; full?: boolean; noLeftBorder?: boolean;
}) => (
  <div style={{ background: "var(--sri-bg)", border: "1px solid var(--sri-bdr)", borderRadius: "var(--sri-r4)", overflow: "hidden", ...(full ? { gridColumn: "1 / -1" } : {}) }}>
    <div style={{ padding: "16px 24px 12px", ...F(8), justifyContent: "space-between", borderBottom: "1px solid var(--sri-bdr)", ...(noLeftBorder ? {} : { borderInlineStart: "3px solid var(--sri-ai)" }) }}>
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
/* FIX #9 — split into 2 columns */
const GRADING_LEFT = GRADING_SCALE.slice(0, 7);
const GRADING_RIGHT = GRADING_SCALE.slice(7);

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
    <div className="sri-root-container" style={{ position: 'relative', background: 'var(--sri-bg)', overflowY: 'auto' }}>
      {/* FIX #1 — full width: removed maxWidth and margin:0 auto */}
      <div data-sri style={{ width: '100%', padding: "24px 0 60px", background: 'var(--sri-bg)' }}>
        <style>{TOKENS}</style>

        {/* HEADER — FIX #21: subtitle color upgraded */}
        <header style={{ background: "var(--sri-bg)", border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", padding: "20px 28px", margin: "0 32px", ...F(14), justifyContent: "space-between" }}>
          <div style={F(14) as React.CSSProperties}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, var(--sri-ai-d), var(--sri-ai))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10" /></svg>
            </div>
            <div>
              <div style={{ ...S(20), color: "var(--sri-ink)" }}>Executive Brief</div>
              <div style={{ fontSize: 13, color: "var(--sri-ink-3)", marginTop: 1 }}>Strategy Room · Published <b style={{ color: "var(--sri-ink-2)", fontWeight: 600 }}>{publishedDateStr}</b> · {versionStr}</div>
            </div>
          </div>
          <div className="sri-actions" style={F(8) as React.CSSProperties}>
            {/* FIX #26 — Generate button ghost style */}
            {isAdminUser && (
              <button onClick={handleGenerate} disabled={generateMutation.isPending || metricsLoading}
                style={{ height: 32, padding: "0 14px", fontFamily: 'var(--ds-font-family-body)', fontSize: 13, fontWeight: 500, borderRadius: "var(--sri-r2)", cursor: "pointer", ...F(6), border: "1px solid transparent", background: "none", color: "var(--sri-ink-3)" }}>
                <RefreshCw size={14} className={generateMutation.isPending ? 'animate-spin' : ''} />
                Generate
              </button>
            )}
            <button onClick={handleDownload} style={{ height: 32, padding: "0 14px", fontFamily: 'var(--ds-font-family-body)', fontSize: 13, fontWeight: 500, borderRadius: "var(--sri-r2)", cursor: "pointer", ...F(6), border: "1px solid var(--sri-bdr)", background: "var(--sri-bg)", color: "var(--sri-ink-3)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Download
            </button>
            <button onClick={onClose} style={{ height: 32, padding: "0 14px", fontFamily: 'var(--ds-font-family-body)', fontSize: 13, fontWeight: 500, borderRadius: "var(--sri-r2)", cursor: "pointer", ...F(6), border: "1px solid var(--sri-bdr)", background: "var(--sri-bg)", color: "var(--sri-ink-3)" }}>✕ Close</button>
          </div>
        </header>

        {/* ADMIN DRAFT BANNER */}
        {isAdminUser && draftBrief && (
          <div style={{ margin: "12px 32px 0", padding: "12px 20px", background: "var(--sri-ai-bg)", border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r3)", ...F(12) as React.CSSProperties, justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sri-ai-d)" }}>New draft available</div>
              <div style={{ fontSize: 11, color: "var(--sri-ink-3)" }}>Generated {new Date(draftBrief.generated_at).toLocaleTimeString()} — review before publishing</div>
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

        {/* KPI STRIP — FIX #12: accentColor per KPI, FIX #23: reduced padding */}
        {kpis && (kpis as any[]).length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${(kpis as any[]).length}, 1fr)`, gap: 12, margin: "16px 32px 0" }}>
            {(kpis as any[]).map((k: any, i: number) => (
              <div key={i} style={{ background: "var(--sri-bg)", border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", padding: "12px 18px", borderTop: `3px solid ${k.accentColor || 'var(--sri-ai)'}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: k.accentColor || "var(--sri-ai)", textTransform: "uppercase", letterSpacing: ".04em" }}>{k.label || k.l}</div>
                <div style={{ ...S(28, 800), marginTop: 4, lineHeight: 1.1, color: k.color || k.c }}>{k.value || k.v}<span style={{ fontSize: 16, color: "var(--sri-ink-m)", fontWeight: 500 }}>{k.unit || k.u}</span></div>
                <div style={{ fontSize: 12, color: "var(--sri-ink-3)", marginTop: 4 }}><span style={{ color: k.deltaColor || k.dc, fontWeight: 600 }}>{k.delta || k.d}</span></div>
              </div>
            ))}
          </div>
        ) : null}

        {/* BODY GRID — FIX #10: align-items: start */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "16px 32px 0", alignItems: "start" }}>

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
                  {/* FIX #17 — trajectory: larger, readable */}
                  {(verdict as any).deltaText && <div style={{ ...F(12) as React.CSSProperties, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ ...M(11), fontWeight: 600, color: "var(--sri-red-t)", background: "var(--sri-red-bg)", padding: "3px 10px", borderRadius: "var(--sri-pill)" }}>{(verdict as any).deltaText}</span>
                    {(verdict as any).trajectory?.length > 0 && (<>
                      <span style={{ fontSize: 12, color: "var(--sri-ink-3)" }}>Trajectory:</span>
                      <span style={{ ...M(12), color: "var(--sri-ink-2)", fontWeight: 600 }}>{(verdict as any).trajectory.map((t: any, i: number) => <React.Fragment key={i}>{i > 0 && " → "}{t.quarter} <b style={t.current ? { color: "var(--sri-red-t)", fontWeight: 800 } : {}}>{t.grade}</b></React.Fragment>)}</span>
                    </>)}
                  </div>}
                  {/* FIX #2-8 — narrative uses --sri-ink-2 */}
                  <div style={{ fontSize: 14, color: "var(--sri-ink-2)", marginTop: 10, lineHeight: 1.7 }}>{(verdict as any).narrative}</div>
                </div>
              </div>
              {/* FIX #25 — Why items: 12px label text */}
              {(verdict as any).whyItems?.length > 0 && (<>
                <div style={{ ...S(13), color: "var(--sri-ink-3)", marginTop: 20, marginBottom: 10 }}>Why {(verdict as any).grade}?</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(verdict as any).whyItems.map((w: any, i: number) => (
                    <div key={i} style={{ ...F(10) as React.CSSProperties, padding: "10px 14px", borderRadius: "var(--sri-r3)", borderInlineStart: `3px solid ${w.severity === "high" ? "var(--sri-red)" : w.severity === "mid" ? "var(--sri-ai)" : "var(--sri-green)"}`, background: "var(--sri-ai-bg)" }}>
                      <span style={{ ...S(16, 800), color: "var(--sri-ai-d)", flexShrink: 0, minWidth: 36 }}>{w.value}</span>
                      <span style={{ fontWeight: 500, color: "var(--sri-ink-2)", fontSize: 12 }}>{w.label}</span>
                    </div>
                  ))}
                </div>
              </>)}
              {/* FIX #9 — Grading scale as 2-column grid, ~26px rows */}
              <div style={{ ...S(13), color: "var(--sri-ink-3)", marginTop: 24, marginBottom: 10 }}>Portfolio Grading Scale</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                {[GRADING_LEFT, GRADING_RIGHT].map((col, ci) => (
                  <table key={ci} style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 2px" }}>
                    <tbody>{col.map((g, i) => { const active = g.g === (verdict as any).grade; return (
                      <tr key={i} style={active ? { background: "var(--sri-ai-bg)" } : {}}>
                        <td style={{ ...S(12, 800), width: 26, textAlign: "center", color: g.c, padding: "4px 6px" }}>{g.g}</td>
                        <td style={{ ...M(10), fontWeight: 500, color: "var(--sri-ink-m)", width: 46, padding: "4px 6px" }}>{g.r}</td>
                        <td style={{ color: active ? "var(--sri-ai-d)" : "var(--sri-ink-3)", fontWeight: active ? 700 : 500, padding: "4px 6px", fontSize: 11 }}>
                          {g.d}{active && <span style={{ ...(D("var(--sri-ai)", 6) as React.CSSProperties), display: "inline-block", marginInlineStart: 6 }} />}
                        </td>
                      </tr>
                    ); })}</tbody>
                  </table>
                ))}
              </div>
            </>) : <Empty msg="Verdict data not loaded" />}
          </Card>

          {/* CHAIN — FIX #7: desc color upgraded, FIX #18: always show bar track, FIX #22: arrow upgraded */}
          <Card title="Strategy-to-Execution Chain">
            {chain && (chain as any[]).length > 0 ? <div style={{ margin: "-20px -24px" }}>{(chain as any[]).map((c: any, i: number) => (
              <div key={i} className="sri-chain-row" style={{ padding: "16px 24px", borderBottom: i < (chain as any[]).length - 1 ? "1px solid var(--sri-bdr)" : "none", display: "flex", alignItems: "flex-start", gap: 16, cursor: "pointer", transition: "background .15s" }}>
                <span style={D(c.color || c.c, 10) as React.CSSProperties} />
                <div style={{ flex: 1 }}>
                  <div style={{ ...S(13), color: "var(--sri-ink)", textTransform: "uppercase", letterSpacing: ".02em" }}>{c.label || c.l}</div>
                  <div style={{ ...S(24, 800), color: "var(--sri-ink)", marginTop: 2 }}>{c.value || c.v} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--sri-ink-m)" }}>{c.unit || c.u}</span></div>
                  <div style={{ fontSize: 13, color: "var(--sri-ink-3)", marginTop: 4 }}>{c.desc}</div>
                  <div style={{ marginTop: 8 }}><div style={BT() as React.CSSProperties}><div style={BF(c.color || c.c, c.pct || c.p || 0) as React.CSSProperties} /></div></div>
                </div>
                <span style={{ color: "var(--sri-ink-3)", fontSize: 16, fontWeight: 600, marginTop: 4 }}>→</span>
              </div>
            ))}</div> : <Empty msg="Chain data not loaded" />}
          </Card>

          {/* CONTRADICTIONS — FIX #11: noLeftBorder on Card, FIX #2-4: explanation color upgraded, FIX #24: padding */}
          <Card title="Contradictions Detected" badge={contradictions && (contradictions as any[]).length > 0 ? `${(contradictions as any[]).length} found` : undefined} noLeftBorder>
            {contradictions && (contradictions as any[]).length > 0 ? (contradictions as any[]).map((c: any, i: number) => (
              <div key={i} style={{ padding: "12px 16px", borderInlineStart: "3px solid var(--sri-ai)", background: "var(--sri-ai-bg)", borderRadius: "0 var(--sri-r2) var(--sri-r2) 0", marginBottom: i < (contradictions as any[]).length - 1 ? 8 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sri-ink)" }}>{c.text || c.t}</div>
                <div style={{ fontSize: 12, color: "var(--sri-ink-3)", marginTop: 4 }}>→ {c.explanation || c.e}</div>
                <div style={{ fontSize: 11, color: "var(--sri-ai-d)", marginTop: 4, fontWeight: 600, ...F(4) as React.CSSProperties }}>⚡ {c.source || c.src}</div>
              </div>
            )) : <Empty msg="No contradictions detected" />}
          </Card>

          {/* DECISIONS — FIX #13: 2-row header, FIX #14: dates, FIX #15: evidence no border, FIX #16: export text */}
          <Card title="Decisions Required" badge={decisions && (decisions as any[]).length > 0 ? `${(decisions as any[]).length} Pending` : undefined} badgeBg="var(--sri-red-bg)" badgeColor="var(--sri-red-t)">
            {decisions && (decisions as any[]).length > 0 ? <div style={{ margin: "-20px -24px" }}>
              {(decisions as any[]).map((d: any, i: number) => (
                <div key={i} style={{ border: "1px solid var(--sri-bdr)", borderRadius: "var(--sri-r4)", margin: "12px 20px", overflow: "hidden" }}>
                  {/* FIX #13 — 2-row header */}
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--sri-bdr)" }}>
                    <div style={{ ...F(12) as React.CSSProperties, marginBottom: 6 }}>
                      <div style={{ ...S(14, 800), width: 36, height: 50, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "var(--sri-ai-bg)", color: "var(--sri-ai-d)", border: `2px solid ${(d.isCritical || d.crit) ? "var(--sri-red)" : "var(--sri-ai)"}` }}>{d.id}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: (d.isCritical || d.crit) ? "var(--sri-red-t)" : "var(--sri-ai-d)" }}>{d.priority || d.pr}</span>
                      <span style={{ ...M(11), color: "var(--sri-ink-m)" }}>{fmtDate(d.date || d.dt)}</span>
                    </div>
                    <div style={{ ...S(14), color: "var(--sri-ink)", lineHeight: 1.4 }}>{d.title}</div>
                  </div>
                  <div style={{ padding: "14px 18px" }}>
                    <div style={SECT}>Rationale</div>
                    <div style={{ fontSize: 13, color: "var(--sri-ink-2)", marginBottom: 10, lineHeight: 1.6 }}>{d.rationale || d.rat}</div>
                    <div style={SECT}>Evidence</div>
                    {/* FIX #15 — evidence chips: no border */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{(d.evidence || d.ev || []).map((e: string, j: number) => <span key={j} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: "var(--sri-pill)", background: "var(--sri-ai-bg)", color: "var(--sri-ai-d)" }}>{e}</span>)}</div>
                    <div style={{ fontSize: 12, color: "var(--sri-ink-3)", marginTop: 10 }}>Owner: <b style={{ color: "var(--sri-ink-2)" }}>{d.owner}</b> · Deadline: <b style={{ color: "var(--sri-ink-2)" }}>{fmtDate(d.deadline)}</b></div>
                  </div>
                </div>
              ))}
              {/* FIX #16 — export text: no underline */}
              <div style={{ ...F(8) as React.CSSProperties, justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--sri-bdr)", background: "var(--sri-ai-bg)" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--sri-ai-d)", textDecoration: "none" }}>Ready to act? → Export Decision Pack</span>
                <button style={{ height: 30, padding: "0 14px", fontFamily: 'var(--ds-font-family-body)', fontSize: 12, fontWeight: 600, borderRadius: "var(--sri-r2)", cursor: "pointer", ...F(6), border: "none", background: "var(--sri-ai-d)", color: "#fff" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Export
                </button>
              </div>
            </div> : <Empty msg="No decisions pending" />}
          </Card>

          {/* RECOVERY — FIX #6: note color, FIX #19: connector blue, FIX #28: task text --sri-ink-2 */}
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
                  {/* FIX #6 — recovery note color */}
                  {(recovery as any).projectedNote && <div style={{ fontSize: 11, color: "var(--sri-ink-3)", marginTop: 8 }}>{(recovery as any).projectedNote}</div>}
                </div>
              )}
              {(recovery as any).phases?.map((r: any, i: number) => (
                <div key={i} style={{ position: "relative", paddingInlineStart: 28, marginBottom: i < (recovery as any).phases.length - 1 ? 20 : 0 }}>
                  {/* FIX #19 — connector line: solid blue */}
                  {i < (recovery as any).phases.length - 1 && <div style={{ position: "absolute", insetInlineStart: 9, top: 26, bottom: -8, width: 2, background: "var(--sri-ai)" }} />}
                  <div style={{ position: "absolute", insetInlineStart: 0, top: 4, width: 20, height: 20, borderRadius: "50%", border: `2px solid ${r.color || r.c}`, background: "var(--sri-ai-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={D(r.color || r.c) as React.CSSProperties} /></div>
                  <div style={{ ...F(8) as React.CSSProperties, marginBottom: 6 }}>
                    <span style={{ ...S(14), color: "var(--sri-ink)" }}>{r.phase}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", padding: "3px 8px", borderRadius: "var(--sri-pill)", background: "var(--sri-ai-bg)", color: r.color || r.c }}>{r.tag}</span>
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4, padding: 0, margin: 0 }}>
                    {/* FIX #28 — task text color */}
                    {(r.tasks || []).map((t: string, j: number) => <li key={j} style={{ fontSize: 13, color: "var(--sri-ink-2)", paddingInlineStart: 4 }}>→ {t}</li>)}
                  </ul>
                </div>
              ))}
            </>) : <Empty msg="Recovery plan not loaded" />}
          </Card>

          {/* DATA TRUST — FIX #5: description color, FIX #20: bold range, FIX #27: lineHeight, FIX #29: label weight */}
          <Card title="Data Trust Assessment">
            {dataTrust ? (<>
              <div style={{ ...F(12) as React.CSSProperties, marginBottom: 12 }}>
                <span style={{ ...(D("var(--sri-ai)", 12) as React.CSSProperties), border: "2px solid var(--sri-ai)" }} />
                <span style={{ ...S(16, 800), color: "var(--sri-ink)" }}>Trust Level: <span style={{ color: (dataTrust as any).level === "LOW" ? "var(--sri-red-t)" : (dataTrust as any).level === "HIGH" ? "var(--sri-green-t)" : "var(--sri-ai)" }}>{(dataTrust as any).level}</span></span>
              </div>
              {/* FIX #5, #27 — description: ink-3, lineHeight 1.6 */}
              <div style={{ fontSize: 13, color: "var(--sri-ink-3)", lineHeight: 1.6, marginBottom: 16 }}>{(dataTrust as any).description}</div>
              <div style={{ border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", padding: "14px 18px", marginBottom: 16, background: "var(--sri-ai-bg)" }}>
                <div style={SECT}>AI Confidence in This Assessment</div>
                <div style={{ ...F(8) as React.CSSProperties }}>
                  <span style={{ ...S(22, 800), color: "var(--sri-ai-d)" }}>{(dataTrust as any).confidence}%</span>
                  <span style={{ fontSize: 12, color: "var(--sri-ink-m)" }}>confident</span>
                </div>
                {/* FIX #20 — bold score range */}
                {(dataTrust as any).scoreRange && <div style={{ fontSize: 12, color: "var(--sri-ink-3)", marginTop: 4, lineHeight: 1.5 }}>Score range: <b style={{ color: "var(--sri-ink-2)", fontWeight: 700 }}>{(dataTrust as any).scoreRange}</b></div>}
              </div>
              {/* FIX #29 — label fontWeight 500 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ textAlign: "center", padding: 16, border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", background: "var(--sri-ai-bg)" }}><div style={{ ...S(28, 800), color: "var(--sri-ai-d)" }}>{(dataTrust as any).sources}</div><div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 2, fontWeight: 500 }}>Sources Used</div></div>
                <div style={{ textAlign: "center", padding: 16, border: "1px solid var(--sri-ai-bdr)", borderRadius: "var(--sri-r4)", background: "var(--sri-ai-bg)" }}><div style={{ ...S(28, 800), color: "var(--sri-red-t)" }}>{(dataTrust as any).gaps}</div><div style={{ fontSize: 12, color: "var(--sri-ink-m)", marginTop: 2, fontWeight: 500 }}>Data Gaps</div></div>
              </div>
            </>) : <Empty msg="Trust assessment not loaded" />}
          </Card>
        </div>

        {/* FOOTER — FIX #8: footer color upgraded, FIX #30: margin-top 16px */}
        <div style={{ margin: "16px 32px 0", padding: "14px 24px", borderTop: "1px solid var(--sri-bdr)", ...F(8) as React.CSSProperties, justifyContent: "space-between" }}>
          <div style={{ ...F(8) as React.CSSProperties, fontSize: 12, color: "var(--sri-ink-3)" }}><span style={D("var(--sri-ai)", 6) as React.CSSProperties} />Powered by AI · Steercom-grade</div>
        </div>
      </div>
    </div>
  );
}
