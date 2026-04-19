/**
 * AllWorkHeader — Breadcrumb + title + tabs (V12 compliant)
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
    <div className="px-8 pt-5 pb-0" style={{ borderBottom: '1px solid var(--bd-subtle, #292929)' }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 mb-2" aria-label="Breadcrumb">
        <a href="#" className="text-[12px] hover:underline" style={{ color: 'var(--cp-blue)', fontFamily: 'Inter, sans-serif' }}>Projects</a>
        <span className="text-[12px]" style={{ color: 'var(--fg-3)' }} aria-hidden="true">/</span>
        <span className="text-[12px]" style={{ color: 'var(--fg-3)', fontFamily: 'Inter, sans-serif' }}>Senaei BAU</span>
        <span className="text-[12px]" style={{ color: 'var(--fg-3)' }} aria-hidden="true">/</span>
        <span className="text-[12px] font-medium" style={{ color: 'var(--fg-1)', fontFamily: 'Inter, sans-serif' }} aria-current="page">All Work</span>
      </nav>

      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded"
            style={{ width: 24, height: 24, backgroundColor: 'var(--sem-success)', color: 'var(--bg-app)', fontSize: 12, fontWeight: 700 }}
            aria-hidden="true"
          >
            B
          </div>
          <h1 className="text-[20px] font-semibold" style={{ color: 'var(--fg-1)', letterSpacing: '-0.01em', fontFamily: 'Inter, sans-serif' }}>
            Senaei BAU
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded hover:bg-[var(--hover, #1F1F1F)] transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]" aria-label="Star project">
            <Star className="w-4 h-4" style={{ color: 'var(--fg-3)' }} />
          </button>
          <button className="p-1.5 rounded hover:bg-[var(--hover, #1F1F1F)] transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]" aria-label="Share project">
            <Share2 className="w-4 h-4" style={{ color: 'var(--fg-3)' }} />
          </button>
          <button className="p-1.5 rounded hover:bg-[var(--hover, #1F1F1F)] transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]" aria-label="More options">
            <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--fg-3)' }} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0" style={{ marginBottom: -1 }} role="tablist">
        {TABS.map(tab => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="px-4 py-2 text-[13px] transition-colors duration-[80ms] relative focus-visible:outline-2 focus-visible:outline-[#2563EB]"
              style={{
                color: isActive ? '#2563EB' : '#6b6e76',
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'Inter, sans-serif',
              }}
              role="tab"
              aria-selected={isActive}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0" style={{ height: 2, backgroundColor: '#2563EB' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
