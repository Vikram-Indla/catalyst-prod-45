/**
 * ═══════════════════════════════════════════════════════════════════
 * TriggerSearch — Advanced search and filter controls for triggers
 * ═══════════════════════════════════════════════════════════════════
 */

import { memo, useCallback } from 'react';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import AdsSelect from '@atlaskit/select';
import { Lozenge } from '@/components/ads';
import CustomizeIcon from '@atlaskit/icon/core/customize';
import FilterIcon from '@atlaskit/icon/core/filter';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import SearchIcon from '@atlaskit/icon/core/search';
import ShieldIcon from '@atlaskit/icon/core/shield';
import { HUB_SOURCES, type HubSource } from '@/constants/notificationEvents';
import type { TriggerCategory, TriggerFilters } from '@/types/notification-triggers';

// ── Hub labels ──────────────────────────────────────────────────
const HUB_LABELS: Record<string, string> = {
  All: 'All Hubs',
  StrategyHub: 'Strategy',
  ProductHub: 'Product',
  ProjectHub: 'Project',
  ReleaseHub: 'Release',
  TestHub: 'Test',
  IncidentHub: 'Incident',
  Tasks: 'Task',
  PlanHub: 'Plan',
  WikiHub: 'Wiki',
  CrossHub: 'Cross-Hub',
};

// ── Category options ────────────────────────────────────────────
const CATEGORY_OPTIONS: { key: string; label: string }[] = [
  { key: 'All', label: 'All Categories' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'status_changes', label: 'Status Changes' },
  { key: 'comments_mentions', label: 'Comments & Mentions' },
  { key: 'approvals_signoffs', label: 'Approvals & Sign-offs' },
  { key: 'incidents_sla', label: 'Incidents & SLA' },
  { key: 'testing', label: 'Testing' },
  { key: 'strategy_okrs', label: 'Strategy & OKRs' },
  { key: 'documents_wiki', label: 'Documents & Wiki' },
  { key: 'dependencies_links', label: 'Dependencies & Links' },
  { key: 'system_ai', label: 'System & AI' },
  { key: 'releases', label: 'Releases' },
  { key: 'planning', label: 'Planning' },
  { key: 'product_ideas', label: 'Product & Ideas' },
];

// ── Props ───────────────────────────────────────────────────────
interface TriggerSearchProps {
  filters: TriggerFilters;
  onFiltersChange: (filters: TriggerFilters) => void;
  filteredCount: number;
  totalCount: number;
  groupCount: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const TriggerSearch = memo(function TriggerSearch({
  filters,
  onFiltersChange,
  filteredCount,
  totalCount,
  groupCount,
  onExpandAll,
  onCollapseAll,
}: TriggerSearchProps) {
  const hasActiveFilters =
    filters.hub !== 'All' ||
    filters.category !== 'All' ||
    filters.search !== '' ||
    filters.enabledOnly ||
    filters.mandatoryOnly;

  const activeFilterCount = [
    filters.hub !== 'All',
    filters.category !== 'All',
    filters.search !== '',
    filters.enabledOnly,
    filters.mandatoryOnly,
  ].filter(Boolean).length;

  const resetFilters = useCallback(() => {
    onFiltersChange({
      hub: 'All',
      category: 'All',
      search: '',
      enabledOnly: false,
      mandatoryOnly: false,
    });
  }, [onFiltersChange]);

  return (
    <div className="space-y-3">
      {/* ── Main filter row ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search input */}
        <div className="flex-1 min-w-[240px]">
          <Textfield
            placeholder="Search triggers by name, key, or description..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: (e.target as HTMLInputElement).value })}
            elemBeforeInput={
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                <SearchIcon label="" size="small" />
              </span>
            }
          />
        </div>

        {/* Hub filter */}
        <div style={{ minWidth: '150px' }}>
          <AdsSelect
            value={{ label: HUB_LABELS[filters.hub] || filters.hub, value: filters.hub }}
            options={[
              { label: 'All Hubs', value: 'All' },
              ...HUB_SOURCES.map(hub => ({ label: HUB_LABELS[hub], value: hub })),
            ]}
            onChange={(opt) => onFiltersChange({ ...filters, hub: (opt?.value ?? 'All') as HubSource | 'All' })}
          />
        </div>

        {/* Category filter */}
        <div style={{ minWidth: '190px' }}>
          <AdsSelect
            value={{ label: CATEGORY_OPTIONS.find(o => o.key === filters.category)?.label || filters.category, value: filters.category }}
            options={CATEGORY_OPTIONS.map(opt => ({ label: opt.label, value: opt.key }))}
            onChange={(opt) => onFiltersChange({ ...filters, category: (opt?.value ?? 'All') as TriggerCategory | 'All' })}
          />
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--ds-border-layout, #EBECF0)', flexShrink: 0 }} />

        {/* Toggle filters */}
        <Button
          appearance={filters.enabledOnly ? 'primary' : 'default'}
          onClick={() => onFiltersChange({ ...filters, enabledOnly: !filters.enabledOnly })}
          iconBefore={FilterIcon}
        >
          Enabled
        </Button>

        <Button
          appearance={filters.mandatoryOnly ? 'danger' : 'default'}
          onClick={() => onFiltersChange({ ...filters, mandatoryOnly: !filters.mandatoryOnly })}
          iconBefore={ShieldIcon}
        >
          Mandatory
        </Button>

        {/* Reset filters */}
        {hasActiveFilters && (
          <Button
            appearance="subtle"
            onClick={resetFilters}
            iconBefore={RefreshIcon}
          >
            Reset
            {activeFilterCount > 0 && (
              <span className="ml-1">
                <Lozenge appearance="inprogress">{activeFilterCount}</Lozenge>
              </span>
            )}
          </Button>
        )}
      </div>

      {/* ── Status row ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--ds-text-subtlest,var(--cp-ink-4, var(--cp-border-neutral-light, #94A3B8)))]">
          Showing{' '}
          <span className="font-medium font-['JetBrains_Mono'] text-[var(--ds-text-subtle,#475569)]">{filteredCount}</span>{' '}
          of{' '}
          <span className="font-medium font-['JetBrains_Mono'] text-[var(--ds-text-subtle,#475569)]">{totalCount}</span>{' '}
          triggers across{' '}
          <span className="font-medium font-['JetBrains_Mono'] text-[var(--ds-text-subtle,#475569)]">{groupCount}</span>{' '}
          categories
        </span>

        <div className="flex items-center gap-1">
          <Button
            appearance="subtle"
            spacing="compact"
            iconBefore={CustomizeIcon}
            onClick={onExpandAll}
          >
            Expand All
          </Button>
          <Button
            appearance="subtle"
            spacing="compact"
            onClick={onCollapseAll}
          >
            Collapse All
          </Button>
        </div>
      </div>
    </div>
  );
});
