/**
 * SidebarSectionHeader — Standardized Sidebar Section Header
 * 
 * Uses semantic tokens for dark/light mode compatibility.
 * Expanded state: Label + mini divider visible
 * Collapsed state: Badge only, no divider before menu items
 */

import React from 'react';

interface SidebarSectionHeaderProps {
  /** Badge text shown in brand-active box (e.g., "PR", "EN") */
  badge: string;
  /** Section label shown when expanded (e.g., "Product", "Enterprise") */
  label: string;
  /** Whether sidebar is expanded */
  expanded: boolean;
  /** Height of the header row */
  height?: number;
}

export function SidebarSectionHeader({ 
  badge, 
  label, 
  expanded, 
  height = 44 
}: SidebarSectionHeaderProps) {
  return (
    <div 
      style={{ 
        height: `${height}px`,
        padding: expanded ? '0 12px' : '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: expanded ? 'flex-start' : 'center',
        flexShrink: 0,
      }}
    >
      {expanded ? (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Badge with brand-active background */}
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'var(--brand-active)',
                color: 'var(--text-inverse, #ffffff)',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {badge}
            </div>
            {/* Section label - uses text-1 for visibility */}
            <span style={{ 
              fontSize: '14px', 
              fontWeight: 700, 
              color: 'var(--text-1)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
          </div>
          {/* Mini divider - only visible when expanded */}
          <div 
            style={{ 
              marginTop: '8px',
              width: '100%',
              height: '1px',
              background: 'var(--divider)',
            }}
          />
        </div>
      ) : (
        /* Collapsed: Badge only, centered, no divider */
        <div 
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'var(--brand-active)',
            color: 'var(--text-inverse, #ffffff)',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}
