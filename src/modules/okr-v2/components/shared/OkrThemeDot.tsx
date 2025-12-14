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

// Catalyst brand secondary color palette
const BRAND_THEME_COLORS = [
  'hsl(var(--secondary-green))',      // #5c7c5c - Olive green
  'hsl(var(--secondary-bronze))',     // #8b7355 - Bronze
  'hsl(var(--brand-gold))',           // #c69c6d - Gold
  'hsl(var(--secondary-champagne))',  // #d4b896 - Champagne
  'hsl(var(--secondary-grey))',       // #c8ccd0 - Grey
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
  
  // Always use brand colors, ignore the color prop
  const brandColor = getColorForTheme(themeName, themeIndex);
  
  const dot = (
    <span
      className={`${sizeClass} rounded-full flex-shrink-0`}
      style={{ backgroundColor: brandColor }}
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
