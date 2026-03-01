import React from 'react';
import {
  BookOpen, User, Users, Link, Sparkles, ShieldAlert, ClipboardList, Clock,
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
  'RE-OPEN':       { bg: '#DEEBFF', color: '#0747A6' },
  'IN PROGRESS':   { bg: '#DEEBFF', color: '#0747A6' },
  'TO DO':         { bg: '#E3FCEF', color: '#006644' },
  'DEFERRED':      { bg: '#DFE1E6', color: '#253858' },
  'DONE':          { bg: '#E3FCEF', color: '#006644' },
  'AT CAPACITY':   { bg: '#DFE1E6', color: '#253858' },
  'AVAILABLE':     { bg: '#E3FCEF', color: '#006644' },
  'BLOCKED':       { bg: '#DEEBFF', color: '#0747A6' },
  'CRITICAL':      { bg: '#DFE1E6', color: '#253858' },
  'HIGH':          { bg: '#DFE1E6', color: '#253858' },
  'MEDIUM':        { bg: '#DFE1E6', color: '#253858' },
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
  const num = parseFloat(text);
  const unit = text.replace(/[\d.]/g, '').trim();
  let color = '#16A34A'; // green ≤12h
  if (unit === 'd') {
    color = num > 3 ? '#DC2626' : '#D97706';
  } else if (unit === 'h' && num > 12) {
    color = '#D97706';
  }
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
        <BookOpen size={12} strokeWidth={2} color="#FFFFFF" aria-hidden="true" />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', fontFamily: F.inter }}>Knowledge Assist</span>
      {tag && (
        <span
          role="status"
          aria-live="polite"
          style={{
            fontSize: 11, fontWeight: 700, color: '#16A34A',
            background: 'rgba(22,163,74,0.08)', borderRadius: 3,
            padding: '0 6px', height: 20, lineHeight: '20px',
            textTransform: 'uppercase', letterSpacing: '0.03em',
            fontFamily: F.inter,
          }}
        >{tag}</span>
      )}
    </div>
  );
}

/* ── AI badge (purple pill) ── */
function AIBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 9, fontWeight: 700, color: '#7C3AED',
      background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)',
      borderRadius: 9999, padding: '1px 6px', lineHeight: '14px',
      fontFamily: F.inter,
    }}>
      <Sparkles size={8} strokeWidth={2} color="#7C3AED" />
      AI
    </span>
  );
}

/* ── Table header & cell styles ── */
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
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

// Column widths
const W_KEY = { width: 100, minWidth: 100 };
const W_TYPE = { width: 50, minWidth: 50 };
const W_STATUS = { width: 110, minWidth: 110 };
const W_REPORTER = { width: 110, minWidth: 110 };
const W_AGE = { width: 70, minWidth: 70, textAlign: 'right' as const };
const W_TITLE = { maxWidth: 999 }; // flex — no max constraint

/* ── AI Prediction / Analysis Row ── */
function AIPredictionRow({ label, text }: { label: string; text: string }) {
  return (
    <div style={{
      padding: '12px 20px',
      background: 'linear-gradient(90deg, rgba(124,58,237,0.05), transparent)',
      borderTop: '0.75px solid rgba(124,58,237,0.1)',
      display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      <Sparkles size={16} strokeWidth={2} color="#7C3AED" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
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
            <span style={{ fontSize: 11, fontWeight: 500, color: '#0D7331', fontFamily: F.inter }}>{confidence}</span>
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
      style={{ height: 36, transition: 'background 80ms', ...style }}
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

      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} strokeWidth={2} color="#2563EB" aria-hidden="true" />
            <span style={{ fontSize: 14, fontWeight: 650, color: '#0F172A', fontFamily: F.sora }}>Wahid Nasri</span>
            <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.inter }}>— Mobile Developer</span>
          </div>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: F.mono }}>📁 Delivery · 100%</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <caption className="ka-sr-only">Wahid Nasri's work items</caption>
            <colgroup>
              <col style={{ width: 100 }} />
              <col style={{ width: 50 }} />
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 70 }} />
            </colgroup>
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
                  <td style={{ ...TD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                  <td style={TD}><StatusLozenge status={r.status} /></td>
                  <td style={TD}>{r.reporter}</td>
                  <td style={{ ...TD, textAlign: 'right' }}><Ageing text={r.age} /></td>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </div>

        <AIPredictionRow
          label="AI Prediction"
          text="BAU-5074 (15h deferred) at risk of SLA breach. BAU-5027 ageing past 17h — consider re-prioritizing in next sprint."
        />
        <CardFooter meta="Showing 5 of 20 · Last 2 weeks · Mar 1, 2026" confidence="High confidence" />
      </div>

      {/* Associated Items */}
      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden', marginTop: 4 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <Link size={14} strokeWidth={2} color="#64748B" aria-hidden="true" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', fontFamily: F.inter }}>Associated Items (Same Parent)</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18, borderRadius: 9999,
            background: '#2563EB', color: '#FFFFFF',
            fontSize: 11, fontWeight: 700, fontFamily: F.inter, padding: '0 5px',
          }}>2</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <caption className="ka-sr-only">Associated items under same parent</caption>
          <colgroup>
            <col style={{ width: 100 }} />
            <col />
            <col style={{ width: 110 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 70 }} />
          </colgroup>
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
                <td style={{ ...TD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
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
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <ShieldAlert size={16} strokeWidth={2} color="#DC2626" aria-hidden="true" />
          <span style={{ fontSize: 14, fontWeight: 650, color: '#DC2626', fontFamily: F.sora }}>Blocked Items</span>
          <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.mono }}>10 total</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <caption className="ka-sr-only">Blocked work items</caption>
          <colgroup>
            <col style={{ width: 100 }} />
            <col />
            <col style={{ width: 120 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 70 }} />
          </colgroup>
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
                <td style={{ ...TD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                <td style={{ ...TD, fontSize: 11, color: '#64748B' }}>{r.reason}</td>
                <td style={TD}>{r.assignee}</td>
                <td style={{ ...TD, textAlign: 'right' }}><Ageing text={r.age} /></td>
              </HoverRow>
            ))}
          </tbody>
        </table>

        <AIPredictionRow
          label="AI Analysis"
          text="70% of blocked items share the same root cause (Accessibility score <100) assigned to Nada. Recommend batch resolution — single accessibility audit pass could unblock 7 of 10 items."
        />
        <CardFooter meta="5 of 10 · Ask 'Show all blocked' for full list" confidence="High confidence" />
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   RESPONSE 3 — "What are Vikram's open items?"
   ═══════════════════════════════════════════════════════════════ */

const VIKRAM_ROWS = [
  { key: 'BAU-5069', type: 'FE', title: 'Iron & cement Product License - Integration Enhancements', status: 'IN PROGRESS', project: 'Senaei BAU', age: '10h' },
  { key: 'BAU-5076', type: 'FE', title: 'tests', status: 'BACKLOG', project: 'Senaei BAU', age: '1d' },
  { key: 'BAU-5075', type: 'FE', title: 'test', status: 'IN REQUIREMENTS', project: 'Senaei BAU', age: '1d' },
  { key: 'BAU-5067', type: 'FE', title: 'Know your Journey - Public Interactive Journey (FE + API)', status: 'BACKLOG', project: 'Senaei BAU', age: '2d' },
  { key: 'BAU-5066', type: 'FE', title: 'Know your Journey - Public Interactive Journey (FE + API)', status: 'BACKLOG', project: 'Senaei BAU', age: '2d' },
];

export function VikramResponse() {
  return (
    <div style={{ animation: 'ka-msg-in 200ms ease' }}>
      <ResponseHeader tag="LIVE DATA" />

      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={16} strokeWidth={2} color="#2563EB" aria-hidden="true" />
            <span style={{ fontSize: 14, fontWeight: 650, color: '#0F172A', fontFamily: F.sora }}>Vikram Indla</span>
            <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.inter }}>— Delivery Manager</span>
          </div>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: F.mono }}>📁 Delivery · 20 items</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <caption className="ka-sr-only">Vikram Indla's open items</caption>
            <colgroup>
              <col style={{ width: 100 }} />
              <col style={{ width: 50 }} />
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 70 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={TH}>Key</th>
                <th style={TH}>Type</th>
                <th style={TH}>Title</th>
                <th style={TH}>Status</th>
                <th style={TH}>Project</th>
                <th style={{ ...TH, textAlign: 'right' }}>Ageing</th>
              </tr>
            </thead>
            <tbody>
              {VIKRAM_ROWS.map(r => (
                <HoverRow key={r.key}>
                  <td style={TD}><KeyLink k={r.key} /></td>
                  <td style={TD}><TypeBadge type={r.type} /></td>
                  <td style={{ ...TD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                  <td style={TD}><StatusLozenge status={r.status} /></td>
                  <td style={{ ...TD, fontSize: 12 }}>{r.project}</td>
                  <td style={{ ...TD, textAlign: 'right' }}><Ageing text={r.age} /></td>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </div>

        <AIPredictionRow
          label="AI Prediction"
          text="Vikram has 8 assigned and 12 reported items. BAU-5069 (Integration Enhancements) is actively in progress. Multiple Know your Journey items in Backlog — consider prioritizing sprint planning."
        />
        <CardFooter meta="Showing 5 of 20 · Mar 1, 2026" confidence="High confidence" />
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   RESPONSE 4 — "SLA breach predictions"
   ═══════════════════════════════════════════════════════════════ */

const SLA_ROWS = [
  { key: 'BAU-5074', title: 'Notification Screen Issues', assignee: 'Wahid Nasri', age: '15h', risk: 'HIGH' },
  { key: 'SIMP-3245', title: 'Landing Page — Program & Incentives', assignee: 'Nada Alfassam', age: '5d', risk: 'CRITICAL' },
  { key: 'BAU-5027', title: 'Entity Page Issues', assignee: 'Wahid Nasri', age: '17h', risk: 'MEDIUM' },
];

export function SLAResponse() {
  return (
    <div style={{ animation: 'ka-msg-in 200ms ease' }}>
      <ResponseHeader tag="LIVE DATA" />

      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <Clock size={16} strokeWidth={2} color="#D97706" aria-hidden="true" />
          <span style={{ fontSize: 14, fontWeight: 650, color: '#0F172A', fontFamily: F.sora }}>SLA Risk Analysis</span>
          <AIBadge />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <caption className="ka-sr-only">SLA breach predictions</caption>
            <colgroup>
              <col style={{ width: 100 }} />
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 70 }} />
              <col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={TH}>Key</th>
                <th style={TH}>Title</th>
                <th style={TH}>Assignee</th>
                <th style={{ ...TH, textAlign: 'right' }}>Ageing</th>
                <th style={TH}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {SLA_ROWS.map(r => (
                <HoverRow key={r.key}>
                  <td style={TD}><KeyLink k={r.key} /></td>
                  <td style={{ ...TD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                  <td style={TD}>{r.assignee}</td>
                  <td style={{ ...TD, textAlign: 'right' }}><Ageing text={r.age} /></td>
                  <td style={TD}><StatusLozenge status={r.risk} /></td>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </div>

        <AIPredictionRow
          label="AI Prediction"
          text="At current velocity, BAU-5074 will breach 24h SLA by tomorrow morning. SIMP-3245 has been blocked 5 days — escalation recommended. Reassigning BAU-5027 to available developer could prevent breach."
        />
        <CardFooter meta="3 items at risk · Analysis as of Mar 1, 2026" confidence="High confidence" />
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   RESPONSE 5 — "Team capacity & workload"
   ═══════════════════════════════════════════════════════════════ */

const TEAM_ROWS = [
  { member: 'Wahid Nasri', role: 'Mobile FE', active: 20, blocked: 0, capacity: 100, status: 'AT CAPACITY' },
  { member: 'Nada Alfassam', role: 'QA', active: 15, blocked: 7, capacity: 100, status: 'BLOCKED' },
  { member: 'Raza Bangi', role: 'Backend', active: 8, blocked: 0, capacity: 75, status: 'AVAILABLE' },
  { member: 'Yousif Al-Harbi', role: 'Backend', active: 8, blocked: 0, capacity: 100, status: 'AT CAPACITY' },
  { member: 'Sara Ahmad', role: 'BA', active: 4, blocked: 0, capacity: 40, status: 'AVAILABLE' },
];

export function TeamCapacityResponse() {
  return (
    <div style={{ animation: 'ka-msg-in 200ms ease' }}>
      <ResponseHeader tag="LIVE DATA" />

      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <Users size={16} strokeWidth={2} color="#7C3AED" aria-hidden="true" />
          <span style={{ fontSize: 14, fontWeight: 650, color: '#0F172A', fontFamily: F.sora }}>Team Capacity</span>
          <AIBadge />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <caption className="ka-sr-only">Team capacity and workload</caption>
            <colgroup>
              <col style={{ width: 120 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 55 }} />
              <col style={{ width: 55 }} />
              <col style={{ width: 70 }} />
              <col style={{ width: 100 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={TH}>Member</th>
                <th style={TH}>Role</th>
                <th style={TH}>Active</th>
                <th style={TH}>Blocked</th>
                <th style={TH}>Capacity</th>
                <th style={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {TEAM_ROWS.map(r => (
                <HoverRow key={r.member}>
                  <td style={{ ...TD, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.member}</td>
                  <td style={{ ...TD, fontSize: 12, color: '#64748B' }}>{r.role}</td>
                  <td style={{ ...TD, fontFamily: F.mono, fontSize: 12, fontVariantNumeric: 'tabular-nums' as any }}>{r.active}</td>
                  <td style={{ ...TD, fontFamily: F.mono, fontSize: 12, fontVariantNumeric: 'tabular-nums' as any, color: r.blocked > 0 ? '#DC2626' : '#0F172A' }}>{r.blocked}</td>
                  <td style={{
                    ...TD, fontFamily: F.mono, fontSize: 12, fontVariantNumeric: 'tabular-nums' as any,
                    color: r.capacity < 80 ? '#16A34A' : '#0F172A',
                  }}>{r.capacity}%</td>
                  <td style={TD}><StatusLozenge status={r.status} /></td>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </div>

        <AIPredictionRow
          label="AI Analysis"
          text="Team is at 83% average capacity. Nada is the critical bottleneck — 7 blocked items on accessibility. Raza and Sara have bandwidth available. Consider redistributing Nada's non-blocked items to free her for the accessibility audit pass."
        />
        <CardFooter meta="5 team members · Live data · Mar 1, 2026" confidence="High confidence" />
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   RESPONSE — "Status of BAU-5069"
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

      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#2563EB', fontFamily: F.mono }}>BAU-5069</span>
          <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.inter }}>— Iron & Cement Product License</span>
        </div>

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

        <CardFooter meta="Last synced: Mar 1, 2026" confidence="High confidence" />
      </div>

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
            fontSize: 11, fontWeight: 700, fontFamily: F.inter, padding: '0 5px',
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
  if (q.includes('vikram') && (q.includes('item') || q.includes('open') || q.includes('work'))) return <VikramResponse />;
  if (q.includes('sla') || q.includes('breach')) return <SLAResponse />;
  if (q.includes('capacity') || q.includes('workload') || q.includes('team capacity')) return <TeamCapacityResponse />;
  if (q.includes('bau-5069') || q.includes('status of')) return <StatusResponse />;
  return null;
}
