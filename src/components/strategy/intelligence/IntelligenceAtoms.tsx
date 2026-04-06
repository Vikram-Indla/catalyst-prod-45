import React from "react";

// ══════════════════════════════════════════════════
// AVATAR — initials circle
// ══════════════════════════════════════════════════
const AVATAR_PALETTE = [
  { bg: '#DBEAFE', text: '#7DB8FC' }, { bg: '#D1FAE5', text: '#4ADE80' },
  { bg: 'rgba(251,191,36,0.10)', text: '#FBBF24' }, { bg: '#EDE9FE', text: '#A78BFA' },
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
// MINI BAR — thin progress bar (blue fill only)
// ══════════════════════════════════════════════════
export function MiniBar({ value, max, height = 6 }: {
  value: number; max: number; height?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bg-slate-100 dark:bg-[rgba(255,255,255,0.08)] w-full overflow-hidden" style={{ height, borderRadius: height / 2 }}>
      <div className="bg-[#2563EB] h-full transition-[width] duration-[800ms] ease-out" style={{ width: `${pct}%`, borderRadius: height / 2 }} />
    </div>
  );
}

// ══════════════════════════════════════════════════
// PROGRESS COLOR HELPER (dots only, not bar fills)
// ══════════════════════════════════════════════════
export function getProgressColor(progress: number): string {
  if (progress >= 70) return '#16A34A';
  if (progress >= 40) return '#D97706';
  return '#EF4444';
}
