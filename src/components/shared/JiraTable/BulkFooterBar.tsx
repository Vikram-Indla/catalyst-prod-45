/**
 * BulkFooterBar — bottom-anchored action bar for multi-selected rows.
 *
 * Shows when selectedCount > 0. Displays:
 * - "N selected" count
 * - "Select all" link to select all rows in scope
 * - Action buttons (Delete, Move, Transition, etc.)
 * - X close button to deselect all
 */
import React from 'react';
import { token } from '@atlaskit/tokens';

export interface BulkFooterBarProps {
  selectedCount: number;
  onSelectAll?: () => void;
  onDeselectAll: () => void;
  onDelete?: () => void;
  onMove?: () => void;
  onTransition?: () => void;
}

export function BulkFooterBar({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onMove,
  onTransition,
}: BulkFooterBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: token('color.background.neutral.subtle', '#F7F8F9'),
        borderTop: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
        zIndex: 100,
        boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9,30,66,0.13)'),
      }}
    >
      {/* Count and Select All */}
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: token('color.text', '#172B4D'),
        }}
      >
        {selectedCount} selected
      </span>

      {onSelectAll && (
        <>
          <span
            style={{
              color: token('color.text.subtlest', '#738496'),
            }}
          >
            ·
          </span>
          <button
            type="button"
            onClick={onSelectAll}
            style={{
              background: 'none',
              border: 'none',
              color: token('color.link', '#0C66E4'),
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            Select all
          </button>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Action Buttons */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          style={{
            padding: '6px 12px',
            borderRadius: 3,
            border: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
            background: token('color.background.neutral', '#FFFFFF'),
            color: token('color.text.danger', '#AE2A19'),
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Delete
        </button>
      )}

      {onMove && (
        <button
          type="button"
          onClick={onMove}
          style={{
            padding: '6px 12px',
            borderRadius: 3,
            border: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
            background: token('color.background.neutral', '#FFFFFF'),
            color: token('color.text', '#172B4D'),
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Move to...
        </button>
      )}

      {onTransition && (
        <button
          type="button"
          onClick={onTransition}
          style={{
            padding: '6px 12px',
            borderRadius: 3,
            border: `1px solid ${'var(--ds-border, #DFE1E6)'}`,
            background: token('color.background.neutral', '#FFFFFF'),
            color: token('color.text', '#172B4D'),
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Transition
        </button>
      )}

      {/* Close Button */}
      <button
        type="button"
        onClick={onDeselectAll}
        aria-label="Deselect all"
        style={{
          background: 'none',
          border: 'none',
          color: token('color.text.subtlest', '#738496'),
          cursor: 'pointer',
          fontSize: 16,
          padding: 0,
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>
    </div>
  );
}
