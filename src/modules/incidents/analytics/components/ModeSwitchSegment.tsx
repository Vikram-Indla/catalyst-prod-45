/**
 * Mode Switch Segment
 * Premium navigation toggle for List | Analytics | Insights
 * Designed as module-level navigation, not secondary buttons
 */

import { useNavigate } from 'react-router-dom';
import { List, BarChart3, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'analytics' | 'insights';

interface ModeSwitchSegmentProps {
  currentMode: ViewMode;
}

const MODES: { value: ViewMode; label: string; icon: React.ElementType; path: string }[] = [
  { value: 'list', label: 'List', icon: List, path: '/release/incidents' },
  { value: 'analytics', label: 'Analytics', icon: BarChart3, path: '/release/incidents/analytics' },
  { value: 'insights', label: 'Insights', icon: Lightbulb, path: '/release/incidents/insights' },
];

export function ModeSwitchSegment({ currentMode }: ModeSwitchSegmentProps) {
  const navigate = useNavigate();

  const handleModeChange = (mode: ViewMode) => {
    const target = MODES.find(m => m.value === mode);
    if (target) {
      navigate(target.path);
    }
  };

  return (
    <nav 
      className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1"
      role="tablist"
      aria-label="View mode"
    >
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.value;
        return (
          <button
            key={mode.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleModeChange(mode.value)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2",
              isActive 
                ? "bg-background text-foreground shadow-sm border border-border/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
