/**
 * Shared components for Knowledge Assist hardcoded responses.
 * V12 table spec: 36px rows, 8×12 cell padding, 0.75px dividers.
 */
import React from 'react';
import { Clock, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const F = {
  inter: "'Inter', -apple-system, sans-serif",
  sora: "'Sora', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

/* ── StatusLozenge (3-color: grey/blue/green) ── */
const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  // Grey
  'to do': { bg: '#DFE1E6', color: '#44546F' },
  'backlog': { bg: '#DFE1E6', color: '#44546F' },
  'deferred': { bg: '#DFE1E6', color: '#44546F' },
  'blocked': { bg: '#DFE1E6', color: '#44546F' },
  'on hold': { bg: '#DFE1E6', color: '#44546F' },
  'p1': { bg: '#DFE1E6', color: '#44546F' },
  'p2': { bg: '#DFE1E6', color: '#44546F' },
  'p3': { bg: '#DFE1E6', color: '#44546F' },
  'at capacity': { bg: '#DFE1E6', color: '#44546F' },
  // Blue
  'in progress': { bg: '#0C66E4', color: '#FFFFFF' },
  're-open': { bg: '#0C66E4', color: '#FFFFFF' },
  're-opened': { bg: '#0C66E4', color: '#FFFFFF' },
  'code review': { bg: '#0C66E4', color: '#FFFFFF' },
  'in review': { bg: '#0C66E4', color: '#FFFFFF' },
  'ready for qa': { bg: '#0C66E4', color: '#FFFFFF' },
  'uat': { bg: '#0C66E4', color: '#FFFFFF' },
  // Green
  'done': { bg: '#1B7F37', color: '#FFFFFF' },
  'closed': { bg: '#1B7F37', color: '#FFFFFF' },
  'resolved': { bg: '#1B7F37', color: '#FFFFFF' },
  'available': { bg: '#1B7F37', color: '#FFFFFF' },
};

export function Loz({ status }: { status: string }) {
  const s = STATUS_MAP[status.toLowerCase()] || { bg: '#DFE1E6', color: '#44546F' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20,
      padding: '0 6px', borderRadius: 4,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', fontFamily: F.inter,
      lineHeight: '20px', whiteSpace: 'nowrap',
    }}>{status.toUpperCase()}</span>
  );
}

/* ── Response Card Header ── */
export function CardHeader({ icon: Icon, iconColor, title, titleColor, subtitle }: {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  titleColor?: string;
  subtitle: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <Icon size={16} strokeWidth={2} color={iconColor} />
      <span style={{ fontFamily: F.sora, fontSize: 14, fontWeight: 650, color: titleColor || 'var(--fg-1)' }}>{title}</span>
      <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: F.inter }}>{subtitle}</span>
    </div>
  );
}

/* ── V12 Table ── */
export function V12Table({ headers, widths, children }: {
  headers: string[];
  widths: string[];
  children: React.ReactNode;
}) {
  return (
    <div style={{
      border: '1px solid rgba(15,23,42,0.12)', borderRadius: 4,
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
        </colgroup>
        <thead>
          <tr style={{ height: 36, background: 'var(--cp-bd-zone)' }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '8px 12px', fontSize: 11, fontWeight: 650,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: 'var(--fg-3)', fontFamily: F.inter, textAlign: 'left',
                whiteSpace: 'nowrap',
                borderBottom: '1.5px solid rgba(15,23,42,0.12)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      style={{ height: 36, borderBottom: '0.75px solid rgba(15,23,42,0.06)', cursor: onClick ? 'pointer' : undefined, transition: 'background 80ms' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.04)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function KeyCell({ value }: { value: string }) {
  return (
    <td style={{ padding: '8px 12px', fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', whiteSpace: 'nowrap' }}>
      {value}
    </td>
  );
}

export function Cell({ children, mono, muted, bold }: { children: React.ReactNode; mono?: boolean; muted?: boolean; bold?: boolean }) {
  return (
    <td style={{
      padding: '8px 12px', fontSize: 13, fontWeight: bold ? 600 : 400,
      color: muted ? 'var(--fg-3)' : 'var(--fg-1)',
      fontFamily: mono ? F.mono : F.inter,
      fontVariantNumeric: mono ? 'tabular-nums' : undefined,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {children}
    </td>
  );
}

/* ── Scope Bar ── */
export function ScopeBar({ showing, total, label }: { showing: number; total: number; label: string }) {
  return (
    <div style={{
      padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, color: 'var(--fg-3)', fontFamily: F.inter,
    }}>
      <Clock size={14} strokeWidth={2} color="var(--fg-3)" />
      <span>{showing} of {total} · {label}</span>
    </div>
  );
}

/* ── Extend Link ── */
export function ExtendLink({ main, hint, onClick, loading }: { main: string; hint: string; onClick?: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '10px 14px', background: 'transparent',
        border: '1.5px solid rgba(15,23,42,0.08)', borderRadius: 8,
        cursor: 'pointer', textAlign: 'left', transition: 'all 150ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cp-blue)'; e.currentTarget.style.background = 'rgba(37,99,235,0.04)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.08)'; e.currentTarget.style.background = 'transparent'; }}
    >
      <ArrowUpRight size={14} strokeWidth={2} color="var(--cp-blue)" />
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--cp-blue)', fontFamily: F.inter }}>{main}</span>
      <span style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: F.inter }}>{hint}</span>
    </button>
  );
}

/* ── Ageing Dot ── */
export function AgeingDot({ value }: { value: string }) {
  // Green ≤12h, Amber ≤3d, Red >3d
  const num = parseInt(value);
  const unit = value.replace(/[0-9]/g, '').trim().toLowerCase();
  let color = '#16A34A'; // green
  if (unit.startsWith('d')) {
    if (num > 3) color = '#DC2626';
    else color = '#D97706';
  } else if (unit.startsWith('h') && num > 12) {
    color = '#D97706';
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontFamily: F.mono, color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </span>
  );
}
