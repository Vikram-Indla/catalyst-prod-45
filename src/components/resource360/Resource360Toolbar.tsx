import React from 'react';
import type { ViewMode, Quarter } from '@/types/resource360';

interface Props {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  quarter: Quarter;
  onQuarterChange: (q: Quarter) => void;
  onAIOpen: () => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
}

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: 'ring', label: '360° View' },
  { key: 'chronology', label: 'Chronology' },
  { key: 'list', label: 'List' },
  { key: 'board', label: 'Board' },
];

const QUARTERS: Quarter[] = ['Q4-2025', 'Q1-2026', 'Q2-2026'];

/**
 * Toolbar: view tabs, quarter selector, filter buttons, AI Intelligence, fullscreen toggle.
 */
export function Resource360Toolbar({
  activeView,
  onViewChange,
  quarter,
  onQuarterChange,
  onAIOpen,
  isFullscreen,
  onFullscreenToggle,
}: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 20px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        flexShrink: 0,
      }}
    >
      {/* View tabs */}
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onViewChange(tab.key)}
            className="px-3.5 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: activeView === tab.key ? '#2563EB' : '#fff',
              color: activeView === tab.key ? '#fff' : '#6B7280',
              cursor: 'pointer',
              border: 'none',
              borderRight: '1px solid #E5E7EB',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quarter selector */}
      <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 8, padding: 2 }}>
        {QUARTERS.map((q) => (
          <button
            key={q}
            onClick={() => onQuarterChange(q)}
            className="px-2.5 py-1 text-xs font-semibold rounded-md transition-all"
            style={{
              background: quarter === q ? '#fff' : 'transparent',
              color: quarter === q ? '#2563EB' : '#9CA3AF',
              boxShadow: quarter === q ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              cursor: 'pointer',
              border: 'none',
              fontWeight: quarter === q ? 700 : 600,
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

      {/* Filter buttons (visual only) */}
      <div style={{ display: 'flex', gap: 6 }}>
        <FilterButton label="Hub" />
        <FilterButton label="Priority" />
      </div>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* AI Intelligence button */}
        <button
          onClick={onAIOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            background: '#FFFFFF', border: '1px solid #DDD6FE',
            color: '#7C3AED', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'opacity 150ms',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          <span style={{ fontSize: 14 }}>✦</span>
          Intelligence
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={onFullscreenToggle}
          style={{
            width: 32, height: 32, borderRadius: 6,
            border: '1px solid #E5E7EB', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16, color: '#6B7280',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#2563EB';
            (e.currentTarget as HTMLElement).style.color = '#2563EB';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB';
            (e.currentTarget as HTMLElement).style.color = '#6B7280';
          }}
        >
          {isFullscreen ? '✕' : '⛶'}
        </button>
      </div>
    </div>
  );
}

function FilterButton({ label }: { label: string }) {
  return (
    <button
      style={{
        fontSize: 11, fontWeight: 600, padding: '4px 10px',
        borderRadius: 6, border: '1px solid #E5E7EB',
        background: '#F3F4F6', color: '#6B7280', cursor: 'pointer',
        transition: 'background 150ms',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#E5E7EB'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; }}
    >
      {label}
    </button>
  );
}
