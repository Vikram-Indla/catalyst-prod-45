/**
 * ═══════════════════════════════════════════════════════════════════
 * TriggerSearch — Advanced search and filter controls for triggers
 * ═══════════════════════════════════════════════════════════════════
 */

import { memo, useCallback } from 'react';
import { Search, Filter, Shield, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  TaskHub: 'Task',
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
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #94A3B8))]" />
          <Input
            placeholder="Search triggers by name, key, or description..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9 h-9 text-sm border-[var(--bd-default, #E2E8F0)] focus-visible:ring-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]"
          />
        </div>

        {/* Hub filter */}
        <Select
          value={filters.hub}
          onValueChange={(v) => onFiltersChange({ ...filters, hub: v as HubSource | 'All' })}
        >
          <SelectTrigger className="w-[150px] h-9 text-sm border-[var(--bd-default, #E2E8F0)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Hubs</SelectItem>
            {HUB_SOURCES.map((hub) => (
              <SelectItem key={hub} value={hub}>
                {HUB_LABELS[hub]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select
          value={filters.category}
          onValueChange={(v) => onFiltersChange({ ...filters, category: v as TriggerCategory | 'All' })}
        >
          <SelectTrigger className="w-[190px] h-9 text-sm border-[var(--bd-default, #E2E8F0)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        {/* Toggle filters */}
        <Button
          variant={filters.enabledOnly ? 'default' : 'outline'}
          size="sm"
          className={`text-xs h-8 ${
            filters.enabledOnly
              ? 'bg-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1D4ED8))] text-white'
              : 'border-[var(--bd-default, #E2E8F0)]'
          }`}
          onClick={() => onFiltersChange({ ...filters, enabledOnly: !filters.enabledOnly })}
        >
          <Filter className="h-3 w-3 mr-1" />
          Enabled
        </Button>

        <Button
          variant={filters.mandatoryOnly ? 'default' : 'outline'}
          size="sm"
          className={`text-xs h-8 ${
            filters.mandatoryOnly
              ? 'bg-[var(--ds-text-danger,var(--ds-text-danger, #DC2626))] hover:bg-[#B91C1C] text-white'
              : 'border-[var(--bd-default, #E2E8F0)]'
          }`}
          onClick={() => onFiltersChange({ ...filters, mandatoryOnly: !filters.mandatoryOnly })}
        >
          <Shield className="h-3 w-3 mr-1" />
          Mandatory
        </Button>

        {/* Reset filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8 text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))]"
            onClick={resetFilters}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
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
        <span className="text-xs text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #94A3B8))]">
          Showing{' '}
          <span className="font-medium font-['JetBrains_Mono'] text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))]">{filteredCount}</span>{' '}
          of{' '}
          <span className="font-medium font-['JetBrains_Mono'] text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))]">{totalCount}</span>{' '}
          triggers across{' '}
          <span className="font-medium font-['JetBrains_Mono'] text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))]">{groupCount}</span>{' '}
          categories
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] hover:text-[var(--ds-text,var(--ds-text, #0F172A))]"
            onClick={onExpandAll}
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-[var(--ds-text-subtle,var(--ds-text-subtle, #475569))] hover:text-[var(--ds-text,var(--ds-text, #0F172A))]"
            onClick={onCollapseAll}
          >
            Collapse All
          </Button>
        </div>
      </div>
    </div>
  );
});
