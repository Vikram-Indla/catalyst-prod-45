// ============================================================
// HEADER COMPONENT - PageChrome-style inline breadcrumb
// Matches /industry/backlog header pattern
// ============================================================

import React from 'react';
import { useStore } from '@/stores/requirementAssistStore';
import { HelpCircle, Settings } from 'lucide-react';

export function Header() {
  const { generation } = useStore();

  return (
    <div className="shrink-0" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Row 1: Breadcrumb + Title - PageChrome style (inline) */}
      <div
        className="flex items-center justify-between px-6"
        style={{ 
          height: '52px',
          borderBottom: '1px solid var(--divider)',
        }}
      >
        {/* Left: Breadcrumb + Title (NO ICONS) */}
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-3)' }}
          >
            PRODUCT
          </span>
          <span 
            className="text-[14px]" 
            style={{ color: 'var(--text-4)' }}
          >
            /
          </span>
          <h1
            className="text-[18px] font-semibold"
            style={{ color: 'var(--text-1)' }}
          >
            Requirement Assist
          </h1>
        </div>

        {/* Center - Generation ID */}
        {generation && (
          <div 
            className="text-sm font-mono"
            style={{ color: 'var(--text-3)' }}
          >
            {generation.displayId}
          </div>
        )}

        {/* Right - Action Buttons */}
        <div className="flex items-center gap-2">
          <button 
            className="p-2 rounded-md transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button 
            className="p-2 rounded-md transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
