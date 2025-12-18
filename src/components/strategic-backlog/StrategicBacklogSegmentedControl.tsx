/**
 * Premium Segmented Control for Strategic Backlog
 * Enterprise-grade selector with brand tokens
 */
import { cn } from '@/lib/utils';
import { Palette, Target, Square } from 'lucide-react';

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
  { id: 'epics', label: 'Epics', icon: Square },
];

export function StrategicBacklogSegmentedControl({
  activeSection,
  onSectionChange,
  counts,
}: SegmentedControlProps) {
  return (
    <div className="inline-flex items-center p-1 rounded-lg bg-muted/50 border border-border">
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
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
              isActive
                ? "bg-surface text-foreground shadow-sm border border-brand-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-[rgba(92,124,92,0.08)]"
            )}
          >
            <Icon className={cn(
              "h-4 w-4 transition-colors",
              isActive ? "text-brand-primary" : "text-muted-foreground"
            )} />
            <span>{segment.label}</span>
            <span className={cn(
              "ml-1 text-xs px-1.5 py-0.5 rounded-full",
              isActive 
                ? "bg-brand-primary/15 text-brand-primary" 
                : "bg-muted text-muted-foreground"
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
