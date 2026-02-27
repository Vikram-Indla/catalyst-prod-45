/**
 * Chunk 1 v2 — Strategy Room Dashboard
 * 35-point audit fixes applied.
 * Scope: [data-srd] — ring-fenced --srd-* tokens, zero global leak
 */

import { useState, useRef, useEffect } from 'react';
import { useVision } from '@/hooks/strategy/useStrategyData';
import { useUpdateVision } from '@/hooks/strategy/useStrategyMutations';
import { Pencil, Check, X } from 'lucide-react';

interface StrategyRoomDashboardProps {
  onOpenBrief: () => void;
  onDownloadBrief?: () => void;
}

const TOKENS = `
[data-srd] {
  --srd-ink:#09090B; --srd-ink-2:#18181B; --srd-ink-3:#3F3F46;
  --srd-ink-m:#71717A; --srd-ink-ms:#6F6F78;
  --srd-bg:#FFFFFF; --srd-bg-2:#FAFAFA; --srd-bg-3:#F4F4F5;
  --srd-bdr:#E4E4E7; --srd-bdr-s:#D4D4D8;
  --srd-blue:#2563EB; --srd-blue-h:#1D4ED8; --srd-blue-bg:#EFF6FF; --srd-blue-bdr:#BFDBFE;
  --srd-teal:#0D9488; --srd-teal-t:#0A8277; --srd-teal-bg:#F0FDFA;
  --srd-green:#16A34A; --srd-green-t:#11853D; --srd-green-bg:#F0FDF4;
  --srd-red:#DC2626; --srd-red-t:#D92525; --srd-red-bg:#FEF2F2;
  --srd-purple:#7C3AED;
  --srd-ai:#2563EB; --srd-ai-d:#1E40AF; --srd-ai-bg:#EFF6FF; --srd-ai-bdr:#93C5FD;
  --srd-r:4px; --srd-r2:6px; --srd-r3:8px; --srd-r4:12px; --srd-pill:9999px;
  font-family:'Inter',system-ui,sans-serif; color:var(--srd-ink);
  -webkit-font-smoothing:antialiased; line-height:1.5;
}
@keyframes srd-pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes srd-fadeup{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
/* #26 hover on banner */
[data-srd] .srd-banner:hover{box-shadow:0 4px 16px rgba(37,99,235,.15);transform:translateY(-1px)}
/* #27 button hovers */
[data-srd] .srd-btn:hover{border-color:var(--srd-bdr-s);background:var(--srd-bg-2)}
[data-srd] .srd-btn-p:hover{background:var(--srd-blue-h)}
/* #28 chip hover */
[data-srd] .srd-chip:hover{background:var(--srd-bg-2)}
/* #29 link hover */
[data-srd] .srd-link:hover{text-decoration:underline}
`;

/* ─── helpers ─── */
const S = (sz: number, wt = 700): React.CSSProperties => ({ fontFamily: "'Sora',sans-serif", fontSize: sz, fontWeight: wt });
const M = (sz = 11): React.CSSProperties => ({ fontFamily: "'JetBrains Mono',monospace", fontSize: sz });
const F = (g = 8): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: g });
const D = (c: string, s = 8): React.CSSProperties => ({ width: s, height: s, borderRadius: '50%', background: c, flexShrink: 0 });
const P = (bg: string, c: string): React.CSSProperties => ({ ...M(11), fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--srd-pill)', background: bg, color: c, whiteSpace: 'nowrap' });
/* #12 standardized delta format */
const DT = (t: string): React.CSSProperties => ({ ...M(11), fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--srd-pill)', marginInlineStart: 4, background: t === 'up' ? 'var(--srd-green-bg)' : t === 'down' ? 'var(--srd-red-bg)' : 'var(--srd-bg-3)', color: t === 'up' ? 'var(--srd-green-t)' : t === 'down' ? 'var(--srd-red-t)' : 'var(--srd-ink-m)' });
const BT = (h = 6): React.CSSProperties => ({ height: h, background: 'var(--srd-bg-3)', borderRadius: 'var(--srd-pill)', overflow: 'hidden', display: 'flex' });
/* #17 #18 min-width on bar segments */
const BF = (c: string, p: number): React.CSSProperties => ({ height: '100%', minWidth: p > 0 ? 6 : 0, width: `${p}%`, background: c, transition: 'width .8s' });
const BF_SINGLE = (c: string, p: number): React.CSSProperties => ({ height: '100%', width: `${p}%`, background: c, borderRadius: 'var(--srd-pill)', transition: 'width .8s' });
/* #10 increased section header margin */
const SECT: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--srd-ink-m)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '18px 0 6px' };
const LINK = 'srd-link';
const LINK_S: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--srd-blue)', cursor: 'pointer', textDecoration: 'none' };

/* ─── atoms ─── */
function Ico({ d, sz = 14 }: { d: string; sz?: number }) {
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

/* #5 stretch + #30 stagger animation */
function W({ title, link, foot, children, delay = 0 }: { title: string; link?: string; foot?: React.ReactNode; children: React.ReactNode; delay?: number }) {
  return (
    <div style={{ border: '1px solid var(--srd-bdr)', borderRadius: 'var(--srd-r4)', background: 'var(--srd-bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: `srd-fadeup .4s ease ${delay}s both` }}>
      <div style={{ ...F(8), justifyContent: 'space-between', padding: '14px 20px 10px' }}>
        {/* #14 Sora for titles */}
        <span style={{ ...S(13), color: 'var(--srd-ink)' }}>{title}</span>
        {link && <span className={LINK} style={LINK_S}>{link}</span>}
      </div>
      <div style={{ padding: '0 20px 16px', flex: 1 }}>{children}</div>
      {/* #32 stronger footer border */}
      {foot && <div style={{ borderTop: '1px solid var(--srd-bdr-s)', padding: '10px 20px', ...F(12), fontSize: 11, color: 'var(--srd-ink-m)' }}>{foot}</div>}
    </div>
  );
}

function Row({ name, pct, ct, tag, util, uc, c = 'var(--srd-blue)' }: { name: string; pct: number; ct: number; tag?: string; util?: string; uc?: string; c?: string }) {
  return (
    <div style={{ ...F(8), height: 30 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--srd-ink)', width: 100, flexShrink: 0 }}>{name}</span>
      <div style={{ flex: 1 }}><div style={{ height: 6, background: 'var(--srd-bg-3)', borderRadius: 'var(--srd-pill)', overflow: 'hidden' }}><div style={BF_SINGLE(c, pct)} /></div></div>
      {util && <span style={{ ...M(10), fontWeight: 600, width: 34, textAlign: 'end', color: uc }}>{util}</span>}
      <span style={{ ...M(11), fontWeight: 600, color: 'var(--srd-ink-2)', width: 28, textAlign: 'end' }}>{ct}</span>
      {/* #19 'No cost assigned' → blue-bg instead of red */}
      {tag && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--srd-pill)', background: 'var(--srd-ai-bg)', color: 'var(--srd-ai-d)' }}>{tag}</span>}
    </div>
  );
}

/* ─── data ─── */
const THEMES = [
  { n: 'Digital Transformation', s: 'On Track', c: 'var(--srd-green)', bg: 'var(--srd-green-bg)', tc: 'var(--srd-green-t)' },
  { n: 'Workforce Development', s: 'Off Track', c: 'var(--srd-red)', bg: 'var(--srd-red-bg)', tc: 'var(--srd-red-t)' },
  { n: 'Supply Chain', s: 'On Track', c: 'var(--srd-green)', bg: 'var(--srd-green-bg)', tc: 'var(--srd-green-t)' },
  { n: 'Sustainability & ESG', s: 'At Risk', c: 'var(--srd-ai)', bg: 'var(--srd-ai-bg)', tc: 'var(--srd-ai-d)' },
  { n: 'Innovation & R&D', s: 'At Risk', c: 'var(--srd-ai)', bg: 'var(--srd-ai-bg)', tc: 'var(--srd-ai-d)' },
  { n: 'Regulatory', s: 'On Track', c: 'var(--srd-green)', bg: 'var(--srd-green-bg)', tc: 'var(--srd-green-t)' },
];

export default function StrategyRoomDashboard({ onOpenBrief, onDownloadBrief }: StrategyRoomDashboardProps) {
  const { data: vision } = useVision();
  const updateVision = useUpdateVision();
  const [editingVision, setEditingVision] = useState(false);
  const [visionDraft, setVisionDraft] = useState('');
  const visionInputRef = useRef<HTMLInputElement>(null);

  const visionTitle = vision?.title || 'Transforming the Kingdom into a leading global industrial powerhouse and logistics hub';
  const visionYear = vision?.target_year || 2030;

  useEffect(() => {
    if (editingVision && visionInputRef.current) {
      visionInputRef.current.focus();
      visionInputRef.current.select();
    }
  }, [editingVision]);

  const startEditVision = () => {
    setVisionDraft(visionTitle);
    setEditingVision(true);
  };

  const saveVision = () => {
    if (vision && visionDraft.trim() && visionDraft.trim() !== visionTitle) {
      updateVision.mutate({ id: vision.id, title: visionDraft.trim() });
    }
    setEditingVision(false);
  };

  const cancelEditVision = () => {
    setEditingVision(false);
  };

  return (
    <div data-srd style={{ width: '100%', margin: '0 auto', background: 'var(--srd-bg)', minHeight: '100vh' }}>
      <style>{TOKENS}</style>

      {/* ═══ HEADER — #1 greeting REMOVED ═══ */}
      <header style={{ padding: '16px 32px 14px', borderBottom: '1px solid var(--srd-bdr)', ...F(8), justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 style={{ ...S(22), color: 'var(--srd-ink)', letterSpacing: '-0.025em', margin: 0 }}>Strategy Room</h1>
          <div style={{ ...F(12), marginTop: 2 }}>
            {/* #33 pulse animation with explicit style */}
            <span style={{ ...M(11), color: 'var(--srd-ink-m)', ...F(5) }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--srd-green)', flexShrink: 0, animation: 'srd-pulse 2s ease-in-out infinite' }} />
              Live · Updated 12 min ago
            </span>
            <span style={{ ...M(11), color: 'var(--srd-ink-m)' }}>FY 2026 · Q1</span>
          </div>
        </div>
        <div style={F(8)}>
          {/* #27 hover classes */}
          <button className="srd-btn-p" onClick={onOpenBrief} style={{ height: 32, padding: '0 14px', fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600, borderRadius: 'var(--srd-r2)', cursor: 'pointer', ...F(6), border: '1px solid var(--srd-blue)', background: 'var(--srd-blue)', color: '#fff', transition: 'all .15s' }}>
            <Ico d="M13 2L3 14h9l-1 8 10-12h-9l1-8" />AI Intelligence
          </button>
          {/* #35 settings gear */}
          <button className="srd-btn" style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid transparent', borderRadius: 'var(--srd-r2)', cursor: 'pointer', background: 'none', color: 'var(--srd-ink-m)', transition: 'all .15s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
          </button>
        </div>
      </header>

      {/* ═══ VISION STRIP ═══ */}
      <div style={{ margin: '12px 32px 0', border: '1px solid var(--srd-blue-bdr)', borderRadius: 'var(--srd-r4)', padding: '10px 20px', background: 'var(--srd-blue-bg)', ...F(12), fontSize: 13 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--srd-blue)', textTransform: 'uppercase', letterSpacing: '.08em', background: 'rgba(37,99,235,.08)', padding: '3px 8px', borderRadius: 'var(--srd-r)', flexShrink: 0 }}>Vision {visionYear}</span>
        {editingVision ? (
          <div style={{ flex: 1, ...F(6) }}>
            <input
              ref={visionInputRef}
              value={visionDraft}
              onChange={e => setVisionDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveVision(); if (e.key === 'Escape') cancelEditVision(); }}
              style={{ flex: 1, fontWeight: 500, color: 'var(--srd-ink-2)', fontSize: 13, fontFamily: "'Inter',sans-serif", background: 'var(--srd-bg)', border: '1px solid var(--srd-blue-bdr)', borderRadius: 'var(--srd-r)', padding: '4px 10px', outline: 'none' }}
            />
            <button onClick={saveVision} style={{ width: 26, height: 26, borderRadius: 'var(--srd-r)', background: 'var(--srd-blue)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={14} /></button>
            <button onClick={cancelEditVision} style={{ width: 26, height: 26, borderRadius: 'var(--srd-r)', background: 'var(--srd-bg)', color: 'var(--srd-ink-m)', border: '1px solid var(--srd-bdr)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={14} /></button>
          </div>
        ) : (
          <span onClick={startEditVision} style={{ fontWeight: 500, color: 'var(--srd-ink-2)', flex: 1, cursor: 'pointer', ...F(6) }} title="Click to edit">
            {visionTitle}
            <Pencil size={12} style={{ color: 'var(--srd-ink-m)', opacity: 0.4 }} />
          </span>
        )}
        <span style={{ ...M(11), color: 'var(--srd-blue)', background: 'rgba(37,99,235,.08)', padding: '2px 8px', borderRadius: 'var(--srd-pill)', flexShrink: 0 }}>Target {visionYear}</span>
      </div>

      {/* ═══ INTELLIGENCE BANNER — #7 tighter, #26 hover, #34 reduced gap ═══ */}
      <div className="srd-banner" onClick={onOpenBrief} style={{ margin: '12px 32px 0', border: '1px solid var(--srd-blue-bdr)', borderRadius: 'var(--srd-r4)', padding: '12px 20px', ...F(12), background: 'var(--srd-blue-bg)', cursor: 'pointer', transition: 'all .2s' }}>
        <div style={{ ...S(18, 800), width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--srd-red-bg)', color: 'var(--srd-red-t)', border: '2px solid var(--srd-red)' }}>D-</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...S(13), color: 'var(--srd-ink)' }}>AI Brief Available — 2 decisions require your attention</div>
          <div style={{ fontSize: 11, color: 'var(--srd-ink-m)', marginTop: 1 }}>Published Feb 20, 2026 · Score 47/100 · Next review: Mar 1</div>
        </div>
        <span style={P('var(--srd-red-bg)', 'var(--srd-red-t)')}>2 decisions</span>
        <span style={P('var(--srd-ai-bg)', 'var(--srd-ai-d)')}>3 data issues</span>
      </div>

      {/* ═══ THEME STRIP — #4 scrollable, shorter names to prevent orphan ═══ */}
      <div style={{ margin: '12px 32px 0', ...F(6), overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' as const }}>
        {THEMES.map((t, i) => (
          <div key={i} className="srd-chip" style={{ ...F(5), padding: '5px 12px', border: '1px solid var(--srd-bdr)', borderRadius: 'var(--srd-pill)', fontSize: 12, fontWeight: 500, color: 'var(--srd-ink)', cursor: 'pointer', background: 'var(--srd-bg)', whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s' }}>
            <span style={D(t.c, 7)} />{t.n}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--srd-pill)', background: t.bg, color: t.tc }}>{t.s}</span>
          </div>
        ))}
      </div>

      {/* ═══ DASHBOARD — #5 align-items: stretch ═══ */}
      <main style={{ padding: '16px 32px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ROW 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'stretch' }}>

          {/* ─── BUDGET ─── */}
          <W title="Budget Position" link="Full Planner →" delay={0.05} foot={
            <>
              <span style={F(5)}><span style={D('var(--srd-red)', 6)} />43 missing costs</span>
              {/* #22 add second footer stat */}
              <span style={{ ...F(5), marginInlineStart: 8 }}><span style={D('var(--srd-ai)', 6)} />11 renewals ≤90 days</span>
              {/* #15 larger footer timestamp */}
              <span style={{ ...M(11), color: 'var(--srd-ink-m)', marginInlineStart: 'auto' }}>2h ago</span>
            </>
          }>
            <div style={F(6)}>
              <span style={{ ...S(26, 800) }}>SAR 11.8M</span>
              <span style={DT('up')}>↑ 4% vs FY25</span>
            </div>
            {/* #16 confidence flagged as badge */}
            <div style={{ fontSize: 12, color: 'var(--srd-ink-m)', marginTop: 2 }}>
              Annual budget · FY 2026 · <span style={{ fontWeight: 700, color: 'var(--srd-ai-d)', background: 'var(--srd-ai-bg)', padding: '1px 7px', borderRadius: 'var(--srd-pill)', fontSize: 11 }}>43% data confidence</span>
            </div>
            {/* #18 min-width on bar segments */}
            <div style={{ ...BT(8), marginTop: 12, borderRadius: 'var(--srd-pill)' }}>
              <div style={BF('var(--srd-blue)', 73)} />
              <div style={BF('var(--srd-teal)', 20)} />
              <div style={BF('var(--srd-ai)', 5)} />
              <div style={BF('var(--srd-purple)', 2)} />
            </div>
            {/* #8 legend as 2x2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginTop: 8 }}>
              {[{ c: 'var(--srd-blue)', t: 'In-house 8.6M' }, { c: 'var(--srd-teal)', t: 'Outsourced 2.3M' }, { c: 'var(--srd-ai)', t: 'Co-sourced 598K' }, { c: 'var(--srd-purple)', t: 'Licenses 312K' }].map((l, i) => (
                <span key={i} style={{ ...F(5), fontSize: 11, color: 'var(--srd-ink-m)' }}><span style={D(l.c, 6)} />{l.t}</span>
              ))}
            </div>
            <div style={SECT}>By Department</div>
            {[{ name: 'Delivery', pct: 45, ct: 34 }, { name: 'Product', pct: 25, ct: 19 }, { name: 'Operations', pct: 16, ct: 12 }, { name: 'Tech Support', pct: 9, ct: 7, tag: 'No cost assigned' }, { name: 'Governance', pct: 5, ct: 4, tag: 'No cost assigned' }].map((d, i) => <Row key={i} {...d} />)}
          </W>

          {/* ─── WORKFORCE ─── */}
          <W title="Workforce" link="Details →" delay={0.1} foot={
            <>
              <span style={F(5)}><span style={D('var(--srd-ink-m)', 6)} />Thiqah (gov't staffing): 32%</span>
              <span style={{ ...M(11), color: 'var(--srd-ink-m)', marginInlineStart: 'auto' }}>2h ago</span>
            </>
          }>
            {/* #12 standardized delta */}
            <div style={F(6)}><span style={{ ...S(26, 800) }}>76</span><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--srd-ink-m)' }}>team members</span><span style={DT('up')}>↑ 3 vs last month</span></div>
            <div style={{ fontSize: 12, color: 'var(--srd-ink-m)', marginTop: 2 }}>5 departments · 7 vendors · <b style={{ color: 'var(--srd-ink-3)' }}>99% avg utilization</b></div>
            <div style={{ ...F(12), marginTop: 8 }}>
              {[{ c: 'var(--srd-blue)', n: 7, l: 'Full-time' }, { c: 'var(--srd-teal)', n: 59, l: 'Vendor' }, { c: 'var(--srd-purple)', n: 5, l: 'Freelance' }].map((x, i) => (
                <span key={i} style={{ ...F(5), fontSize: 12, color: 'var(--srd-ink-m)' }}><span style={D(x.c, 6)} /><b style={{ color: 'var(--srd-ink-2)' }}>{x.n}</b> {x.l}</span>
              ))}
            </div>
            {/* #20 Over-allocated: softer red (opacity 0.7 on bg) */}
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              {[{ v: 0, l: 'Unassigned' }, { v: 1, l: 'Under-utilized' }, { v: 5, l: 'Committed' }, { v: 70, l: 'Over-allocated', d: true }].map((b, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', border: `1px solid ${b.d ? 'rgba(220,38,38,.2)' : 'var(--srd-bdr)'}`, borderRadius: 'var(--srd-r2)', padding: '7px 4px', background: b.d ? 'rgba(254,242,242,.7)' : 'var(--srd-bg)' }}>
                  <div style={{ ...S(17), color: b.d ? 'var(--srd-red-t)' : 'var(--srd-ink)' }}>{b.v}</div>
                  <div style={{ fontSize: 10, color: b.d ? 'var(--srd-red-t)' : 'var(--srd-ink-m)', marginTop: 1 }}>{b.l}</div>
                </div>
              ))}
            </div>
            <div style={SECT}>By Department</div>
            {/* #25 show all 5 departments */}
            {[
              { name: 'Delivery', pct: 100, ct: 34, util: '100%', uc: 'var(--srd-green-t)' },
              { name: 'Product', pct: 100, ct: 19, util: '100%', uc: 'var(--srd-green-t)' },
              { name: 'Operations', pct: 100, ct: 12, util: '100%', uc: 'var(--srd-green-t)' },
              { name: 'Tech Support', pct: 92, ct: 7, util: '92%', uc: 'var(--srd-green-t)' },
              { name: 'Governance', pct: 81, ct: 4, util: '81%', uc: 'var(--srd-ai)' },
            ].map((d, i) => <Row key={i} {...d} />)}
          </W>

          {/* ─── CONTRACTS ─── */}
          <W title="Contract Status" link="All Contracts →" delay={0.15} foot={
            <>
              <span style={{ fontSize: 11, color: 'var(--srd-ai-d)' }}>⚡ Top source: Internal staffing — 48 resources (63%)</span>
              <span style={{ ...M(11), color: 'var(--srd-ink-m)', marginInlineStart: 'auto' }}>2h ago</span>
            </>
          }>
            {/* #9 more padding, #13 letter-spacing */}
            <div style={{ display: 'flex', gap: 2 }}>
              {[{ n: 3, l: 'Expired', c: 'var(--srd-red)', tc: 'var(--srd-red-t)' }, { n: 8, l: '≤3 Months', c: 'var(--srd-ai)', tc: 'var(--srd-ai-d)' }, { n: 24, l: '3–6 Months', c: 'var(--srd-blue)', tc: 'var(--srd-blue)' }, { n: 41, l: '>6 Months', c: 'var(--srd-green)', tc: 'var(--srd-green-t)' }].map((b, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderBottom: `2px solid ${b.c}`, borderRadius: 'var(--srd-r) var(--srd-r) 0 0', background: 'var(--srd-bg-2)' }}>
                  <div style={{ ...S(20, 800), color: b.tc }}>{b.n}</div>
                  <div style={{ fontSize: 10, color: 'var(--srd-ink-m)', textTransform: 'uppercase', marginTop: 4, fontWeight: 600, letterSpacing: '.03em' }}>{b.l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--srd-ink-m)', textAlign: 'center', margin: '6px 0 10px' }}>76 total contracts across 5 departments</div>
            {/* #17 min-width on bar segments */}
            <div style={{ ...BT(8), borderRadius: 'var(--srd-pill)' }}>
              <div style={BF('var(--srd-red)', 4)} />
              <div style={BF('var(--srd-ai)', 10)} />
              <div style={BF('var(--srd-blue)', 32)} />
              <div style={BF('var(--srd-green)', 54)} />
            </div>
            <div style={SECT}>Expiring Soonest</div>
            {[{ n: 'Abdulrahman AlRajhi', d: 'Technical Support', dt: 'Mar 29' }, { n: 'Mahmoud Gameel', d: 'Delivery', dt: 'Mar 29' }, { n: 'Abdulrahman Alghizzy', d: 'Product', dt: 'Mar 29' }].map((e, i) => (
              <div key={i} style={{ ...F(8), height: 28, fontSize: 12 }}>
                <span style={D('var(--srd-red)', 6)} />
                <span style={{ fontWeight: 600, color: 'var(--srd-ink)', flex: 1 }}>{e.n}</span>
                <span style={{ color: 'var(--srd-ink-m)', width: 110, flexShrink: 0 }}>{e.d}</span>
                <span style={{ ...M(12), color: 'var(--srd-red-t)', fontWeight: 600 }}>{e.dt}</span>
              </div>
            ))}
            <span className={LINK} style={{ ...LINK_S, display: 'block', marginTop: 6, fontSize: 12 }}>+8 more within 3 months →</span>
          </W>
        </div>

        {/* ROW 2 — #5 stretch */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'stretch' }}>

          {/* ─── EXECUTION — #23 danger items FIRST ─── */}
          <W title="Execution Snapshot" delay={0.2} foot={<span>73 initiatives not connected to any strategic theme</span>}>
            {[
              { l: 'Unlinked Initiatives', v: '73', t: 'of 295', vc: 'var(--srd-red-t)' },
              { l: 'Goals At Risk', v: '4', d: '↑ 1 vs Q4', dt: 'down', vc: 'var(--srd-ai)' },
              { l: 'Avg. Alignment', v: '74%', d: '↓ 3% vs Q4', dt: 'down', t: 'target 85%', vc: 'var(--srd-ai)' },
              { l: 'Total Work Items', v: '295', d: '↑ 12 vs Q4', dt: 'up' },
              { l: 'Active Workstreams', v: '7', d: '→ 0 vs Q4', dt: 'flat' },
            ].map((k, i) => (
              <div key={i} style={{ ...F(8), justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 4 ? '1px solid var(--srd-bdr)' : 'none' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--srd-ink)' }}>{k.l}</span>
                <div style={F(8)}>
                  {k.t && <span style={{ ...M(10), color: 'var(--srd-ink-m)' }}>{k.t}</span>}
                  {k.d && <span style={DT(k.dt)}>{k.d}</span>}
                  <span style={{ ...S(15), color: k.vc || 'var(--srd-ink)' }}>{k.v}</span>
                </div>
              </div>
            ))}
          </W>

          {/* ─── ALIGNMENT — #24 reduced bar height ─── */}
          <W title="Initiative → Theme Alignment" delay={0.25} foot={<span>% of initiatives linked to at least one strategic theme</span>}>
            {[
              { n: 'Data & AI', p: 90, c: 'var(--srd-green)', tc: 'var(--srd-green-t)' },
              { n: 'Senaie', p: 84, c: 'var(--srd-green)', tc: 'var(--srd-green-t)' },
              { n: 'Catalyst', p: 82, c: 'var(--srd-green)', tc: 'var(--srd-green-t)' },
              { n: 'Tahommona', p: 74, c: 'var(--srd-blue)', tc: 'var(--srd-blue)' },
              { n: 'MIM', p: 73, c: 'var(--srd-blue)', tc: 'var(--srd-blue)' },
              { n: 'Delivery', p: 64, c: 'var(--srd-blue)', tc: 'var(--srd-blue)' },
              { n: 'Standalone', p: 48, c: 'var(--srd-ai)', tc: 'var(--srd-ai-d)' },
            ].map((a, i) => (
              <div key={i} style={{ ...F(10), height: 32 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--srd-ink)', width: 90, textAlign: 'end', flexShrink: 0 }}>{a.n}</span>
                <div style={{ flex: 1 }}><div style={{ height: 8, background: 'var(--srd-bg-3)', borderRadius: 'var(--srd-pill)', overflow: 'hidden' }}><div style={BF_SINGLE(a.c, a.p)} /></div></div>
                <span style={{ ...M(12), fontWeight: 600, width: 36, textAlign: 'end', color: a.tc }}>{a.p}%</span>
              </div>
            ))}
          </W>

          {/* ─── INVESTMENT (empty) ─── */}
          <W title="Investment Allocation" delay={0.3} foot={<span style={{ ...M(11), color: 'var(--srd-ink-m)' }}>Pending setup</span>}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 100, gap: 6, textAlign: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--srd-bdr-s)" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8M8 14h8" /></svg>
              <span style={{ fontSize: 13, color: 'var(--srd-ink-m)', fontStyle: 'italic' }}>Investment tracking not configured</span>
              <span className={LINK} style={{ ...LINK_S, fontSize: 12 }}>Set up in Strategy Settings →</span>
            </div>
          </W>
        </div>
      </main>
    </div>
  );
}
