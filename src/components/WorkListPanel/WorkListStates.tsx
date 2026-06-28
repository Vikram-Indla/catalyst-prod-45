/**
 * WorkListStates — Empty and loading state displays (F1.14)
 *
 * Components for showing loading spinner and empty state messages.
 */
import React, { memo } from 'react';

export const WorkListLoadingState = memo(function WorkListLoadingState() {
  return (
    <div
      data-testid="loading-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: '16px',
        color: 'var(--ds-icon-subtle, #626F86)',
      }}
    >
      <div
        data-testid="loading-spinner"
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--ds-background-information, #E6EDFA)',
          borderTop: '3px solid var(--ds-link, #0C66E4)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ margin: 0, fontSize: '14px' }}>Loading work items...</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

export const WorkListEmptyState = memo(function WorkListEmptyState() {
  return (
    <div
      data-testid="empty-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: '12px',
        color: 'var(--ds-icon-subtle, #626F86)',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          opacity: 0.5,
        }}
      >
        📋
      </div>
      <h3
        style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))',
        }}
      >
        No items found
      </h3>
      <p style={{ margin: 0, fontSize: '14px', textAlign: 'center' }}>
        Create your first issue or adjust your filters to see items here.
      </p>
      <button
        style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: 'var(--ds-link, #0C66E4)',
          color: 'var(--ds-text-inverse, #FFFFFF)',
          border: 'none',
          borderRadius: '3px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background-color 150ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--ds-background-brand-bold, #0044A3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--ds-link, #0C66E4)';
        }}
      >
        Create issue
      </button>
    </div>
  );
});
