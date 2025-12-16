/**
 * Strategic Backlog Tabs - Themes | Objectives | Epics
 * Matches mockup exactly with icon + label + count badges
 */
import { cn } from '@/lib/utils';
import { Layers, Target, Box } from 'lucide-react';

type SubSection = 'themes' | 'objectives' | 'epics';

interface TabsProps {
  activeSection: SubSection;
  onSectionChange: (section: SubSection) => void;
  counts: {
    themes: number;
    objectives: number;
    epics: number;
  };
}

const TABS: { id: SubSection; label: string; icon: React.ElementType }[] = [
  { id: 'themes', label: 'Themes', icon: Layers },
  { id: 'objectives', label: 'Objectives', icon: Target },
  { id: 'epics', label: 'Epics', icon: Box },
];

export function StrategicBacklogTabs({
  activeSection,
  onSectionChange,
  counts,
}: TabsProps) {
  return (
    <div className="flex items-center gap-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeSection === tab.id;
        const count = counts[tab.id];

        return (
          <button
            key={tab.id}
            onClick={() => onSectionChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className={cn(
              "h-5 w-5",
              isActive ? "text-secondary-green" : "text-muted-foreground/60"
            )} />
            {tab.label}
            <span className={cn(
              "px-1.5 py-0.5 text-xs rounded",
              isActive 
                ? "bg-secondary-green/15 text-secondary-green" 
                : "bg-border text-muted-foreground"
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
