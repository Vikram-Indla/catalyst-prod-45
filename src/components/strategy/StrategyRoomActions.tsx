/**
 * StrategyRoomActions — Density toggle + Intelligence button + Export button
 * Passed into CommandCenterHeader's `actions` prop for Strategy Room.
 */

import { Download } from 'lucide-react';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { StrategyDensity } from '@/hooks/useStrategyPreferences';

interface StrategyRoomActionsProps {
  density: StrategyDensity;
  setDensity: (d: StrategyDensity) => void;
  isIntelligenceOpen?: boolean;
  onToggleIntelligence?: () => void;
}

/** Compact: 4 thin lines */
function CompactIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3h10M2 5.5h10M2 8h10M2 10.5h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** Comfortable: 3 medium lines */
function ComfortableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Spacious: 2 thick lines */
function SpaciousIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 5h10M2 9h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const densityOptions: { value: StrategyDensity; label: string; icon: React.ReactNode }[] = [
  { value: 'compact', label: 'Compact', icon: <CompactIcon /> },
  { value: 'comfortable', label: 'Comfortable', icon: <ComfortableIcon /> },
  { value: 'spacious', label: 'Spacious', icon: <SpaciousIcon /> },
];

export function StrategyRoomActions({ density, setDensity, isIntelligenceOpen, onToggleIntelligence }: StrategyRoomActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Density segmented control */}
      <TooltipProvider delayDuration={200}>
        <div
          className="flex items-center rounded-md overflow-hidden border border-slate-200 dark:border-[#2E2E2E]"
          role="radiogroup"
          aria-label="Display density"
        >
          {densityOptions.map((opt) => {
            const isActive = density === opt.value;
            return (
              <Tooltip key={opt.value}>
                <TooltipTrigger asChild>
                  <button
                    role="radio"
                    aria-checked={isActive}
                    aria-label={opt.label}
                    onClick={() => setDensity(opt.value)}
                    className={`flex items-center justify-center w-8 h-8 border-none cursor-pointer transition-all duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      isActive
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-white dark:bg-[#1A1A1A] text-slate-500 dark:text-[#A1A1A1]'
                    }`}
                  >
                    {opt.icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{opt.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {onToggleIntelligence && (
        <AIIntelligenceButton
          label="Intelligence"
          isActive={isIntelligenceOpen}
          onClick={onToggleIntelligence}
        />
      )}

      {/* Export button */}
      <button
        className="flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium text-slate-500 dark:text-[#A1A1A1] bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2E2E2E] rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Download size={14} />
        Export
      </button>
    </div>
  );
}
