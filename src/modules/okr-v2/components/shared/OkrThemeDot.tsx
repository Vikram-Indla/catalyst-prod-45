// ═══════════════════════════════════════════════════════════════════════════════
// OKR Theme Dot — Shared Presentational Component
// Colored dot using actual theme color from Enterprise Themes
// ═══════════════════════════════════════════════════════════════════════════════

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OkrThemeDotProps {
  color: string;
  themeName?: string;
  size?: 'sm' | 'md';
}

export function OkrThemeDot({ color, themeName, size = 'md' }: OkrThemeDotProps) {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  
  const dot = (
    <span
      className={`${sizeClass} rounded-full flex-shrink-0`}
      style={{ backgroundColor: color }}
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
