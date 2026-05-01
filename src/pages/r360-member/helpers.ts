/**
 * R360 Member Detail — Period helpers & utility functions
 * Extracted from R360MemberDetail.tsx
 */

// ── Period helpers ──
export type PeriodType = 'weekly' | 'monthly';

export function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const sun = new Date(now);
  sun.setDate(now.getDate() - day + offset * 7);
  sun.setHours(0, 0, 0, 0);
  // Saudi work week: Sunday–Thursday (5 days)
  const thu = new Date(sun);
  thu.setDate(sun.getDate() + 4);
  thu.setHours(23, 59, 59, 999);
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = offset === 0 ? 'This Week' : offset === -1 ? 'Last Week' : offset === 1 ? 'Next Week' : `Week ${offset > 0 ? '+' : ''}${offset}`;
  const range = `${M[sun.getMonth()]} ${sun.getDate()} – ${M[thu.getMonth()]} ${thu.getDate()}, ${thu.getFullYear()}`;
  return { start: sun, end: thu, label, range };
}

export function getMonthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  end.setHours(23, 59, 59, 999);
  const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const label = offset === 0 ? 'This Month' : `${M[start.getMonth()]} ${start.getFullYear()}`;
  const range = `${M[start.getMonth()]} 1 – ${start.getDate() === 1 ? end.getDate() : end.getDate()}, ${end.getFullYear()}`;
  return { start, end, label, range };
}

// ── Priority dot color ──
export function priorityDotColor(p: string) {
  const l = p?.toLowerCase();
  if (l === 'highest' || l === 'critical') return 'var(--ds-text-danger, #EF4444)';
  if (l === 'high') return '#F97316';
  if (l === 'medium') return 'var(--ds-text-warning, #D97706)';
  return 'var(--ds-text-subtlest, #94A3B8)';
}

// ── Priority border color for board/ring cards (D-R7) ──
export function priorityBorderColor(p: string): string {
  const l = (p || '').toLowerCase();
  if (l === 'highest' || l === 'critical' || l === 'high') return 'var(--ds-text-danger, #DC2626)';
  if (l === 'medium') return 'var(--ds-text-warning, #D97706)';
  return 'var(--ds-text-subtlest, #94A3B8)';
}

// ── Mini Avatar color hashing ──
export const AVATAR_COLORS = ['var(--ds-text-brand, #2563EB)', '#0D9488', 'var(--ds-text-warning, #D97706)'];
export function hashColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── From tag age escalation helper — uses age_days directly ──
export function getFromTagClass(ageDays: number): string {
  if (ageDays >= 29) return 'red';
  if (ageDays >= 15) return 'amber';
  return 'neutral';
}

export function getFromTagPrefix(ageDays: number): string {
  return ageDays >= 15 ? '⚠ ' : '';
}

// ── Saudi work day helpers ──
export function getSaudiWorkDays(periodStart: Date): { name: string; date: Date }[] {
  // Saudi work week: Sun–Thu
  const days: { name: string; date: Date }[] = [];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU'];
  const d = new Date(periodStart);
  // Find Sunday
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  for (let i = 0; i < 5; i++) {
    days.push({ name: dayNames[i], date: new Date(d) });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function getWeekCells(periodStart: Date): { label: string; weekNum: number; date: Date }[] {
  const cells: { label: string; weekNum: number; date: Date }[] = [];
  const d = new Date(periodStart);
  for (let i = 0; i < 5; i++) {
    const weekOfYear = Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
    cells.push({ label: `W${weekOfYear}`, weekNum: weekOfYear, date: new Date(d) });
    d.setDate(d.getDate() + 7);
  }
  return cells;
}

// ── Ring view geometry constants ──
export const CARD_W = 228;
export const CARD_H = 145;
export const RING_CANVAS_H = 620;
export const AVATAR_R = 28; // half of 56px avatar
export const PAGE_SIZE = 8;

// Slot positions as percentages/px for absolute placement (228x145 cards)
export const SLOT_POSITIONS: { left: string; top: string }[] = [
  { left: '4%',  top: '5%' },       // Slot 1: top-left
  { left: '36%', top: '2%' },       // Slot 2: top-center
  { left: '62%', top: '5%' },       // Slot 3: top-right
  { left: '68%', top: '33%' },      // Slot 4: mid-right
  { left: '62%', top: '61%' },      // Slot 5: bottom-right
  { left: '36%', top: '65%' },      // Slot 6: bottom-center
  { left: '4%',  top: '61%' },      // Slot 7: bottom-left
  { left: '4%',  top: '33%' },      // Slot 8: mid-left
];

// Compute connector endpoints dynamically from card positions
// Returns card centre in pixel coords
export function getCardPixelPos(slotIdx: number, containerW: number): { x: number; y: number } {
  const slot = SLOT_POSITIONS[slotIdx];
  if (!slot) return { x: 0, y: 0 };
  let leftPx: number;
  if (slot.left.endsWith('%')) {
    leftPx = (parseFloat(slot.left) / 100) * containerW;
  } else {
    leftPx = parseFloat(slot.left);
  }
  let topPx: number;
  if (slot.top.endsWith('%')) {
    topPx = (parseFloat(slot.top) / 100) * RING_CANVAS_H;
  } else {
    topPx = parseFloat(slot.top);
  }
  return { x: leftPx + CARD_W / 2, y: topPx + CARD_H / 2 };
}

// Compute spoke endpoints offset from avatar edge to card nearest edge
export function getSpokeEndpoints(cx: number, cy: number, cardCx: number, cardCy: number) {
  const dx = cardCx - cx;
  const dy = cardCy - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { x1: cx, y1: cy, x2: cardCx, y2: cardCy };
  const ux = dx / dist;
  const uy = dy / dist;
  // Start: avatar edge
  const x1 = cx + ux * AVATAR_R;
  const y1 = cy + uy * AVATAR_R;
  // End: card nearest edge (ray-rectangle intersection)
  const halfW = CARD_W / 2;
  const halfH = CARD_H / 2;
  const scaleX = Math.abs(ux) > 0.001 ? halfW / Math.abs(ux) : Infinity;
  const scaleY = Math.abs(uy) > 0.001 ? halfH / Math.abs(uy) : Infinity;
  const edgeDist = Math.min(scaleX, scaleY);
  return {
    x1, y1,
    x2: cardCx - ux * edgeDist,
    y2: cardCy - uy * edgeDist,
  };
}
