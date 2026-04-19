/**
 * CatalystKanban — Top-level hub-agnostic Kanban primitive.
 *
 * Composes the FilterBar (Atlaskit-native), CatalystKanbanBoard (Pragmatic
 * DnD) and density/theme wiring into a single mount point that every
 * Catalyst Hub can adopt with a small adapter.
 *
 *   ┌─ Host Hub Page ───────────────────────────────────────────────┐
 *   │   cards   = hubRows.map(adapter)                              │
 *   │   columns = HUB_COLUMNS                                       │
 *   │   <CatalystKanban                                             │
 *   │     cards={cards}                                             │
 *   │     columns={HUB_COLUMNS}                                     │
 *   │     statusToColumnId={hubStatusToColumnId}                    │
 *   │     columnIdToStatus={hubColumnIdToStatus}                    │
 *   │     filterFields={HUB_FILTER_FIELDS}                          │
 *   │     groupByOptions={HUB_GROUP_BY}                             │
 *   │     sortOptions={HUB_SORT}                                    │
 *   │     onCardClick={…}                                           │
 *   │     onStatusChange={…}                                        │
 *   │   />                                                          │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * Sustainability notes:
 *   • Filter / sort / group / density state is fully internal. Hubs
 *     that want URL-persistence wrap CatalystKanban with the existing
 *     useBoardUrlState hook; this primitive never couples to a route.
 *   • Theme tokens come from @atlaskit/tokens for chrome (filter bar,
 *     chips, triggers) and from KANBAN_TOKENS for the board surface
 *     because Atlaskit tokens don't yet cover "column body / card drag
 *     shadow / hover" precisely. When @atlaskit/tokens adds equivalent
 *     tokens, move these over.
 *   • Hub-specific chrome (progress bar, health dot, severity chip)
 *     surfaces via renderCardFooter. The primitive never learns about
 *     hub-specific fields.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { useTheme } from '@/hooks/useTheme';
import { readDensityPref, writeDensityPref } from './densityPrefs';
import { KANBAN_TOKENS, DENSITY_CONFIG, type KanbanDensity } from './kanban-tokens';
import { FilterBar } from './filters/FilterBar';
import type { MenuButtonOption } from './filters/MenuButton';
import { CatalystKanbanBoard, resolveCatalystDrop } from './CatalystKanbanBoard';
import type { CatalystKanbanProps, KanbanCardData, KanbanGroupByOption } from './catalyst-types';

const DEFAULT_GROUP: MenuButtonOption[] = [{ id: 'none', label: 'None' }];
const DEFAULT_SORT: MenuButtonOption[] = [{ id: 'default', label: 'Default order' }];
const DENSITY_OPTIONS: MenuButtonOption[] = [
  { id: 'compact',     label: 'Compact' },
  { id: 'dense',       label: 'Dense' },
  { id: 'comfortable', label: 'Comfortable' },
];

export function CatalystKanban({
  cards,
  columns,
  statusToColumnId,
  columnIdToStatus,
  filterFields = [],
  groupByOptions = [],
  sortOptions = [],
  onCardClick,
  onStatusChange,
  renderCardFooter,
  onCreate,
  createLabel,
  storageKey,
}: CatalystKanbanProps) {
  const { isDark } = useTheme();
  const tk = isDark ? KANBAN_TOKENS.dark : KANBAN_TOKENS.light;
  const avatarsByName = useProfileAvatarsByName();

  /* ═════ State ═════ */
  const densityKey = storageKey ? `catalyst-kanban:${storageKey}:density` : undefined;
  const [density, setDensity] = useState<KanbanDensity>(() => readDensityPref('comfortable', densityKey));
  const onDensityChange = useCallback((id: string) => {
    const d = id as KanbanDensity;
    setDensity(d);
    writeDensityPref(d, densityKey);
  }, [densityKey]);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [groupBy, setGroupBy] = useState(groupByOptions[0]?.id ?? 'none');
  const [sortBy, setSortBy] = useState(sortOptions[0]?.id ?? 'default');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ═════ Menu button option lists (derived from hub schemas) ═════ */
  const groupMenu: MenuButtonOption[] = useMemo(() =>
    groupByOptions.length > 0 ? groupByOptions.map(g => ({ id: g.id, label: g.label })) : DEFAULT_GROUP,
    [groupByOptions],
  );
  const sortMenu: MenuButtonOption[] = useMemo(() =>
    sortOptions.length > 0 ? sortOptions.map(s => ({ id: s.id, label: s.label })) : DEFAULT_SORT,
    [sortOptions],
  );

  /* ═════ Filtering ═════ */
  const filtered = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    return cards.filter(card => {
      if (lowerSearch) {
        const hay = `${card.title} ${card.key} ${card.assigneeName ?? ''}`.toLowerCase();
        if (!hay.includes(lowerSearch)) return false;
      }
      for (const field of filterFields) {
        const selected = filters[field.id] ?? [];
        if (!field.matches(card, selected)) return false;
      }
      return true;
    });
  }, [cards, search, filters, filterFields]);

  /* ═════ Sorting ═════ */
  const sorted = useMemo(() => {
    const sortDef = sortOptions.find(s => s.id === sortBy);
    if (!sortDef) return filtered;
    return [...filtered].sort(sortDef.compare);
  }, [filtered, sortOptions, sortBy]);

  /* ═════ Swimlane buckets ═════ */
  const activeGroup: KanbanGroupByOption | undefined = useMemo(
    () => groupByOptions.find(g => g.id === groupBy),
    [groupByOptions, groupBy],
  );
  const swimlanes = useMemo(() => {
    if (!activeGroup || activeGroup.id === 'none') {
      return [{ key: '__all__', label: '', cards: sorted }];
    }
    const buckets = new Map<string, { key: string; label: string; cards: KanbanCardData[] }>();
    for (const card of sorted) {
      const key = activeGroup.getKey(card);
      const label = activeGroup.getLabel(card);
      if (!buckets.has(key)) buckets.set(key, { key, label, cards: [] });
      buckets.get(key)!.cards.push(card);
    }
    const arr = Array.from(buckets.values()).map(b => ({ ...b, size: b.cards.length }));
    if (activeGroup.compareBuckets) arr.sort(activeGroup.compareBuckets);
    return arr;
  }, [sorted, activeGroup]);

  /* ═════ Column maps (card ids per column) — one per swimlane. ═════ */
  const { cardsById, columnMapsBySwimlane, globalColumnMap } = useMemo(() => {
    const byId = new Map<string, KanbanCardData>();
    const perLane: Record<string, Record<string, string[]>> = {};
    const global: Record<string, string[]> = {};
    for (const col of columns) global[col.id] = [];
    for (const lane of swimlanes) {
      const map: Record<string, string[]> = {};
      for (const col of columns) map[col.id] = [];
      for (const card of lane.cards) {
        byId.set(card.id, card);
        const colId = statusToColumnId(card.status);
        if (colId && map[colId]) {
          map[colId].push(card.id);
          global[colId].push(card.id);
        }
      }
      perLane[lane.key] = map;
    }
    return { cardsById: byId, columnMapsBySwimlane: perLane, globalColumnMap: global };
  }, [swimlanes, columns, statusToColumnId]);

  /* ═════ Global drop monitor — single source of truth for drops. ═════ */
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === 'catalyst-card',
      onDrop: ({ source, location }) => {
        const sourceCardId = source.data.cardId as string;
        const sourceColumnId = source.data.columnId as string;
        const dropTargets = location.current.dropTargets;
        if (dropTargets.length === 0) return;
        const firstTarget = dropTargets[0];
        const targetType = firstTarget.data.type as 'catalyst-card' | 'catalyst-column';
        const targetColumnId = firstTarget.data.columnId as string;

        const resolved = resolveCatalystDrop({
          sourceCardId,
          sourceColumnId,
          targetType,
          targetColumnId,
          targetCardId: targetType === 'catalyst-card' ? (firstTarget.data.cardId as string) : undefined,
          edge: targetType === 'catalyst-card' ? extractClosestEdge(firstTarget.data) : null,
          columnMap: globalColumnMap,
        });
        if (!resolved) return;

        const card = cardsById.get(sourceCardId);
        if (!card) return;
        if (sourceColumnId === resolved.destColumnId) return;
        const newStatus = columnIdToStatus(resolved.destColumnId);
        if (!newStatus) return;
        onStatusChange?.(card, newStatus, resolved.destColumnId);
      },
    });
  }, [globalColumnMap, cardsById, columnIdToStatus, onStatusChange]);

  const onCardClickInternal = useCallback((id: string) => {
    setSelectedId(id);
    const card = cardsById.get(id);
    if (card) onCardClick?.(card);
  }, [cardsById, onCardClick]);

  /* ═════ Swimlane collapse state ═════ */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleLane = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  /* ═════ Filter mutators ═════ */
  const onFiltersChange = useCallback((fieldId: string, next: string[]) => {
    setFilters(prev => ({ ...prev, [fieldId]: next }));
  }, []);
  const onClearAll = useCallback(() => setFilters({}), []);

  const d = DENSITY_CONFIG[density];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0,
      background: tk.pageBg,
    }}>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        fields={filterFields}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearAll={onClearAll}
        groupByOptions={groupMenu}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        sortOptions={sortMenu}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        densityOptions={DENSITY_OPTIONS}
        density={density}
        onDensityChange={onDensityChange}
        allCards={cards}
        onCreate={onCreate}
        createLabel={createLabel}
      />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {swimlanes.map(lane => {
          const laneMap = columnMapsBySwimlane[lane.key] ?? {};
          const isCollapsed = collapsed.has(lane.key);
          const isSwimlaned = activeGroup && activeGroup.id !== 'none';
          return (
            <div key={lane.key} style={{ marginBottom: isSwimlaned ? 4 : 0 }}>
              {isSwimlaned && (
                <button
                  type="button"
                  onClick={() => toggleLane(lane.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    width: '100%', padding: '8px 24px',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: tk.textSecondary,
                    fontFamily: "'Inter', sans-serif",
                    borderTop: `1px solid ${tk.borderSubtle}`,
                  }}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <span>{lane.label || 'Ungrouped'}</span>
                  <span style={{
                    marginLeft: 6, fontSize: 11, fontWeight: 500,
                    color: tk.textMuted,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{lane.cards.length}</span>
                </button>
              )}
              {!isCollapsed && (
                <CatalystKanbanBoard
                  columns={columns}
                  columnMap={laneMap}
                  cardsById={cardsById}
                  avatarsByName={avatarsByName}
                  onCardClick={onCardClickInternal}
                  d={d}
                  tk={tk}
                  selectedId={selectedId}
                  renderCardFooter={renderCardFooter}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
