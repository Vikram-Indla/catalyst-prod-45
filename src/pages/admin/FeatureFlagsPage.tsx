/**
 * FeatureFlagsPage — Stage D: Fully wired to Supabase
 * Zero hardcoded data. Every interaction reads/writes via hooks.
 */

import { useState, useMemo, useCallback } from 'react';
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
  Search,
  RefreshCw,
  AlertCircle,
  Flag,
  ToggleLeft,
  ToggleRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Checkbox,
  Filter,
  Compass,
  Calendar,
  CheckSquare,
  Package,
  FolderKanban,
  Layers,
  Users,
  ShieldCheck,
  Rocket,
  AlertTriangle,
  BookOpen,
  BarChart3,
  DollarSign,
  Sparkles,
  Library,
  ListChecks,
  Building2,
  Box,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── Icon resolver ──────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Compass, Calendar, CheckSquare, Package, FolderKanban,
  Layers, Users, ShieldCheck, Rocket, AlertTriangle,
  BookOpen, BarChart3, DollarSign, Sparkles, Library,
  ListChecks, Building2, Box, Flag,
};

function resolveIcon(name: string): React.ElementType {
  return ICON_MAP[name] || Box;
}

// ── Color map for icon backgrounds ─────────────────────────
const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  teal: 'bg-teal-50 text-teal-600',
  red: 'bg-red-50 text-red-600',
  neutral: 'bg-muted text-muted-foreground',
};

// ── Category badge colors ──────────────────────────────────
const CATEGORY_COLORS: Record<ModuleCategory, string> = {
  Strategy: 'bg-blue-50 text-blue-700',
  Product: 'bg-purple-50 text-purple-700',
  Delivery: 'bg-teal-50 text-teal-700',
  Quality: 'bg-emerald-50 text-emerald-700',
  Operations: 'bg-slate-100 text-slate-700',
};

// ── Status badge ───────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  live: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-slate-100 text-slate-500',
  beta: 'bg-amber-50 text-amber-700',
};

// ── Environment tabs ───────────────────────────────────────
const ENVIRONMENTS: { value: EnvironmentScope; label: string }[] = [
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'development', label: 'Development' },
];

type FilterMode = 'all' | 'enabled' | 'disabled';

export default function FeatureFlagsPage() {
  // ── State ──────────────────────────────────────────────
  const [environment, setEnvironment] = useState<EnvironmentScope>('production');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [categoryFilter, setCategoryFilter] = useState<ModuleCategory | 'all'>('all');
  const [sortField, setSortField] = useState<'updated_at' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDisableOpen, setBulkDisableOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // ── Hooks (all wired to Supabase) ─────────────────────
  const { data: flags, isLoading, error, refetch } = useAdminFeatureFlags(environment);
  const { data: stats } = useAdminFeatureFlagStats(environment);
  const toggleMutation = useToggleAdminFeatureFlag();
  const bulkMutation = useBulkToggleAdminFeatureFlags();

  // ── Derived: filter + search + sort ────────────────────
  const filteredFlags = useMemo(() => {
    if (!flags) return [];
    let result = [...flags];

    // Filter by enabled/disabled
    if (filterMode === 'enabled') result = result.filter((f) => f.enabled);
    if (filterMode === 'disabled') result = result.filter((f) => !f.enabled);

    // Filter by category
    if (categoryFilter !== 'all') result = result.filter((f) => f.category === categoryFilter);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.module_name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.module_key.toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const diff = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        return sortDir === 'asc' ? diff : -diff;
      });
    }

    return result;
  }, [flags, filterMode, categoryFilter, searchQuery, sortField, sortDir]);

  // ── Group by category ─────────────────────────────────
  const groupedFlags = useMemo(() => {
    const groups: Record<string, FeatureFlag[]> = {};
    filteredFlags.forEach((f) => {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    });
    return groups;
  }, [filteredFlags]);

  // ── Handlers ──────────────────────────────────────────
  const handleToggle = useCallback(
    async (flag: FeatureFlag, newEnabled: boolean) => {
      if (!newEnabled) {
        // Check dependents before disabling
        try {
          const dependents = await featureFlagService.getDependents(flag.module_key);
          if (dependents.length > 0) {
            toast.warning(
              `${dependents.join(', ')} depend${dependents.length === 1 ? 's' : ''} on ${flag.module_name}`,
              {
                description: `Disabling ${flag.module_name} may break dependent module functionality.`,
                duration: Infinity,
                action: {
                  label: 'Disable Anyway',
                  onClick: () =>
                    toggleMutation.mutate({
                      id: flag.id,
                      enabled: false,
                      environment,
                    }),
                },
                cancel: {
                  label: 'Cancel',
                  onClick: () => {},
                },
              },
            );
            return;
          }
        } catch {
          // If dependency check fails, proceed with toggle
        }
      }
      toggleMutation.mutate({ id: flag.id, enabled: newEnabled, environment });
    },
    [environment, toggleMutation],
  );

  const handleSort = useCallback(
    (field: 'updated_at') => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
    },
    [sortField],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(filteredFlags.map((f) => f.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [filteredFlags],
  );

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleBulkEnable = useCallback(() => {
    selectedIds.forEach((id) => {
      toggleMutation.mutate({ id, enabled: true, environment });
    });
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

  // ── Loading state ─────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 p-6 min-w-0">
        <div className="h-7 w-48 bg-muted rounded mb-1 animate-pulse" />
        <div className="h-4 w-80 bg-muted rounded mb-6 animate-pulse" />
        <div className="h-14 bg-muted/50 border border-border rounded-md mb-4 animate-pulse" />
        <div className="flex gap-2 mb-3">
          <div className="h-9 w-64 bg-muted rounded animate-pulse" />
          <div className="h-9 w-16 bg-muted rounded animate-pulse" />
          <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="border border-border rounded-md overflow-hidden">
          <div className="h-9 bg-muted/50 border-b border-border" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[52px] border-b border-border/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-sm font-semibold" style={{ color: '#09090B' }}>
          Failed to load feature flags
        </p>
        <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const allSelected = filteredFlags.length > 0 && selectedIds.size === filteredFlags.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredFlags.length;

  return (
    <div className="flex-1 p-6 min-w-0">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Flag size={20} className="text-primary" />
            <h1
              style={{
                fontFamily: "'Sora', system-ui",
                fontSize: 22,
                fontWeight: 700,
                color: '#09090B',
                letterSpacing: '-0.025em',
              }}
            >
              Feature Flags
            </h1>
          </div>
          <p
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 13,
              color: '#71717A',
              marginTop: 2,
            }}
          >
            Control module visibility and incremental rollout across the platform
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-1.5"
        >
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {/* ── Environment Tabs ───────────────────────────── */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {ENVIRONMENTS.map((env) => (
          <button
            key={env.value}
            onClick={() => handleEnvironmentChange(env.value)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              environment === env.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            {env.label}
          </button>
        ))}
      </div>

      {/* ── Stats Bar ──────────────────────────────────── */}
      {stats && (
        <div
          className="flex items-center gap-6 rounded-md border border-border px-4 py-3 mb-4"
          style={{ background: '#FAFAFA' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-bold"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: '#09090B' }}
            >
              {stats.enabled}
            </span>
            <span className="text-lg text-muted-foreground font-normal">/</span>
            <span
              className="text-lg text-muted-foreground"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {stats.total}
            </span>
            <span className="text-xs text-muted-foreground ml-1">modules enabled</span>
          </div>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: stats.total > 0 ? `${(stats.enabled / stats.total) * 100}%` : '0%',
              }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {Object.entries(stats.by_category).map(([cat, data]) => (
              <span key={cat}>
                <span className="font-medium text-foreground">{cat}</span>{' '}
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>

        {/* Filter mode */}
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          {(['all', 'enabled', 'disabled'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 h-9 text-xs font-medium transition-colors ${
                filterMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'enabled' ? 'Enabled' : 'Disabled'}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ModuleCategory | 'all')}
          className="h-9 px-3 text-xs border border-border rounded-md bg-background text-foreground"
        >
          <option value="all">All Categories</option>
          {(['Strategy', 'Product', 'Delivery', 'Quality', 'Operations'] as ModuleCategory[]).map(
            (cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ),
          )}
        </select>

        {/* Bulk actions — visible when items selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleBulkEnable}>
              <ToggleRight size={13} />
              Enable
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setBulkDisableOpen(true)}
            >
              <ToggleLeft size={13} />
              Disable All
            </Button>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      <div className="border border-border rounded-md overflow-hidden">
        {/* Table Header */}
        <div
          className="grid items-center gap-0 border-b text-xs font-semibold uppercase tracking-wider"
          style={{
            gridTemplateColumns: '40px 1fr 100px 80px 80px 140px 60px',
            height: 40,
            background: '#F8FAFC',
            color: '#71717A',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 10,
            letterSpacing: '0.05em',
          }}
        >
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border accent-primary"
            />
          </div>
          <div className="px-3">Module</div>
          <div className="px-3">Category</div>
          <div className="px-3">Status</div>
          <div className="px-3">State</div>
          <div
            className="px-3 flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors"
            onClick={() => handleSort('updated_at')}
          >
            Updated
            {sortField === 'updated_at' ? (
              sortDir === 'asc' ? (
                <ArrowUp size={11} />
              ) : (
                <ArrowDown size={11} />
              )
            ) : (
              <ArrowUpDown size={11} className="opacity-40" />
            )}
          </div>
          <div className="px-3 text-center">Toggle</div>
        </div>

        {/* Table Rows */}
        {filteredFlags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Filter size={32} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No modules match your filters</p>
          </div>
        ) : (
          filteredFlags.map((flag) => {
            const Icon = resolveIcon(flag.icon_name);
            const isSelected = selectedIds.has(flag.id);
            const colorClass = COLOR_MAP[flag.icon_color] || COLOR_MAP.neutral;

            return (
              <div
                key={flag.id}
                className={`grid items-center gap-0 border-b border-border/50 transition-all duration-120 hover:bg-accent/40 ${
                  isSelected ? 'bg-primary/5' : ''
                }`}
                style={{
                  gridTemplateColumns: '40px 1fr 100px 80px 80px 140px 60px',
                  height: 52,
                }}
              >
                {/* Checkbox */}
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleSelectRow(flag.id, e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border accent-primary"
                  />
                </div>

                {/* Module */}
                <div className="flex items-center gap-3 px-3 min-w-0">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-sm font-semibold truncate"
                      style={{ fontFamily: "'Inter', system-ui, sans-serif", color: '#09090B' }}
                    >
                      {flag.module_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {flag.description}
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div className="px-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      CATEGORY_COLORS[flag.category] || 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {flag.category}
                  </span>
                </div>

                {/* Status */}
                <div className="px-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      STATUS_STYLES[flag.status] || STATUS_STYLES.draft
                    }`}
                  >
                    {flag.status}
                  </span>
                </div>

                {/* State */}
                <div className="px-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                      flag.enabled ? 'text-emerald-600' : 'text-muted-foreground'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        flag.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                      }`}
                    />
                    {flag.enabled ? 'On' : 'Off'}
                  </span>
                </div>

                {/* Updated */}
                <div className="px-3">
                  <div
                    className="text-[11px] text-muted-foreground"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {new Date(flag.updated_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 truncate">
                    {flag.updated_by_name}
                  </div>
                </div>

                {/* Toggle */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => handleToggle(flag, !flag.enabled)}
                    disabled={toggleMutation.isPending}
                    className={`transition-colors rounded-full p-0.5 ${
                      toggleMutation.isPending
                        ? 'opacity-50 cursor-wait'
                        : 'cursor-pointer hover:opacity-80'
                    }`}
                    title={flag.enabled ? 'Disable module' : 'Enable module'}
                  >
                    {flag.enabled ? (
                      <ToggleRight size={28} className="text-primary" />
                    ) : (
                      <ToggleLeft size={28} className="text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer info ────────────────────────────────── */}
      <div className="mt-4 text-[11px] text-muted-foreground flex items-center gap-4">
        <span>
          Showing{' '}
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {filteredFlags.length}
          </span>{' '}
          of{' '}
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {flags?.length ?? 0}
          </span>{' '}
          modules
        </span>
        <span className="text-muted-foreground/40">•</span>
        <span>Changes take effect immediately for all users</span>
      </div>

      {/* ── Bulk Disable Confirmation Modal ─────────────── */}
      <Dialog open={bulkDisableOpen} onOpenChange={setBulkDisableOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
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
            className="mt-2"
            autoFocus
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBulkDisableOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== 'DISABLE' || bulkMutation.isPending}
              onClick={handleBulkDisableConfirm}
            >
              {bulkMutation.isPending ? (
                <RefreshCw size={14} className="animate-spin mr-2" />
              ) : null}
              Disable All Modules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
