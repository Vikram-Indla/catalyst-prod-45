/**
 * Master Page Header - 2-Row Pattern per CATALYST_MASTER_PAGE_SPECIFICATION v1.0
 * Row 1 (44px): Title + Count only, no icons/buttons, no border
 * Row 2 (52px): All controls/actions in auto | 1fr | auto grid, border-bottom 1px solid Grey-200
 */

import React, { ReactNode } from 'react';

interface MasterPageHeaderProps {
  /** Page title - displayed in olive color, 20px font weight 700 */
  title: string;
  /** Subtitle / byline text */
  subtitle?: string;
  /** Count display - e.g., "6/6" or "12 items" */
  count?: string | ReactNode;
  /** Left side controls - view toggles, etc. */
  leftControls?: ReactNode;
  /** Center controls - typically search */
  centerControls?: ReactNode;
  /** Right side controls - action buttons, filters, etc. */
  rightControls?: ReactNode;
  /** Put rightControls in title row instead of toolbar row */
  inlineTitleControls?: boolean;
}

export function MasterPageHeader({
  title,
  subtitle,
  count,
  leftControls,
  centerControls,
  rightControls,
  inlineTitleControls,
}: MasterPageHeaderProps) {
  return (
    <div className="bg-card flex-shrink-0">
      {/* Row 1: Title Row */}
      <div 
        className="flex items-center justify-between px-6"
        style={{ minHeight: subtitle ? '68px' : '44px', paddingTop: subtitle ? 14 : 0, paddingBottom: subtitle ? 14 : 0 }}
      >
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline gap-2.5">
            <h1 
              className="font-bold m-0 leading-tight"
              style={{ color: 'var(--text-1)', fontSize: '22px' }}
            >
              {title}
            </h1>
            {count && (
              <span 
                className="text-[13px] font-medium"
                style={{ color: 'var(--text-3)' }}
              >
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <span className="text-[13px]" style={{ color: 'var(--text-3)', marginTop: 4 }}>
              {subtitle}
            </span>
          )}
        </div>
        {inlineTitleControls && rightControls && (
          <div className="flex items-center gap-2">
            {rightControls}
          </div>
        )}
      </div>

      {/* Row 2: Toolbar Row - 52px, with border-bottom */}
      <div 
        className="flex items-center px-6"
        style={{ 
          height: '52px',
          borderBottom: '1px solid var(--divider)'
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
            {!inlineTitleControls && rightControls}
          </div>
        </div>
      </div>
    </div>
  );
}
