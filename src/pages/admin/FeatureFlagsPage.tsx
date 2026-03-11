/**
 * FeatureFlagsPage — Stage E: QA & Polish (Cycles 1-3)
 * All interactions wired to Supabase. Zero hardcoded data.
 * V12 Hybrid Precision design system compliant.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import {
  useAdminFeatureFlags,
  useAdminFeatureFlagStats,
  useToggleAdminFeatureFlag,
  useBulkToggleAdminFeatureFlags,
} from '@/hooks/useAdminFeatureFlags';
import { featureFlagService } from '@/services/feature-flags';
import type { FeatureFlag, EnvironmentScope, ModuleCategory } from '@/types/feature-flags';
import { toast } from 'sonner';
import {
  Search, RefreshCw, AlertCircle, Flag, ToggleLeft, ToggleRight,
  ArrowUpDown, ArrowUp, ArrowDown, Filter, X,
  Compass, Calendar, CheckSquare, Package, FolderKanban,
  Layers, Users, ShieldCheck, Rocket, AlertTriangle,
  BookOpen, BarChart3, DollarSign, Sparkles, Library,
  ListChecks, Building2, Box, Settings,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ── Constants ──────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Compass, Calendar, CheckSquare, Package, FolderKanban,
  Layers, Users, ShieldCheck, Rocket, AlertTriangle,
  BookOpen, BarChart3, DollarSign, Sparkles, Library,
  ListChecks, Building2, Box, Flag, Settings,
};

const resolveIcon = (name: string): React.ElementType => ICON_MAP[name] || Box;

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-[#DEEBFF] text-[#0747A6]',
  purple: 'bg-[#EDE9FE] text-[#7C3AED]',
  teal: 'bg-[#E3FCEF] text-[#006644]',
  red: 'bg-[#FFEBE6] text-[#BF2600]',
  neutral: 'bg-[#DFE1E6] text-[#253858]',
};

// V12 StatusLozenge: Grey, Blue, Green ONLY
const STATUS_LOZENGE: Record<string, { bg: string; text: string }> = {
  live:  { bg: '#E3FCEF', text: '#006644' },
  draft: { bg: '#DFE1E6', text: '#253858' },
  beta:  { bg: '#DEEBFF', text: '#0747A6' },
};

const CATEGORY_LOZENGE: Record<ModuleCategory, { bg: string; text: string }> = {
  Strategy:   { bg: '#DEEBFF', text: '#0747A6' },
  Product:    { bg: '#DEEBFF', text: '#0747A6' },
  Delivery:   { bg: '#DEEBFF', text: '#0747A6' },
  Quality:    { bg: '#E3FCEF', text: '#006644' },
  Operations: { bg: '#DFE1E6', text: '#253858' },
};

const ENVIRONMENTS: { value: EnvironmentScope; label: string }[] = [
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'development', label: 'Development' },
];

const CATEGORIES: ModuleCategory[] = ['Strategy', 'Product', 'Delivery', 'Quality', 'Operations'];

type FilterMode = 'all' | 'enabled' | 'disabled';

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
  const Icon = resolveIcon(flag.icon_name);
  const colorClass = COLOR_MAP[flag.icon_color] || COLOR_MAP.neutral;
  const statusStyle = STATUS_LOZENGE[flag.status] || STATUS_LOZENGE.draft;
  const description = flag.description || flag.module_key;
  const updatedByName = flag.updated_by_name || 'System';

  return (
    <div
      className={`grid items-center gap-0 transition-colors duration-[120ms] ease-out ${
        isSelected
          ? 'bg-[rgba(37,99,235,0.08)]'
          : 'hover:bg-[rgba(15,23,42,0.04)]'
      }`}
      style={{
        gridTemplateColumns: '40px 1fr 100px 80px 80px 140px 60px',
        height: 44,
        borderBottom: '0.75px solid rgba(15,23,42,0.06)',
      }}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(flag.id, e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          aria-label={`Select ${flag.module_name}`}
        />
      </div>

      {/* Module */}
      <div className="flex items-center gap-3 px-3 min-w-0">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div
            className="truncate"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#0F172A',
            }}
            title={flag.module_name}
          >
            {flag.module_name}
          </div>
          <div
            className="truncate"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 11,
              color: '#71717A',
            }}
            title={description}
          >
            {description}
          </div>
        </div>
      </div>

      {/* Category — V12 Lozenge */}
      <div className="px-3">
        <span
          className="inline-flex items-center px-2 rounded"
          style={{
            height: 20,
            background: CATEGORY_LOZENGE[flag.category]?.bg || '#DFE1E6',
            color: CATEGORY_LOZENGE[flag.category]?.text || '#253858',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.03em',
            textTransform: 'uppercase' as const,
            borderRadius: 3,
          }}
          aria-label={`Category: ${flag.category}`}
        >
          {flag.category}
        </span>
      </div>

      {/* Status — V12 StatusLozenge */}
      <div className="px-3">
        <span
          className="inline-flex items-center px-2 rounded"
          style={{
            height: 20,
            background: statusStyle.bg,
            color: statusStyle.text,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.03em',
            textTransform: 'uppercase' as const,
            borderRadius: 3,
          }}
          aria-label={`Status: ${flag.status}`}
        >
          {flag.status}
        </span>
      </div>

      {/* State */}
      <div className="px-3">
        <span
          className="inline-flex items-center gap-1"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: flag.enabled ? '#16A34A' : '#71717A',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: flag.enabled ? '#16A34A' : 'rgba(113,113,122,0.4)',
            }}
          />
          {flag.enabled ? 'On' : 'Off'}
        </span>
      </div>

      {/* Updated */}
      <div className="px-3 min-w-0">
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            color: '#334155',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {new Date(flag.updated_at).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </div>
        <div
          className="truncate"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 11,
            color: '#94A3B8',
          }}
          title={updatedByName}
        >
          {updatedByName}
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center">
        <button
          role="switch"
          aria-checked={flag.enabled}
          aria-label={`${flag.enabled ? 'Disable' : 'Enable'} ${flag.module_name}`}
          onClick={() => onToggle(flag, !flag.enabled)}
          disabled={isPending}
          className="transition-opacity duration-200 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          style={{
            opacity: isPending ? 0.6 : 1,
            cursor: isPending ? 'wait' : 'pointer',
          }}
        >
          {flag.enabled ? (
            <ToggleRight size={28} style={{ color: '#16A34A' }} />
          ) : (
            <ToggleLeft size={28} style={{ color: '#94A3B8' }} />
          )}
        </button>
      </div>
    </div>
  );
});

// ── Main Page ──────────────────────────────────────────────

export default function FeatureFlagsPage() {
  const [environment, setEnvironment] = useState<EnvironmentScope>('production');
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebounce(searchInput, 150);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [categoryFilter, setCategoryFilter] = useState<ModuleCategory | 'all'>('all');
  const [sortField, setSortField] = useState<'updated_at' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDisableOpen, setBulkDisableOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const { data: flags, isLoading, isFetching, error, refetch } = useAdminFeatureFlags(environment);
  const { data: stats } = useAdminFeatureFlagStats(environment);
  const toggleMutation = useToggleAdminFeatureFlag();
  const bulkMutation = useBulkToggleAdminFeatureFlags();

  // Derived: filter + search + sort (all from Supabase data)
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

  const handleBulkEnable = useCallback(() => {
    selectedIds.forEach((id) => toggleMutation.mutate({ id, enabled: true, environment }));
    setSelectedIds(new Set());
  }, [selectedIds, environment, toggleMutation]);

  const handleBulkDisableConfirm = useCallback(() => {
    if (confirmText !== 'DISABLE') return;
    bulkMutation.mutate({ enabled: false, environment });
    setBulkDisableOpen(false);
    setConfirmText('');
    setSelectedIds(new Set());
  }, [confirmText, environment, bulkMutation]);

  const handleEnvironmentChange = useCallback((env: EnvironmentScope) => {
    setEnvironment(env);
    setSelectedIds(new Set());
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setFilterMode('all');
    setCategoryFilter('all');
  }, []);

  const allEnabled = flags?.every((f) => f.enabled) ?? false;
  const noneEnabled = flags?.every((f) => !f.enabled) ?? true;

  // ── Loading: first load → full skeleton ────────────────
  if (isLoading) {
    return (
      <div className="flex-1 min-w-0" style={{ padding: '24px 32px' }}>
        <div className="h-7 w-48 bg-muted rounded mb-1 animate-pulse" />
        <div className="h-4 w-80 bg-muted rounded mb-6 animate-pulse" />
        <div className="h-14 bg-muted/50 border border-border rounded-md mb-4 animate-pulse" />
        <div className="flex gap-2 mb-3">
          <div className="h-9 w-64 bg-muted rounded animate-pulse" />
          <div className="h-9 w-16 bg-muted rounded animate-pulse" />
          <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="overflow-hidden" style={{ border: '0.75px solid rgba(15,23,42,0.12)', borderRadius: 6 }}>
          <div className="h-10" style={{ background: '#F8FAFC', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: 44, borderBottom: '0.75px solid rgba(15,23,42,0.06)' }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="w-12 h-12" style={{ color: '#DC2626' }} />
        <p style={{ fontFamily: "'Inter', system-ui", fontSize: 14, fontWeight: 650, color: '#0F172A' }}>
          Failed to load feature flags
        </p>
        <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#71717A' }}>
          {(error as Error).message}
        </p>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="gap-2 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
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
  const hasActiveFilters = searchInput.trim() || filterMode !== 'all' || categoryFilter !== 'all';

  return (
    <div className="flex-1 min-w-0" style={{ padding: '24px 32px' }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Flag size={20} style={{ color: '#2563EB' }} />
            <h1 style={{ fontFamily: "'Sora', system-ui", fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.025em', margin: 0 }}>
              Feature Flags
            </h1>
          </div>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, color: '#71717A', marginTop: 4 }}>
            Control module visibility and incremental rollout across the platform
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-1.5 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          style={{ borderRadius: 6 }}
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* ── Environment Tabs ───────────────────────────── */}
      <div className="flex items-center gap-1 mb-4" style={{ borderBottom: '0.75px solid rgba(15,23,42,0.12)' }}>
        {ENVIRONMENTS.map((env) => (
          <button
            key={env.value}
            onClick={() => handleEnvironmentChange(env.value)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            style={{
              padding: '8px 12px',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 12,
              fontWeight: environment === env.value ? 650 : 500,
              color: environment === env.value ? '#2563EB' : '#71717A',
              borderBottom: environment === env.value ? '2px solid #2563EB' : '2px solid transparent',
              marginBottom: -0.75,
              background: 'transparent',
              cursor: 'pointer',
              transition: 'color 120ms ease, border-color 120ms ease',
            }}
          >
            {env.label}
          </button>
        ))}
      </div>

      {/* ── Stats Bar ──────────────────────────────────── */}
      {stats && (
        <div
          className="flex items-center gap-6 mb-4"
          style={{
            padding: '12px 16px',
            border: '0.75px solid rgba(15,23,42,0.12)',
            borderRadius: 6,
            background: '#F8FAFC',
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
              {stats.enabled}
            </span>
            <span style={{ fontSize: 16, color: '#94A3B8' }}>/</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>
              {stats.total}
            </span>
            <span style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#71717A', marginLeft: 4 }}>modules enabled</span>
          </div>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#DFE1E6' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: stats.total > 0 ? `${(stats.enabled / stats.total) * 100}%` : '0%',
                background: '#2563EB',
                transition: 'width 300ms ease-out',
              }}
            />
          </div>
          <div className="flex items-center gap-4">
            {Object.entries(stats.by_category).map(([cat, data]) => (
              <span key={cat} style={{ fontFamily: "'Inter', system-ui", fontSize: 11 }}>
                <span style={{ fontWeight: 650, color: '#0F172A' }}>{cat}</span>{' '}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#71717A', fontVariantNumeric: 'tabular-nums' }}>
                  {data.enabled}/{data.total}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#94A3B8' }} />
          <Input
            placeholder="Search modules..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 pl-8 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            style={{ fontFamily: "'Inter', system-ui", fontSize: 13, borderRadius: 4, border: '0.75px solid rgba(15,23,42,0.14)' }}
            aria-label="Search feature flags"
          />
        </div>

        {/* Filter mode */}
        <div className="flex items-center overflow-hidden" style={{ border: '0.75px solid rgba(15,23,42,0.12)', borderRadius: 6 }}>
          {(['all', 'enabled', 'disabled'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
              style={{
                padding: '0 12px',
                height: 36,
                fontFamily: "'Inter', system-ui",
                fontSize: 12,
                fontWeight: filterMode === mode ? 650 : 500,
                background: filterMode === mode ? 'rgba(37,99,235,0.08)' : 'transparent',
                color: filterMode === mode ? '#2563EB' : '#71717A',
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
          className="focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          style={{
            height: 36,
            padding: '0 12px',
            fontFamily: "'Inter', system-ui",
            fontSize: 12,
            border: '0.75px solid rgba(15,23,42,0.14)',
            borderRadius: 4,
            background: '#FFFFFF',
            color: '#0F172A',
          }}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto animate-fade-in">
            <span style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#71717A' }}>
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
              style={{ fontSize: 12, borderRadius: 6 }}
              onClick={handleBulkEnable}
              disabled={toggleMutation.isPending}
            >
              {toggleMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <ToggleRight size={13} />}
              Enable
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
              style={{ fontSize: 12, borderRadius: 6, color: '#DC2626', borderColor: 'rgba(220,38,38,0.3)' }}
              onClick={() => setBulkDisableOpen(true)}
            >
              <ToggleLeft size={13} />
              Disable All
            </Button>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      <div
        aria-label="Feature flags"
        role="table"
        style={{
          border: '0.75px solid rgba(15,23,42,0.12)',
          borderRadius: 6,
          overflow: 'hidden',
          opacity: isFetching && !isLoading ? 0.7 : 1,
          transition: 'opacity 200ms ease',
        }}
      >
        {/* Header */}
        <div
          role="row"
          className="grid items-center gap-0"
          style={{
            gridTemplateColumns: '40px 1fr 100px 80px 80px 140px 60px',
            height: 40,
            background: '#F8FAFC',
            borderBottom: '0.75px solid rgba(15,23,42,0.06)',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#71717A',
            padding: '0',
          }}
        >
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
              aria-label="Select all modules"
            />
          </div>
          <div style={{ padding: '0 12px' }}>Module</div>
          <div style={{ padding: '0 12px' }}>Category</div>
          <div style={{ padding: '0 12px' }}>Status</div>
          <div style={{ padding: '0 12px' }}>State</div>
          <div
            style={{ padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => handleSort('updated_at')}
            className="select-none hover:text-foreground transition-colors duration-[120ms]"
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
          <div style={{ padding: '0 12px', textAlign: 'center' }}>Toggle</div>
        </div>

        {/* Rows */}
        {filteredFlags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            {flags?.length === 0 ? (
              <>
                <Settings size={48} style={{ color: 'rgba(15,23,42,0.15)' }} />
                <p style={{ fontFamily: "'Inter', system-ui", fontSize: 14, fontWeight: 650, color: '#0F172A' }}>
                  No modules configured
                </p>
                <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#71717A' }}>
                  Contact your administrator to set up feature flags.
                </p>
              </>
            ) : (
              <>
                <Flag size={48} style={{ color: 'rgba(15,23,42,0.15)' }} />
                <p style={{ fontFamily: "'Inter', system-ui", fontSize: 14, fontWeight: 650, color: '#0F172A' }}>
                  No modules match your filters
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1.5 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                    style={{ borderRadius: 6 }}
                  >
                    <X size={13} />
                    Clear Filters
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          filteredFlags.map((flag) => (
            <FlagRow
              key={flag.id}
              flag={flag}
              isSelected={selectedIds.has(flag.id)}
              isPending={toggleMutation.isPending}
              onToggle={handleToggle}
              onSelect={handleSelectRow}
            />
          ))
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="mt-4 flex items-center gap-4" style={{ fontFamily: "'Inter', system-ui", fontSize: 11, color: '#71717A' }}>
        <span>
          Showing{' '}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
            {filteredFlags.length}
          </span>{' '}
          of{' '}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
            {flags?.length ?? 0}
          </span>{' '}
          modules
        </span>
        <span style={{ color: 'rgba(113,113,122,0.4)' }}>•</span>
        <span>Changes take effect immediately for all users</span>
      </div>

      {/* ── Bulk Disable Confirmation Modal ─────────────── */}
      <Dialog open={bulkDisableOpen} onOpenChange={(open) => { setBulkDisableOpen(open); if (!open) setConfirmText(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#DC2626' }}>
              <AlertCircle size={18} />
              Disable All Modules
            </DialogTitle>
            <DialogDescription>
              This will disable <strong>all modules</strong> across the{' '}
              <strong>{environment}</strong> environment. Users will see "Coming Soon"
              placeholders. Type <strong>DISABLE</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Type DISABLE to confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-2 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            style={{ borderRadius: 4, border: '0.75px solid rgba(15,23,42,0.14)' }}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleBulkDisableConfirm(); }}
          />
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setBulkDisableOpen(false)}
              style={{ borderRadius: 6 }}
              className="focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== 'DISABLE' || bulkMutation.isPending}
              onClick={handleBulkDisableConfirm}
              style={{ borderRadius: 6 }}
              className="focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            >
              {bulkMutation.isPending && <RefreshCw size={14} className="animate-spin mr-2" />}
              Disable All Modules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
