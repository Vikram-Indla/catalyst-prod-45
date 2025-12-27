// ═══════════════════════════════════════════════════════════════════════════════
// OKR Theme Dot — Shared Presentational Component
// Colored dot using Catalyst brand secondary colors
// ═══════════════════════════════════════════════════════════════════════════════

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OkrThemeDotProps {
  color?: string;
  themeName?: string;
  themeIndex?: number; // Used to cycle through brand colors
  size?: 'sm' | 'md';
}

// Catalyst brand color palette - Blue + Teal
const BRAND_THEME_COLORS = [
  '#2563eb',   // Blue (primary)
  '#0d9488',   // Teal
  '#6b7280',   // Gray
  '#f59e0b',   // Amber
  '#9ca3af',   // Light gray
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {dot}
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{themeName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
