/**
 * WorkspaceSearchBar — Slack-style top-of-shell search.
 *
 * A single full-width search input sitting above the grid (rail | sidebar |
 * panel). Clicking it opens the WorkspaceSearchModal which collects a query
 * and opens the WorkspaceSearchResultsPanel as a right rail listing matched
 * messages.
 */
import React from 'react';
import { SearchIcon } from '../shared/Icon';

interface WorkspaceSearchBarProps {
  workspaceLabel: string;
  onOpen: () => void;
}

export function WorkspaceSearchBar({ workspaceLabel, onOpen }: WorkspaceSearchBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gridColumn: '1 / -1',
        height: 44,
        padding: '0 12px',
        background: 'var(--cv2-bg-rail)',
        borderBottom: '1px solid var(--cv2-border)',
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Search ${workspaceLabel}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          maxWidth: 720,
          height: 28,
          padding: '0 12px',
          background: 'rgba(255,255,255,0.10)',
          color: 'rgba(255,255,255,0.85)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 6,
          fontFamily: 'var(--cv2-font)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <SearchIcon size={14} />
        <span style={{ flex: 1, textAlign: 'left' }}>{`Search ${workspaceLabel}`}</span>
      </button>
    </div>
  );
}
