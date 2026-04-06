/**
 * NOCTURNE Warm Charcoal dark mode color tokens for inline-style components
 */
export type DarkTokens = {
  pageBg: string; cardBg: string; headerBg: string; tableHeaderBg: string;
  hoverBg: string; selectedBg: string; floatBg: string; chipBg: string;
  progressTrack: string; iconBg: string;
  t1: string; t2: string; t3: string; t4: string;
  border: string; borderStrong: string; divider: string;
  blue: string; blueKey: string; green: string; greenText: string;
  shadow: string; cardShadow: string;
};

export const DK: DarkTokens = {
  // Backgrounds — Vercel Geist Pure Neutral
  pageBg: '#0A0A0A',
  cardBg: '#1A1A1A',
  headerBg: '#1F1F1F',
  tableHeaderBg: '#1F1F1F',
  hoverBg: '#1F1F1F',
  selectedBg: 'rgba(59,130,246,0.10)',
  floatBg: '#1A1A1A',
  chipBg: '#292929',
  progressTrack: '#292929',
  iconBg: '#292929',
  
  // Text — Vercel Geist Pure Neutral
  t1: '#EDEDED',   // gray-1000: primary text
  t2: '#A1A1A1',   // gray-900: secondary text
  t3: '#878787',   // gray-600: muted/hints
  t4: 'rgba(237,237,237,0.30)',   // disabled
  
  // Borders — Vercel Geist Solid Hex
  border: '#2E2E2E',
  borderStrong: '#454545',
  divider: '#292929',
  
  // Semantic
  blue: '#60A5FA',
  blueKey: '#60A5FA',
  green: '#86EFAC',
  greenText: '#86EFAC',
  
  // No shadow
  shadow: 'none',
  cardShadow: 'none',
} as const;

export const LK: DarkTokens = {
  pageBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  headerBg: '#FFFFFF',
  tableHeaderBg: '#F1F5F9',
  hoverBg: 'rgba(15,23,42,0.04)',
  selectedBg: '#F0F4FF',
  floatBg: '#FFFFFF',
  chipBg: '#F1F5F9',
  progressTrack: '#F1F5F9',
  iconBg: '#F1F5F9',
  
  t1: '#0F172A',
  t2: '#64748B',
  t3: '#94A3B8',
  t4: '#CBD5E1',
  
  border: 'rgba(15,23,42,0.12)',
  borderStrong: 'rgba(15,23,42,0.20)',
  divider: 'rgba(15,23,42,0.06)',
  
  blue: '#2563EB',
  blueKey: '#2563EB',
  green: '#16A34A',
  greenText: '#11853D',
  
  shadow: '0 1px 3px rgba(0,0,0,0.06)',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
} as const;
