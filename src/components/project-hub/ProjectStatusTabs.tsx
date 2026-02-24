import { Star } from 'lucide-react';

export type ProjectTab = 'all' | 'starred' | 'active' | 'on_hold' | 'planning' | 'completed';

interface Tab {
  key: ProjectTab;
  label: string;
  icon?: 'star';
}

const TABS: Tab[] = [
  { key: 'all', label: 'All' },
  { key: 'starred', label: 'Starred', icon: 'star' },
  { key: 'active', label: 'Active' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'planning', label: 'Planning' },
  { key: 'completed', label: 'Completed' },
];

interface ProjectStatusTabsProps {
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  counts: Record<ProjectTab, number>;
}

export function ProjectStatusTabs({ activeTab, onTabChange, counts }: ProjectStatusTabsProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        const count = counts[tab.key];
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className="flex items-center gap-1.5 rounded-full transition-all"
            style={{
              height: 32,
              padding: '0 12px',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#2563EB' : '#64748B',
              background: isActive ? '#EFF6FF' : 'transparent',
              border: isActive ? '1px solid #BFDBFE' : '1px solid transparent',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {tab.icon === 'star' && (
              <Star
                size={13}
                strokeWidth={2}
                fill={isActive ? '#EAB308' : 'none'}
                color={isActive ? '#EAB308' : '#94A3B8'}
              />
            )}
            {tab.label}
            <span
              className="inline-flex items-center justify-center rounded-full"
              style={{
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                fontSize: 11,
                fontWeight: 600,
                background: isActive ? '#2563EB' : '#E2E8F0',
                color: isActive ? '#FFFFFF' : '#64748B',
                fontFamily: "'Inter', sans-serif",
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
