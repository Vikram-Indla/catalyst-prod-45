/**
 * Chunk 1 v3 — Strategy Room Dashboard
 * ZERO MOCK DATA. All content via props. Pure rendering.
 * Scope: [data-srd] — ring-fenced --srd-* tokens, zero global leak
 */

import { useState, useRef, useEffect } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useVision } from '@/hooks/strategy/useStrategyData';
import { useUpdateVision } from '@/hooks/strategy/useStrategyMutations';
import { Pencil, Check, X } from 'lucide-react';

/* ─── Prop types ─── */
interface ThemeItem { name: string; status: 'on_track' | 'off_track' | 'at_risk' }
interface BudgetSegment { label: string; pct: number; color: string }
interface BudgetDept { name: string; pct: number; count: number; tag?: string }
interface FooterStat { label: string; color: string }
interface BudgetData {
  total: string; currency: string; delta?: number; deltaRef?: string; confidence: number;
  segments?: BudgetSegment[]; departments?: BudgetDept[];
  footerStats?: FooterStat[]; updatedAt?: string;
}
interface WorkforceType { label: string; count: number; color: string }
interface WorkforceBucket { value: number; label: string; isDanger?: boolean; isWarning?: boolean }
interface WorkforceDept { name: string; pct: number; count: number; utilization?: string; utilColor?: string }
interface WorkforceData {
  total: number; delta?: number; deltaRef?: string;
  departmentCount: number; vendorCount: number; avgUtilization: number; thiqahPct: number;
  types?: WorkforceType[]; buckets?: WorkforceBucket[]; departments?: WorkforceDept[];
  updatedAt?: string;
}
interface ContractBucket { count: number; label: string; color: string; textColor: string }
interface ContractExpiring { name: string; department: string; date: string }
interface ContractsData {
  totalCount: number; departmentCount: number; topSource: string;
  buckets?: ContractBucket[]; barSegments?: { pct: number; color: string }[];
  expiringSoon?: ContractExpiring[]; moreCount?: number; updatedAt?: string;
}
interface ExecutionItem {
  label: string; value: string; valueColor?: string; target?: string;
  deltaText?: string; deltaDir?: 'up' | 'down' | 'flat'; footerNote?: string;
}
interface AlignmentItem { name: string; pct: number; color: string; textColor: string }
interface BriefBanner {
  grade: string; score: string; headline: string; publishedAt: string;
  nextReview: string; decisionCount: number; issueCount: number;
}
interface FiscalData { year: string; quarter: string }

interface StrategyRoomDashboardProps {
  onOpenBrief: () => void;
  onDownloadBrief?: () => void;
  themes?: ThemeItem[] | null;
  budget?: BudgetData | null;
  workforce?: WorkforceData | null;
  contracts?: ContractsData | null;
  execution?: ExecutionItem[] | null;
  alignment?: AlignmentItem[] | null;
  brief?: BriefBanner | null;
  fiscal?: FiscalData | null;
  updatedAgo?: string | null;
}

const TOKENS = `
[data-srd] {
  --srd-ink:#09090B; --srd-ink-2:#18181B; --srd-ink-3:#3F3F46;
  --srd-ink-m:#71717A;
  --srd-bg:var(--ds-text-inverse, #FFFFFF); --srd-bg-2:#FAFAFA; --srd-bg-3:#F4F4F5;
  --srd-bdr:#E4E4E7; --srd-bdr-s:#D4D4D8;
  --srd-blue:var(--ds-text-brand, #2563EB); --srd-blue-h:var(--ds-background-brand-bold-hovered, #1D4ED8); --srd-blue-bg:var(--ds-background-selected, #EFF6FF); --srd-blue-bdr:#BFDBFE;
  --srd-teal:#0D9488; --srd-teal-t:#0A8277; --srd-teal-bg:#F0FDFA;
  --srd-green:var(--ds-text-success, #16A34A); --srd-green-t:#11853D; --srd-green-bg:#F0FDF4;
  --srd-red:var(--ds-text-danger, #DC2626); --srd-red-t:#D92525; --srd-red-bg:var(--ds-background-danger, #FEF2F2);
  --srd-purple:var(--ds-text-brand, #2563EB);
  --srd-ai:var(--ds-text-brand, #2563EB); --srd-ai-d:#1E40AF; --srd-ai-bg:var(--ds-background-selected, #EFF6FF); --srd-ai-bdr:#93C5FD;
  --srd-r:4px; --srd-r2:6px; --srd-r3:8px; --srd-r4:12px; --srd-pill:9999px;
  font-family: var(--cp-font-body); color:var(--srd-ink);
  -webkit-font-smoothing:antialiased; line-height:1.5;
}

/* ── DARK MODE — Dark mode overrides ── */
.dark [data-srd] , [data-theme="dark"] [data-srd] {
  --srd-ink: rgba(255,255,255,0.92);
  --srd-ink-2: rgba(255,255,255,0.72);
  --srd-ink-3: rgba(255,255,255,0.72);
  --srd-ink-m: rgba(255,255,255,0.60);
  --srd-bg: var(--ds-surface, #0A0A0A);
  --srd-bg-2: var(--ds-surface, #0A0A0A);
  --srd-bg-3: var(--ds-border, #292929);
  --srd-bdr: var(--ds-border, #2E2E2E);
  --srd-bdr-s: var(--ds-border-bold, #454545);
  --srd-blue: var(--ds-text-brand, #3B82F6);
  --srd-blue-h: var(--ds-text-brand, #60A5FA);
  --srd-blue-bg: rgba(59,130,246,0.08);
  --srd-blue-bdr: rgba(59,130,246,0.16);
  --srd-teal: #5EEAD4;
  --srd-teal-t: #5EEAD4;
  --srd-teal-bg: rgba(94,234,212,0.08);
  --srd-green: #4ADE80;
  --srd-green-t: #4ADE80;
  --srd-green-bg: rgba(74,222,128,0.08);
  --srd-red: var(--ds-border-danger, #FCA5A5);
  --srd-red-t: var(--ds-border-danger, #FCA5A5);
  --srd-red-bg: rgba(239,68,68,0.10);
  --srd-purple: var(--ds-text-brand, #60A5FA);
  --srd-ai: var(--ds-text-brand, #3B82F6);
  --srd-ai-d: var(--ds-text-brand, #60A5FA);
  --srd-ai-bg: rgba(59,130,246,0.08);
  --srd-ai-bdr: rgba(59,130,246,0.16);
}

@keyframes srd-pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes srd-fadeup{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
[data-srd] .srd-banner:hover{box-shadow:0 4px 16px rgba(37,99,235,.15);transform:translateY(-1px)}
[data-srd] .srd-btn:hover{border-color:var(--srd-bdr-s);background:var(--srd-bg-2)}
[data-srd] .srd-btn-p:hover{background:var(--srd-blue-h)}
[data-srd] .srd-chip:hover{background:var(--srd-bg-2)}
[data-srd] .srd-link:hover{text-decoration:underline}

/* Responsive: header */
[data-srd] .srd-header { padding: 16px 32px 14px; display:flex; align-items:flex-start; justify-content:space-between; gap:8px; border-bottom:1px solid var(--srd-bdr); }
[data-srd] .srd-vision { margin: 12px 32px 0; }
[data-srd] .srd-brief-banner { margin: 12px 32px 0; }
[data-srd] .srd-themes { margin: 12px 32px 0; }
[data-srd] .srd-main { padding: 16px 32px 40px; }
[data-srd] .srd-grid { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:14px; align-items:stretch; }

@media (max-width: 1100px) {
  [data-srd] .srd-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 768px) {
  [data-srd] .srd-header { padding: 12px 16px 10px; flex-wrap:wrap; }
  [data-srd] .srd-header .srd-hdr-actions { width:100%; justify-content:flex-end; }
  [data-srd] .srd-vision { margin: 8px 16px 0; }
  [data-srd] .srd-brief-banner { margin: 8px 16px 0; flex-wrap:wrap; gap:8px; }
  [data-srd] .srd-brief-banner .srd-brief-grade { width:36px; height:36px; font-size:15px !important; }
  [data-srd] .srd-themes { margin: 8px 16px 0; }
  [data-srd] .srd-main { padding: 12px 16px 32px; }
  [data-srd] .srd-grid { grid-template-columns: 1fr; }
  [data-srd] .srd-vision { flex-wrap:wrap; }
}
@media (max-width: 480px) {
  [data-srd] .srd-header { padding: 10px 12px 8px; }
  [data-srd] .srd-vision { margin: 8px 12px 0; padding: 8px 12px !important; }
  [data-srd] .srd-brief-banner { margin: 8px 12px 0; padding: 10px 12px !important; }
  [data-srd] .srd-themes { margin: 8px 12px 0; }
  [data-srd] .srd-main { padding: 10px 12px 24px; }
}
`;

/* ─── helpers ─── */
const S = (sz: number, wt = 700): React.CSSProperties => ({ fontFamily: 'var(--cp-font-heading)', fontSize: sz, fontWeight: wt });
const M = (sz = 11): React.CSSProperties => ({ fontFamily: 'var(--cp-font-mono)', fontSize: sz });
const F = (g = 8): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: g });
const Dot = (c: string, s = 8): React.CSSProperties => ({ width: s, height: s, borderRadius: '50%', background: c, flexShrink: 0 });
const Pill = (bg: string, c: string): React.CSSProperties => ({ ...M(11), fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--srd-pill)', background: bg, color: c, whiteSpace: 'nowrap' });
const Delta = (t: string): React.CSSProperties => ({ ...M(11), fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--srd-pill)', marginInlineStart: 4, background: t === 'up' ? 'var(--srd-green-bg)' : t === 'down' ? 'var(--srd-red-bg)' : 'var(--srd-bg-3)', color: t === 'up' ? 'var(--srd-green-t)' : t === 'down' ? 'var(--srd-red-t)' : 'var(--srd-ink-m)' });
const BarTrack = (h = 6): React.CSSProperties => ({ height: h, background: 'var(--srd-bg-3)', borderRadius: 'var(--srd-pill)', overflow: 'hidden', display: 'flex' });
const BarSeg = (c: string, p: number): React.CSSProperties => ({ height: '100%', minWidth: p > 0 ? 6 : 0, width: `${p}%`, background: c, transition: 'width .8s' });
const BarSingle = (c: string, p: number): React.CSSProperties => ({ height: '100%', width: `${p}%`, background: c, borderRadius: 'var(--srd-pill)', transition: 'width .8s' });
const SECT: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--srd-ink-2)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '18px 0 6px' };

const STATUS_STYLE: Record<string, { color: string; bg: string; tc: string; label: string }> = {
  on_track: { color: 'var(--srd-green)', bg: 'var(--srd-green-bg)', tc: 'var(--srd-green-t)', label: 'On Track' },
  off_track: { color: 'var(--srd-red)', bg: 'var(--srd-red-bg)', tc: 'var(--srd-red-t)', label: 'Off Track' },
  at_risk: { color: 'var(--srd-ai)', bg: 'var(--srd-ai-bg)', tc: 'var(--srd-ai-d)', label: 'At Risk' },
};
const st = (s: string) => STATUS_STYLE[s] || STATUS_STYLE.at_risk;
const deltaDir = (v: number) => v > 0 ? 'up' : v < 0 ? 'down' : 'flat';

function Ico({ d, sz = 14 }: { d: string; sz?: number }) {
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

const Empty = ({ msg, actionable }: { msg?: string; actionable?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 80, gap: 6, textAlign: 'center', padding: 20 }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--srd-bdr-s)" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
    <span style={{ fontSize: 12, color: actionable ? 'var(--srd-ink-2)' : 'var(--srd-ink-m)', fontStyle: 'italic' }}>{msg || 'No data available'}</span>
  </div>
);

function Widget({ title, link, foot, children, delay = 0 }: { title: string; link?: string; foot?: React.ReactNode; children: React.ReactNode; delay?: number }) {
  return (
    <div style={{ border: '1px solid var(--srd-bdr)', borderRadius: 'var(--srd-r4)', background: 'var(--srd-bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: `srd-fadeup .4s ease ${delay}s both` }}>
      <div style={{ ...F(8), justifyContent: 'space-between', padding: '14px 20px 10px' }}>
        <span style={{ ...S(13), color: 'var(--srd-ink)' }}>{title}</span>
        {link && <span className="srd-link" style={{ fontSize: 11, fontWeight: 600, color: 'var(--srd-blue)', cursor: 'pointer' }}>{link}</span>}
      </div>
      <div style={{ padding: '0 20px 16px', flex: 1 }}>{children}</div>
      {foot && <div style={{ borderTop: '1px solid var(--srd-bdr-s)', padding: '10px 20px', ...F(12), fontSize: 11, color: 'var(--srd-ink-m)' }}>{foot}</div>}
    </div>
  );
}

function DeptRow({ name, pct, count, tag, utilization, utilColor, barColor = 'var(--srd-blue)' }: { name: string; pct: number; count: number; tag?: string; utilization?: string; utilColor?: string; barColor?: string }) {
  return (
    <div style={{ ...F(8), height: 30 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--srd-ink)', width: 100, flexShrink: 0 }}>{name}</span>
      <div style={{ flex: 1 }}><div style={{ height: 6, background: 'var(--srd-bg-3)', borderRadius: 'var(--srd-pill)', overflow: 'hidden' }}><div style={BarSingle(barColor, pct)} /></div></div>
      {utilization && <span style={{ ...M(10), fontWeight: 600, width: 34, textAlign: 'end', color: utilColor }}>{utilization}</span>}
      <span style={{ ...M(11), fontWeight: 600, color: 'var(--srd-ink-2)', width: 28, textAlign: 'end' }}>{count}</span>
      {tag && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--srd-pill)', background: 'var(--srd-ai-bg)', color: 'var(--srd-ai-d)' }}>{tag}</span>}
    </div>
  );
}

/* ═══ MAIN ═══ */
export default function StrategyRoomDashboard({
  onOpenBrief, onDownloadBrief,
  themes, budget, workforce, contracts, execution, alignment,
  brief, fiscal, updatedAgo,
}: StrategyRoomDashboardProps) {
  const { data: vision } = useVision();
  const updateVision = useUpdateVision();
  const [editingVision, setEditingVision] = useState(false);
  const [visionDraft, setVisionDraft] = useState('');
  const visionInputRef = useRef<HTMLInputElement>(null);

  const visionTitle = vision?.title || '';
  const visionYear = vision?.target_year || 2030;

  useEffect(() => {
    if (editingVision && visionInputRef.current) {
      visionInputRef.current.focus();
      visionInputRef.current.select();
    }
  }, [editingVision]);

  const startEditVision = () => { setVisionDraft(visionTitle); setEditingVision(true); };
  const saveVision = () => {
    if (vision && visionDraft.trim() && visionDraft.trim() !== visionTitle) {
      updateVision.mutate({ id: vision.id, title: visionDraft.trim() });
    }
    setEditingVision(false);
  };
  const cancelEditVision = () => setEditingVision(false);

  return (
    <div data-srd style={{ width: '100%', margin: '0 auto', background: 'var(--srd-bg)', minHeight: '100vh' }}>
      <style>{TOKENS}</style>

      {/* HEADER */}
      <header className="srd-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <CatalystPageHeader title="Strategy Room" />
          <div style={{ ...F(12), marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{ ...M(11), color: 'var(--srd-ink-m)', ...F(5) }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--srd-green)', flexShrink: 0, animation: 'srd-pulse 2s ease-in-out infinite' }} />
              Live{updatedAgo ? ` · Updated ${updatedAgo}` : ''}
            </span>
            {fiscal && <span style={{ ...M(11), color: 'var(--srd-ink-2)' }}>FY {fiscal.year} · {fiscal.quarter}</span>}
          </div>
        </div>
        <div className="srd-hdr-actions" style={F(8)}>
          {onDownloadBrief && (
            <button className="srd-btn" onClick={onDownloadBrief} style={{ height: 32, padding: '0 14px', fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500, borderRadius: 'var(--srd-r2)', cursor: 'pointer', ...F(6), border: '1px solid var(--srd-bdr)', background: 'var(--srd-bg)', color: 'var(--srd-ink-3)', transition: 'all .15s' }}>
              <Ico d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />Download Brief
            </button>
          )}
          <button className="srd-btn-p" onClick={onOpenBrief} style={{ height: 32, padding: '0 14px', fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 600, borderRadius: 'var(--srd-r2)', cursor: 'pointer', ...F(6), border: '1px solid var(--srd-blue)', background: 'var(--srd-blue)', color: 'var(--ds-surface, #fff)', transition: 'all .15s' }}>
            <Ico d="M13 2L3 14h9l-1 8 10-12h-9l1-8" />AI Intelligence
          </button>
          <button className="srd-btn" style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid transparent', borderRadius: 'var(--srd-r2)', cursor: 'pointer', background: 'none', color: 'var(--srd-ink-2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
          </button>
        </div>
      </header>

      {/* VISION — editable, from database */}
      {vision && (
        <div className="srd-vision" style={{ border: '1px solid var(--srd-blue-bdr)', borderRadius: 'var(--srd-r4)', padding: '10px 20px', background: 'var(--srd-blue-bg)', ...F(12), fontSize: 13, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--srd-blue)', textTransform: 'uppercase', letterSpacing: '.08em', background: 'rgba(37,99,235,.08)', padding: '3px 8px', borderRadius: 'var(--srd-r)', flexShrink: 0 }}>Vision {visionYear}</span>
          {editingVision ? (
            <div style={{ flex: 1, ...F(6) }}>
              <input
                ref={visionInputRef}
                value={visionDraft}
                onChange={e => setVisionDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveVision(); if (e.key === 'Escape') cancelEditVision(); }}
                style={{ flex: 1, fontWeight: 500, color: 'var(--srd-ink-2)', fontSize: 13, fontFamily: 'var(--cp-font-body)', background: 'var(--srd-bg)', border: '1px solid var(--srd-blue-bdr)', borderRadius: 'var(--srd-r)', padding: '4px 10px', outline: 'none' }}
              />
              <button onClick={saveVision} style={{ width: 26, height: 26, borderRadius: 'var(--srd-r)', background: 'var(--srd-blue)', color: 'var(--ds-surface, #fff)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={14} /></button>
              <button onClick={cancelEditVision} style={{ width: 26, height: 26, borderRadius: 'var(--srd-r)', background: 'var(--srd-bg)', color: 'var(--srd-ink-m)', border: '1px solid var(--srd-bdr)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={14} /></button>
            </div>
          ) : (
            <span onClick={startEditVision} style={{ fontWeight: 500, color: 'var(--srd-ink-2)', flex: 1, cursor: 'pointer', ...F(6) }} title="Click to edit">
              {visionTitle || <em style={{ color: 'var(--srd-ink-m)' }}>Click to set vision statement</em>}
              <Pencil size={12} style={{ color: 'var(--srd-ink-m)', opacity: 0.4 }} />
            </span>
          )}
          <span style={{ ...M(11), color: 'var(--srd-blue)', background: 'rgba(37,99,235,.08)', padding: '2px 8px', borderRadius: 'var(--srd-pill)', flexShrink: 0 }}>Target {visionYear}</span>
        </div>
      )}

      {/* INTELLIGENCE BANNER */}
      {brief && (
        <div className="srd-banner srd-brief-banner" onClick={onOpenBrief} style={{ border: '1px solid var(--srd-blue-bdr)', borderRadius: 'var(--srd-r4)', padding: '12px 20px', ...F(12), background: 'var(--srd-blue-bg)', cursor: 'pointer', transition: 'all .2s', flexWrap: 'wrap' }}>
          <div className="srd-brief-grade" style={{ ...S(18, 800), width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--srd-red-bg)', color: 'var(--srd-red-t)', border: '2px solid var(--srd-red)' }}>{brief.grade}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...S(13), color: 'var(--srd-ink)' }}>{brief.headline}</div>
            <div style={{ fontSize: 11, color: 'var(--srd-ink-2)', marginTop: 1 }}>Published {brief.publishedAt} · Score {brief.score} · Next review: {brief.nextReview}</div>
          </div>
          {brief.decisionCount > 0 && <span style={Pill('var(--srd-red-bg)', 'var(--srd-red-t)')}>{brief.decisionCount} decision{brief.decisionCount !== 1 ? 's' : ''}</span>}
          {brief.issueCount > 0 && <span style={Pill('var(--srd-ai-bg)', 'var(--srd-ai-d)')}>{brief.issueCount} data issue{brief.issueCount !== 1 ? 's' : ''}</span>}
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--srd-blue)', whiteSpace: 'nowrap' }}>Open Full Brief →</span>
        </div>
      )}

      {/* THEMES */}
      {themes && themes.length > 0 && (
        <div className="srd-themes" style={{ ...F(6), overflowX: 'auto', scrollbarWidth: 'none' as const }}>
          {themes.map((t, i) => { const s2 = st(t.status); return (
            <div key={i} className="srd-chip" style={{ ...F(5), padding: '5px 12px', border: '1px solid var(--srd-bdr)', borderRadius: 'var(--srd-pill)', fontSize: 12, fontWeight: 500, color: 'var(--srd-ink)', cursor: 'pointer', background: 'var(--srd-bg)', whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s' }}>
              <span style={Dot(s2.color, 7)} />{t.name}
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--srd-pill)', background: s2.bg, color: s2.tc }}>{s2.label}</span>
            </div>
          ); })}
        </div>
      )}

      {/* DASHBOARD */}
      <main className="srd-main" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="srd-grid">

          {/* BUDGET */}
          <Widget title="Budget Position" link="Full Planner →" delay={0.05} foot={budget ? (<>{(budget.footerStats || []).map((f, i) => <span key={i} style={{ ...F(5), marginInlineEnd: 8, color: 'var(--srd-ink-2)' }}><span style={Dot(f.color, 6)} />{f.label}</span>)}<span style={{ ...M(11), color: 'var(--srd-ink-m)', marginInlineStart: 'auto' }}>{budget.updatedAt}</span></>) : null}>
            {budget ? (<>
              <div style={F(6)}><span style={{ ...S(26, 800) }}>{budget.currency} {budget.total}</span>{budget.delta != null && <span style={Delta(deltaDir(budget.delta))}>{budget.delta > 0 ? '↑' : '↓'} {Math.abs(budget.delta)}% vs {budget.deltaRef}</span>}</div>
              <div style={{ fontSize: 12, color: 'var(--srd-ink-2)', marginTop: 2 }}>Annual budget · FY {fiscal?.year || '—'} · <span style={{ fontWeight: 700, color: budget.confidence < 60 ? 'var(--srd-ai-d)' : 'var(--srd-ink-2)', background: budget.confidence < 60 ? 'var(--srd-ai-bg)' : 'transparent', padding: budget.confidence < 60 ? '1px 7px' : 0, borderRadius: 'var(--srd-pill)', fontSize: 11 }}>{budget.confidence}% data confidence</span></div>
              {budget.segments && budget.segments.length > 0 && (<><div style={{ ...BarTrack(8), marginTop: 12, borderRadius: 'var(--srd-pill)' }}>{budget.segments.map((s, i) => <div key={i} style={BarSeg(s.color, s.pct)} />)}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginTop: 8 }}>{budget.segments.map((s, i) => <span key={i} style={{ ...F(5), fontSize: 11, color: 'var(--srd-ink-2)' }}><span style={Dot(s.color, 6)} />{s.label}</span>)}</div></>)}
              {budget.departments && budget.departments.length > 0 && (<><div style={SECT}>By Department</div>{budget.departments.map((d, i) => <DeptRow key={i} name={d.name} pct={d.pct} count={d.count} tag={d.tag} />)}</>)}
            </>) : <Empty msg="Budget data not loaded" />}
          </Widget>

          {/* WORKFORCE */}
          <Widget title="Workforce" link="Details →" delay={0.1} foot={workforce ? (<><span style={F(5)}><span style={Dot('var(--srd-ink-m)', 6)} />Thiqah (gov't staffing): {workforce.thiqahPct}%</span><span style={{ ...M(11), color: 'var(--srd-ink-m)', marginInlineStart: 'auto' }}>{workforce.updatedAt}</span></>) : null}>
            {workforce ? (<>
              <div style={F(6)}><span style={{ ...S(26, 800) }}>{workforce.total}</span><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--srd-ink-2)' }}>team members</span>{workforce.delta != null && <span style={Delta(deltaDir(workforce.delta))}>{workforce.delta > 0 ? '↑' : '↓'} {Math.abs(workforce.delta)} vs {workforce.deltaRef}</span>}</div>
              <div style={{ fontSize: 12, color: 'var(--srd-ink-2)', marginTop: 2 }}>{workforce.departmentCount} departments · {workforce.vendorCount} vendors · <b style={{ color: 'var(--srd-ink-2)' }}>{workforce.avgUtilization}% avg utilization</b></div>
              {workforce.types && workforce.types.length > 0 && <div style={{ ...F(12), marginTop: 8 }}>{workforce.types.map((x, i) => <span key={i} style={{ ...F(5), fontSize: 12, color: 'var(--srd-ink-2)' }}><span style={Dot(x.color, 6)} /><b style={{ color: 'var(--srd-ink)' }}>{x.count}</b> {x.label}</span>)}</div>}
              {workforce.buckets && workforce.buckets.length > 0 && <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>{workforce.buckets.map((b, i) => {
                const borderColor = b.isDanger ? 'var(--srd-red)' : b.isWarning ? 'var(--srd-ai)' : 'var(--srd-bdr)';
                const bgColor = b.isDanger ? 'var(--srd-red-bg)' : b.isWarning ? 'var(--srd-ai-bg)' : 'var(--srd-bg)';
                const numColor = b.isDanger ? 'var(--srd-red-t)' : b.isWarning ? 'var(--srd-ai-d)' : 'var(--srd-ink)';
                const lblColor = b.isDanger ? 'var(--srd-red-t)' : b.isWarning ? 'var(--srd-ai-d)' : 'var(--srd-ink-2)';
                return <div key={i} style={{ flex: 1, textAlign: 'center', border: `1px solid ${borderColor}`, borderRadius: 'var(--srd-r2)', padding: '7px 4px', background: bgColor }}><div style={{ ...S(17), color: numColor }}>{b.value}</div><div style={{ fontSize: 10, color: lblColor, marginTop: 1, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '.03em' }}>{b.label}</div></div>;
              })}</div>}
              {workforce.departments && workforce.departments.length > 0 && (<><div style={SECT}>By Department</div>{workforce.departments.map((d, i) => <DeptRow key={i} name={d.name} pct={d.pct} count={d.count} utilization={d.utilization} utilColor={d.utilColor} />)}</>)}
            </>) : <Empty msg="Workforce data not loaded" />}
          </Widget>

          {/* CONTRACTS */}
          <Widget title="Contract Status" link="All Contracts →" delay={0.15} foot={contracts ? (<><span style={{ fontSize: 11, color: 'var(--srd-ai-d)' }}>⚡ {contracts.topSource}</span><span style={{ ...M(11), color: 'var(--srd-ink-m)', marginInlineStart: 'auto' }}>{contracts.updatedAt}</span></>) : null}>
            {contracts ? (<>
              {contracts.buckets && contracts.buckets.length > 0 && <div style={{ display: 'flex', gap: 2 }}>{contracts.buckets.map((b, i) => <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderBottom: `2px solid ${b.color}`, borderRadius: 'var(--srd-r) var(--srd-r) 0 0', background: 'var(--srd-bg-2)' }}><div style={{ ...S(20, 800), color: b.textColor }}>{b.count}</div><div style={{ fontSize: 10, color: 'var(--srd-ink-2)', textTransform: 'uppercase', marginTop: 4, fontWeight: 600, letterSpacing: '.03em' }}>{b.label}</div></div>)}</div>}
              <div style={{ fontSize: 11, color: 'var(--srd-ink-2)', textAlign: 'center', margin: '6px 0 10px' }}>{contracts.totalCount} total contracts across {contracts.departmentCount} departments</div>
              {contracts.barSegments && contracts.barSegments.length > 0 && <div style={{ ...BarTrack(8), borderRadius: 'var(--srd-pill)' }}>{contracts.barSegments.map((s, i) => <div key={i} style={BarSeg(s.color, s.pct)} />)}</div>}
              {contracts.expiringSoon && contracts.expiringSoon.length > 0 && (<><div style={SECT}>Expiring Soonest</div>{contracts.expiringSoon.map((e, i) => <div key={i} style={{ ...F(8), height: 28, fontSize: 12 }}><span style={Dot('var(--srd-red)', 6)} /><span style={{ fontWeight: 600, color: 'var(--srd-ink)', flex: 1 }}>{e.name}</span><span style={{ color: 'var(--srd-ink-m)', width: 110, flexShrink: 0 }}>{e.department}</span><span style={{ ...M(12), color: 'var(--srd-red-t)', fontWeight: 600 }}>{e.date}</span></div>)}{(contracts.moreCount ?? 0) > 0 && <span className="srd-link" style={{ fontSize: 12, fontWeight: 600, color: 'var(--srd-blue)', cursor: 'pointer', display: 'block', marginTop: 6 }}>+{contracts.moreCount} more within 3 months →</span>}</>)}
            </>) : <Empty msg="Contract data not loaded" />}
          </Widget>
        </div>

        <div className="srd-grid">
          {/* EXECUTION */}
          <Widget title="Execution Snapshot" delay={0.2} foot={execution && execution.length > 0 ? <span>{execution[0]?.footerNote || '—'}</span> : null}>
            {execution && execution.length > 0 ? execution.map((k, i) => (
              <div key={i} style={{ ...F(8), justifyContent: 'space-between', padding: '9px 0', borderBottom: i < execution.length - 1 ? '1px solid var(--srd-bdr)' : 'none' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--srd-ink)' }}>{k.label}</span>
                <div style={F(8)}>
                  {k.target && <span style={{ ...M(10), color: 'var(--srd-ink-2)' }}>{k.target}</span>}
                  {k.deltaText && <span style={Delta(k.deltaDir || 'flat')}>{k.deltaText}</span>}
                  <span style={{ ...S(15), color: k.valueColor || 'var(--srd-ink)' }}>{k.value}</span>
                </div>
              </div>
            )) : <Empty msg="Execution data not loaded" />}
          </Widget>

          {/* ALIGNMENT */}
          <Widget title="Request → Theme Alignment" delay={0.25} foot={<span>% of initiatives linked to at least one strategic theme</span>}>
            {alignment && alignment.length > 0 ? alignment.map((a, i) => (
              <div key={i} style={{ ...F(10), height: 32 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--srd-ink)', width: 90, textAlign: 'end', flexShrink: 0 }}>{a.name}</span>
                <div style={{ flex: 1 }}><div style={{ height: 8, background: 'var(--srd-bg-3)', borderRadius: 'var(--srd-pill)', overflow: 'hidden' }}><div style={BarSingle(a.color, a.pct)} /></div></div>
                <span style={{ ...M(12), fontWeight: 600, width: 36, textAlign: 'end', color: a.textColor }}>{a.pct}%</span>
              </div>
            )) : <Empty msg="Alignment data not loaded" />}
          </Widget>

          {/* INVESTMENT (genuinely empty) */}
          <Widget title="Investment Allocation" delay={0.3} foot={<span style={{ ...M(11), color: 'var(--srd-ink-m)' }}>Pending setup</span>}>
            <Empty msg="Investment tracking not configured" actionable />
            <div style={{ textAlign: 'center' }}><span className="srd-link" style={{ fontSize: 12, fontWeight: 600, color: 'var(--srd-blue)', cursor: 'pointer' }}>Set up in Strategy Settings →</span></div>
          </Widget>
        </div>
      </main>
    </div>
  );
}
