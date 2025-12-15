/**
 * Premium Segmented Control for Strategic Backlog
 * CLAUDE DESIGN - Token-based styling
 */
import { cn } from '@/lib/utils';
import { Palette, Target, Boxes } from 'lucide-react';

type SubSection = 'themes' | 'objectives' | 'epics';

interface SegmentedControlProps {
  activeSection: SubSection;
  onSectionChange: (section: SubSection) => void;
  counts: {
    themes: number;
    objectives: number;
    epics: number;
  };
}

const SEGMENTS: { id: SubSection; label: string; icon: React.ElementType }[] = [
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'objectives', label: 'Objectives', icon: Target },
  { id: 'epics', label: 'Epics', icon: Boxes },
];

export function StrategicBacklogSegmentedControl({
  activeSection,
  onSectionChange,
  counts,
}: SegmentedControlProps) {
  return (
    <div className="inline-flex items-center p-1 rounded-lg bg-catalyst-surface border border-catalyst-border">
      {SEGMENTS.map((segment) => {
        const Icon = segment.icon;
        const isActive = activeSection === segment.id;
        const count = counts[segment.id];

        return (
          <button
            key={segment.id}
            onClick={() => onSectionChange(segment.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-catalyst-gold focus-visible:ring-offset-2",
              isActive
                ? "bg-catalyst-surface-hover text-catalyst-text shadow-sm border border-catalyst-gold/30"
                : "text-catalyst-text-muted hover:text-catalyst-text hover:bg-catalyst-green-tint"
            )}
          >
            <Icon className={cn(
              "h-4 w-4 transition-colors",
              isActive ? "text-catalyst-gold" : "text-catalyst-text-muted"
            )} />
            <span>{segment.label}</span>
            <span className={cn(
              "ml-1 text-xs px-1.5 py-0.5 rounded-full font-medium",
              isActive 
                ? "bg-catalyst-gold/15 text-catalyst-gold" 
                : "bg-catalyst-surface-hover text-catalyst-text-muted"
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
