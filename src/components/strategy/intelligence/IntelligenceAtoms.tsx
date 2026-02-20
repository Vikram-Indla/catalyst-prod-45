import React from "react";

// ══════════════════════════════════════════════════
// SECTION DIVIDER — centered label between lines
// ══════════════════════════════════════════════════
export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5 mt-3">
      <div className="h-px flex-1 bg-slate-100" />
      <span className="text-[11px] font-[800] uppercase tracking-[0.1em] text-slate-400 select-none">
        § {label}
      </span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

// ══════════════════════════════════════════════════
// SUB HEADING — for sections within a section
// ══════════════════════════════════════════════════
export function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[12px] font-[700] text-slate-700 uppercase tracking-[0.04em] mb-3">
      {children}
    </h4>
  );
}

// ══════════════════════════════════════════════════
// AI HEALTH RING — 80px ring chart for health score
// ══════════════════════════════════════════════════
export function HealthRing({ value, size = 80 }: { value: number; size?: number }) {
  const strokeWidth = 6;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ;
  const color = value >= 70 ? '#16A34A' : value >= 45 ? '#D97706' : '#EF4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-[800] leading-none" style={{ color }}>{value}</span>
        <span className="text-[10px] text-slate-400 font-semibold">/100</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// VERDICT CARD — small metric card (Schedule, Scope, etc.)
// ══════════════════════════════════════════════════
export function VerdictCard({ label, value, icon, sub, color }: {
  label: string; value: string; icon?: string; sub?: string; color: string;
}) {
  return (
    <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
      <div className="text-[9px] font-[700] uppercase tracking-[0.06em] text-slate-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-1.5">
        {icon && <span className="text-[10px]" style={{ color }}>{icon}</span>}
        <span className="text-[16px] font-[800] leading-none" style={{ color }}>{value}</span>
        {sub && <span className="text-[10px] text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// AVATAR — initials circle
// ══════════════════════════════════════════════════
const AVATAR_PALETTE = [
  { bg: '#DBEAFE', text: '#1E40AF' }, { bg: '#D1FAE5', text: '#065F46' },
  { bg: '#FEF3C7', text: '#92400E' }, { bg: '#EDE9FE', text: '#5B21B6' },
  { bg: '#CFFAFE', text: '#155E75' }, { bg: '#E0E7FF', text: '#3730A3' },
];

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTE.length;
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const p = AVATAR_PALETTE[idx];

  return (
    <div className="rounded-full flex items-center justify-center shrink-0 font-bold select-none"
      style={{ width: size, height: size, fontSize: size * 0.36, background: p.bg, color: p.text }}>
      {initials}
    </div>
  );
}

// ══════════════════════════════════════════════════
// RISK SIGNAL CARD — AI-generated, 1 sentence, color-coded
// ══════════════════════════════════════════════════
const SIGNAL_CONFIGS = [
  { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', icon: '🔴', label: 'Critical' },
  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '🟡', label: 'Watch' },
  { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: '🟢', label: 'Momentum' },
];

export function RiskSignalCard({ index, text }: { index: number; text: string }) {
  const c = SIGNAL_CONFIGS[index] || SIGNAL_CONFIGS[1];
  return (
    <div className="p-3 rounded-lg border"
      style={{ background: c.bg, borderColor: c.border, borderLeftWidth: 3, borderLeftColor: c.color }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px]">{c.icon}</span>
        <span className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: c.color }}>{c.label}</span>
        <span className="text-[9px] text-purple-400 ml-auto">✦ AI</span>
      </div>
      <p className="text-[12px] text-slate-700 leading-[1.6]">{text}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════
// MINI BAR — thin progress bar
// ══════════════════════════════════════════════════
export function MiniBar({ value, max, color, height = 6 }: {
  value: number; max: number; color: string; height?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height, background: '#F1F5F9', borderRadius: height / 2, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: height / 2, transition: 'width 0.8s ease' }} />
    </div>
  );
}

// ══════════════════════════════════════════════════
// PROGRESS COLOR HELPER
// ══════════════════════════════════════════════════
export function getProgressColor(progress: number): string {
  if (progress >= 70) return '#16A34A';
  if (progress >= 40) return '#D97706';
  return '#EF4444';
}
