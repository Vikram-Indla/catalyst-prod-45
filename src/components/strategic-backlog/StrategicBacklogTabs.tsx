/**
 * Strategic Backlog Tabs - Themes | Snapshots | Objectives | Epics
 * Pixel-perfect implementation matching mockups
 */
import { cn } from '@/lib/utils';
import { WorkItemIcon, WorkItemIconType } from '@/components/dependencies/WorkItemIcon';

type SubSection = 'themes' | 'snapshots' | 'objectives' | 'epics';

interface TabsProps {
  activeSection: SubSection;
  onSectionChange: (section: SubSection) => void;
  counts: {
    themes: number;
    snapshots: number;
    objectives: number;
    epics: number;
  };
}

const TABS: { id: SubSection; label: string; iconType: WorkItemIconType }[] = [
  { id: 'themes', label: 'Themes', iconType: 'theme' },
  { id: 'snapshots', label: 'Snapshots', iconType: 'snapshot' },
  { id: 'objectives', label: 'Objectives', iconType: 'objective' },
  { id: 'epics', label: 'Epics', iconType: 'epic' },
];

export function StrategicBacklogTabs({
  activeSection,
  onSectionChange,
  counts,
}: TabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg overflow-x-auto" style={{ background: 'var(--surface-subtle)' }}>
      {TABS.map((tab) => {
        const isActive = activeSection === tab.id;
        const count = counts[tab.id];

        return (
          <button
            key={tab.id}
            onClick={() => onSectionChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap shrink-0",
              isActive
                ? "bg-brand-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-[var(--surface-hover)]"
            )}
          >
            <WorkItemIcon type={tab.iconType} size="sm" className={isActive ? "[&_*]:!text-white [&_*]:!fill-white/20" : ""} />
            <span className="hidden xs:inline sm:inline">{tab.label}</span>
            <span 
              className={cn(
                "px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-full min-w-[18px] sm:min-w-[20px] text-center",
                isActive 
                  ? "bg-white/20 text-white"
                  : "bg-[var(--border-default)] text-[var(--text-muted)]"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
