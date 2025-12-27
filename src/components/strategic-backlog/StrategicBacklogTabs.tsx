/**
 * Strategic Backlog Tabs - Themes | Snapshots | Objectives | Epics
 * Pixel-perfect implementation matching mockups
 */
import { cn } from '@/lib/utils';
import { Layers, Target, Box, Calendar } from 'lucide-react';

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

const TABS: { id: SubSection; label: string; icon: React.ElementType }[] = [
  { id: 'themes', label: 'Themes', icon: Layers },
  { id: 'snapshots', label: 'Snapshots', icon: Calendar },
  { id: 'objectives', label: 'Objectives', icon: Target },
  { id: 'epics', label: 'Epics', icon: Box },
];

export function StrategicBacklogTabs({
  activeSection,
  onSectionChange,
  counts,
}: TabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-subtle)' }}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeSection === tab.id;
        const count = counts[tab.id];

        return (
          <button
            key={tab.id}
            onClick={() => onSectionChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
              isActive
                ? "bg-white dark:bg-[#161B22] shadow-sm"
                : "hover:bg-[var(--surface-hover)]"
            )}
            style={{
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <Icon 
              className="h-4 w-4"
              style={{ color: isActive ? '#2563eb' : 'var(--text-muted)' }}
            />
            {tab.label}
            <span 
              className="px-1.5 py-0.5 text-[11px] font-semibold rounded-full min-w-[20px] text-center"
              style={{
                background: isActive ? '#2563eb' : 'var(--border-default)',
                color: isActive ? '#FFFFFF' : 'var(--text-muted)',
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
