/**
 * KanbanBoardShell — canonical Kanban primitive (Phase 2).
 *
 * The shell is the hub-agnostic container that every Catalyst board will
 * eventually mount. It composes:
 *
 *   CatalystPageHeader  ──▶ page title
 *   KanbanToolbar       ──▶ search, avatar stack, filter, group-by, ••• menu
 *   PragmaticBoard      ──▶ the draggable column grid (via Pragmatic DnD)
 *
 * Everything hub-specific flows through a single `BoardAdapter<T>` prop.
 * The shell knows nothing about Supabase, Initiative rows, Incident types,
 * or any particular status enum — it just forwards the declarative data
 * and persistence callbacks the adapter supplies.
 *
 * Phase 2 scope: shell exists and is type-safe. ProjectHub continues to
 * use PragmaticBoard directly (its page predates this shell). Hubs
 * migrated in Phases 3-6 will use <KanbanBoardShell adapter={...} />.
 */
import { useMemo, useState, useCallback, useEffect } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { KanbanToolbar } from '@/components/kanban/toolbar/KanbanToolbar';
import { PragmaticBoard } from '@/components/kanban/PragmaticBoard';
import { QuickFilterChips, type QuickFilterId } from '@/components/kanban/QuickFilterChips';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';
import { KANBAN_TOKENS, DENSITY_CONFIG } from '@/components/kanban/kanban-tokens';
import type { KanbanDensity } from '@/components/kanban/kanban-tokens';
import { ENABLE_KANBAN_V2 } from '@/lib/featureFlags';
import { readDensityPref, writeDensityPref } from '@/components/kanban/densityPrefs';
import {
  type AdvancedFilters,
  EMPTY_ADVANCED_FILTERS,
  countAdvancedFilters,
} from '@/components/kanban/AdvancedFilterPanel';
import { useKanbanViewSettings } from '@/hooks/useKanbanViewSettings';
import {
  type BoardAdapter,
  buildColMapFromAdapter,
  buildIssuesByIdFromAdapter,
} from '@/components/kanban/adapters/BoardAdapter';

/* ═══════════════════════════════════════════════════════════════════════
   Props — a single adapter + minimal presentational context.
   ═══════════════════════════════════════════════════════════════════════ */

export interface KanbanBoardShellProps<THubRow = unknown> {
  adapter: BoardAdapter<THubRow>;
  /** Page title rendered in CatalystPageHeader. Default: "Board". */
  title?: string;
  /** Toggle for ENABLE_KANBAN_V2 features (density / URL state). */
  enableV2?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════
   Shell.
   ═══════════════════════════════════════════════════════════════════════ */

export function KanbanBoardShell<THubRow = unknown>({
  adapter,
  title = 'Board',
  enableV2 = ENABLE_KANBAN_V2,
}: KanbanBoardShellProps<THubRow>) {
  const { isDark } = useTheme();
  const tk = isDark ? KANBAN_TOKENS.dark : KANBAN_TOKENS.light;

  /* ─── Density ─── */
  const [density, setDensity] = useState<KanbanDensity>(
    enableV2 ? readDensityPref('comfortable') : 'comfortable',
  );
  const onDensityChange = useCallback((d: KanbanDensity) => {
    setDensity(d);
    writeDensityPref(d);
  }, []);
  const d = DENSITY_CONFIG[density];

  /* ─── View settings (hub-scoped, persisted via useKanbanViewSettings) ─── */
  const { settings: viewSettings, updateSettings: updateViewSettings } = useKanbanViewSettings(
    adapter.contextKey,
    null,
  );

  /* ─── Toolbar state owned by the shell (not the adapter) ─── */
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showBasicFilter, setShowBasicFilter] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const advFilterCount = countAdvancedFilters(advancedFilters);

  /* ─── Quick filter (Jira-parity board 597 quick filter set) ─── */
  const [quickFilter, setQuickFilter] = useState<QuickFilterId>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      setCurrentUserName(meta?.full_name ?? meta?.name ?? data.user?.email ?? null);
    });
  }, []);

  /* ─── Optimistic colMap (shell owns this; persist delegates to adapter) ─── */
  const initialColMap = useMemo(() => buildColMapFromAdapter(adapter), [adapter]);
  const [colMap, setColMap] = useState(initialColMap);
  // Re-sync colMap whenever the adapter's cards change identity (new fetch).
  useMemo(() => {
    setColMap(buildColMapFromAdapter(adapter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter.cards]);

  const issuesById = useMemo(() => buildIssuesByIdFromAdapter(adapter), [adapter.cards]);

  /* ─── Quick-filter predicate. Applied AFTER colMap so the optimistic-drag
       state is preserved; the filtered colMap is what PragmaticBoard receives. */
  const filteredColMap = useMemo(() => {
    if (!quickFilter) return colMap;
    const oneDayAgoMs = Date.now() - 24 * 60 * 60 * 1000;
    const passes = (cardId: string): boolean => {
      const issue = issuesById.get(cardId);
      if (!issue) return false;
      if (quickFilter === 'recently_updated') {
        const t = issue.updatedAt ? Date.parse(issue.updatedAt) : NaN;
        return Number.isFinite(t) && t >= oneDayAgoMs;
      }
      if (quickFilter === 'assigned_to_me') {
        return !!currentUserName && issue.assigneeName === currentUserName;
      }
      return true;
    };
    const next: typeof colMap = {};
    for (const [colId, ids] of Object.entries(colMap)) {
      next[colId] = ids.filter(passes);
    }
    return next;
  }, [colMap, issuesById, quickFilter, currentUserName]);

  /* ─── Counts for toolbar ─── */
  const totalIssues = adapter.cards.length;
  const basicFilterCount = Object.values(adapter.filterSelected).reduce(
    (sum, arr) => sum + arr.length,
    0,
  ) + adapter.selAssignees.size;
  const activeFilterCount = basicFilterCount + (advFilterCount > 0 ? 1 : 0);

  /* ─── Drop handler: optimistic reorder, delegate persist to adapter ─── */
  const handleDrop = useCallback(
    (event: { cardId: string; sourceColId: string; destColId: string; insertIndex: number }) => {
      setColMap(prev => {
        const next: typeof prev = { ...prev };
        const src = [...(next[event.sourceColId] ?? [])];
        const srcIdx = src.indexOf(event.cardId);
        if (srcIdx < 0) return prev;
        src.splice(srcIdx, 1);
        if (event.destColId === event.sourceColId) {
          src.splice(event.insertIndex, 0, event.cardId);
          next[event.sourceColId] = src;
        } else {
          const dst = [...(next[event.destColId] ?? [])];
          dst.splice(event.insertIndex, 0, event.cardId);
          next[event.sourceColId] = src;
          next[event.destColId] = dst;
        }
        return next;
      });
      // Delegate persistence. Adapter decides whether to call onStatusChange,
      // reorder, etc. Rejection surfaces as toast + rollback inside adapter.
      Promise.resolve(adapter.persistence.onDrop(event)).catch(() => {
        // Adapter is responsible for rolling back. Shell has already applied
        // the optimistic update; adapter can call setColMap via a ref if
        // rollback is needed. For now, we just log.
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[KanbanBoardShell] persistence.onDrop rejected; adapter should roll back.');
        }
      });
    },
    [adapter],
  );

  /* ─── Render ─── */
  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: tk.pageBg }}>
      <CatalystPageHeader title={title} />

      <KanbanToolbar<string>
        tk={tk}
        search={adapter.search}
        onSearchChange={adapter.onSearchChange}
        allAssignees={adapter.allAssignees}
        selAssignees={adapter.selAssignees}
        onSelAssigneesChange={(updater) => {
          // onSelAssigneesChange in adapter takes a Set; toolbar sends a SetState action.
          const next = typeof updater === 'function'
            ? (updater as (prev: Set<string>) => Set<string>)(adapter.selAssignees)
            : updater;
          adapter.onSelAssigneesChange(next);
        }}
        avatarsByName={adapter.avatarsByName}
        basicFilterCount={basicFilterCount}
        showBasicFilter={showBasicFilter}
        onShowBasicFilterChange={setShowBasicFilter}
        filterCategories={adapter.filterCategories}
        filterSelected={adapter.filterSelected}
        onFilterChange={adapter.onFilterChange}
        onClearBasicFilters={adapter.onClearFilters}
        groupBy={adapter.groupBy}
        onGroupByChange={adapter.onGroupByChange}
        groupByOptions={adapter.groupByOptions}
        groupByNoneKey={adapter.groupByNoneKey}
        activeFilterCount={activeFilterCount}
        onClearAllFilters={() => {
          adapter.onClearFilters();
          setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
        }}
        totalIssues={totalIssues}
        showBoardMenu={showBoardMenu}
        onShowBoardMenuChange={setShowBoardMenu}
        showViewSettings={showViewSettings}
        onShowViewSettingsChange={setShowViewSettings}
        showAdvancedFilter={showAdvancedFilter}
        onShowAdvancedFilterChange={setShowAdvancedFilter}
        advancedFilters={advancedFilters}
        onAdvancedFiltersChange={setAdvancedFilters}
        advFilterCount={advFilterCount}
        viewSettings={viewSettings}
        onUpdateViewSettings={updateViewSettings}
        onExpandAll={() => { /* no-op — shell does not render swimlanes yet */ }}
        onCollapseAll={() => { /* no-op — shell does not render swimlanes yet */ }}
        enableDensity={enableV2}
        density={density}
        onDensityChange={onDensityChange}
        mapStatusesPath={adapter.mapStatusesPath}
        projectKey={adapter.contextKey}
      />

      <QuickFilterChips active={quickFilter} onChange={setQuickFilter} tk={tk} />

      <div className="flex-1 min-h-0" style={{ overflow: 'auto', padding: '0 16px 16px 16px' }}>
        <PragmaticBoard
          columns={adapter.columns}
          colMap={filteredColMap}
          issuesById={issuesById}
          avatarsByName={adapter.avatarsByName}
          onCardClick={(id) => adapter.interactions?.onCardClick?.(id)}
          d={d}
          tk={tk}
          onDrop={handleDrop}
          onToggleFlag={adapter.persistence.onToggleFlag
            ? (id) => adapter.persistence.onToggleFlag!(id)
            : undefined}
          onCopyLink={adapter.interactions?.onCopyLink}
          onCopyKey={adapter.interactions?.onCopyKey}
          onCreateInColumn={adapter.interactions?.onCreateInColumn}
          createInColumnLabel={adapter.interactions?.createInColumnLabel}
          onChangeStatus={adapter.persistence.onStatusChange
            ? (id, s) => adapter.persistence.onStatusChange!(id, s)
            : undefined}
          onSaveSummary={adapter.persistence.onSaveSummary
            ? (id, summary) => adapter.persistence.onSaveSummary!(id, summary)
            : undefined}
          onChangeAssignee={adapter.persistence.onChangeAssignee
            ? (id, a) => adapter.persistence.onChangeAssignee!(id, a)
            : undefined}
          projectKey={adapter.contextKey}
          onLabelsUpdated={adapter.persistence.onLabelsUpdated
            ? (id, labels) => adapter.persistence.onLabelsUpdated!(id, labels)
            : undefined}
          onParentChange={adapter.persistence.onParentChange
            ? (id, p) => adapter.persistence.onParentChange!(id, p)
            : undefined}
          onArchive={adapter.persistence.onArchive
            ? (id) => adapter.persistence.onArchive!(id)
            : undefined}
          onDelete={adapter.persistence.onDelete
            ? (id) => adapter.persistence.onDelete!(id)
            : undefined}
          onMoved={adapter.persistence.onMoved
            ? (id, projectKey) => adapter.persistence.onMoved!(id, { projectKey })
            : undefined}
          onLinked={adapter.persistence.onLinked
            ? () => { /* signature mismatch — adapter receives full context elsewhere */ }
            : undefined}
          visibleFields={viewSettings.visibleFields}
          resolveIcon={adapter.resolveIcon as ((issue: import('@/components/kanban/kanban-types').BoardIssue) => React.ReactNode | null) | undefined}
          /*
            Swimlane resolver — adapter exposes swimlaneOf(groupBy) → fn|null.
            When groupBy != 'none' AND adapter.swimlaneOf returns a fn,
            PragmaticBoard switches to lane-band rendering. Otherwise the
            board renders flat (legacy path).
          */
          swimlaneOf={(() => {
            if (adapter.groupBy === adapter.groupByNoneKey) return undefined;
            const resolver = adapter.swimlaneOf?.(adapter.groupBy);
            if (!resolver) return undefined;
            return (issue: import('@/components/kanban/kanban-types').BoardIssue) =>
              resolver(issue as import('@/components/kanban/adapters/BoardAdapter').CanonicalBoardIssue);
          })()}
          swimlaneLabel={adapter.swimlaneLabel}
        />
      </div>
    </div>
  );
}
