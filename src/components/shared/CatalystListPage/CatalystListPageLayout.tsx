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
  // Toolbar = search + filter dropdowns row (toolbarActions like Export CSV excluded from here)
  const showToolbar = onSearchChange || (toolbarFilters && toolbarFilters.length > 0);

  return (
    <AtlaskitPageShell flush chromeBand={chromeBand ?? null}>
      {/* Row 1: Tabs + primary CTA (tabBarActions) — always a clean navigation band */}
      {showTabBar && onTabChange ? (
        <CatalystQuickTabBar
          tabs={tabs}
          activeTab={activeTab ?? tabs[0]?.id ?? ''}
          onTabChange={onTabChange}
          actionsStretch={false}
          actions={tabBarActions}
        />
      ) : null}

      {/* Row 2: Search + filter dropdowns + secondary actions (Export CSV etc.).
          When no tab bar but a primary CTA (tabBarActions) is provided, inline
          the CTA at the right end of the toolbar row so it stays visible —
          matches the Catalyst CTA convention used on Filters/Boards/Roadmaps. */}
      {showToolbar ? (
        !showTabBar && tabBarActions ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 24px',
              flexShrink: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <CatalystListToolbar
                compact
                search={search}
                searchPlaceholder={searchPlaceholder}
                onSearchChange={onSearchChange}
                filters={toolbarFilters}
                hasActiveFilters={hasActiveFilters}
                onClearAll={onClearAllFilters}
                actions={toolbarActions}
              />
            </div>
            <div style={{ flexShrink: 0 }}>{tabBarActions}</div>
          </div>
        ) : (
          <CatalystListToolbar
            compact={showTabBar}
            search={search}
            searchPlaceholder={searchPlaceholder}
            onSearchChange={onSearchChange}
            filters={toolbarFilters}
            hasActiveFilters={hasActiveFilters}
            onClearAll={onClearAllFilters}
            actions={toolbarActions}
          />
        )
      ) : toolbarActions ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 24px' }}>
          {toolbarActions}
        </div>
      ) : null}

      {/* No tabs, no search, but CTA exists */}
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

        <div style={{ paddingTop: 12 }}>{children}</div>

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
