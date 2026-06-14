/**
 * Column primitives: ColumnHeader (status dot + name + count/WIP) and
 * ColumnBody (scrollable droppable card list). Split so swimlane mode can
 * render headers once at the top and bodies per lane (Jira-accurate).
 */
import React, { forwardRef } from 'react';
import { token } from '@atlaskit/tokens';
import { SIZES } from '../constants';
import type { KanbanColumn, WipState } from '../types';

function wipState(count: number, max: number | null): WipState {
  if (max == null) return 'normal';
  if (count > max) return 'exceeded';
  if (count === max) return 'warning';
  return 'normal';
}

export const ColumnHeader: React.FC<{ column: KanbanColumn; count: number }> = ({ column, count }) => {
  const wip = wipState(count, column.max);
  const countColor = wip === 'exceeded'
    ? token('color.text.danger', '#AE2A19')
    : wip === 'warning'
      ? token('color.text.warning', '#7F5F01')
      : token('color.text.subtlest', '#626F86');
  // Jira board column header: NO status dot — name (uppercase, subtle) + count.
  // Width is owned by the parent column wrapper in Board.
  return (
    <div style={{
      width: '100%', flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 8,
      height: SIZES.COLUMN_HEADER_HEIGHT, padding: '12px 12px 8px 12px',
    }}>
      <span style={{
        fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3,
        color: token('color.text.subtlest', '#626F86'),
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, lineHeight: '16px',
      }}>
        {column.name}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 500, lineHeight: '16px', flexShrink: 0, color: countColor,
        background: wip === 'normal' ? token('color.background.neutral', '#091E420F') : 'transparent',
        borderRadius: 10, padding: '0 6px', minWidth: 18, textAlign: 'center',
      }}>
        {count}{column.max != null ? `/${column.max}` : ''}
      </span>
    </div>
  );
};

interface ColumnBodyProps {
  ariaLabel: string;
  isDragOver?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** lane bodies size to content; flat single-lane fills height */
  fill?: boolean;
}

/** ref attaches to the scrollable list for pragmatic-dnd drop targeting. */
export const ColumnBody = forwardRef<HTMLDivElement, ColumnBodyProps>(
  ({ ariaLabel, isDragOver, children, footer, fill }, ref) => (
    <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', maxHeight: '100%', minHeight: fill ? 0 : 40 }}>
      <div
        ref={ref}
        role="list"
        aria-label={ariaLabel}
        className="kb-column-body"
        style={{
          flex: fill ? 1 : undefined, overflowY: 'auto', overflowX: 'hidden',
          padding: '2px 8px 4px 8px', display: 'flex', flexDirection: 'column', gap: SIZES.CARD_GAP,
          background: isDragOver ? token('color.background.selected', '#E9F2FF') : 'transparent',
          borderRadius: 6, transition: 'background-color 150ms ease',
          minHeight: fill ? 0 : 24,
        }}
      >
        {children}
      </div>
      {footer}
    </div>
  ),
);
ColumnBody.displayName = 'ColumnBody';
