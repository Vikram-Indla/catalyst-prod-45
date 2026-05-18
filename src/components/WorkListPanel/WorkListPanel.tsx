/**
 * WorkListPanel — Split-view left rail (360px fixed width).
 * Contains toolbar (search, filter, sort, refresh) and virtualized list of work items.
 *
 * Props:
 *   - projectKey: string — Project key (e.g. "BAU")
 *   - isLoading?: boolean — Show spinner while fetching items
 *   - items?: WorkItem[] — Array of work items to display
 *   - onClearFilters?: () => void — Callback when "Adjust filters" is clicked
 */
import React from 'react';
import SearchIcon from '@atlaskit/icon/glyph/search';
import './WorkListPanel.css';

export interface WorkItem {
  id: string;
  key: string;
  summary: string;
}

export interface WorkListPanelProps {
  projectKey: string;
  isLoading?: boolean;
  items?: WorkItem[];
  onClearFilters?: () => void;
}

export const WorkListPanel: React.FC<WorkListPanelProps> = ({
  projectKey,
  isLoading = false,
  items = [],
  onClearFilters,
}) => {
  return (
    <div
      data-testid="work-list-panel"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        height: '100%',
        width: '360px',
      }}
    >
      {/* Toolbar (auto height) */}
      <div data-testid="work-list-toolbar" style={{ flex: '0 0 auto' }}>
        {/* Toolbar content will be added in feature #18-24 */}
      </div>

      {/* List area (1fr height, scrollable) */}
      <div
        data-testid="work-list-items"
        style={{
          flex: '1 1 auto',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {isLoading ? (
          <div
            data-testid="work-list-loading"
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: '14px',
              color: 'var(--ds-text-subtlest, #626F86)',
            }}
          >
            Loading items…
          </div>
        ) : items.length === 0 ? (
          <div
            data-testid="work-list-empty-state"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <div
              data-testid="empty-state-icon"
              style={{
                marginBottom: '16px',
                color: 'var(--ds-icon-subtle, #626F86)',
              }}
            >
              <SearchIcon size="large" />
            </div>
            <p
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--ds-text, var(--cp-text-primary, #172B4D))',
              }}
            >
              No issues found
            </p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onClearFilters?.();
              }}
              style={{
                fontSize: '14px',
                color: 'var(--ds-link, #0055CC)',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              Adjust filters
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
};
