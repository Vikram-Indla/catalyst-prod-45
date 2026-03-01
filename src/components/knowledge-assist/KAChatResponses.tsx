import React from 'react';
import {
  BookOpen, User, Link, Sparkles, ShieldAlert,
  ThumbsUp, ThumbsDown,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Shared primitives
   ═══════════════════════════════════════════════════════════════ */

const F = {
  inter: "'Inter', -apple-system, sans-serif",
  sora: "'Sora', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

/* ── Status Lozenge (3-color guardrail) ── */
const LOZENGE_MAP: Record<string, { bg: string; color: string }> = {
  'RE-OPEN':      { bg: '#DEEBFF', color: '#0747A6' },
  'IN PROGRESS':  { bg: '#DEEBFF', color: '#0747A6' },
  'TO DO':        { bg: '#E3FCEF', color: '#006644' },
  'DEFERRED':     { bg: '#DFE1E6', color: '#253858' },
  'DONE':         { bg: '#E3FCEF', color: '#006644' },
};

function StatusLozenge({ status }: { status: string }) {
  const s = LOZENGE_MAP[status] ?? { bg: '#DFE1E6', color: '#253858' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20,
      padding: '0 6px', borderRadius: 3,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', fontFamily: F.inter,
      lineHeight: '20px', whiteSpace: 'nowrap',
    }}>{status}</span>
  );
}

/* ── Type Badge ── */
function TypeBadge({ type }: { type: string }) {
  const isPurple = type === 'Backend' || type === 'BE';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20,
      padding: '0 6px', borderRadius: 4,
      background: isPurple ? 'rgba(124,58,237,0.08)' : 'rgba(37,99,235,0.08)',
      color: isPurple ? '#7C3AED' : '#2563EB',
      fontSize: 11, fontWeight: 500, fontFamily: F.inter,
      lineHeight: '20px', whiteSpace: 'nowrap',
    }}>{type}</span>
  );
}

/* ── Ageing dot ── */
function Ageing({ text }: { text: string }) {
  // Parse to determine color: green ≤12h, amber ≤24h, red >24h
  const num = parseFloat(text);
  const unit = text.replace(/[\d.]/g, '').trim();
  let color = '#16A34A'; // green
  if (unit === 'd' || (unit === 'h' && num > 24)) color = '#DC2626';
  else if (unit === 'h' && num > 12) color = '#D97706';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontFamily: F.mono, color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>{text}</span>
    </span>
  );
}

/* ── Key Link ── */
function KeyLink({ k }: { k: string }) {
  return (
    <span
      style={{
        fontSize: 12, fontWeight: 500, color: '#2563EB', fontFamily: F.mono,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
      onMouseLeave={e => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
    >{k}</span>
  );
}

/* ── AI Response Header ── */
function ResponseHeader({ tag }: { tag?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <BookOpen size={12} strokeWidth={2} color="#FFFFFF" />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', fontFamily: F.inter }}>Knowledge Assist</span>
      {tag && (
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#16A34A',
          background: 'rgba(22,163,74,0.08)', borderRadius: 3,
          padding: '0 6px', height: 20, lineHeight: '20px',
          textTransform: 'uppercase', letterSpacing: '0.03em',
          fontFamily: F.inter,
        }}>{tag}</span>
      )}
    </div>
  );
}

/* ── Table header cell ── */
const TH: React.CSSProperties = {
  padding: '10px 12px', fontSize: 11, fontWeight: 650,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  color: '#64748B', fontFamily: F.inter, textAlign: 'left',
  background: '#F1F5F9', whiteSpace: 'nowrap',
  borderBottom: '1.5px solid rgba(15,23,42,0.12)',
};

const TD: React.CSSProperties = {
  padding: '8px 12px', fontSize: 13, color: '#0F172A',
  fontFamily: F.inter, borderBottom: '0.75px solid rgba(15,23,42,0.06)',
  maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

/* ── AI Prediction / Analysis Row ── */
function AIPredictionRow({ label, text }: { label: string; text: string }) {
  return (
    <div style={{
      padding: '12px 20px',
      background: 'linear-gradient(90deg, rgba(124,58,237,0.05), transparent)',
      borderTop: '0.75px solid rgba(124,58,237,0.1)',
      display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      <Sparkles size={16} strokeWidth={2} color="#7C3AED" style={{ flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 12, color: '#334155', margin: 0, lineHeight: 1.6, fontFamily: F.inter }}>
        <strong style={{ color: '#7C3AED', fontWeight: 650 }}>{label}:</strong>{' '}{text}
      </p>
    </div>
  );
}

/* ── Card Footer ── */
function CardFooter({ meta, confidence }: { meta: string; confidence?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', background: '#F1F5F9',
      borderTop: '0.75px solid rgba(15,23,42,0.06)',
    }}>
      <span style={{ fontSize: 11, color: '#64748B', fontFamily: F.inter }}>{meta}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {confidence && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#16A34A' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#16A34A', fontFamily: F.inter }}>{confidence}</span>
          </span>
        )}
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          <ThumbsUp size={13} strokeWidth={2} color="#94A3B8" />
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          <ThumbsDown size={13} strokeWidth={2} color="#94A3B8" />
        </button>
      </div>
    </div>
  );
}

/* ── Hoverable table row ── */
function HoverRow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <tr
      style={{ height: 36, transition: 'background 100ms', ...style }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.04)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >{children}</tr>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RESPONSE 1 — "What is Wahid working on?"
   ═══════════════════════════════════════════════════════════════ */

const WAHID_ROWS = [
  { key: 'BAU-5054', type: 'FE', title: 'My Requests missing Search & Filter', status: 'RE-OPEN', reporter: 'Vikram Indla', age: '4h' },
  { key: 'BAU-5070', type: 'FE', title: 'Individual Dashboard Issues', status: 'RE-OPEN', reporter: 'Vikram Indla', age: '4h' },
  { key: 'BAU-5073', type: 'FE', title: 'More Screen Issues', status: 'RE-OPEN', reporter: 'Vikram Indla', age: '5h' },
  { key: 'BAU-5074', type: 'FE', title: 'Notification Screen Issues', status: 'DEFERRED', reporter: 'Vikram Indla', age: '15h' },
  { key: 'BAU-5027', type: 'FE', title: 'Entity Page Issues', status: 'RE-OPEN', reporter: 'Vikram Indla', age: '17h' },
];

const WAHID_ASSOCIATED = [
  { key: 'BAU-5055', title: 'My Requests BE validation', assignee: 'Raza Bangi', status: 'IN PROGRESS', age: '3h' },
  { key: 'BAU-5056', title: 'My Requests QA regression', assignee: 'Nada Alfassam', status: 'TO DO', age: '2h' },
];

export function WahidResponse() {
  return (
    <div style={{ animation: 'ka-msg-in 200ms ease' }}>
      <ResponseHeader tag="LIVE DATA" />

      {/* Person Card */}
      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden' }}>
        {/* Person header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} strokeWidth={2} color="#2563EB" />
            <span style={{ fontSize: 14, fontWeight: 650, color: '#0F172A', fontFamily: F.sora }}>Wahid Nasri</span>
            <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.inter }}>— Mobile Developer</span>
          </div>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: F.mono }}>📁 Delivery · 100%</span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Key</th>
                <th style={TH}>Type</th>
                <th style={TH}>Title</th>
                <th style={TH}>Status</th>
                <th style={TH}>Reported By</th>
                <th style={{ ...TH, textAlign: 'right' }}>Ageing</th>
              </tr>
            </thead>
            <tbody>
              {WAHID_ROWS.map(r => (
                <HoverRow key={r.key}>
                  <td style={TD}><KeyLink k={r.key} /></td>
                  <td style={TD}><TypeBadge type={r.type} /></td>
                  <td style={TD}>{r.title}</td>
                  <td style={TD}><StatusLozenge status={r.status} /></td>
                  <td style={TD}>{r.reporter}</td>
                  <td style={{ ...TD, textAlign: 'right' }}><Ageing text={r.age} /></td>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Prediction */}
        <AIPredictionRow
          label="AI Prediction"
          text="BAU-5074 (15h deferred) at risk of SLA breach. BAU-5027 ageing past 17h — consider re-prioritizing in next sprint."
        />

        {/* Footer */}
        <CardFooter meta="Showing 5 of 20 · Last 2 weeks · Mar 1, 2026" confidence="High confidence" />
      </div>

      {/* Associated Items Card */}
      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden', marginTop: 4 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <Link size={14} strokeWidth={2} color="#64748B" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', fontFamily: F.inter }}>Associated Items (Same Parent)</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18, borderRadius: 9999,
            background: '#2563EB', color: '#FFFFFF',
            fontSize: 11, fontWeight: 700, fontFamily: F.inter,
            padding: '0 5px',
          }}>2</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Key</th>
              <th style={TH}>Title</th>
              <th style={TH}>Assignee</th>
              <th style={TH}>Status</th>
              <th style={{ ...TH, textAlign: 'right' }}>Ageing</th>
            </tr>
          </thead>
          <tbody>
            {WAHID_ASSOCIATED.map(r => (
              <HoverRow key={r.key}>
                <td style={TD}><KeyLink k={r.key} /></td>
                <td style={TD}>{r.title}</td>
                <td style={TD}>{r.assignee}</td>
                <td style={TD}><StatusLozenge status={r.status} /></td>
                <td style={{ ...TD, textAlign: 'right' }}><Ageing text={r.age} /></td>
              </HoverRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   RESPONSE 2 — "What items are blocked?"
   ═══════════════════════════════════════════════════════════════ */

const BLOCKED_ROWS = [
  { key: 'SIMP-3172', title: 'Restricted Chemical Imports Permit', reason: 'Accessibility <100', assignee: 'Nada Alfassam', age: '2d' },
  { key: 'SIMP-3166', title: 'Restricted Chemical Imports Permit', reason: 'Accessibility <100', assignee: 'Nada Alfassam', age: '2d' },
  { key: 'SIMP-3245', title: 'Landing Page — Program & Incentives', reason: 'Card color mismatch', assignee: 'Nada Alfassam', age: '5d' },
  { key: 'SIMP-3133', title: 'Usage and Disclaimer', reason: 'Accessibility <100', assignee: 'Nada Alfassam', age: '3d' },
  { key: 'SIMP-3128', title: 'Usage and Disclaimer', reason: 'Accessibility <100', assignee: 'Nada Alfassam', age: '3d' },
];

export function BlockedResponse() {
  return (
    <div style={{ animation: 'ka-msg-in 200ms ease' }}>
      <ResponseHeader tag="LIVE DATA" />

      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <ShieldAlert size={16} strokeWidth={2} color="#DC2626" />
          <span style={{ fontSize: 14, fontWeight: 650, color: '#DC2626', fontFamily: F.sora }}>Blocked Items</span>
          <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.mono }}>10 total</span>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Key</th>
              <th style={TH}>Title</th>
              <th style={TH}>Reason</th>
              <th style={TH}>Assignee</th>
              <th style={{ ...TH, textAlign: 'right' }}>Ageing</th>
            </tr>
          </thead>
          <tbody>
            {BLOCKED_ROWS.map(r => (
              <HoverRow key={r.key}>
                <td style={TD}><KeyLink k={r.key} /></td>
                <td style={TD}>{r.title}</td>
                <td style={{ ...TD, fontSize: 11, color: '#64748B' }}>{r.reason}</td>
                <td style={TD}>{r.assignee}</td>
                <td style={{ ...TD, textAlign: 'right' }}><Ageing text={r.age} /></td>
              </HoverRow>
            ))}
          </tbody>
        </table>

        {/* AI Analysis */}
        <AIPredictionRow
          label="AI Analysis"
          text="70% of blocked items share the same root cause (Accessibility score <100) assigned to Nada. Recommend batch resolution — single accessibility audit pass could unblock 7 of 10 items."
        />

        {/* Footer */}
        <CardFooter meta="5 of 10 · Ask 'Show all blocked' for full list" confidence="High confidence" />
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   RESPONSE 3 — "Status of BAU-5069"
   ═══════════════════════════════════════════════════════════════ */

export function StatusResponse() {
  const fields = [
    { label: 'Title', value: 'Integration Enhancements' },
    { label: 'Status', value: <StatusLozenge status="IN PROGRESS" /> },
    { label: 'Priority', value: 'Medium' },
    { label: 'Type', value: <TypeBadge type="Backend" /> },
    { label: 'Project', value: 'Senaei BAU' },
    { label: 'Assignee', value: <span style={{ fontWeight: 500 }}>Muhammad Raza Bangi</span> },
    { label: 'Reporter', value: 'Vikram Indla' },
    { label: 'Created', value: <span style={{ fontFamily: F.mono, fontSize: 12 }}>2/26/2026</span> },
    { label: 'Updated', value: <span style={{ fontFamily: F.mono, fontSize: 12 }}>3/1/2026</span> },
  ];

  return (
    <div style={{ animation: 'ka-msg-in 200ms ease' }}>
      <ResponseHeader tag="LIVE DATA" />

      {/* Detail Card */}
      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#2563EB', fontFamily: F.mono }}>BAU-5069</span>
          <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.inter }}>— Iron & Cement Product License</span>
        </div>

        {/* Detail Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '100px 1fr',
          gap: '4px 16px', padding: 20,
        }}>
          {fields.map((f, i) => (
            <React.Fragment key={i}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#334155', fontFamily: F.inter }}>{f.label}</span>
              <span style={{ fontSize: 13, fontWeight: 400, color: '#0F172A', fontFamily: F.inter }}>{f.value}</span>
            </React.Fragment>
          ))}
        </div>

        {/* Footer */}
        <CardFooter meta="Last synced: Mar 1, 2026" confidence="High confidence" />
      </div>

      {/* Linked Items */}
      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden', marginTop: 4 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <Link size={14} strokeWidth={2} color="#64748B" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', fontFamily: F.inter }}>Linked Under Parent</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18, borderRadius: 9999,
            background: '#2563EB', color: '#FFFFFF',
            fontSize: 11, fontWeight: 700, fontFamily: F.inter,
            padding: '0 5px',
          }}>1</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Key</th>
              <th style={TH}>Title</th>
              <th style={TH}>Assignee</th>
              <th style={TH}>Status</th>
            </tr>
          </thead>
          <tbody>
            <HoverRow>
              <td style={TD}><KeyLink k="BAU-5070" /></td>
              <td style={TD}>Integration UI Enhancements</td>
              <td style={TD}>Wahid Nasri</td>
              <td style={TD}><StatusLozenge status="RE-OPEN" /></td>
            </HoverRow>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Matcher — maps question text → mock response component
   ═══════════════════════════════════════════════════════════════ */

export function matchMockResponse(question: string): React.ReactNode | null {
  const q = question.toLowerCase();
  if (q.includes('wahid')) return <WahidResponse />;
  if (q.includes('blocked')) return <BlockedResponse />;
  if (q.includes('bau-5069') || q.includes('status of')) return <StatusResponse />;
  return null;
}
