/**
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
import { toast } from 'sonner';
import {
  Search, RefreshCw, AlertCircle, Flag, Check, X,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight,
  Compass, Calendar, CheckSquare, Package, FolderKanban,
  Layers, Users, ShieldCheck, Rocket, AlertTriangle,
  BookOpen, BarChart3, DollarSign, Box, Settings, MoreHorizontal,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── Constants ──────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Compass, Calendar, CheckSquare, Package, FolderKanban,
  Layers, Users, ShieldCheck, Rocket, AlertTriangle,
  BookOpen, BarChart3, DollarSign, Box, Settings,
};

const resolveIcon = (name: string): React.ElementType => ICON_MAP[name] || Box;

const ICON_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue:    { bg: '#0C66E4', text: 'var(--ds-text-inverse, #FFFFFF)' },
  teal:    { bg: '#1B7F37', text: 'var(--ds-text-inverse, #FFFFFF)' },
  red:     { bg: '#FFEBE6', text: '#BF2600' },
  neutral: { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E' },
};

// V12 StatusLozenge: LIVE=Green, DRAFT=Grey, BETA=Blue
const STATUS_LOZENGE: Record<string, { bg: string; text: string }> = {
  live:  { bg: '#1B7F37', text: 'var(--ds-text-inverse, #FFFFFF)' },
  draft: { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E' },
  beta:  { bg: '#0C66E4', text: 'var(--ds-text-inverse, #FFFFFF)' },
};

// D03: Category badges with distinct colors per MARAM V3.1.1
const CATEGORY_BADGE: Record<ModuleCategory, { bg: string; text: string; border: string }> = {
  Strategy:   { bg: 'var(--ds-background-selected, #EFF6FF)', text: 'var(--ds-text-brand, #2563EB)', border: '#BFDBFE' },
  Product:    { bg: '#F4F4F5', text: '#3F3F46', border: '#D4D4D8' },
  Delivery:   { bg: 'var(--ds-background-selected, #EFF6FF)', text: 'var(--ds-text-brand, #2563EB)', border: '#BFDBFE' },
  Quality:    { bg: '#F0FDFA', text: '#0D9488', border: '#99F6E4' },
  Operations: { bg: 'var(--ds-background-danger, #FEF2F2)', text: 'var(--ds-text-danger, #DC2626)', border: '#FECACA' },
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
      className={`group grid items-center gap-0 ${isDark ? "bg-[var(--ds-surface,#0A0A0A)]" : "bg-white"}`}
      style={{
        gridTemplateColumns: GRID_COLS,
        height: 52,
        borderBottom: `0.75px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.06))'}`,
        transition: 'background-color 120ms ease',
        ...(isSelected ? { backgroundColor: 'rgba(37,99,235,0.08)' } : {}),
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--cp-interact-hover, rgba(15,23,42,0.04))'; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--cp-bg-elevated, #FFFFFF)'; }}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(flag.id, e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-[var(--ds-text-brand,#2563EB)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
          aria-label={`Select ${flag.module_name}`}
        />
      </div>

      {/* Module */}
      <div className="flex items-center gap-3 px-3 min-w-0">
        <div
          className="w-[34px] h-[34px] rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: iconColor.bg, color: iconColor.text }}
        >
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div
            className="truncate"
            style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)' }}
            title={flag.module_name}
          >
            {flag.module_name}
          </div>
          <div
            className="truncate"
            style={{ fontFamily: 'var(--cp-font-body)', fontSize: 11, color: 'var(--cp-text-tertiary, #71717A)', maxWidth: 280 }}
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
            padding: '0 6px',
            background: catStyle.bg,
            color: catStyle.text,
            border: `1px solid ${catStyle.border}`,
            fontFamily: 'var(--cp-font-body)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
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
            padding: '0 6px',
            background: statusStyle.bg,
            color: statusStyle.text,
            fontFamily: 'var(--cp-font-body)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            borderRadius: 4,
          }}
          aria-label={`Status: ${flag.status}`}
        >
          {flag.status}
        </span>
      </div>

      {/* Toggle — D04: Real switch */}
      <div className="flex items-center justify-center">
        <Switch
          checked={flag.enabled}
          onCheckedChange={(checked) => onToggle(flag, checked)}
          disabled={isPending}
          aria-label={`${flag.enabled ? 'Disable' : 'Enable'} ${flag.module_name}`}
          style={{
            opacity: isPending ? 0.6 : 1,
            cursor: isPending ? 'wait' : 'pointer',
          }}
        />
      </div>

      {/* Updated */}
      <div className="px-3 min-w-0">
        <div style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: 'var(--cp-text-secondary, #334155)', fontVariantNumeric: 'tabular-nums' }}>
          {new Date(flag.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
        <div
          className="truncate"
          style={{ fontFamily: 'var(--cp-font-body)', fontSize: 11, color: 'var(--cp-text-muted, #94A3B8)', maxWidth: 120 }}
          title={updatedByName}
        >
          {updatedByName}
        </div>
      </div>

      {/* D10: Hover-reveal row actions */}
      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms]">
        <button
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[rgba(15,23,42,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
          aria-label="Configure module"
          style={{ borderRadius: 4 }}
        >
          <Settings size={16} style={{ color: 'var(--cp-text-tertiary, #64748B)' }} />
        </button>
        <button
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[rgba(15,23,42,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
          aria-label="More options"
          style={{ borderRadius: 4 }}
        >
          <MoreHorizontal size={16} style={{ color: 'var(--cp-text-tertiary, #64748B)' }} />
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
        background: 'var(--cp-bg-page, #F8FAFC)',
        borderTop: isFirst ? 'none' : `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`,
        borderBottom: `0.75px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.06))'}`,
      }}
      role="row"
      aria-expanded={!isCollapsed}
    >
      {isCollapsed ? (
        <ChevronRight size={16} style={{ color: 'var(--cp-text-muted, #94A3B8)' }} />
      ) : (
        <ChevronDown size={16} style={{ color: 'var(--cp-text-muted, #94A3B8)' }} />
      )}
      <span style={{
        fontFamily: 'var(--cp-font-body)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--cp-text-tertiary, #64748B)',
      }}>
        {category}
      </span>
      <span
        style={{
          fontFamily: 'var(--cp-font-body)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--cp-text-tertiary, #64748B)',
          background: 'var(--cp-border, #E5E5E5)',
          borderRadius: 9999,
          padding: '1px 6px',
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
            toast.warning(
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
      <div className={`flex-1 min-w-0 ${isDark ? "bg-[var(--ds-surface,#0A0A0A)]" : "bg-white"}`} style={{ padding: '24px 32px' }}>
        <div className="h-7 w-48 bg-[var(--ds-surface-sunken,#F1F5F9)] rounded mb-1 animate-pulse" />
        <div className="h-4 w-80 bg-[var(--ds-surface-sunken,#F1F5F9)] rounded mb-6 animate-pulse" />
        <div className="h-14 bg-[var(--ds-surface-sunken,#F1F5F9)] rounded-md mb-4 animate-pulse" style={{ border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`, borderRadius: 6 }} />
        <div className="flex gap-2 mb-3">
          <div className="h-9 w-64 bg-[var(--ds-surface-sunken,#F1F5F9)] rounded animate-pulse" />
          <div className="h-9 w-16 bg-[var(--ds-surface-sunken,#F1F5F9)] rounded animate-pulse" />
        </div>
        <div className={`overflow-hidden ${isDark ? "bg-[var(--ds-surface,#0A0A0A)]" : "bg-white"}`} style={{ border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`, borderRadius: 6 }}>
          <div style={{ height: 40, background: 'var(--cp-bg-sunken, #F1F5F9)', borderBottom: `0.75px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.06))'}` }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`animate-pulse ${isDark ? "bg-[var(--ds-surface,#0A0A0A)]" : "bg-white"}`} style={{ height: 52, borderBottom: `0.75px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.06))'}` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────
  if (error) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center py-20 gap-3 ${isDark ? "bg-[var(--ds-surface,#0A0A0A)]" : "bg-white"}`}>
        <AlertCircle className="w-12 h-12" style={{ color: 'var(--ds-text-danger, #DC2626)' }} />
        <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 14, fontWeight: 650, color: 'var(--cp-text-primary, #0F172A)' }}>
          Failed to load feature flags
        </p>
        <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: 'var(--cp-text-tertiary, #71717A)' }}>
          {(error as Error).message}
        </p>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="gap-2 focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
          style={{ borderRadius: 6 }}
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  const allSelected = filteredFlags.length > 0 && selectedIds.size === filteredFlags.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredFlags.length;

  return (
    <div className={`flex-1 min-w-0 ${isDark ? "bg-[var(--ds-surface,#0A0A0A)]" : "bg-white"}`} style={{ padding: '24px 32px' }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Flag size={20} style={{ color: 'var(--ds-text-brand, #2563EB)' }} />
            <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', letterSpacing: '-0.025em', margin: 0 }}>
              Feature Flags
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-tertiary, #71717A)', marginTop: 4 }}>
            Control module visibility and incremental rollout across the platform
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
          style={{ borderRadius: 6 }}
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>


      {/* ── Stats Bar — D07 + D08 ──────────────────────── */}
      {stats && (
        <div
          className="flex items-center mb-4"
          style={{
            padding: '10px 16px',
            border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`,
            borderRadius: 6,
            background: 'var(--cp-bg-sunken, #F1F5F9)',
            gap: 0,
          }}
        >
          {/* Left: count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>
              {stats.enabled}
            </span>
            <span style={{ fontSize: 14, color: 'var(--cp-text-muted, #94A3B8)' }}>/</span>
            <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 14, color: 'var(--cp-text-muted, #94A3B8)', fontVariantNumeric: 'tabular-nums' }}>
              {stats.total}
            </span>
            <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: 'var(--cp-text-tertiary, #71717A)', marginLeft: 2 }}>modules enabled</span>
          </div>

          {/* Divider */}
          <div style={{ width: 0.75, height: 28, background: 'var(--cp-border-default, rgba(15,23,42,0.12))', margin: '0 16px', flexShrink: 0 }} />

          {/* Center: progress */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--cp-border, #DFE1E6)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: stats.total > 0 ? `${(stats.enabled / stats.total) * 100}%` : '0%',
                  background: 'var(--ds-text-success, #16A34A)',
                  transition: 'width 300ms ease-out',
                }}
              />
            </div>
            <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 11, color: 'var(--cp-text-tertiary, #71717A)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
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
              className="inline-flex items-center gap-1.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                height: 50,
                padding: '0 14px',
                borderRadius: 6,
                background: 'var(--ds-text-success, #16A34A)',
                fontFamily: 'var(--cp-font-body)',
                fontSize: 13,
                fontWeight: 600,
                cursor: allEnabled ? 'not-allowed' : 'pointer',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => { if (!allEnabled) (e.currentTarget.style.background = '#15803D'); }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-text-success, #16A34A)'; }}
            >
              {bulkMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Check size={16} />}
              Enable All
            </button>
            <button
              onClick={() => { if (!noneEnabled) setBulkDisableOpen(true); }}
              disabled={noneEnabled || bulkMutation.isPending}
              className="inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                height: 50,
                padding: '0 14px',
                borderRadius: 6,
                background: 'transparent',
                border: '0.75px solid #DC2626',
                color: 'var(--ds-text-danger, #DC2626)',
                fontFamily: 'var(--cp-font-body)',
                fontSize: 13,
                fontWeight: 500,
                cursor: noneEnabled ? 'not-allowed' : 'pointer',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => { if (!noneEnabled) (e.currentTarget.style.background = 'var(--cp-danger-light, #FEF2F2)'); }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={16} />
              Disable All
            </button>
          </div>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--cp-text-muted, #94A3B8)' }} />
          <Input
            placeholder="Search modules..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 pl-8 focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
            style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, borderRadius: 4, border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.14))'}` }}
            aria-label="Search feature flags"
          />
        </div>

        {/* Filter mode */}
        <div className="flex items-center overflow-hidden" style={{ border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`, borderRadius: 6 }}>
          {(['all', 'enabled', 'disabled'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
              style={{
                padding: '8px 12px',
                height: 50,
                fontFamily: 'var(--cp-font-body)',
                fontSize: 12,
                fontWeight: filterMode === mode ? 650 : 500,
                background: filterMode === mode ? 'rgba(37,99,235,0.08)' : 'transparent',
                color: filterMode === mode ? 'var(--ds-text-brand, #2563EB)' : '#71717A',
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
          className="focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
          style={{
            height: 50,
            padding: '8px 12px',
            fontFamily: 'var(--cp-font-body)',
            fontSize: 12,
            border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.14))'}`,
            borderRadius: 4,
            background: 'var(--cp-bg-elevated, #FFFFFF)',
            color: 'var(--cp-text-primary, #0F172A)',
          }}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        {/* Bulk actions for selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto animate-fade-in">
            <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: 'var(--cp-text-tertiary, #71717A)' }}>
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
              style={{ fontSize: 12, borderRadius: 6 }}
              onClick={() => {
                selectedIds.forEach((id) => toggleMutation.mutate({ id, enabled: true, environment }));
                setSelectedIds(new Set());
              }}
              disabled={toggleMutation.isPending}
            >
              Enable Selected
            </Button>
          </div>
        )}
      </div>

      {/* ── Table — D05 grouped + D09 52px rows ────────── */}
      <div
        aria-label="Feature flags"
        role="table"
        className={isDark ? "bg-[var(--ds-surface,#0A0A0A)]" : "bg-white"}
        style={{
          border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.12))'}`,
          borderRadius: 6,
          overflow: 'hidden',
          opacity: isFetching && !isLoading ? 0.7 : 1,
          transition: 'opacity 200ms ease',
        }}
      >
        {/* Header — thead on var(--ds-surface-sunken, #F1F5F9) */}
        <div
          role="row"
          className="grid items-center gap-0"
          style={{
            gridTemplateColumns: GRID_COLS,
            height: 40,
            background: 'var(--cp-bg-sunken, #F1F5F9)',
            borderBottom: `0.75px solid ${'var(--cp-border-subtle, rgba(15,23,42,0.06))'}`,
            fontFamily: 'var(--cp-font-body)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--cp-text-tertiary, #71717A)',
          }}
        >
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[var(--ds-text-brand,#2563EB)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
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
            className="select-none hover:text-[var(--ds-text,#0F172A)] transition-colors duration-[120ms]"
            role="columnheader"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('updated_at'); } }}
          >
            Updated
            {sortField === 'updated_at' ? (
              sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
            ) : (
              <ArrowUpDown size={11} className="opacity-40" />
            )}
          </div>
          <div />
        </div>

        {/* Rows — grouped by category */}
        {filteredFlags.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 gap-3 ${isDark ? "bg-[var(--ds-surface,#0A0A0A)]" : "bg-white"}`}>
            {flags?.length === 0 ? (
              <>
                <Settings size={48} style={{ color: 'rgba(15,23,42,0.15)' }} />
                <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 14, fontWeight: 650, color: 'var(--cp-text-primary, #0F172A)' }}>
                  No modules configured
                </p>
                <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: 'var(--cp-text-tertiary, #71717A)' }}>
                  Contact your administrator to set up feature flags.
                </p>
              </>
            ) : (
              <>
                <Flag size={48} style={{ color: 'rgba(15,23,42,0.15)' }} />
                <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 14, fontWeight: 650, color: 'var(--cp-text-primary, #0F172A)' }}>
                  No modules match your filters
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5" style={{ borderRadius: 6 }}>
                    <X size={13} />
                    Clear Filters
                  </Button>
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
      <div className="mt-4 flex items-center gap-4" style={{ fontFamily: 'var(--cp-font-body)', fontSize: 11, color: 'var(--cp-text-tertiary, #71717A)' }}>
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
        <span style={{ color: 'rgba(113,113,122,0.4)' }}>•</span>
        <span>Changes take effect immediately for all users</span>
      </div>

      {/* ── Bulk Disable Confirmation — AlertDialog (D08) ── */}
      <AlertDialog open={bulkDisableOpen} onOpenChange={(open) => { setBulkDisableOpen(open); if (!open) setConfirmText(''); }}>
        <AlertDialogContent className="sm:max-w-md" style={{ borderRadius: 8 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: 'var(--ds-text-danger, #DC2626)' }}>
              <AlertCircle size={18} />
              Disable All Modules?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will disable all <strong>{stats?.total ?? 0}</strong> modules in the{' '}
              <strong>{environment}</strong> environment. Users will lose access to all hub functionality.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder='Type "DISABLE" to confirm'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-2 focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
            style={{ borderRadius: 4, border: `0.75px solid ${'var(--cp-border-default, rgba(15,23,42,0.14))'}` }}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleBulkDisableConfirm(); if (e.key === 'Escape') { setBulkDisableOpen(false); setConfirmText(''); } }}
          />
          <AlertDialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => { setBulkDisableOpen(false); setConfirmText(''); }}
              style={{ borderRadius: 6 }}
              className="focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== 'DISABLE' || bulkMutation.isPending}
              onClick={handleBulkDisableConfirm}
              style={{ borderRadius: 6 }}
              className="focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,#2563EB)] focus-visible:ring-offset-2"
            >
              {bulkMutation.isPending && <RefreshCw size={14} className="animate-spin mr-2" />}
              Disable All Modules
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
