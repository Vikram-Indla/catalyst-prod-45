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
  isDark?: boolean;
}

export function ProjectStatusTabs({ activeTab, onTabChange, counts, isDark = false }: ProjectStatusTabsProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        const count = counts[tab.key];
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
              isActive
                ? isDark ? 'bg-[#0D1526] border-[#1E3A5F]' : 'bg-[#DEEBFF] border-[#B3D4FF]'
                : 'bg-transparent border-transparent'
            }`}
            style={{
              height: 32,
              padding: '0 12px',
              lineHeight: '32px',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? (isDark ? '#4C9AFF' : '#0052CC') : (isDark ? '#878787' : '#6B778C'),
              borderWidth: 1,
              borderStyle: 'solid',
              cursor: 'pointer',
              fontFamily: 'var(--ds-font-family-body)',
            }}
          >
            {tab.icon === 'star' && (
              <Star
                size={13}
                strokeWidth={2}
                fill={isActive ? '#FFAB00' : 'none'}
                color={isActive ? '#FFAB00' : (isDark ? '#7D7D7D' : '#6B778C')}
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
                backgroundColor: isActive ? '#0052CC' : (isDark ? '#2E2E2E' : '#EBECF0'),
                color: isActive ? '#FFFFFF' : (isDark ? '#878787' : '#6B778C'),
                fontFamily: 'var(--ds-font-family-body)',
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
