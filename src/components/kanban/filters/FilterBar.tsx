/**
 * FilterBar — The canonical Kanban filter row.
 *
 * Two-tier design (see §design in catalyst-types.ts):
 *
 *   Primary controls row (always visible)
 *     ┌─────────────────────────────────────────────────────────────────┐
 *     │ 🔍 Search  │ Assignees…  │ Field1 │ Field2 │ … │        Create │
 *     └─────────────────────────────────────────────────────────────────┘
 *
 *   Meta controls row (always visible)
 *     ┌─────────────────────────────────────────────────────────────────┐
 *     │ Group: None ▼  │ Sort: Score ▼  │ Density: Comfortable ▼  │ …  │
 *     └─────────────────────────────────────────────────────────────────┘
 *
 *   Active filter chips row (conditional)
 *     ┌─────────────────────────────────────────────────────────────────┐
 *     │ FILTERS  [dept: Finance ×] [quarter: Q2 2026 ×]  Clear all     │
 *     └─────────────────────────────────────────────────────────────────┘
 *
 * The two tiers stay visually separate so power users don't lose search
 * when they adjust a meta control. Active chips appear below the primary
 * row to keep the meta row from "jumping" as filters toggle.
 */
import { useMemo } from 'react';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { Plus } from 'lucide-react';
import type { KanbanCardData, KanbanFilterFieldDef } from '../catalyst-types';
import { SearchField } from './SearchField';
import { MultiSelectFilter } from './MultiSelectFilter';
import { MenuButton, type MenuButtonOption } from './MenuButton';
import { ActiveFilterChips, type ActiveFilterChip } from './ActiveFilterChips';

export interface FilterBarProps {
  search: string;
  onSearchChange: (next: string) => void;

  /** Hub-declared filter fields (department, priority, etc.) */
  fields: KanbanFilterFieldDef[];
  /** Current selection per field id. */
  filters: Record<string, string[]>;
  onFiltersChange: (fieldId: string, next: string[]) => void;
  onClearAll: () => void;

  /** Meta controls (group / sort / density). */
  groupByOptions: MenuButtonOption[];
  groupBy: string;
  onGroupByChange: (id: string) => void;

  sortOptions: MenuButtonOption[];
  sortBy: string;
  onSortByChange: (id: string) => void;

  densityOptions: MenuButtonOption[];
  density: string;
  onDensityChange: (id: string) => void;

  /** All cards in the board — used to derive option counts live. */
  allCards: KanbanCardData[];

  onCreate?: () => void;
  createLabel?: string;
}

export function FilterBar({
  search, onSearchChange,
  fields, filters, onFiltersChange, onClearAll,
  groupByOptions, groupBy, onGroupByChange,
  sortOptions, sortBy, onSortByChange,
  densityOptions, density, onDensityChange,
  allCards, onCreate, createLabel = 'Create',
}: FilterBarProps) {
  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    for (const field of fields) {
      const values = filters[field.id] ?? [];
      if (values.length === 0) continue;
      const options = field.getOptions(allCards);
      for (const v of values) {
        const opt = options.find(o => o.value === v);
        chips.push({
          fieldId: field.id,
          fieldLabel: field.label,
          value: v,
          valueLabel: opt?.label ?? v,
        });
      }
    }
    return chips;
  }, [fields, filters, allCards]);

  return (
    <div style={{ borderBottom: `1px solid ${token('color.border')}` }}>
      {/* Primary controls row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '12px 24px 10px',
      }}>
        <SearchField value={search} onChange={onSearchChange} />

        {fields.map(field => {
          const options = field.getOptions(allCards);
          return (
            <MultiSelectFilter
              key={field.id}
              label={field.label}
              icon={field.icon}
              options={options}
              selected={filters[field.id] ?? []}
              onChange={(next) => onFiltersChange(field.id, next)}
              width={field.width}
              testId={`kanban-filter-${field.id}`}
            />
          );
        })}

        <div style={{ flex: 1 }} />

        {onCreate && (
          <Button appearance="primary" onClick={onCreate} iconBefore={() => <Plus size={14} />}>
            {createLabel}
          </Button>
        )}
      </div>

      {/* Meta controls row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '0 24px 12px',
      }}>
        <MenuButton
          label="Group"
          value={groupBy}
          options={groupByOptions}
          onChange={onGroupByChange}
          testId="kanban-groupby"
        />
        <MenuButton
          label="Sort"
          value={sortBy}
          options={sortOptions}
          onChange={onSortByChange}
          testId="kanban-sort"
        />
        <MenuButton
          label="Density"
          value={density}
          options={densityOptions}
          onChange={onDensityChange}
          testId="kanban-density"
        />
      </div>

      {/* Active filter chips — only renders when filters non-empty. */}
      <ActiveFilterChips
        chips={activeChips}
        onRemove={(fieldId, value) => {
          const current = filters[fieldId] ?? [];
          onFiltersChange(fieldId, current.filter(v => v !== value));
        }}
        onClearAll={onClearAll}
      />
    </div>
  );
}
