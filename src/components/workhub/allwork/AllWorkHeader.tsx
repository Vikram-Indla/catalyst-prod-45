/**
 * AllWorkHeader — Breadcrumb + title + tabs
 */
import { Star, Share2, MoreHorizontal } from 'lucide-react';

type TabKey = 'all-work' | 'board' | 'timeline' | 'calendar' | 'backlog' | 'reports';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all-work', label: 'All Work' },
  { key: 'board', label: 'Board' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'reports', label: 'Reports' },
];

interface Props {
  activeTab: TabKey;
  onTabChange: (t: TabKey) => void;
  onCreateClick: () => void;
}

export function AllWorkHeader({ activeTab, onTabChange }: Props) {
  return (
    <div className="px-8 pt-5 pb-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[12px]" style={{ color: '#1868db', cursor: 'pointer' }}>Projects</span>
        <span className="text-[12px]" style={{ color: '#6b6e76' }}>/</span>
        <span className="text-[12px]" style={{ color: '#6b6e76' }}>Senaei BAU</span>
        <span className="text-[12px]" style={{ color: '#6b6e76' }}>/</span>
        <span className="text-[12px] font-medium" style={{ color: '#1A1D23' }}>All Work</span>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Project icon */}
          <div
            className="flex items-center justify-center rounded"
            style={{ width: 24, height: 24, backgroundColor: '#0d9488', color: '#fff', fontSize: 12, fontWeight: 700 }}
          >
            B
          </div>
          <h1 className="text-[20px] font-semibold" style={{ color: '#1A1D23', letterSpacing: '-0.01em' }}>
            Senaei BAU
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded hover:bg-[#f1f5f9] transition-colors">
            <Star className="w-4 h-4" style={{ color: '#6b6e76' }} />
          </button>
          <button className="p-1.5 rounded hover:bg-[#f1f5f9] transition-colors">
            <Share2 className="w-4 h-4" style={{ color: '#6b6e76' }} />
          </button>
          <button className="p-1.5 rounded hover:bg-[#f1f5f9] transition-colors">
            <MoreHorizontal className="w-4 h-4" style={{ color: '#6b6e76' }} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0" style={{ marginBottom: -1 }}>
        {TABS.map(tab => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="px-4 py-2 text-[13px] transition-colors relative"
              style={{
                color: isActive ? '#1558bc' : '#6b6e76',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {tab.label}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0"
                  style={{ height: 2, backgroundColor: '#1558bc' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
