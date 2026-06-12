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
import SearchIcon from '@atlaskit/icon/core/search';
import MoreIcon from '@atlaskit/icon/glyph/more';
import SettingsIcon from '@atlaskit/icon/core/settings';
import LocationIcon from '@atlaskit/icon/core/location';
import EditIcon from '@atlaskit/icon/core/edit';
import FilterIcon from '@atlaskit/icon/core/filter';
import ArchiveBoxIcon from '@atlaskit/icon/core/archive-box';
import VideoIcon from '@atlaskit/icon/core/video';
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
        cursor: 'pointer', fontSize: 14, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))', fontWeight: 500,
        textAlign: 'left', fontFamily: 'var(--cp-font-body)',
        transition: 'background 80ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
          background: 'var(--cp-primary-60, #0052CC)', borderRadius: 10, padding: '1px 8px',
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
  /** False when groupBy==='none' — hides Swimlanes section in ViewSettingsPanel */
  hasSwimlanes?: boolean;
  /** Expand all disabled when all swimlanes already open */
  canExpandAll?: boolean;
  /** Collapse all disabled when all swimlanes already closed */
  canCollapseAll?: boolean;

  /* Density (Kanban V2 flag controls visibility) */
  enableDensity: boolean;
  density?: KanbanDensity;
  onDensityChange?: (d: KanbanDensity) => void;

  /* Map-statuses navigation target (e.g. "/project-hub/BAU/boards/map-statuses") */
  mapStatusesPath?: string;

  /* Project key for AdvancedFilterPanel (project-scoped advanced filter) */
  projectKey?: string;

  /* Archived view — admin/owner only; defaults to hidden */
  canArchive?: boolean;
  showArchived?: boolean;
  onShowArchivedChange?: Dispatch<SetStateAction<boolean>>;

  /* Rename board */
  onRenameBoard?: () => void;

  /* Standup modal */
  onStartStandup?: () => void;

  /* Quick filter pills (Jira parity: Assigned to me, Flagged, Recently updated, etc.) */
  quickFilters?: Set<string>;
  onQuickFiltersChange?: Dispatch<SetStateAction<Set<string>>>;
  /** Which pill keys are visible — controlled by View Settings */
  enabledQuickFilters?: string[];
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
  hasSwimlanes, canExpandAll, canCollapseAll,
  enableDensity, density, onDensityChange,
  mapStatusesPath,
  projectKey,
  canArchive, showArchived, onShowArchivedChange,
  onRenameBoard,
  onStartStandup,
  quickFilters, onQuickFiltersChange, enabledQuickFilters,
}: KanbanToolbarProps<TGroupBy>) {
  const navigate = useNavigate();
  const boardMenuRef = useRef<HTMLDivElement>(null);

  /* Quick filter pill definitions — use view-settings controlled list */
  const QUICK_FILTER_DEFS = [
    { key: 'assigned-to-me',   label: 'Assigned to me'  },
    { key: 'flagged',          label: 'Flagged'          },
    { key: 'recently-updated', label: 'Recently updated' },
    { key: 'high-priority',    label: 'High priority'    },
    { key: 'unassigned',       label: 'Unassigned'       },
    { key: 'in-progress',      label: 'In progress'      },
  ] as const;

  const toggleQuickFilter = (key: string) => {
    onQuickFiltersChange?.(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

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
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
          <SearchIcon label="" size="small" primaryColor={tk.textMuted} />
        </span>
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

      {/* Quick filter pills — only show the pills enabled in View Settings */}
      {onQuickFiltersChange && QUICK_FILTER_DEFS
        .filter(({ key }) => !enabledQuickFilters || enabledQuickFilters.includes(key))
        .map(({ key, label }) => {
        const active = quickFilters?.has(key) ?? false;
        return (
          <button
            key={key}
            onClick={() => toggleQuickFilter(key)}
            style={{
              height: 32, padding: '0 10px',
              border: 'none', borderRadius: 3,
              fontSize: 14, fontWeight: 500,
              color: active ? 'var(--ds-link, var(--cp-primary-60, #0052CC))' : tk.textPrimary,
              background: active ? 'var(--ds-background-selected, #DEEBFF)' : 'transparent',
              cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
              transition: 'background 100ms',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = tk.surfaceHover; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            {label}
          </button>
        );
      })}

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

      {/* View settings gear — direct access button (Jira parity: settings icon, no dropdown intermediary) */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { onShowViewSettingsChange(v => !v); onShowBoardMenuChange(false); }}
          className="focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 3, border: 'none',
            background: showViewSettings ? tk.surfaceHover : 'transparent',
            cursor: 'pointer', transition: 'background 150ms ease', outline: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = tk.surfaceHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = showViewSettings ? tk.surfaceHover : 'transparent'; }}
          aria-label="View settings"
          aria-pressed={showViewSettings}
        >
          <SettingsIcon label="View settings" size="small" primaryColor={showViewSettings ? tk.selectedAccent : tk.textSecondary} />
        </button>
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
            hasSwimlanes={hasSwimlanes}
            canExpandAll={canExpandAll}
            canCollapseAll={canCollapseAll}
          />
        )}
      </div>

      {/* Board menu ••• — Map statuses, Advanced filter, Standup, Archive */}
      <div ref={boardMenuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { onShowBoardMenuChange(v => !v); onShowViewSettingsChange(false); }}
          className="focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 3, border: 'none', background: 'transparent',
            cursor: 'pointer', transition: 'background 150ms ease', outline: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = tk.surfaceHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Board menu"
        >
          <MoreIcon label="Board menu" size="small" primaryColor={tk.textSecondary} />
        </button>
        {showBoardMenu && (
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
            <div style={{ padding: '6px 16px 4px', fontSize: 11, fontWeight: 600, color: tk.textMuted, letterSpacing: '0.04em' }}>
              Board options
            </div>
            {onRenameBoard && (
              <BoardMenuItem
                icon={<EditIcon label="" size="small" primaryColor={tk.textSecondary} />}
                label="Rename board"
                onClick={() => { onShowBoardMenuChange(false); onRenameBoard(); }}
              />
            )}
            {mapStatusesPath && (
              <BoardMenuItem
                icon={<LocationIcon label="" size="small" primaryColor={tk.textSecondary} />}
                label="Map statuses"
                onClick={() => { onShowBoardMenuChange(false); navigate(mapStatusesPath); }}
              />
            )}
            <BoardMenuItem
              icon={<FilterIcon label="" size="small" primaryColor={tk.textSecondary} />}
              label="Advanced filter"
              badge={advFilterCount > 0 ? advFilterCount : undefined}
              onClick={() => { onShowBoardMenuChange(false); onShowAdvancedFilterChange(true); }}
            />
            {onStartStandup && (
              <>
                <div style={{ height: 1, background: tk.borderSubtle, margin: '6px 12px' }} />
                <BoardMenuItem
                  icon={<VideoIcon label="" size="small" primaryColor={tk.textSecondary} />}
                  label="Start standup"
                  onClick={() => { onShowBoardMenuChange(false); onStartStandup(); }}
                />
              </>
            )}
            {canArchive && (
              <>
                <div style={{ height: 1, background: tk.borderSubtle, margin: '6px 12px' }} />
                <BoardMenuItem
                  icon={<ArchiveBoxIcon label="" size="small" primaryColor={showArchived ? 'var(--cp-primary-60, #0052CC)' : tk.textSecondary} />}
                  label={showArchived ? 'Hide archived issues' : 'Show archived issues'}
                  onClick={() => { onShowBoardMenuChange(false); onShowArchivedChange?.(v => !v); }}
                />
              </>
            )}
          </div>
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
