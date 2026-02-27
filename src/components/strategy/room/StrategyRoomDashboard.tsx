/**
 * Chunk 1 — Strategy Room Dashboard
 * Scope: [data-srd] — ring-fenced --srd-* tokens, zero global leak
 * Job: "Where do things stand RIGHT NOW?" — pure status cockpit
 */

import { useState } from 'react';

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
`;

/* ─── helpers ─── */
const S = (sz: number, wt = 700): React.CSSProperties => ({ fontFamily: "'Sora',sans-serif", fontSize: sz, fontWeight: wt });
const M = (sz = 11): React.CSSProperties => ({ fontFamily: "'JetBrains Mono',monospace", fontSize: sz });
const F = (g = 8): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: g });
const D = (c: string, s = 8): React.CSSProperties => ({ width: s, height: s, borderRadius: '50%', background: c, flexShrink: 0 });
const P = (bg: string, c: string): React.CSSProperties => ({ ...M(11), fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--srd-pill)', background: bg, color: c, whiteSpace: 'nowrap' });
const DT = (t: string): React.CSSProperties => ({ ...M(11), fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--srd-pill)', marginInlineStart: 4, background: t === 'up' ? 'var(--srd-green-bg)' : t === 'down' ? 'var(--srd-red-bg)' : 'var(--srd-bg-3)', color: t === 'up' ? 'var(--srd-green-t)' : t === 'down' ? 'var(--srd-red-t)' : 'var(--srd-ink-m)' });
const BT = (h = 6): React.CSSProperties => ({ height: h, background: 'var(--srd-bg-3)', borderRadius: 'var(--srd-pill)', overflow: 'hidden' });
const BF = (c: string, p: number): React.CSSProperties => ({ height: '100%', width: `${p}%`, background: c, borderRadius: 'var(--srd-pill)', transition: 'width .8s' });
const SECT: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--srd-ink-m)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '14px 0 6px' };
const LINK: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--srd-blue)', cursor: 'pointer' };

/* ─── atoms ─── */
function Btn({ children, primary, onClick }: { children: React.ReactNode; primary?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ height: 32, padding: '0 14px', fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: primary ? 600 : 500, borderRadius: 'var(--srd-r2)', cursor: 'pointer', ...F(6), border: `1px solid ${primary ? 'var(--srd-blue)' : 'var(--srd-bdr)'}`, background: primary ? 'var(--srd-blue)' : 'var(--srd-bg)', color: primary ? '#fff' : 'var(--srd-ink-3)', transition: 'all .15s' }}>
      {children}
    </button>
  );
}

function Ico({ d, sz = 14 }: { d: string; sz?: number }) {
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

function W({ title, link, foot, children }: { title: string; link?: string; foot?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--srd-bdr)', borderRadius: 'var(--srd-r4)', background: 'var(--srd-bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...F(8), justifyContent: 'space-between', padding: '14px 20px 10px' }}>
        <span style={{ ...S(13), color: 'var(--srd-ink)' }}>{title}</span>
        {link && <span style={LINK}>{link}</span>}
      </div>
      <div style={{ padding: '0 20px 16px', flex: 1 }}>{children}</div>
      {foot && <div style={{ borderTop: '1px solid var(--srd-bdr)', padding: '10px 20px', ...F(12), fontSize: 11, color: 'var(--srd-ink-m)' }}>{foot}</div>}
    </div>
  );
}

function Row({ name, pct, ct, tag, util, uc, c = 'var(--srd-blue)' }: { name: string; pct: number; ct: number; tag?: string; util?: string; uc?: string; c?: string }) {
  return (
    <div style={{ ...F(8), height: 30 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--srd-ink)', width: 100, flexShrink: 0 }}>{name}</span>
      <div style={{ flex: 1 }}><div style={BT()}><div style={BF(c, pct)} /></div></div>
      {util && <span style={{ ...M(10), fontWeight: 600, width: 34, textAlign: 'end', color: uc }}>{util}</span>}
      <span style={{ ...M(11), fontWeight: 600, color: 'var(--srd-ink-2)', width: 28, textAlign: 'end' }}>{ct}</span>
      {tag && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--srd-pill)', background: 'var(--srd-red-bg)', color: 'var(--srd-red-t)' }}>{tag}</span>}
    </div>
  );
}

function Leg({ items }: { items: { c: string; t: string }[] }) {
  return (
    <div style={{ ...F(12), flexWrap: 'wrap', marginTop: 8 }}>
      {items.map((l, i) => <span key={i} style={{ ...F(5), fontSize: 11, color: 'var(--srd-ink-m)' }}><span style={D(l.c, 6)} />{l.t}</span>)}
    </div>
  );
}

/* ─── data ─── */
const THEMES = [
  { n: 'Digital Transformation', s: 'On Track', c: 'var(--srd-green)', bg: 'var(--srd-green-bg)', tc: 'var(--srd-green-t)' },
  { n: 'Workforce Development', s: 'Off Track', c: 'var(--srd-red)', bg: 'var(--srd-red-bg)', tc: 'var(--srd-red-t)' },
  { n: 'Supply Chain Excellence', s: 'On Track', c: 'var(--srd-green)', bg: 'var(--srd-green-bg)', tc: 'var(--srd-green-t)' },
  { n: 'Sustainability & ESG', s: 'At Risk', c: 'var(--srd-ai)', bg: 'var(--srd-ai-bg)', tc: 'var(--srd-ai-d)' },
  { n: 'Innovation & R&D Hub', s: 'At Risk', c: 'var(--srd-ai)', bg: 'var(--srd-ai-bg)', tc: 'var(--srd-ai-d)' },
  { n: 'Regulatory Modernization', s: 'On Track', c: 'var(--srd-green)', bg: 'var(--srd-green-bg)', tc: 'var(--srd-green-t)' },
];

export default function StrategyRoomDashboard({ onOpenBrief, onDownloadBrief }: StrategyRoomDashboardProps) {
  return (
    <div data-srd style={{ maxWidth: 1440, margin: '0 auto', background: 'var(--srd-bg)', minHeight: '100vh' }}>
      <style>{TOKENS}</style>

      {/* HEADER */}
      <header style={{ padding: '20px 32px 14px', borderBottom: '1px solid var(--srd-bdr)', ...F(8), justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontSize: 13, color: 'var(--srd-ink-m)' }}>Good morning, <b style={{ color: 'var(--srd-ink-3)', fontWeight: 600 }}>Dr. Abdullah</b></div>
          <h1 style={{ ...S(22), color: 'var(--srd-ink)', letterSpacing: '-0.025em', margin: 0 }}>Strategy Room</h1>
          <div style={{ ...F(12), marginTop: 2 }}>
            <span style={{ ...M(11), color: 'var(--srd-ink-m)', ...F(5) }}><span style={{ ...D('var(--srd-green)', 6), animation: 'srd-pulse 2s infinite' }} />Live · Updated 12 min ago</span>
            <span style={{ ...M(11), color: 'var(--srd-ink-m)' }}>FY 2026 · Q1</span>
          </div>
        </div>
        <div style={F(8)}>
          <Btn primary onClick={onOpenBrief}><Ico d="M13 2L3 14h9l-1 8 10-12h-9l1-8" />AI Intelligence</Btn>
        </div>
      </header>

      {/* VISION STRIP */}
      <div style={{ padding: '8px 32px', background: 'var(--srd-blue-bg)', borderBottom: '1px solid rgba(37,99,235,.08)', ...F(12), fontSize: 13 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--srd-blue)', textTransform: 'uppercase', letterSpacing: '.08em', background: 'rgba(37,99,235,.08)', padding: '3px 8px', borderRadius: 'var(--srd-r)' }}>Vision 2030</span>
        <span style={{ fontWeight: 500, color: 'var(--srd-ink-2)', flex: 1 }}>Transforming the Kingdom into a leading global industrial powerhouse and logistics hub</span>
        <span style={{ ...M(11), color: 'var(--srd-blue)', background: 'rgba(37,99,235,.08)', padding: '2px 8px', borderRadius: 'var(--srd-pill)' }}>Target 2030</span>
      </div>

      {/* INTELLIGENCE BANNER */}
      <div onClick={onOpenBrief} style={{ margin: '20px 32px 0', border: '1px solid var(--srd-blue-bdr)', borderRadius: 'var(--srd-r4)', padding: '14px 20px', ...F(16), background: 'var(--srd-blue-bg)', cursor: 'pointer' }}>
        <div style={{ ...S(18, 800), width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--srd-red-bg)', color: 'var(--srd-red-t)', border: '2px solid var(--srd-red)' }}>D-</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...S(14), color: 'var(--srd-ink)' }}>AI Brief Available — 2 decisions require your attention</div>
          <div style={{ fontSize: 12, color: 'var(--srd-ink-m)', marginTop: 2 }}>Published Feb 20, 2026 · Score 47/100 · Next review: Mar 1</div>
        </div>
        <div style={F(8)}>
          <span style={P('var(--srd-red-bg)', 'var(--srd-red-t)')}>2 decisions</span>
          <span style={P('var(--srd-ai-bg)', 'var(--srd-ai-d)')}>3 data issues</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--srd-blue)', whiteSpace: 'nowrap' }}>Open Full Brief →</span>
      </div>

      {/* THEME HEALTH STRIP */}
      <div style={{ margin: '16px 32px 0', ...F(8), flexWrap: 'wrap' }}>
        {THEMES.map((t, i) => (
          <div key={i} style={{ ...F(6), padding: '6px 14px', border: '1px solid var(--srd-bdr)', borderRadius: 'var(--srd-pill)', fontSize: 12, fontWeight: 500, color: 'var(--srd-ink)', cursor: 'pointer', background: 'var(--srd-bg)' }}>
            <span style={D(t.c)} />{t.n}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--srd-pill)', background: t.bg, color: t.tc }}>{t.s}</span>
          </div>
        ))}
      </div>

      {/* DASHBOARD */}
      <main style={{ padding: '20px 32px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ROW 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* BUDGET */}
          <W title="Budget Position" link="Full Planner →" foot={<><span style={{ ...F(5) }}><span style={D('var(--srd-red)', 6)} />43 missing costs</span><span style={{ ...M(10), color: 'var(--srd-ink-m)', marginInlineStart: 'auto' }}>2h ago</span></>}>
            <div style={F(6)}><span style={{ ...S(26, 800), color: 'var(--srd-ink)' }}>SAR 11.8M</span><span style={DT('up')}>↑ 4% vs FY25</span></div>
            <div style={{ fontSize: 12, color: 'var(--srd-ink-m)', marginTop: 2 }}>Annual budget · FY 2026 · <b style={{ color: 'var(--srd-ink-3)' }}>43% data confidence</b></div>
            <div style={{ display: 'flex', height: 8, borderRadius: 'var(--srd-pill)', overflow: 'hidden', marginTop: 12 }}>
              <div style={{ width: '73%', background: 'var(--srd-blue)' }} /><div style={{ width: '20%', background: 'var(--srd-teal)' }} /><div style={{ width: '5%', background: 'var(--srd-ai)' }} /><div style={{ width: '2%', background: 'var(--srd-purple)' }} />
            </div>
            <Leg items={[{ c: 'var(--srd-blue)', t: 'In-house 8.6M' }, { c: 'var(--srd-teal)', t: 'Outsourced 2.3M' }, { c: 'var(--srd-ai)', t: 'Co-sourced 598K' }, { c: 'var(--srd-purple)', t: 'Licenses 312K' }]} />
            <div style={SECT}>By Department</div>
            {[{ name: 'Delivery', pct: 45, ct: 34 }, { name: 'Product', pct: 25, ct: 19 }, { name: 'Operations', pct: 16, ct: 12 }, { name: 'Tech Support', pct: 9, ct: 7, tag: 'No cost assigned' }, { name: 'Governance', pct: 5, ct: 4, tag: 'No cost assigned' }].map((d, i) => <Row key={i} {...d} />)}
          </W>

          {/* WORKFORCE */}
          <W title="Workforce" link="Details →" foot={<><span style={{ ...F(5) }}><span style={D('var(--srd-ink-m)', 6)} />Thiqah (gov't staffing): 32%</span><span style={{ ...M(10), color: 'var(--srd-ink-m)', marginInlineStart: 'auto' }}>2h ago</span></>}>
            <div style={F(6)}><span style={{ ...S(26, 800), color: 'var(--srd-ink)' }}>76</span><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--srd-ink-m)' }}>team members</span><span style={DT('up')}>↑ 3 this month</span></div>
            <div style={{ fontSize: 12, color: 'var(--srd-ink-m)', marginTop: 2 }}>5 departments · 7 vendors · <b style={{ color: 'var(--srd-ink-3)' }}>99% avg utilization</b></div>
            <div style={{ ...F(12), marginTop: 8 }}>
              {[{ c: 'var(--srd-blue)', n: 7, l: 'Full-time' }, { c: 'var(--srd-teal)', n: 59, l: 'Vendor' }, { c: 'var(--srd-purple)', n: 5, l: 'Freelance' }].map((x, i) => (
                <span key={i} style={{ ...F(5), fontSize: 12, color: 'var(--srd-ink-m)' }}><span style={D(x.c, 6)} /><b style={{ color: 'var(--srd-ink-2)' }}>{x.n}</b> {x.l}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {[{ v: 0, l: 'Unassigned' }, { v: 1, l: 'Under-utilized' }, { v: 5, l: 'Committed' }, { v: 70, l: 'Over-allocated', d: true }].map((b, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', border: `1px solid ${b.d ? 'var(--srd-red-bg)' : 'var(--srd-bdr)'}`, borderRadius: 'var(--srd-r2)', padding: '8px 4px', background: b.d ? 'var(--srd-red-bg)' : 'var(--srd-bg)' }}>
                  <div style={{ ...S(18), color: b.d ? 'var(--srd-red-t)' : 'var(--srd-ink)' }}>{b.v}</div>
                  <div style={{ fontSize: 10, color: b.d ? 'var(--srd-red-t)' : 'var(--srd-ink-m)', marginTop: 1 }}>{b.l}</div>
                </div>
              ))}
            </div>
            <div style={SECT}>By Department</div>
            {[{ name: 'Delivery', pct: 100, ct: 34, util: '100%', uc: 'var(--srd-green-t)' }, { name: 'Product', pct: 100, ct: 19, util: '100%', uc: 'var(--srd-green-t)' }, { name: 'Operations', pct: 100, ct: 12, util: '100%', uc: 'var(--srd-green-t)' }, { name: 'Governance', pct: 81, ct: 4, util: '81%', uc: 'var(--srd-ai)' }].map((d, i) => <Row key={i} {...d} />)}
          </W>

          {/* CONTRACTS */}
          <W title="Contract Status" link="All Contracts →" foot={<><span style={{ fontSize: 11, color: 'var(--srd-ai-d)' }}>⚡ Top source: Internal staffing — 48 resources (63%)</span><span style={{ ...M(10), color: 'var(--srd-ink-m)', marginInlineStart: 'auto' }}>2h ago</span></>}>
            <div style={{ display: 'flex', gap: 2 }}>
              {[{ n: 3, l: 'Expired', c: 'var(--srd-red)', tc: 'var(--srd-red-t)' }, { n: 8, l: '≤3 Months', c: 'var(--srd-ai)', tc: 'var(--srd-ai-d)' }, { n: 24, l: '3–6 Months', c: 'var(--srd-blue)', tc: 'var(--srd-blue)' }, { n: 41, l: '>6 Months', c: 'var(--srd-green)', tc: 'var(--srd-green-t)' }].map((b, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 4px 8px', borderBottom: `2px solid ${b.c}`, borderRadius: 'var(--srd-r) var(--srd-r) 0 0', background: 'var(--srd-bg-2)' }}>
                  <div style={{ ...S(22, 800), color: b.tc }}>{b.n}</div>
                  <div style={{ fontSize: 10, color: 'var(--srd-ink-m)', textTransform: 'uppercase', marginTop: 2, fontWeight: 600 }}>{b.l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--srd-ink-m)', textAlign: 'center', margin: '4px 0 10px' }}>76 total contracts across 5 departments</div>
            <div style={{ display: 'flex', height: 8, borderRadius: 'var(--srd-pill)', overflow: 'hidden' }}>
              <div style={{ width: '4%', background: 'var(--srd-red)' }} /><div style={{ width: '10%', background: 'var(--srd-ai)' }} /><div style={{ width: '32%', background: 'var(--srd-blue)' }} /><div style={{ width: '54%', background: 'var(--srd-green)' }} />
            </div>
            <div style={SECT}>Expiring Soonest</div>
            {[{ n: 'Abdulrahman AlRajhi', d: 'Technical Support', dt: 'Mar 29' }, { n: 'Mahmoud Gameel', d: 'Delivery', dt: 'Mar 29' }, { n: 'Abdulrahman Alghizzy', d: 'Product', dt: 'Mar 29' }].map((e, i) => (
              <div key={i} style={{ ...F(8), height: 30, fontSize: 12 }}>
                <span style={D('var(--srd-red)', 6)} /><span style={{ fontWeight: 600, color: 'var(--srd-ink)', flex: 1 }}>{e.n}</span>
                <span style={{ color: 'var(--srd-ink-m)', width: 110, flexShrink: 0 }}>{e.d}</span>
                <span style={{ ...M(12), color: 'var(--srd-red-t)', fontWeight: 600 }}>{e.dt}</span>
              </div>
            ))}
            <span style={{ ...LINK, display: 'block', marginTop: 6, fontSize: 12 }}>+8 more within 3 months →</span>
          </W>
        </div>

        {/* ROW 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* EXECUTION */}
          <W title="Execution Snapshot" foot={<span>73 initiatives not connected to any strategic theme</span>}>
            {[
              { l: 'Total Work Items', v: '295', d: '↑ 12', dt: 'up' },
              { l: 'Active Workstreams', v: '7', d: '→ 0', dt: 'flat' },
              { l: 'Avg. Alignment', v: '74%', d: '↓ 3%', dt: 'down', t: 'target 85%', vc: 'var(--srd-ai)' },
              { l: 'Goals At Risk', v: '4', d: '↑ 1', dt: 'down', vc: 'var(--srd-ai)' },
              { l: 'Unlinked Initiatives', v: '73', t: 'of 295', vc: 'var(--srd-red-t)' },
            ].map((k, i) => (
              <div key={i} style={{ ...F(8), justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--srd-bdr)' : 'none' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--srd-ink)' }}>{k.l}</span>
                <div style={F(8)}>
                  {k.t && <span style={{ ...M(10), color: 'var(--srd-ink-m)' }}>{k.t}</span>}
                  {k.d && <span style={DT(k.dt)}>{k.d}</span>}
                  <span style={{ ...S(16), color: k.vc || 'var(--srd-ink)' }}>{k.v}</span>
                </div>
              </div>
            ))}
          </W>

          {/* ALIGNMENT */}
          <W title="Initiative → Theme Alignment" foot={<span>% of initiatives linked to at least one strategic theme</span>}>
            {[
              { n: 'Data & AI', p: 90, c: 'var(--srd-green)', tc: 'var(--srd-green-t)' },
              { n: 'Senaie', p: 84, c: 'var(--srd-green)', tc: 'var(--srd-green-t)' },
              { n: 'Catalyst', p: 82, c: 'var(--srd-green)', tc: 'var(--srd-green-t)' },
              { n: 'Tahommona', p: 74, c: 'var(--srd-blue)', tc: 'var(--srd-blue)' },
              { n: 'MIM', p: 73, c: 'var(--srd-blue)', tc: 'var(--srd-blue)' },
              { n: 'Delivery', p: 64, c: 'var(--srd-blue)', tc: 'var(--srd-blue)' },
              { n: 'Standalone', p: 48, c: 'var(--srd-ai)', tc: 'var(--srd-ai-d)' },
            ].map((a, i) => (
              <div key={i} style={{ ...F(10), height: 34 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--srd-ink)', width: 100, textAlign: 'end', flexShrink: 0 }}>{a.n}</span>
                <div style={{ flex: 1 }}><div style={BT(8)}><div style={BF(a.c, a.p)} /></div></div>
                <span style={{ ...M(12), fontWeight: 600, width: 36, textAlign: 'end', color: a.tc }}>{a.p}%</span>
              </div>
            ))}
          </W>

          {/* INVESTMENT (empty) */}
          <W title="Investment Allocation" foot={<span style={{ ...M(10), color: 'var(--srd-ink-m)' }}>Pending setup</span>}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 100, gap: 6, textAlign: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--srd-bdr-s)" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8M8 14h8" /></svg>
              <span style={{ fontSize: 13, color: 'var(--srd-ink-m)', fontStyle: 'italic' }}>Investment tracking not configured</span>
              <span style={{ fontSize: 12, color: 'var(--srd-blue)', fontWeight: 600, cursor: 'pointer' }}>Set up in Strategy Settings →</span>
            </div>
          </W>
        </div>
      </main>
    </div>
  );
}
