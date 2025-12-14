/**
 * SidebarSectionHeader — Standardized Sidebar Section Header
 * 
 * Expanded state: Green label + mini divider visible
 * Collapsed state: Badge only, no divider before menu items
 */

import React from 'react';

interface SidebarSectionHeaderProps {
  /** Badge text shown in green gradient box (e.g., "PR", "EN") */
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
      className="px-3 flex items-center shrink-0"
      style={{ 
        height: `${height}px`,
      }}
    >
      {expanded ? (
        <div className="w-full">
          <div className="flex items-center gap-2.5">
            {/* Green gradient badge */}
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #5c7c5c 0%, #6d8d6d 100%)' }}
            >
              {badge}
            </div>
            {/* Section label - always green when expanded */}
            <span className="text-[13px] font-bold text-secondary-green truncate">
              {label}
            </span>
          </div>
          {/* Mini divider - only visible when expanded */}
          <div 
            className="mt-2 w-full h-px"
            style={{ backgroundColor: '#e5e7eb' }}
          />
        </div>
      ) : (
        /* Collapsed: Badge only, centered, no divider */
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold mx-auto"
          style={{ background: 'linear-gradient(135deg, #5c7c5c 0%, #6d8d6d 100%)' }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}
