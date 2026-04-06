import React from 'react';
import type { ViewMode, Quarter } from '@/types/resource360';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';

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
  { key: 'board', label: 'Board' },
];

const QUARTERS: Quarter[] = ['Q4-2025', 'Q1-2026', 'Q2-2026'];

export function Resource360Toolbar({
  activeView, onViewChange, quarter, onQuarterChange, onAIOpen, isFullscreen, onFullscreenToggle,
}: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 20px', background: 'var(--bg-app, #FFFFFF)',
      borderBottom: '1px solid #D9D2C9', flexShrink: 0,
    }}>
      {/* View tabs — dark navy active */}
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #D9D2C9' }}>
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onViewChange(tab.key)}
            style={{
              padding: '6px 16px', fontSize: 12, cursor: 'pointer', border: 'none',
              borderRight: '1px solid #D9D2C9',
              fontWeight: activeView === tab.key ? 700 : 600,
              background: activeView === tab.key ? '#2563EB' : 'transparent',
              color: activeView === tab.key ? '#fff' : '#3D3D56',
              transition: 'all .12s',
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
            style={{
              padding: '4px 10px', fontSize: 11, fontWeight: quarter === q ? 700 : 600,
              borderRadius: 6, cursor: 'pointer', border: 'none',
              background: quarter === q ? '#fff' : 'transparent',
              color: quarter === q ? '#1A1A2E' : '#9CA3AF',
              boxShadow: quarter === q ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Intelligence button — purple outlined style */}
        <AIIntelligenceButton
          label="Intelligence"
          onClick={onAIOpen}
        />

        {/* Fullscreen toggle */}
        <button
          onClick={onFullscreenToggle}
          style={{
            width: 32, height: 32, borderRadius: 6,
            border: '1px solid #D9D2C9', background: 'var(--bg-app, #fff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16, color: '#6B7280',
          }}
        >
          {isFullscreen ? '✕' : '⛶'}
        </button>
      </div>
    </div>
  );
}
