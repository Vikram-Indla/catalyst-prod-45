/**
 * WorkListHeader — Header for work list (F1.18)
 *
 * Title, item count, and create button.
 */
import React, { memo } from 'react';

export interface WorkListHeaderProps {
  itemCount: number;
  onCreateClick: () => void;
}

export const WorkListHeader = memo(function WorkListHeader({
  itemCount,
  onCreateClick,
}: WorkListHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 12px',
        borderBottom: '1px solid #DCDFE6',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: '#172B4D',
        }}
      >
        Work Items{' '}
        <span
          style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#626F86',
          }}
        >
          ({itemCount})
        </span>
      </h2>
      <button
        onClick={onCreateClick}
        style={{
          padding: '8px 12px',
          backgroundColor: '#0055CC',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '3px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background-color 150ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#0044A3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#0055CC';
        }}
      >
        Create
      </button>
    </div>
  );
});
