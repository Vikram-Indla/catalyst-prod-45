/**
 * KanbanToolbar — Canonical Jira-parity toolbar extracted from KanbanBoardPage.
 *
 * Phase 1 of the Catalyst canonical Kanban consolidation. This component is
 * the composed toolbar that ships with every hub's board (ProjectHub,
 * ProductHub, IncidentHub, Ideas, Team, Program). It owns:
 *
 *   • search input (48h row, 220w, 3px radius)
 *   • avatar stack filter (re-exported from ../KanbanToolbar.tsx — the old
 *     barrel file that houses AvatarStackFilter + the sub-filters; will be
 *     renamed in Phase 7 cleanup)
 *   • basic filter popover (epic / type / priority / assignee via
 *     JiraBasicFilter)
 *   • group-by popover
 *   • clear-filters button (only when active)
 *   • issue count (right-aligned, JetBrains Mono)
 *   • board-menu ••• with View Settings, Map Statuses, Advanced Filter
 *   • View Settings side panel (density + visible fields + expand/collapse)
 *   • Advanced Filter side panel
 *
 * Design rule: this component is **presentational**. All state + setters
 * come in via props. It owns no domain state of its own. That keeps the
 * toolbar easy to drop into any hub page once that hub's adapter is in
 * place.
 *
 * Phase 1 contract (no behavior change):
 *   - DOM structure is bit-identical to the previous inline block in
 *     KanbanBoardPage.tsx (lines 864-1017 before extraction).
 *   - Token usage unchanged — still reads from KanbanThemeTokens.
 *   - `tk`, `ENABLE_KANBAN_V2` and `onDensityChange` all flow through to
 *     ViewSettingsPanel exactly as before.
 *
 * Phase 2 will normalize the prop surface against BoardAdapter<T>; for now
 * we accept the full verbose shape so the extraction is mechanical and
 * reviewable diff-by-diff.
 */

import { useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MoreHorizontal, Settings2, Map as MapIcon, Filter } from 'lucide-react';
import type { KanbanThemeTokens, KanbanDensity } from '../kanban-tokens';
import { AvatarStackFilter } from '../KanbanToolbar';
import {
  AdvancedFilterPanel,
  type AdvancedFilters,
} from '../AdvancedFilterPanel';
import { FilterTriggerButton, JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import { GroupByPopover } from '@/components/shared/GroupByPopover';
import type { GroupByOption } from '@/components/shared/GroupByPopover';
import { ViewSettingsPanel } from '../ViewSettingsPanel';
import type { KanbanViewSettings } from '@/hooks/useKanbanViewSettings';

/* ═══ Board Menu Item (enterprise styling) ═══ */
function BoardMenuItem({
  icon, label, badge, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full"
      style={{
        padding: '10px 16px', background: 'transparent', border: 'none',
        cursor: 'pointer', fontSize: 14, color: 'var(--ds-text, var(--ds-text, #172B4D))', fontWeight: 450,
        textAlign: 'left', fontFamily: 'var(--cp-font-body)',
        transition: 'background 80ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
          background: '#0052CC', borderRadius: 10, padding: '1px 8px',
          lineHeight: '18px',
        }}>{badge}</span>
      )}
    </button>
  );
}

/* ═══ Props contract ═══ */
export interface KanbanToolbarProps<TGroupBy extends string = string> {
  /* Theme */
  tk: KanbanThemeTokens;

  /* Search */
  search: string;
  onSearchChange: (v: string) => void;

  /* Avatar stack */
  allAssignees: { name: string; count: number }[];
  selAssignees: Set<string>;
  onSelAssigneesChange: Dispatch<SetStateAction<Set<string>>>;
  avatarsByName: Map<string, string>;

  /* Basic filter popover */
  basicFilterCount: number;
  showBasicFilter: boolean;
  onShowBasicFilterChange: Dispatch<SetStateAction<boolean>>;
  filterCategories: FilterCategory[];
  filterSelected: Record<string, string[]>;
  onFilterChange: (categoryKey: string, values: string[]) => void;
  onClearBasicFilters: () => void;

  /* Group-by */
  groupBy: TGroupBy;
  onGroupByChange: (v: TGroupBy) => void;
  groupByOptions: GroupByOption<TGroupBy>[];
  groupByNoneKey: TGroupBy;

  /* Active filter count + clear-all */
  activeFilterCount: number;
  onClearAllFilters: () => void;

  /* Issue count */
  totalIssues: number;

  /* Board menu + View Settings + Advanced Filter */
  showBoardMenu: boolean;
  onShowBoardMenuChange: Dispatch<SetStateAction<boolean>>;
  showViewSettings: boolean;
  onShowViewSettingsChange: Dispatch<SetStateAction<boolean>>;
  showAdvancedFilter: boolean;
  onShowAdvancedFilterChange: Dispatch<SetStateAction<boolean>>;
  advancedFilters: AdvancedFilters;
  onAdvancedFiltersChange: (next: AdvancedFilters) => void;
  advFilterCount: number;

  /* View Settings */
  viewSettings: KanbanViewSettings;
  onUpdateViewSettings: (patch: Partial<KanbanViewSettings>) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;

  /* Density (Kanban V2 flag controls visibility) */
  enableDensity: boolean;
  density?: KanbanDensity;
  onDensityChange?: (d: KanbanDensity) => void;

  /* Map-statuses navigation target (e.g. "/project-hub/BAU/boards/map-statuses") */
  mapStatusesPath?: string;

  /* Project key for AdvancedFilterPanel (project-scoped advanced filter) */
  projectKey?: string;
}

/* ═══ KanbanToolbar — composed toolbar, presentational ═══ */
export function KanbanToolbar<TGroupBy extends string = string>({
  tk,
  search, onSearchChange,
  allAssignees, selAssignees, onSelAssigneesChange, avatarsByName,
  basicFilterCount, showBasicFilter, onShowBasicFilterChange,
  filterCategories, filterSelected, onFilterChange, onClearBasicFilters,
  groupBy, onGroupByChange, groupByOptions, groupByNoneKey,
  activeFilterCount, onClearAllFilters,
  totalIssues,
  showBoardMenu, onShowBoardMenuChange,
  showViewSettings, onShowViewSettingsChange,
  showAdvancedFilter, onShowAdvancedFilterChange,
  advancedFilters, onAdvancedFiltersChange, advFilterCount,
  viewSettings, onUpdateViewSettings, onExpandAll, onCollapseAll,
  enableDensity, density, onDensityChange,
  mapStatusesPath,
  projectKey,
}: KanbanToolbarProps<TGroupBy>) {
  const navigate = useNavigate();
  const boardMenuRef = useRef<HTMLDivElement>(null);

  /* Close board menu on outside click — behavior preserved from the
     previous inline effect in KanbanBoardPage.tsx. */
  useEffect(() => {
    if (!showBoardMenu) return;
    function handler(e: MouseEvent) {
      if (boardMenuRef.current && !boardMenuRef.current.contains(e.target as Node)) {
        onShowBoardMenuChange(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBoardMenu, onShowBoardMenuChange]);

  return (
    <div className="flex items-center gap-2 px-4 flex-wrap" style={{
      minHeight: 48, background: 'transparent',
      flexShrink: 0,
      paddingTop: 8, paddingBottom: 8,
    }}>
      {/* Search — 32h, 3px radius */}
      <div className="relative" style={{ width: 220 }}>
        <Search size={14} style={{ color: tk.textMuted }} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text" placeholder="Search board" value={search}
          onChange={e => onSearchChange(e.target.value)}
          style={{
            width: '100%', height: 32, paddingLeft: 30, paddingRight: 8,
            border: `1px solid ${tk.border}`, borderRadius: 3,
            fontSize: 14, fontWeight: 500,
            color: tk.textPrimary, background: tk.surfaceBg,
            outline: 'none', fontFamily: 'var(--cp-font-body)',
            transition: 'border-color 150ms ease',
          }}
          onFocus={e => e.currentTarget.style.borderColor = tk.selectedAccent}
          onBlur={e => e.currentTarget.style.borderColor = tk.border}
        />
      </div>

      {/* Avatar stack */}
      <AvatarStackFilter
        allAssignees={allAssignees}
        selected={selAssignees}
        onChange={onSelAssigneesChange}
        avatarsByName={avatarsByName}
        tk={tk}
      />

      {/* Canonical Filter */}
      <div style={{ position: 'relative' }}>
        <FilterTriggerButton
          count={basicFilterCount}
          onClick={() => onShowBasicFilterChange(p => !p)}
          isOpen={showBasicFilter}
        />
        {showBasicFilter && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100 }}>
            <JiraBasicFilter
              categories={filterCategories}
              selected={filterSelected}
              onSelectionChange={onFilterChange}
              onClearAll={onClearBasicFilters}
              onClose={() => onShowBasicFilterChange(false)}
            />
          </div>
        )}
      </div>

      {/* Canonical Group By */}
      <GroupByPopover<TGroupBy>
        value={groupBy}
        onChange={onGroupByChange}
        options={groupByOptions}
        noneKey={groupByNoneKey}
      />

      {/* Clear filters */}
      {activeFilterCount > 0 && (
        <button
          onClick={onClearAllFilters}
          style={{
            fontSize: 12, color: tk.selectedAccent, background: 'none',
            border: 'none', cursor: 'pointer', fontWeight: 500,
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          Clear ({activeFilterCount})
        </button>
      )}

      <div className="flex-1" />

      <span style={{ fontSize: 12, color: tk.textMuted, fontFamily: 'var(--cp-font-mono)' }}>
        {totalIssues} issues
      </span>

      {/* Board menu ••• */}
      <div ref={boardMenuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { onShowBoardMenuChange(v => !v); onShowViewSettingsChange(false); }}
          className="focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            /* Jira parity: 32h, 3px radius, transparent */
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 3, border: 'none', background: 'transparent',
            cursor: 'pointer', transition: 'background 150ms ease', outline: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = tk.surfaceHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Board menu"
        >
          <MoreHorizontal size={16} style={{ color: tk.textSecondary }} />
        </button>
        {showBoardMenu && !showViewSettings && (
          <div
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6,
              width: 240, background: tk.surfaceBg,
              border: `1px solid ${tk.border}`, borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.12)',
              zIndex: 50,
              padding: '6px 0', fontFamily: 'var(--cp-font-body)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '6px 16px 4px', fontSize: 11, fontWeight: 700, color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Board Options
            </div>
            <BoardMenuItem
              icon={<Settings2 size={16} style={{ color: tk.textSecondary }} />}
              label="View settings"
              onClick={() => { onShowBoardMenuChange(false); onShowViewSettingsChange(true); }}
            />
            {mapStatusesPath && (
              <BoardMenuItem
                icon={<MapIcon size={16} style={{ color: tk.textSecondary }} />}
                label="Map statuses"
                onClick={() => { onShowBoardMenuChange(false); navigate(mapStatusesPath); }}
              />
            )}
            <div style={{ height: 1, background: tk.borderSubtle, margin: '6px 12px' }} />
            <BoardMenuItem
              icon={<Filter size={16} style={{ color: tk.textSecondary }} />}
              label="Advanced filter"
              badge={advFilterCount > 0 ? advFilterCount : undefined}
              onClick={() => { onShowBoardMenuChange(false); onShowAdvancedFilterChange(true); }}
            />
          </div>
        )}
        {showViewSettings && (
          <ViewSettingsPanel
            settings={viewSettings}
            onUpdate={onUpdateViewSettings}
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
            onClose={() => onShowViewSettingsChange(false)}
            tk={tk}
            density={enableDensity ? density : undefined}
            onDensityChange={enableDensity ? onDensityChange : undefined}
          />
        )}
        {showAdvancedFilter && (
          <AdvancedFilterPanel
            projectKey={projectKey ?? ''}
            filters={advancedFilters}
            onChange={onAdvancedFiltersChange}
            onClose={() => onShowAdvancedFilterChange(false)}
            tk={tk}
          />
        )}
      </div>
    </div>
  );
}
