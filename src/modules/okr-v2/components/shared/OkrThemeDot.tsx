// ═══════════════════════════════════════════════════════════════════════════════
// OKR Theme Dot — Shared Presentational Component
// Small circular dot using theme color from Enterprise Themes configuration
// Used by both OKRHubV1 (Objectives Table) and OKRHubV2 (Strategy Tree)
// ═══════════════════════════════════════════════════════════════════════════════

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OkrThemeDotProps {
  color: string;
  themeName?: string;
  size?: 'sm' | 'md';
  showGlow?: boolean;
}

export function OkrThemeDot({ color, themeName, size = 'md', showGlow = false }: OkrThemeDotProps) {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  
  const dot = (
    <span
      className={`${sizeClass} rounded-full flex-shrink-0`}
      style={{ 
        backgroundColor: color,
        boxShadow: showGlow ? `0 0 0 2px ${color}25` : undefined
      }}
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
