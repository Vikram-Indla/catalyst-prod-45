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
  // Backgrounds — NOCTURNE Warm Charcoal
  pageBg: '#0A0A0A',
  cardBg: 'transparent',
  headerBg: 'transparent',
  tableHeaderBg: 'rgba(255,255,255,0.03)',
  hoverBg: 'rgba(255,255,255,0.03)',
  selectedBg: 'rgba(59,130,246,0.08)',
  floatBg: '#1A1A1A',
  chipBg: 'rgba(255,255,255,0.06)',
  progressTrack: 'rgba(255,255,255,0.08)',
  iconBg: 'rgba(255,255,255,0.06)',
  
  // Text — NOCTURNE Warm Charcoal
  t1: '#EDEDED',   // primary text (titles, values, data)
  t2: '#A1A1A1',   // secondary (labels, legends)
  t3: '#878787',   // tertiary (timestamps, muted labels)
  t4: 'rgba(237,237,237,0.30)',   // decorative (placeholders)
  
  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.12)',
  divider: 'rgba(255,255,255,0.05)',
  
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
  tableHeaderBg: var(--bg-2, '#F1F5F9'),
  hoverBg: 'rgba(15,23,42,0.04)',
  selectedBg: '#F0F4FF',
  floatBg: '#FFFFFF',
  chipBg: var(--bg-2, '#F1F5F9'),
  progressTrack: var(--bg-2, '#F1F5F9'),
  iconBg: var(--bg-2, '#F1F5F9'),
  
  t1: 'var(--fg-1, #0F172A)',
  t2: '#64748B',
  t3: 'var(--fg-3, #94A3B8)',
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
