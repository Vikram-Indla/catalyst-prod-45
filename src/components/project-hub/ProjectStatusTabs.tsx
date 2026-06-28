import { Star } from '@/lib/atlaskit-icons';

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
            className={`flex items-center gap-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563EB))] ${
              isActive
                ? isDark ? 'bg-[var(--ds-text, #172B4D)] border-[var(--ds-text, #172B4D)]' : 'bg-[var(--ds-background-information, #E9F2FF)] border-[var(--ds-background-information, #E9F2FF)]'
                : 'bg-transparent border-transparent'
            }`}
            style={{
              height: 32,
              padding: '0 12px',
              lineHeight: '32px',
              fontSize: 'var(--ds-font-size-300)',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? ('var(--cp-text-link, var(--cp-primary-60, #0052CC))') : ('var(--cp-text-tertiary, var(--cp-text-secondary, #6B778C))'),
              borderWidth: 1,
              borderStyle: 'solid',
              cursor: 'pointer',
              fontFamily: 'var(--cp-font-body)',
            }}
          >
            {tab.icon === 'star' && (
              <Star
                size={13}
                strokeWidth={2}
                fill={isActive ? 'var(--ds-background-warning-bold, #E2B203)' : 'none'}
                color={isActive ? 'var(--ds-background-warning-bold, #E2B203)' : ('var(--cp-text-tertiary, var(--cp-text-secondary, #6B778C))')}
              />
            )}
            {tab.label}
            <span
              className="inline-flex items-center justify-center rounded-full"
              style={{
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                fontSize: 'var(--ds-font-size-100)',
                fontWeight: 600,
                backgroundColor: isActive ? 'var(--cp-primary-60, #0052CC)' : ('var(--cp-border, #EBECF0)'),
                color: isActive ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))' : ('var(--cp-text-tertiary, var(--cp-text-secondary, #6B778C))'),
                fontFamily: 'var(--cp-font-body)',
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
