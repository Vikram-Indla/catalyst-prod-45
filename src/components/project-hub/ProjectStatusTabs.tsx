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
            className="flex items-center gap-1.5 rounded-full transition-all"
            style={{
              height: 32,
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? (isDark ? 'var(--cp-blue-light)' : 'var(--cp-blue)') : (isDark ? '#878787' : 'var(--fg-3)'),
              backgroundColor: isActive ? (isDark ? 'rgba(59,130,246,0.10)' : 'var(--cp-blue-wash)') : 'transparent',
              border: isActive ? `1px solid ${isDark ? 'rgba(59,130,246,0.25)' : 'var(--cp-primary-20)'}` : '1px solid transparent',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {tab.icon === 'star' && (
              <Star
                size={13}
                strokeWidth={2}
                fill={isActive ? 'var(--sem-star)' : 'none'}
                color={isActive ? 'var(--sem-star)' : (isDark ? '#7D7D7D' : 'var(--fg-4)')}
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
                backgroundColor: isActive ? 'var(--cp-blue)' : (isDark ? '#2E2E2E' : 'var(--divider)'),
                color: isActive ? 'var(--cp-float)' : (isDark ? '#878787' : 'var(--fg-3)'),
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
