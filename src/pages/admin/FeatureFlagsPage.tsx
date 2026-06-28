// @ts-nocheck
/**
 * ⚠️ DEPRECATED (Phase -1 Cleanup, 2026-06-20)
 * This page is soft-deprecated via router redirect to /admin/access.
 * Hard removal scheduled after 1-release grace period (2026-08-20).
 * Reexport: FeatureFlagsContent from @/components/admin/FeatureFlagsContent
 *
 * FeatureFlagsPage — Nuclear Fix: 11 Critical Defects
 * V12 Hybrid Precision. All data from Supabase.
 */

import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import {
  useAdminFeatureFlags,
  useAdminFeatureFlagStats,
  useToggleAdminFeatureFlag,
  useBulkToggleAdminFeatureFlags,
} from '@/hooks/useAdminFeatureFlags';
import { featureFlagService } from '@/services/feature-flags';
import type { FeatureFlag, ModuleCategory } from '@/types/feature-flags';
import { catalystToast } from '@/lib/catalystToast';
import Spinner from '@atlaskit/spinner';
import SearchIcon from '@atlaskit/icon/core/search';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import FlagIcon from '@atlaskit/icon/core/flag';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import SortAscendingIcon from '@atlaskit/icon/core/sort-ascending';
import ArrowUpIcon from '@atlaskit/icon/core/arrow-up';
import ArrowDownIcon from '@atlaskit/icon/core/arrow-down';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import CompassIcon from '@atlaskit/icon/core/compass';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import CheckboxCheckedIcon from '@atlaskit/icon/core/checkbox-checked';
import ArchiveBoxIcon from '@atlaskit/icon/core/archive-box';
import BoardIcon from '@atlaskit/icon/core/board';
import BoardsIcon from '@atlaskit/icon/core/boards';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import ShieldIcon from '@atlaskit/icon/core/shield';
import CloudArrowUpIcon from '@atlaskit/icon/core/cloud-arrow-up';
import WarningIcon from '@atlaskit/icon/core/warning';
import BookWithBookmarkIcon from '@atlaskit/icon/core/book-with-bookmark';
import ChartBarIcon from '@atlaskit/icon/core/chart-bar';
import CreditCardIcon from '@atlaskit/icon/core/credit-card';
import SettingsIcon from '@atlaskit/icon/core/settings';
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
import { useTheme } from '@/hooks/useTheme';
import AtlasButton from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/admin/admin-alert-dialog';
import { AdminGuard } from '@/components/admin/AdminGuard';

// ── Constants ──────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Compass: CompassIcon,
  Calendar: CalendarIcon,
  CheckSquare: CheckboxCheckedIcon,
  Package: ArchiveBoxIcon,
  FolderKanban: BoardIcon,
  Layers: BoardsIcon,
  Users: PeopleGroupIcon,
  ShieldCheck: ShieldIcon,
  Rocket: CloudArrowUpIcon,
  AlertTriangle: WarningIcon,
  BookOpen: BookWithBookmarkIcon,
  BarChart3: ChartBarIcon,
  DollarSign: CreditCardIcon,
  Box: ArchiveBoxIcon,
  Settings: SettingsIcon,
};

const resolveIcon = (name: string): React.ElementType => ICON_MAP[name] || ArchiveBoxIcon;

const ICON_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue:    { bg: 'var(--ds-text-information)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
  teal:    { bg: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold))', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
  red:     { bg: 'var(--ds-background-danger-subtler)', text: 'var(--ds-text-danger)' },
  neutral: { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)' },
};

// V12 StatusLozenge: LIVE=Green, DRAFT=Grey, BETA=Blue
const STATUS_LOZENGE: Record<string, { bg: string; text: string }> = {
  live:  { bg: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold))', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
  draft: { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)' },
  beta:  { bg: 'var(--ds-text-information)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
};

// D03: Category badges with distinct colors per MARAM V3.1.1
const CATEGORY_BADGE: Record<ModuleCategory, { bg: string; text: string; border: string }> = {
  Strategy:   { bg: 'var(--ds-background-selected)', text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', border: 'var(--ds-border-information)' },
  Product:    { bg: 'var(--ds-background-neutral)', text: 'var(--ds-text)', border: 'var(--ds-border-neutral)' },
  Delivery:   { bg: 'var(--ds-background-selected)', text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', border: 'var(--ds-border-information)' },
  Quality:    { bg: 'var(--ds-background-success-subtler)', text: 'var(--cp-teal-60, var(--ds-chart-teal-bold))', border: 'var(--ds-border-success)' },
  Operations: { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger, var(--cp-danger))', border: 'var(--ds-border-danger)' },
};

const ENVIRONMENT = 'production' as const;

const CATEGORIES: ModuleCategory[] = ['Strategy', 'Product', 'Delivery', 'Quality', 'Operations'];

type FilterMode = 'all' | 'enabled' | 'disabled';

// Grid columns: checkbox | module | category | status | enabled(toggle) | updated | actions
const GRID_COLS = '40px 1fr 100px 80px 72px 150px 72px';

// ── Debounce hook ──────────────────────────────────────────
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ── Memoized Row Component ─────────────────────────────────
interface RowProps {
  flag: FeatureFlag;
  isSelected: boolean;
  isPending: boolean;
  onToggle: (flag: FeatureFlag, enabled: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
}

const FlagRow = memo(function FlagRow({ flag, isSelected, isPending, onToggle, onSelect }: RowProps) {
  const { isDark } = useTheme();
  const Icon = resolveIcon(flag.icon_name);
  const iconColor = ICON_COLOR_MAP[flag.icon_color] || ICON_COLOR_MAP.neutral;
  const statusStyle = STATUS_LOZENGE[flag.status] || STATUS_LOZENGE.draft;
  const catStyle = CATEGORY_BADGE[flag.category] || CATEGORY_BADGE.Operations;
  const description = flag.description || flag.module_key;
  const updatedByName = flag.updated_by_name || 'System';

  return (
    <div
      className={`group grid items-center gap-0 ${isDark ? "bg-[var(--ds-surface)]" : "bg-white"}`}
      style={{
        gridTemplateColumns: GRID_COLS,
        height: 52,
        borderBottom: `0.75px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.06))'}`,
        transition: 'background-color 120ms ease',
        ...(isSelected ? { backgroundColor: 'var(--ds-background-selected-hovered, rgba(37,99,235,0.08))' } : {}),
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--cp-interact-hover, rgba(15,23,42,0.04))'; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))'; }}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(flag.id, e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:ring-offset-2"
          aria-label={`Select ${flag.module_name}`}
        />
      </div>

      {/* Module */}
      <div className="flex items-center gap-3 px-3 min-w-0">
        <div
          className="w-[34px] h-[34px] rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: iconColor.bg, color: iconColor.text }}
        >
          <Icon label="" size="small" />
        </div>
        <div className="min-w-0">
          <div
            className="truncate"
            style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))' }}
            title={flag.module_name}
          >
            {flag.module_name}
          </div>
          <div
            className="truncate"
            style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-100)', color: 'var(--cp-text-tertiary, var(--ds-text-subtlest))', maxWidth: 280 }}
            title={description}
          >
            {description}
          </div>
        </div>
      </div>

      {/* Category Badge — D03 */}
      <div className="px-3">
        <span
          className="inline-flex items-center"
          style={{
            height: 20,
            padding: '0 8px',
            background: catStyle.bg,
            color: catStyle.text,
            border: `1px solid ${catStyle.border}`,
            fontFamily: 'var(--cp-font-body)',
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 600,
            letterSpacing: '0.03em',
            /* sentence-case per CLAUDE.md */
            borderRadius: 4,
          }}
          aria-label={`Category: ${flag.category}`}
        >
          {flag.category}
        </span>
      </div>

      {/* Status — D06: LIVE=Green */}
      <div className="px-3">
        <span
          className="inline-flex items-center"
          style={{
            height: 20,
            padding: '0 8px',
            background: statusStyle.bg,
            color: statusStyle.text,
            fontFamily: 'var(--cp-font-body)',
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 700,
            letterSpacing: '0.03em',
            /* sentence-case per CLAUDE.md */
            borderRadius: 4,
          }}
          aria-label={`Status: ${flag.status}`}
        >
          {flag.status}
        </span>
      </div>

      {/* Toggle — D04: Real switch */}
      <div className="flex items-center justify-center">
        <Toggle
          isChecked={flag.enabled}
          onChange={() => onToggle(flag, !flag.enabled)}
          isDisabled={isPending}
          label={`${flag.enabled ? 'Disable' : 'Enable'} ${flag.module_name}`}
        />
      </div>

      {/* Updated */}
      <div className="px-3 min-w-0">
        <div style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', fontVariantNumeric: 'tabular-nums' }}>
          {new Date(flag.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
        <div
          className="truncate"
          style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-100)', color: 'var(--cp-text-muted, var(--cp-ink-4, var(--cp-border-neutral-light, var(--ds-text-disabled))))', maxWidth: 120 }}
          title={updatedByName}
        >
          {updatedByName}
        </div>
      </div>

      {/* D10: Hover-reveal row actions */}
      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-120">
        <button
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--ds-shadow-overlay, rgba(15,23,42,0.04))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:ring-offset-2"
          aria-label="Configure module"
          style={{ borderRadius: 4 }}
        >
          <span style={{ display: 'inline-flex', color: 'var(--cp-text-tertiary, var(--cp-ink-3, var(--cp-text-secondary, var(--ds-text-subtlest))))' }}><SettingsIcon label="" size="small" /></span>
        </button>
        <button
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--ds-shadow-overlay, rgba(15,23,42,0.04))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:ring-offset-2"
          aria-label="More options"
          style={{ borderRadius: 4 }}
        >
          <span style={{ display: 'inline-flex', color: 'var(--cp-text-tertiary, var(--cp-ink-3, var(--cp-text-secondary, var(--ds-text-subtlest))))' }}><ShowMoreHorizontalIcon label="" size="small" /></span>
        </button>
      </div>
    </div>
  );
});

// ── Group Header Row ───────────────────────────────────────
interface GroupHeaderProps {
  category: ModuleCategory;
  count: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isFirst: boolean;
}

const GroupHeaderRow = memo(function GroupHeaderRow({ category, count, isCollapsed, onToggleCollapse, isFirst }: GroupHeaderProps) {
  const { isDark } = useTheme();
  return (
    <div
      className="flex items-center gap-2 cursor-pointer select-none"
      onClick={onToggleCollapse}
      style={{
        height: 50,
        padding: '8px 12px',
        background: 'var(--cp-bg-page, var(--ds-surface-sunken))',
        borderTop: isFirst ? 'none' : `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`,
        borderBottom: `0.75px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.06))'}`,
      }}
      role="row"
      aria-expanded={!isCollapsed}
    >
      {isCollapsed ? (
        <span style={{ display: 'inline-flex', color: 'var(--cp-text-muted, var(--cp-ink-4, var(--cp-border-neutral-light, var(--ds-text-disabled))))' }}><ChevronRightIcon label="" size="small" /></span>
      ) : (
        <span style={{ display: 'inline-flex', color: 'var(--cp-text-muted, var(--cp-ink-4, var(--cp-border-neutral-light, var(--ds-text-disabled))))' }}><ChevronDownIcon label="" size="small" /></span>
      )}
      <span style={{
        fontFamily: 'var(--cp-font-body)',
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 600,
        letterSpacing: '0.06em',
        /* sentence-case per CLAUDE.md */
        color: 'var(--cp-text-tertiary, var(--cp-ink-3, var(--cp-text-secondary, var(--ds-text-subtlest))))',
      }}>
        {category}
      </span>
      <span
        style={{
          fontFamily: 'var(--cp-font-body)',
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 500,
          color: 'var(--cp-text-tertiary, var(--cp-ink-3, var(--cp-text-secondary, var(--ds-text-subtlest))))',
          background: 'var(--cp-border, var(--ds-border))',
          borderRadius: 9999,
          padding: '0 8px',
        }}
      >
        {count}
      </span>
    </div>
  );
});

// ── Main Page ──────────────────────────────────────────────

export default function FeatureFlagsPage() {
  const { isDark } = useTheme();
  const environment = ENVIRONMENT;
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebounce(searchInput, 150);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [categoryFilter, setCategoryFilter] = useState<ModuleCategory | 'all'>('all');
  const [sortField, setSortField] = useState<'updated_at' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDisableOpen, setBulkDisableOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<ModuleCategory>>(new Set());

  const { data: flags, isLoading, isFetching, error, refetch } = useAdminFeatureFlags(environment);
  const { data: stats } = useAdminFeatureFlagStats(environment);
  const toggleMutation = useToggleAdminFeatureFlag();
  const bulkMutation = useBulkToggleAdminFeatureFlags();

  // Derived: filter + search + sort
  const filteredFlags = useMemo(() => {
    if (!flags) return [];
    let result = [...flags];
    if (filterMode === 'enabled') result = result.filter((f) => f.enabled);
    if (filterMode === 'disabled') result = result.filter((f) => !f.enabled);
    if (categoryFilter !== 'all') result = result.filter((f) => f.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.module_name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.module_key.toLowerCase().includes(q),
      );
    }
    if (sortField) {
      result.sort((a, b) => {
        const diff = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        return sortDir === 'asc' ? diff : -diff;
      });
    }
    return result;
  }, [flags, filterMode, categoryFilter, searchQuery, sortField, sortDir]);

  // Group by category
  const groupedFlags = useMemo(() => {
    const groups: { category: ModuleCategory; flags: FeatureFlag[] }[] = [];
    for (const cat of CATEGORIES) {
      const catFlags = filteredFlags.filter((f) => f.category === cat);
      if (catFlags.length > 0) {
        groups.push({ category: cat, flags: catFlags.sort((a, b) => a.sort_order - b.sort_order) });
      }
    }
    return groups;
  }, [filteredFlags]);

  // Handlers
  const handleToggle = useCallback(
    async (flag: FeatureFlag, newEnabled: boolean) => {
      if (!newEnabled) {
        try {
          const dependents = await featureFlagService.getDependents(flag.module_key);
          if (dependents.length > 0) {
            catalystToast.warning(
              `${dependents.join(', ')} depend${dependents.length === 1 ? 's' : ''} on ${flag.module_name}`,
              {
                description: `Disabling ${flag.module_name} may break dependent module functionality.`,
                duration: Infinity,
                action: { label: 'Disable Anyway', onClick: () => toggleMutation.mutate({ id: flag.id, enabled: false, environment }) },
                cancel: { label: 'Cancel', onClick: () => {} },
              },
            );
            return;
          }
        } catch { /* proceed on dependency check failure */ }
      }
      toggleMutation.mutate({ id: flag.id, enabled: newEnabled, environment });
    },
    [environment, toggleMutation],
  );

  const handleSort = useCallback((field: 'updated_at') => {
    setSortField((prev) => { if (prev === field) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return prev; } setSortDir('desc'); return field; });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(filteredFlags.map((f) => f.id)) : new Set());
  }, [filteredFlags]);

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => { const next = new Set(prev); checked ? next.add(id) : next.delete(id); return next; });
  }, []);

  const handleBulkDisableConfirm = useCallback(() => {
    if (confirmText !== 'DISABLE') return;
    bulkMutation.mutate({ enabled: false, environment });
    setBulkDisableOpen(false);
    setConfirmText('');
    setSelectedIds(new Set());
  }, [confirmText, environment, bulkMutation]);

  // Environment tabs removed — production only

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setFilterMode('all');
    setCategoryFilter('all');
  }, []);

  const toggleGroupCollapse = useCallback((cat: ModuleCategory) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  const allEnabled = flags?.every((f) => f.enabled) ?? false;
  const noneEnabled = flags?.every((f) => !f.enabled) ?? true;
  const hasActiveFilters = searchInput.trim() || filterMode !== 'all' || categoryFilter !== 'all';

  // ── Loading: first load → full skeleton ────────────────
  if (isLoading) {
    return (
      <div className={`flex-1 min-w-0 ${isDark ? "bg-[var(--ds-surface)]" : "bg-white"}`} style={{ padding: '24px 32px' }}>
        <div className="h-7 w-48 bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] rounded mb-1 animate-pulse" />
        <div className="h-4 w-80 bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] rounded mb-6 animate-pulse" />
        <div className="h-14 bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] rounded-md mb-4 animate-pulse" style={{ border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`, borderRadius: 6 }} />
        <div className="flex gap-2 mb-3">
          <div className="h-9 w-64 bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] rounded animate-pulse" />
          <div className="h-9 w-16 bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] rounded animate-pulse" />
        </div>
        <div className={`overflow-hidden ${isDark ? "bg-[var(--ds-surface)]" : "bg-white"}`} style={{ border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`, borderRadius: 6 }}>
          <div style={{ height: 40, background: 'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, var(--ds-surface-sunken))))', borderBottom: `0.75px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.06))'}` }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`animate-pulse ${isDark ? "bg-[var(--ds-surface)]" : "bg-white"}`} style={{ height: 52, borderBottom: `0.75px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.06))'}` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────
  if (error) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center py-20 gap-3 ${isDark ? "bg-[var(--ds-surface)]" : "bg-white"}`}>
        <span style={{ display: 'flex', color: 'var(--ds-text-danger, var(--cp-danger))' }}><CrossCircleIcon label="" size="large" /></span>
        <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-400)', fontWeight: 650, color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))' }}>
          Failed to load feature flags
        </p>
        <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-text-tertiary, var(--ds-text-subtlest))' }}>
          {(error as Error).message}
        </p>
        <AtlasButton
          appearance="default"
          onClick={() => refetch()}
          iconBefore={(iconProps) => <RefreshIcon {...iconProps} label="" size="small" />}
        >
          Retry
        </AtlasButton>
      </div>
    );
  }

  const allSelected = filteredFlags.length > 0 && selectedIds.size === filteredFlags.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredFlags.length;

  return (
    <AdminGuard>
    <div className={`flex-1 min-w-0 ${isDark ? "bg-[var(--ds-surface)]" : "bg-white"}`} style={{ padding: '24px 32px' }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span style={{ display: 'inline-flex', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }}><FlagIcon label="" size="medium" /></span>
            <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-700)', fontWeight: 700, color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))', letterSpacing: '-0.025em', margin: 0 }}>
              Feature Flags
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-300)', color: 'var(--cp-text-tertiary, var(--ds-text-subtlest))', marginTop: 4 }}>
            Control module visibility and incremental rollout across the platform
          </p>
        </div>
        <AtlasButton
          appearance="default"
          onClick={() => refetch()}
          iconBefore={(iconProps) => <RefreshIcon {...iconProps} label="" size="small" />}
        >
          Refresh
        </AtlasButton>
      </div>


      {/* ── Stats Bar — D07 + D08 ──────────────────────── */}
      {stats && (
        <div
          className="flex items-center mb-4"
          style={{
            padding: '10px 16px',
            border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`,
            borderRadius: 6,
            background: 'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, var(--ds-surface-sunken))))',
            gap: 0,
          }}
        >
          {/* Left: count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-600)', fontWeight: 700, color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))', fontVariantNumeric: 'tabular-nums' }}>
              {stats.enabled}
            </span>
            <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--cp-text-muted, var(--cp-ink-4, var(--cp-border-neutral-light, var(--ds-text-disabled))))' }}>/</span>
            <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-400)', color: 'var(--cp-text-muted, var(--cp-ink-4, var(--cp-border-neutral-light, var(--ds-text-disabled))))', fontVariantNumeric: 'tabular-nums' }}>
              {stats.total}
            </span>
            <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-text-tertiary, var(--ds-text-subtlest))', marginLeft: 2 }}>modules enabled</span>
          </div>

          {/* Divider */}
          <div style={{ width: 0.75, height: 28, background: 'var(--cp-border-default, rgba(15,23,42,0.12))', margin: '0 16px', flexShrink: 0 }} />

          {/* Center: progress */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--cp-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border))))' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: stats.total > 0 ? `${(stats.enabled / stats.total) * 100}%` : '0%',
                  background: 'var(--ds-text-success, var(--cp-success))',
                  transition: 'width 300ms ease-out',
                }}
              />
            </div>
            <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-100)', color: 'var(--cp-text-tertiary, var(--ds-text-subtlest))', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {stats.total > 0 ? ((stats.enabled / stats.total) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: 0.75, height: 28, background: 'var(--cp-border-default, rgba(15,23,42,0.12))', margin: '0 16px', flexShrink: 0 }} />

          {/* Right: Enable All / Disable All — D08 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { if (!allEnabled) bulkMutation.mutate({ enabled: true, environment }); }}
              disabled={allEnabled || bulkMutation.isPending}
              className="inline-flex items-center gap-1.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                height: 50,
                padding: '0 14px',
                borderRadius: 6,
                background: 'var(--ds-text-success, var(--cp-success))',
                fontFamily: 'var(--cp-font-body)',
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: 600,
                cursor: allEnabled ? 'not-allowed' : 'pointer',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => { if (!allEnabled) (e.currentTarget.style.background = 'var(--ds-background-success-bold, var(--ds-background-success-bold))'); }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-text-success, var(--cp-success))'; }}
            >
              {bulkMutation.isPending ? <Spinner size="small" /> : <CheckMarkIcon label="" size="small" />}
              Enable All
            </button>
            <button
              onClick={() => { if (!noneEnabled) setBulkDisableOpen(true); }}
              disabled={noneEnabled || bulkMutation.isPending}
              className="inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                height: 50,
                padding: '0 14px',
                borderRadius: 6,
                background: 'transparent',
                border: '0.75px solid var(--cp-danger, var(--ds-background-danger-bold))',
                color: 'var(--ds-text-danger, var(--cp-danger))',
                fontFamily: 'var(--cp-font-body)',
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: 500,
                cursor: noneEnabled ? 'not-allowed' : 'pointer',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => { if (!noneEnabled) (e.currentTarget.style.background = 'var(--cp-danger-light, var(--ds-background-danger, var(--ds-background-danger)))'); }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <CrossIcon label="" size="small" />
              Disable All
            </button>
          </div>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Textfield
            placeholder="Search modules..."
            value={searchInput}
            onChange={(e) => setSearchInput((e.target as HTMLInputElement).value)}
            aria-label="Search feature flags"
            elemBeforeInput={<span style={{ display: 'inline-flex', color: 'var(--cp-text-muted, var(--cp-ink-4, var(--cp-border-neutral-light, var(--ds-text-disabled))))', marginLeft: 8 }}><SearchIcon label="" size="small" /></span>}
          />
        </div>

        {/* Filter mode */}
        <div className="flex items-center overflow-hidden" style={{ border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`, borderRadius: 6 }}>
          {(['all', 'enabled', 'disabled'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:ring-offset-2"
              style={{
                padding: '8px 12px',
                height: 50,
                fontFamily: 'var(--cp-font-body)',
                fontSize: 'var(--ds-font-size-200)',
                fontWeight: filterMode === mode ? 650 : 500,
                background: filterMode === mode ? 'var(--ds-background-selected-hovered, rgba(37,99,235,0.08))' : 'transparent',
                color: filterMode === mode ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--ds-text-subtlest)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {mode === 'all' ? 'All' : mode === 'enabled' ? 'Enabled' : 'Disabled'}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ModuleCategory | 'all')}
          className="focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:ring-offset-2"
          style={{
            height: 50,
            padding: '8px 12px',
            fontFamily: 'var(--cp-font-body)',
            fontSize: 'var(--ds-font-size-200)',
            border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.14))'}`,
            borderRadius: 4,
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
            color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))',
          }}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        {/* Bulk actions for selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto animate-fade-in">
            <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-text-tertiary, var(--ds-text-subtlest))' }}>
              {selectedIds.size} selected
            </span>
            <AtlasButton
              appearance="default"
              onClick={() => {
                selectedIds.forEach((id) => toggleMutation.mutate({ id, enabled: true, environment }));
                setSelectedIds(new Set());
              }}
              isDisabled={toggleMutation.isPending}
            >
              Enable Selected
            </AtlasButton>
          </div>
        )}
      </div>

      {/* ── Table — D05 grouped + D09 52px rows ────────── */}
      <div
        aria-label="Feature flags"
        role="table"
        className={isDark ? "bg-[var(--ds-surface)]" : "bg-white"}
        style={{
          border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`,
          borderRadius: 6,
          overflow: 'hidden',
          opacity: isFetching && !isLoading ? 0.7 : 1,
          transition: 'opacity 200ms ease',
        }}
      >
        {/* Header — thead on var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken))) */}
        <div
          role="row"
          className="grid items-center gap-0"
          style={{
            gridTemplateColumns: GRID_COLS,
            height: 40,
            background: 'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, var(--ds-surface-sunken))))',
            borderBottom: `0.75px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.06))'}`,
            fontFamily: 'var(--cp-font-body)',
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 600,
            letterSpacing: '0.06em',
            /* sentence-case per CLAUDE.md */
            color: 'var(--cp-text-tertiary, var(--ds-text-subtlest))',
          }}
        >
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:ring-offset-2"
              aria-label="Select all modules"
            />
          </div>
          <div style={{ padding: '8px 12px' }}>Module</div>
          <div style={{ padding: '8px 12px' }}>Category</div>
          <div style={{ padding: '8px 12px' }}>Status</div>
          <div style={{ padding: '8px 12px', textAlign: 'center' }}>Enabled</div>
          <div
            style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => handleSort('updated_at')}
            className="select-none hover:text-[var(--ds-text,var(--cp-ink-1, var(--cp-ink-1)))] transition-colors duration-120"
            role="columnheader"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('updated_at'); } }}
          >
            Updated
            {sortField === 'updated_at' ? (
              sortDir === 'asc' ? <ArrowUpIcon label="" size="small" /> : <ArrowDownIcon label="" size="small" />
            ) : (
              <span style={{ display: 'inline-flex', opacity: 0.4 }}><SortAscendingIcon label="" size="small" /></span>
            )}
          </div>
          <div />
        </div>

        {/* Rows — grouped by category */}
        {filteredFlags.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 gap-3 ${isDark ? "bg-[var(--ds-surface)]" : "bg-white"}`}>
            {flags?.length === 0 ? (
              <>
                <span style={{ display: 'inline-flex', color: 'var(--ds-shadow-overlay, rgba(15,23,42,0.15))' }}><SettingsIcon label="" size="large" /></span>
                <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-400)', fontWeight: 650, color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))' }}>
                  No modules configured
                </p>
                <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-text-tertiary, var(--ds-text-subtlest))' }}>
                  Contact your administrator to set up feature flags.
                </p>
              </>
            ) : (
              <>
                <span style={{ display: 'inline-flex', color: 'var(--ds-shadow-overlay, rgba(15,23,42,0.15))' }}><FlagIcon label="" size="large" /></span>
                <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-400)', fontWeight: 650, color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))' }}>
                  No modules match your filters
                </p>
                {hasActiveFilters && (
                  <AtlasButton
                    appearance="default"
                    onClick={clearFilters}
                    iconBefore={(iconProps) => <CrossIcon {...iconProps} label="" size="small" />}
                  >
                    Clear Filters
                  </AtlasButton>
                )}
              </>
            )}
          </div>
        ) : (
          groupedFlags.map((group, gi) => (
            <React.Fragment key={group.category}>
              <GroupHeaderRow
                category={group.category}
                count={group.flags.length}
                isCollapsed={collapsedGroups.has(group.category)}
                onToggleCollapse={() => toggleGroupCollapse(group.category)}
                isFirst={gi === 0}
              />
              {!collapsedGroups.has(group.category) &&
                group.flags.map((flag) => (
                  <FlagRow
                    key={flag.id}
                    flag={flag}
                    isSelected={selectedIds.has(flag.id)}
                    isPending={toggleMutation.isPending}
                    onToggle={handleToggle}
                    onSelect={handleSelectRow}
                  />
                ))}
            </React.Fragment>
          ))
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="mt-4 flex items-center gap-4" style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-100)', color: 'var(--cp-text-tertiary, var(--ds-text-subtlest))' }}>
        <span>
          Showing{' '}
          <span style={{ fontFamily: 'var(--cp-font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            {filteredFlags.length}
          </span>{' '}
          of{' '}
          <span style={{ fontFamily: 'var(--cp-font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            {flags?.length ?? 0}
          </span>{' '}
          modules
        </span>
        <span style={{ color: 'rgba(113,113,122,0.4)' }}>•</span> // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
        <span>Changes take effect immediately for all users</span>
      </div>

      {/* ── Bulk Disable Confirmation — AlertDialog (D08) ── */}
      <AlertDialog open={bulkDisableOpen} onOpenChange={(open) => { setBulkDisableOpen(open); if (!open) setConfirmText(''); }}>
        <AlertDialogContent className="sm:max-w-md" style={{ borderRadius: 8 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: 'var(--ds-text-danger, var(--cp-danger))' }}>
              <span style={{ display: 'inline-flex' }}><CrossCircleIcon label="" size="small" /></span>
              Disable All Modules?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will disable all <strong>{stats?.total ?? 0}</strong> modules in the{' '}
              <strong>{environment}</strong> environment. Users will lose access to all hub functionality.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2">
            <Textfield
              placeholder='Type "DISABLE" to confirm'
              value={confirmText}
              onChange={(e) => setConfirmText((e.target as HTMLInputElement).value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleBulkDisableConfirm(); if (e.key === 'Escape') { setBulkDisableOpen(false); setConfirmText(''); } }}
            />
          </div>
          <AlertDialogFooter className="mt-4">
            <AtlasButton
              appearance="subtle"
              onClick={() => { setBulkDisableOpen(false); setConfirmText(''); }}
            >
              Cancel
            </AtlasButton>
            <AtlasButton
              appearance="danger"
              isDisabled={confirmText !== 'DISABLE' || bulkMutation.isPending}
              onClick={handleBulkDisableConfirm}
              iconBefore={bulkMutation.isPending ? (iconProps) => <RefreshIcon {...iconProps} label="" size="small" /> : undefined}
            >
              Disable All Modules
            </AtlasButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </AdminGuard>
  );
}
