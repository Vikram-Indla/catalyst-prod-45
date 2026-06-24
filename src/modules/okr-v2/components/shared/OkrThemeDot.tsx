// ═══════════════════════════════════════════════════════════════════════════════
// OKR Theme Dot — Shared Presentational Component
// Colored dot using Catalyst brand secondary colors
// ═══════════════════════════════════════════════════════════════════════════════

import { Tooltip } from '@/components/ads';

interface OkrThemeDotProps {
  color?: string;
  themeName?: string;
  themeIndex?: number; // Used to cycle through brand colors
  size?: 'sm' | 'md';
}

// Catalyst brand color palette - Blue + Teal
const BRAND_THEME_COLORS = [
  'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',   // Blue (primary)
  'var(--ds-icon-information, #1D7AFC)',   // Teal
  'var(--ds-text-subtlest, #626F86)',   // Gray
  'var(--ds-text-warning, #f59e0b)',   // Amber
  'var(--ds-text-subtlest, #626F86)',   // Light gray
];

// Get a consistent color based on theme name hash
function getColorForTheme(themeName?: string, index?: number): string {
  if (index !== undefined) {
    return BRAND_THEME_COLORS[index % BRAND_THEME_COLORS.length];
  }
  
  if (!themeName) {
    return BRAND_THEME_COLORS[0];
  }
  
  // Simple hash to get consistent color per theme name
  let hash = 0;
  for (let i = 0; i < themeName.length; i++) {
    hash = themeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % BRAND_THEME_COLORS.length;
  return BRAND_THEME_COLORS[colorIndex];
}

export function OkrThemeDot({ color, themeName, themeIndex, size = 'md' }: OkrThemeDotProps) {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  
  // Use provided color from database, fall back to brand color palette
  const displayColor = color || getColorForTheme(themeName, themeIndex);
  
  const dot = (
    <span
      className={`${sizeClass} rounded-full flex-shrink-0`}
      style={{ backgroundColor: displayColor }}
    />
  );

  if (!themeName) return dot;

  return (
    <Tooltip position="top" content={themeName}>
      {dot}
    </Tooltip>
  );
}
