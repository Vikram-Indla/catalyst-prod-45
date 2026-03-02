import React from 'react';
import {
  User, Users, Link, ShieldAlert, ClipboardList, Clock,
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

/* ── Status Lozenge (3-color guardrail — WCAG AAA contrast) ── */
const LOZENGE_MAP: Record<string, { bg: string; color: string }> = {
  'RE-OPEN':       { bg: '#DBEAFE', color: '#1E40AF' },
  'IN PROGRESS':   { bg: '#DBEAFE', color: '#1E40AF' },
  'TO DO':         { bg: '#D1FAE5', color: '#065F46' },
  'DEFERRED':      { bg: '#DFE1E6', color: '#1E293B' },
  'DONE':          { bg: '#D1FAE5', color: '#065F46' },
  'AT CAPACITY':   { bg: '#DFE1E6', color: '#1E293B' },
  'AVAILABLE':     { bg: '#D1FAE5', color: '#065F46' },
  'BLOCKED':       { bg: '#DBEAFE', color: '#1E40AF' },
  'CRITICAL':      { bg: '#DFE1E6', color: '#1E293B' },
  'HIGH':          { bg: '#DFE1E6', color: '#1E293B' },
  'MEDIUM':        { bg: '#DFE1E6', color: '#1E293B' },
};

function StatusLozenge({ status }: { status: string }) {
  const s = LOZENGE_MAP[status] ?? { bg: '#DFE1E6', color: '#1E293B' };
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
  let color = '#16A34A';
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
      style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8', fontFamily: F.mono, cursor: 'pointer', whiteSpace: 'nowrap' }}
      onMouseEnter={e => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
      onMouseLeave={e => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
    >{k}</span>
  );
}

/* ── Table header & cell styles (enterprise contrast) ── */
const TH: React.CSSProperties = {
  padding: '10px 12px', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  color: '#475569', fontFamily: F.inter, textAlign: 'left',
  background: '#F1F5F9', whiteSpace: 'nowrap',
  borderBottom: '2px solid rgba(15,23,42,0.12)',
};

const TD: React.CSSProperties = {
  padding: '8px 12px', fontSize: 13, color: '#0F172A',
  fontFamily: F.inter, borderBottom: '0.75px solid rgba(15,23,42,0.06)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};

/* ── Card Footer ── */
function CardFooter({ meta, confidence }: { meta: string; confidence?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', background: '#F1F5F9',
      borderTop: '0.75px solid rgba(15,23,42,0.06)',
    }}>
      <span style={{ fontSize: 12, color: '#475569', fontFamily: F.inter }}>{meta}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {confidence && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#16A34A' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#0D7331', fontFamily: F.inter }}>{confidence}</span>
          </span>
        )}
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
          <ThumbsUp size={13} strokeWidth={2} color="#94A3B8" />
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
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

/* ── Response Card wrapper ── */
function ResponseCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: '1.5px solid rgba(15,23,42,0.10)', borderRadius: 8,
      overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>{children}</div>
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
    <div>
      <ResponseCard>
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <caption className="ka-sr-only">Wahid Nasri's work items</caption>
            <thead>
              <tr>
                <th style={{ ...TH, width: 100 }}>Key</th>
                <th style={{ ...TH, width: 50 }}>Type</th>
                <th style={TH}>Title</th>
                <th style={{ ...TH, width: 120 }}>Status</th>
                <th style={{ ...TH, width: 110 }}>Reported By</th>
                <th style={{ ...TH, width: 70, textAlign: 'right' }}>Ageing</th>
              </tr>
            </thead>
            <tbody>
              {WAHID_ROWS.map(r => (
                <HoverRow key={r.key}>
                  <td style={{ ...TD, width: 100 }}><KeyLink k={r.key} /></td>
                  <td style={{ ...TD, width: 50 }}><TypeBadge type={r.type} /></td>
                  <td style={TD}>{r.title}</td>
                  <td style={{ ...TD, width: 120 }}><StatusLozenge status={r.status} /></td>
                  <td style={{ ...TD, width: 110 }}>{r.reporter}</td>
                  <td style={{ ...TD, width: 70, textAlign: 'right' }}><Ageing text={r.age} /></td>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </div>

        <CardFooter meta="Showing 5 of 20 · Last 2 weeks · Mar 1, 2026" confidence="High confidence" />
      </ResponseCard>

      {/* Associated Items */}
      <div style={{ marginTop: 4 }}>
        <ResponseCard>
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <caption className="ka-sr-only">Associated items under same parent</caption>
            <thead>
              <tr>
                <th style={{ ...TH, width: 100 }}>Key</th>
                <th style={TH}>Title</th>
                <th style={{ ...TH, width: 110 }}>Assignee</th>
                <th style={{ ...TH, width: 120 }}>Status</th>
                <th style={{ ...TH, width: 70, textAlign: 'right' }}>Ageing</th>
              </tr>
            </thead>
            <tbody>
              {WAHID_ASSOCIATED.map(r => (
                <HoverRow key={r.key}>
                  <td style={{ ...TD, width: 100 }}><KeyLink k={r.key} /></td>
                  <td style={TD}>{r.title}</td>
                  <td style={{ ...TD, width: 110 }}>{r.assignee}</td>
                  <td style={{ ...TD, width: 120 }}><StatusLozenge status={r.status} /></td>
                  <td style={{ ...TD, width: 70, textAlign: 'right' }}><Ageing text={r.age} /></td>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </ResponseCard>
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
    <div>
      <ResponseCard>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <ShieldAlert size={16} strokeWidth={2} color="#DC2626" aria-hidden="true" />
          <span style={{ fontSize: 14, fontWeight: 650, color: '#DC2626', fontFamily: F.sora }}>Blocked Items</span>
          <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.mono }}>10 total</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <caption className="ka-sr-only">Blocked work items</caption>
          <thead>
            <tr>
              <th style={{ ...TH, width: 100 }}>Key</th>
              <th style={TH}>Title</th>
              <th style={{ ...TH, width: 130 }}>Reason</th>
              <th style={{ ...TH, width: 110 }}>Assignee</th>
              <th style={{ ...TH, width: 70, textAlign: 'right' }}>Ageing</th>
            </tr>
          </thead>
          <tbody>
            {BLOCKED_ROWS.map(r => (
              <HoverRow key={r.key}>
                <td style={{ ...TD, width: 100 }}><KeyLink k={r.key} /></td>
                <td style={TD}>{r.title}</td>
                <td style={{ ...TD, width: 130, fontSize: 11, color: '#64748B' }}>{r.reason}</td>
                <td style={{ ...TD, width: 110 }}>{r.assignee}</td>
                <td style={{ ...TD, width: 70, textAlign: 'right' }}><Ageing text={r.age} /></td>
              </HoverRow>
            ))}
          </tbody>
        </table>

        <CardFooter meta="5 of 10 · Ask 'Show all blocked' for full list" confidence="High confidence" />
      </ResponseCard>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   RESPONSE 3 — "What are Vikram's open items?"
   ═══════════════════════════════════════════════════════════════ */

const VIKRAM_ROWS = [
  { key: 'BAU-5054', type: 'FE', title: 'My Requests missing Search & Filter', status: 'RE-OPEN', project: 'Senaei BAU', age: '4h' },
  { key: 'BAU-5073', type: 'FE', title: 'More Screen Issues', status: 'RE-OPEN', project: 'Senaei BAU', age: '5h' },
  { key: 'BAU-5074', type: 'FE', title: 'Notification Screen Issues', status: 'DEFERRED', project: 'Senaei BAU', age: '15h' },
  { key: 'SIMP-3245', type: 'FE', title: 'Landing Page — Program & Incentives', status: 'IN PROGRESS', project: 'SIMP', age: '1d' },
  { key: 'MDT-533', type: 'BE', title: 'Request Query Optimization', status: 'IN PROGRESS', project: 'MDT', age: '1d' },
];

export function VikramResponse() {
  return (
    <div>
      <ResponseCard>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={16} strokeWidth={2} color="#2563EB" aria-hidden="true" />
            <span style={{ fontSize: 14, fontWeight: 650, color: '#0F172A', fontFamily: F.sora }}>Vikram Indla</span>
            <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.inter }}>— Delivery Manager</span>
          </div>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: F.mono }}>📁 Delivery · 12 items</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <caption className="ka-sr-only">Vikram Indla's open items</caption>
            <thead>
              <tr>
                <th style={{ ...TH, width: 100 }}>Key</th>
                <th style={{ ...TH, width: 50 }}>Type</th>
                <th style={TH}>Title</th>
                <th style={{ ...TH, width: 120 }}>Status</th>
                <th style={{ ...TH, width: 100 }}>Project</th>
                <th style={{ ...TH, width: 70, textAlign: 'right' }}>Ageing</th>
              </tr>
            </thead>
            <tbody>
              {VIKRAM_ROWS.map(r => (
                <HoverRow key={r.key}>
                  <td style={{ ...TD, width: 100 }}><KeyLink k={r.key} /></td>
                  <td style={{ ...TD, width: 50 }}><TypeBadge type={r.type} /></td>
                  <td style={TD}>{r.title}</td>
                  <td style={{ ...TD, width: 120 }}><StatusLozenge status={r.status} /></td>
                  <td style={{ ...TD, width: 100, fontSize: 12 }}>{r.project}</td>
                  <td style={{ ...TD, width: 70, textAlign: 'right' }}><Ageing text={r.age} /></td>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </div>

        <CardFooter meta="Showing 5 of 20 · Mar 1, 2026" confidence="High confidence" />
      </ResponseCard>
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
    <div>
      <ResponseCard>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <Clock size={16} strokeWidth={2} color="#D97706" aria-hidden="true" />
          <span style={{ fontSize: 14, fontWeight: 650, color: '#0F172A', fontFamily: F.sora }}>SLA Risk Analysis</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <caption className="ka-sr-only">SLA breach predictions</caption>
            <thead>
              <tr>
                <th style={{ ...TH, width: 100 }}>Key</th>
                <th style={TH}>Title</th>
                <th style={{ ...TH, width: 110 }}>Assignee</th>
                <th style={{ ...TH, width: 70, textAlign: 'right' }}>Ageing</th>
                <th style={{ ...TH, width: 80 }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {SLA_ROWS.map(r => (
                <HoverRow key={r.key}>
                  <td style={{ ...TD, width: 100 }}><KeyLink k={r.key} /></td>
                  <td style={TD}>{r.title}</td>
                  <td style={{ ...TD, width: 110 }}>{r.assignee}</td>
                  <td style={{ ...TD, width: 70, textAlign: 'right' }}><Ageing text={r.age} /></td>
                  <td style={{ ...TD, width: 80 }}><StatusLozenge status={r.risk} /></td>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </div>

        <CardFooter meta="3 items at risk · Analysis as of Mar 1, 2026" confidence="High confidence" />
      </ResponseCard>
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
    <div>
      <ResponseCard>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <Users size={16} strokeWidth={2} color="#7C3AED" aria-hidden="true" />
          <span style={{ fontSize: 14, fontWeight: 650, color: '#0F172A', fontFamily: F.sora }}>Team Capacity</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <caption className="ka-sr-only">Team capacity and workload</caption>
            <thead>
              <tr>
                <th style={TH}>Member</th>
                <th style={{ ...TH, width: 80 }}>Role</th>
                <th style={{ ...TH, width: 55 }}>Items</th>
                <th style={{ ...TH, width: 55 }}>Blocked</th>
                <th style={{ ...TH, width: 70 }}>Capacity</th>
                <th style={{ ...TH, width: 110 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {TEAM_ROWS.map(r => (
                <HoverRow key={r.member}>
                  <td style={{ ...TD, fontWeight: 500 }}>{r.member}</td>
                  <td style={{ ...TD, width: 80, fontSize: 12, color: '#64748B' }}>{r.role}</td>
                  <td style={{ ...TD, width: 55, fontFamily: F.mono, fontSize: 12, fontVariantNumeric: 'tabular-nums' as any }}>{r.active}</td>
                  <td style={{ ...TD, width: 55, fontFamily: F.mono, fontSize: 12, fontVariantNumeric: 'tabular-nums' as any, color: r.blocked > 0 ? '#DC2626' : '#0F172A' }}>{r.blocked}</td>
                  <td style={{ ...TD, width: 70, fontFamily: F.mono, fontSize: 12, fontVariantNumeric: 'tabular-nums' as any, color: r.capacity < 80 ? '#16A34A' : '#0F172A' }}>{r.capacity}%</td>
                  <td style={{ ...TD, width: 110 }}><StatusLozenge status={r.status} /></td>
                </HoverRow>
              ))}
            </tbody>
          </table>
        </div>

        <CardFooter meta="5 team members · Live data · Mar 1, 2026" confidence="High confidence" />
      </ResponseCard>
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
    <div>
      <ResponseCard>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8', fontFamily: F.mono }}>BAU-5069</span>
          <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.inter }}>— Iron & Cement Product License</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '4px 16px', padding: 20 }}>
          {fields.map((f, i) => (
            <React.Fragment key={i}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#334155', fontFamily: F.inter }}>{f.label}</span>
              <span style={{ fontSize: 13, fontWeight: 400, color: '#0F172A', fontFamily: F.inter }}>{f.value}</span>
            </React.Fragment>
          ))}
        </div>

        <CardFooter meta="Last synced: Mar 1, 2026" confidence="High confidence" />
      </ResponseCard>

      <div style={{ marginTop: 4 }}>
        <ResponseCard>
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
                <th style={{ ...TH, width: 100 }}>Key</th>
                <th style={TH}>Title</th>
                <th style={{ ...TH, width: 110 }}>Assignee</th>
                <th style={{ ...TH, width: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <HoverRow>
                <td style={{ ...TD, width: 100 }}><KeyLink k="BAU-5070" /></td>
                <td style={TD}>Integration UI Enhancements</td>
                <td style={{ ...TD, width: 110 }}>Wahid Nasri</td>
                <td style={{ ...TD, width: 120 }}><StatusLozenge status="RE-OPEN" /></td>
              </HoverRow>
            </tbody>
          </table>
        </ResponseCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Placeholder for presets without a built response
   ═══════════════════════════════════════════════════════════════ */

function PlaceholderResponse() {
  return (
    <div>
      <ResponseCard>
        <div style={{ padding: '20px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#64748B', fontFamily: F.inter, margin: 0 }}>
            This query is being processed...
          </p>
        </div>
      </ResponseCard>
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
  if (q.includes('nada') || q.includes('raza') || q.includes('yousif')) return <PlaceholderResponse />;
  if (q.includes('re-opened') || q.includes('deferred') || q.includes('reported') || q.includes('changed') || q.includes('bandwidth')) return <PlaceholderResponse />;
  return null;
}
