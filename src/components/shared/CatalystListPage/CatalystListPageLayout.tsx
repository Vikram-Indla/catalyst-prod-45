/**
 * CatalystListPageLayout — full-page shell for any Catalyst list/directory surface.
 *
 * Owns the AtlaskitPageShell wrapper so callers don't need to import it.
 * Composes the standard stacking order:
 *
 *   AtlaskitPageShell (flush, chromeBand passthrough)
 *     └─ CatalystQuickTabBar   (tabs + right CTA — optional)
 *     └─ CatalystListToolbar   (search + dropdowns + actions — optional)
 *     └─ content area
 *          ├─ CatalystBulkActionBar  (shown when selectedCount > 0)
 *          ├─ children              (the JiraTable or any content)
 *          └─ footer                (e.g., "X of Y filters" row count)
 *
 * Reuse examples:
 *   - Project Filters list (BAU Filters)
 *   - Project Boards list  (BAU Boards)
 *   - Project Roadmap list (BAU Roadmaps)
 *   - Any future hub directory page
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import { AtlaskitPageShell } from '@/components/ads';
import { CatalystQuickTabBar, type QuickTab } from './CatalystQuickTabBar';
import { CatalystListToolbar, type ToolbarFilter } from './CatalystListToolbar';
import { CatalystBulkActionBar, type BulkAction } from './CatalystBulkActionBar';

interface CatalystListPageLayoutProps {
  // ── AtlaskitPageShell passthrough ──────────────────────────────────────
  /** Renders in the chrome band above the white card (e.g., ProjectHeaderChip). */
  chromeBand?: React.ReactNode;

  // ── Tab bar ────────────────────────────────────────────────────────────
  tabs?: QuickTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  /** Right-side slot in the tab bar (e.g., "+ Create" button). */
  tabBarActions?: React.ReactNode;

  // ── Toolbar ────────────────────────────────────────────────────────────
  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (v: string) => void;
  toolbarFilters?: ToolbarFilter[];
  hasActiveFilters?: boolean;
  onClearAllFilters?: () => void;
  /** Extra nodes appended after "Clear all" in the toolbar (e.g., Export CSV). */
  toolbarActions?: React.ReactNode;

  // ── Bulk action bar ────────────────────────────────────────────────────
  selectedCount?: number;
  bulkActions?: BulkAction[];
  onDeselect?: () => void;

  // ── Content ────────────────────────────────────────────────────────────
  children: React.ReactNode;
  /** Optional footer rendered below children (e.g., "X of Y filters" count). */
  footer?: React.ReactNode;
}

export function CatalystListPageLayout({
  chromeBand,
  tabs,
  activeTab,
  onTabChange,
  tabBarActions,
  search,
  searchPlaceholder,
  onSearchChange,
  toolbarFilters,
  hasActiveFilters,
  onClearAllFilters,
  toolbarActions,
  selectedCount = 0,
  bulkActions,
  onDeselect,
  children,
  footer,
}: CatalystListPageLayoutProps) {
  const showTabBar = tabs && tabs.length > 0;
  const showToolbar = onSearchChange || (toolbarFilters && toolbarFilters.length > 0) || toolbarActions;

  return (
    <AtlaskitPageShell flush chromeBand={chromeBand ?? null}>
      {showTabBar && onTabChange ? (
        <CatalystQuickTabBar
          tabs={tabs}
          activeTab={activeTab ?? tabs[0]?.id ?? ''}
          onTabChange={onTabChange}
          actions={tabBarActions}
        />
      ) : null}

      {showToolbar && (
        <CatalystListToolbar
          search={search}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
          filters={toolbarFilters}
          hasActiveFilters={hasActiveFilters}
          onClearAll={onClearAllFilters}
          actions={
            tabBarActions && !showTabBar
              ? <>{toolbarActions}{tabBarActions}</>
              : toolbarActions
          }
        />
      )}

      {!showToolbar && tabBarActions && !showTabBar && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 24px' }}>
          {tabBarActions}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 32px' }}>
        {selectedCount > 0 && onDeselect && (
          <CatalystBulkActionBar
            selectedCount={selectedCount}
            actions={bulkActions}
            onDeselect={onDeselect}
          />
        )}

        {children}

        {footer && (
          <div
            style={{
              padding: '8px 4px',
              fontSize: 'var(--ds-font-size-200)',
              color: token('color.text.subtlest'),
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </AtlaskitPageShell>
  );
}
