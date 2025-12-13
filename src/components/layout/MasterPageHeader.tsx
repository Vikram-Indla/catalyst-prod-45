/**
 * Master Page Header - 2-Row Pattern per CATALYST_MASTER_PAGE_SPECIFICATION v1.0
 * Row 1 (44px): Title + Count only, no icons/buttons, no border
 * Row 2 (52px): All controls/actions in auto | 1fr | auto grid, border-bottom 1px solid Grey-200
 */

import React, { ReactNode } from 'react';

interface MasterPageHeaderProps {
  /** Page title - displayed in olive color, 20px font weight 700 */
  title: string;
  /** Count display - e.g., "6/6" or "12 items" */
  count?: string | ReactNode;
  /** Left side controls - view toggles, etc. */
  leftControls?: ReactNode;
  /** Center controls - typically search */
  centerControls?: ReactNode;
  /** Right side controls - action buttons, filters, etc. */
  rightControls?: ReactNode;
}

export function MasterPageHeader({
  title,
  count,
  leftControls,
  centerControls,
  rightControls,
}: MasterPageHeaderProps) {
  return (
    <div className="bg-card flex-shrink-0">
      {/* Row 1: Title Row - 44px, no border */}
      <div 
        className="flex items-center px-6"
        style={{ height: '44px' }}
      >
        <div className="flex items-baseline gap-2.5">
          <h1 
            className="text-xl font-bold m-0 leading-tight"
            style={{ color: '#5c7c5c' }} // Olive color per spec
          >
            {title}
          </h1>
          {count && (
            <span 
              className="text-[13px] font-medium"
              style={{ color: '#6b7280' }} // Grey-500 per spec
            >
              {count}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Toolbar Row - 52px, with border-bottom */}
      <div 
        className="flex items-center px-6"
        style={{ 
          height: '52px',
          borderBottom: '1px solid #e5e7eb' // Grey-200 per spec
        }}
      >
        <div 
          className="w-full items-center gap-4"
          style={{ 
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
          }}
        >
          {/* Left Zone - auto width */}
          <div className="flex items-center gap-2">
            {leftControls}
          </div>

          {/* Center Zone - 1fr, centered content */}
          <div className="flex justify-center">
            {centerControls}
          </div>

          {/* Right Zone - auto width, right-aligned */}
          <div className="flex items-center justify-end gap-3">
            {rightControls}
          </div>
        </div>
      </div>
    </div>
  );
}
