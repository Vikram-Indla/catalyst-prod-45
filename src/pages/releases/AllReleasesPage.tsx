/**
 * ALL RELEASES PAGE — CATALYST10 Complete Rebuild
 * Now wired to real Supabase data via useAllReleases hook
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, ChevronDown, ChevronUp, Download, Plus, Sparkles,
  LayoutGrid, Clock, Table2, FileText, FileSpreadsheet, FileDown,
  Clipboard, Check, Loader2, ArrowUpDown, Calendar, Rocket,
  AlertTriangle, Package, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAllReleases } from '@/hooks/releases/useAllReleases';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Release as DBRelease, ReleaseStatus, ReleaseHealth } from '@/types/releases';
import { differenceInDays, format, parseISO } from 'date-fns';

// ─── View-layer type (derived from DB release) ──────────────────
interface ViewRelease {
  id: string;
  name: string;
  version: string;
  status: string;
  health: number;
  healthRaw: ReleaseHealth;
  progress: number;
  testsPass: number;
  testsTotal: number;
  defects: number;
  coverage: number | null;
  targetDate: string;
  daysRemaining: number;
  overdue: boolean;
  owner: string;
  description: string;
  barLeft: number;
  barWidth: number;
  startDate: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────
function healthToScore(h: ReleaseHealth): number {
  switch (h) {
    case 'critical': return 25;
    case 'at_risk': return 55;
    case 'healthy': return 85;
    default: return 50;
  }
}

function getHealthLabel(h: number) {
  if (h < 40) return 'critical';
  if (h < 60) return 'at-risk';
  if (h < 80) return 'attention';
  return 'healthy';
}
function getHealthDisplay(h: number) {
  if (h < 40) return 'Critical';
  if (h < 60) return 'At Risk';
  if (h < 80) return 'Attention';
  return 'Healthy';
}
function getHealthColor(h: number) {
  if (h < 40) return 'var(--ds-text-danger, #ef4444)';
  if (h < 60) return 'var(--ds-text-warning, #d97706)';
  if (h < 80) return 'var(--ds-text-brand, #2563eb)';
  return '#0d9488';
}
function getHealthBg(h: number) {
  if (h < 40) return '#fee2e2';
  if (h < 60) return '#fef3c7';
  if (h < 80) return '#dbeafe';
  return '#ccfbf1';
}

const STATUS_DISPLAY: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  planned:  { dot: 'var(--ds-text-subtlest, #94a3b8)', bg: 'var(--ds-surface-sunken, #f1f5f9)', text: 'var(--ds-text-subtle, #475569)', label: 'Planned' },
  planning: { dot: 'var(--ds-text-subtlest, #94a3b8)', bg: 'var(--ds-surface-sunken, #f1f5f9)', text: 'var(--ds-text-subtle, #475569)', label: 'Planning' },
  active:   { dot: 'var(--ds-text-brand, #2563eb)', bg: '#dbeafe', text: '#1e40af', label: 'Active' },
  development: { dot: 'var(--ds-text-brand, #2563eb)', bg: 'rgba(37,99,235,0.1)', text: 'var(--ds-text-brand, #2563eb)', label: 'Development' },
  staging:  { dot: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6', label: 'Staging' },
  testing:  { dot: 'var(--ds-text-warning, #d97706)', bg: 'rgba(217,119,6,0.1)', text: 'var(--ds-text-warning, #d97706)', label: 'Testing' },
  uat:      { dot: '#f97316', bg: 'rgba(249,115,22,0.1)', text: '#f97316', label: 'UAT' },
  released: { dot: '#0d9488', bg: 'rgba(13,148,136,0.1)', text: '#0d9488', label: 'Released' },
};

function getStatusConfig(status: string) {
  return STATUS_DISPLAY[status] || STATUS_DISPLAY.planned;
}

// Map DB release to view release
function mapToViewRelease(r: DBRelease): ViewRelease {
  const target = r.target_date ? parseISO(r.target_date) : null;
  const start = r.start_date ? parseISO(r.start_date) : null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const rawDiff = target ? differenceInDays(target, now) : 0;
  const daysRemaining = Math.abs(rawDiff);
  const overdue = target ? rawDiff < 0 && r.status !== 'released' : false;
  const score = healthToScore(r.health);

  // Compute timeline bar positions (Jan 2026 = 0, Oct 2026 = 100)
  const timelineStart = new Date('2026-01-01').getTime();
  const timelineEnd = new Date('2026-11-01').getTime();
  const range = timelineEnd - timelineStart;
  const sTime = start ? start.getTime() : (target ? target.getTime() - 30 * 86400000 : timelineStart);
  const tTime = target ? target.getTime() : sTime + 30 * 86400000;
  const barLeft = Math.max(0, Math.min(95, ((sTime - timelineStart) / range) * 100));
  const barWidth = Math.max(3, Math.min(40, ((tTime - sTime) / range) * 100));

  return {
    id: r.id,
    name: r.name,
    version: r.version || 'v1.0',
    status: r.status || 'planned',
    health: score,
    healthRaw: r.health,
    progress: r.progress ?? 0,
    testsPass: r.test_cases_passed ?? 0,
    testsTotal: r.test_cases_total ?? 0,
    defects: r.defects_open ?? 0,
    coverage: r.coverage_percent != null ? r.coverage_percent : null,
    targetDate: target ? format(target, 'MMM d, yyyy') : 'TBD',
    daysRemaining,
    overdue,
    owner: r.owner?.full_name || 'Unassigned',
    description: r.description || r.notes || '',
    barLeft,
    barWidth,
    startDate: r.start_date,
  };
}

type SortableField = 'name' | 'status' | 'progress' | 'defects' | 'health' | 'daysRemaining';

// ─── Page Component ─────────────────────────────────────────────
export default function AllReleasesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Core state
  const [activeView, setActiveView] = useState<'cards' | 'timeline' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [healthFilter, setHealthFilter] = useState<string[]>([]);
  const [quarterFilter, setQuarterFilter] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortableField>('health');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Pagination removed — all releases shown

  // UI state
  const [isNewReleaseModalOpen, setIsNewReleaseModalOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [detailRelease, setDetailRelease] = useState<ViewRelease | null>(null);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);
  const [bulkStatusDropdown, setBulkStatusDropdown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Refs
  const searchRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // ─── Fetch real data ──────────────────────────────────────────
  const mappedSort = useMemo(() => {
    const colMap: Record<string, 'name' | 'status' | 'progress' | 'health' | 'target_date'> = {
      name: 'name', status: 'status', progress: 'progress', health: 'health', daysRemaining: 'target_date', defects: 'name',
    };
    return { column: colMap[sortField] || 'name', direction: sortDirection } as const;
  }, [sortField, sortDirection]);

  const { data, isLoading, isError, error, refetch } = useAllReleases({
    filter: {
      status: statusFilter as ReleaseStatus[],
      health: healthFilter.map(h => h === 'at-risk' ? 'at_risk' : h) as ReleaseHealth[],
      search: searchQuery,
    },
    sort: mappedSort,
    page: 0,
    pageSize: 200,
  });

  // ─── Realtime subscription ─────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`releases-live-${crypto.randomUUID().slice(0, 6)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'releases' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-releases'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const releases = useMemo(() => {
    if (!data?.releases) return [];
    return data.releases.map(mapToViewRelease);
  }, [data?.releases]);

  // ─── Mutations ────────────────────────────────────────────────
  const createReleaseMutation = useMutation({
    mutationFn: async (input: { name: string; version: string; target_date?: string; status: string; description?: string }) => {
      // Fetch the first available release vehicle to avoid hardcoded UUID
      const { data: vehicles } = await supabase
        .from('release_vehicles')
        .select('id')
        .limit(1)
        .single();
      const vehicleId = vehicles?.id || null;

      const { data, error } = await supabase
        .from('releases')
        .insert({
          name: input.name,
          version: input.version,
          target_date: input.target_date || null,
          status: input.status === 'planning' ? 'planned' : input.status,
          description: input.description || null,
          ...(vehicleId ? { release_vehicle_id: vehicleId } : {}),
        } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-releases'] });
      toast.success('Release created');
      setIsNewReleaseModalOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      if (ids.length === 0) return;
      const dbStatus = status === 'planning' ? 'planned' : status;
      const { error } = await supabase
        .from('releases')
        .update({ status: dbStatus } as any)
        .in('id', ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['all-releases'] });
      toast.success(`Updated ${vars.ids.length} releases`);
      setSelectedIds(new Set());
      setBulkStatusDropdown(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      // Soft delete — set deleted_at instead of hard DELETE
      const { error } = await supabase
        .from('releases')
        .update({ deleted_at: new Date().toISOString() } as any)
        .in('id', ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['all-releases'] });
      toast.success(`Archived ${ids.length} releases`);
      setSelectedIds(new Set());
      setDeleteConfirm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Derived state ──────────────────────────────────────────
  const filteredReleases = useMemo(() => {
    let result = [...releases];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.version.toLowerCase().includes(q) ||
        r.status.includes(q) ||
        r.owner.toLowerCase().includes(q)
      );
    }
    if (statusFilter.length > 0) result = result.filter(r => statusFilter.includes(r.status));
    if (healthFilter.length > 0) {
      result = result.filter(r => healthFilter.includes(getHealthLabel(r.health)));
    }
    if (quarterFilter.length > 0) {
      result = result.filter(r => {
        if (r.targetDate === 'TBD') return false;
        const d = new Date(r.targetDate);
        const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
        return quarterFilter.includes(q);
      });
    }
    result.sort((a, b) => {
      const av = a[sortField] as any;
      const bv = b[sortField] as any;
      const m = sortDirection === 'asc' ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * m;
      return String(av).localeCompare(String(bv)) * m;
    });
    return result;
  }, [releases, searchQuery, statusFilter, healthFilter, quarterFilter, sortField, sortDirection]);

  // No pagination needed — show all filtered releases

  const statCounts = useMemo(() => ({
    total: releases.length,
    planning: releases.filter(r => r.status === 'planned' || r.status === 'planning').length,
    staging: releases.filter(r => r.status === 'staging' || r.status === 'active' || r.status === 'development').length,
    testing: releases.filter(r => r.status === 'testing' || r.status === 'uat').length,
    released: releases.filter(r => r.status === 'released').length,
    atRisk: releases.filter(r => r.health >= 40 && r.health < 60).length,
  }), [releases]);

  // ─── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        if (e.key === 'Escape') { (e.target as HTMLElement).blur(); }
        return;
      }
      if (e.target !== document.body && !(e.target as HTMLElement)?.closest('[data-shortcuts-ok]')) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') {
        setIsNewReleaseModalOpen(false);
        setIsExportDropdownOpen(false);
        setIsAIDrawerOpen(false);
        setDetailRelease(null);
        setActiveFilterDropdown(null);
        setBulkStatusDropdown(false);
        setDeleteConfirm(false);
        if (selectedIds.size > 0) setSelectedIds(new Set());
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) setIsNewReleaseModalOpen(true);
      if (e.key === 'e' && !e.metaKey && !e.ctrlKey) setIsExportDropdownOpen(p => !p);
      if (e.key === '1' && !e.metaKey && !e.ctrlKey) setActiveView('cards');
      if (e.key === '2' && !e.metaKey && !e.ctrlKey) setActiveView('timeline');
      if (e.key === '3' && !e.metaKey && !e.ctrlKey) setActiveView('table');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIds]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setActiveFilterDropdown(null);
        setIsExportDropdownOpen(false);
        setBulkStatusDropdown(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  // ─── Handlers ───────────────────────────────────────────────
  const handleSort = (field: SortableField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReleases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReleases.map(r => r.id)));
    }
  };

  const handleExportCSV = () => {
    const headers = "Release,Version,Status,Health,Progress,Tests,Defects,Coverage,Days,Owner";
    const rows = filteredReleases.map(r =>
      `"${r.name}",${r.version},${r.status},${r.health},${r.progress}%,${r.testsPass}/${r.testsTotal},${r.defects},${r.coverage ?? '—'},${r.daysRemaining}d,${r.owner}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-releases-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
    setIsExportDropdownOpen(false);
  };

  const handleCopyClipboard = () => {
    const headers = "Release\tVersion\tStatus\tHealth\tProgress\tTests\tDefects\tCoverage\tDays\tOwner";
    const rows = filteredReleases.map(r =>
      `${r.name}\t${r.version}\t${r.status}\t${r.health}\t${r.progress}%\t${r.testsPass}/${r.testsTotal}\t${r.defects}\t${r.coverage ?? '—'}\t${r.daysRemaining}d\t${r.owner}`
    );
    navigator.clipboard.writeText([headers, ...rows].join('\n'));
    toast.success("Copied to clipboard!");
    setIsExportDropdownOpen(false);
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkStatus = (newStatus: string) => {
    bulkUpdateStatusMutation.mutate({ ids: Array.from(selectedIds), status: newStatus });
  };

  const handleExportSelected = () => {
    const sel = filteredReleases.filter(r => selectedIds.has(r.id));
    const headers = "Release,Version,Status,Health,Progress,Tests,Defects,Coverage,Days,Owner";
    const rows = sel.map(r =>
      `"${r.name}",${r.version},${r.status},${r.health},${r.progress}%,${r.testsPass}/${r.testsTotal},${r.defects},${r.coverage ?? '—'},${r.daysRemaining}d,${r.owner}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-releases-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sel.length} releases`);
  };

  const handleCreateRelease = (input: { name: string; version: string; status: string; targetDate: string; description: string }) => {
    createReleaseMutation.mutate({
      name: input.name,
      version: input.version,
      status: input.status,
      target_date: input.targetDate || undefined,
      description: input.description || undefined,
    });
  };

  // Select all checkbox state
  const selectAllState: 'none' | 'some' | 'all' =
    selectedIds.size === 0 ? 'none' :
    selectedIds.size === filteredReleases.length ? 'all' : 'some';

  // ─── Render Helpers ─────────────────────────────────────────
  const sortArrow = sortDirection === 'asc' ? '↑' : '↓';
  const sortFieldLabel = { name: 'Name', status: 'Status', progress: 'Progress', defects: 'Defects', health: 'Health', daysRemaining: 'Days' }[sortField];

  // Get unique statuses from data
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(releases.map(r => r.status));
    return Array.from(statuses).sort();
  }, [releases]);

  // ─── Loading skeleton ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 52px)', background: 'var(--ds-surface-sunken, #f8fafc)' }}>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-6 w-40 rounded bg-border/40 animate-pulse" />
            <div className="h-5 w-16 rounded bg-border/40 animate-pulse" />
          </div>
          <div className="h-10 w-full rounded-lg bg-border/40 animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 w-20 rounded bg-border/40 animate-pulse" />)}
          </div>
        </div>
        <div className="px-6 flex-1 space-y-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-9 w-full rounded bg-border/40 animate-pulse" style={{ opacity: 1 - i * 0.06 }} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4" style={{ height: 'calc(100vh - 52px)' }}>
        <div className="flex items-center justify-center w-12 h-12 rounded-full" style={{ background: '#fee2e2' }}>
          <AlertTriangle className="w-6 h-6" style={{ color: 'var(--ds-text-danger, #ef4444)' }} />
        </div>
        <div className="text-center">
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text, #0f172a)' }}>Failed to load releases</h3>
          <p style={{ fontSize: '13px', color: 'var(--ds-text-subtlest, #64748b)', marginTop: '4px', maxWidth: '360px' }}>
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 transition-colors"
          style={{ ...primaryBtnStyle, padding: '8px 16px' }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────
  if (!isLoading && releases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4" style={{ height: 'calc(100vh - 52px)' }}>
        <div className="flex items-center justify-center w-12 h-12 rounded-full" style={{ background: '#dbeafe' }}>
          <Package className="w-6 h-6" style={{ color: 'var(--ds-text-brand, #2563eb)' }} />
        </div>
        <div className="text-center">
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text, #0f172a)' }}>No releases yet</h3>
          <p style={{ fontSize: '13px', color: 'var(--ds-text-subtlest, #64748b)', marginTop: '4px' }}>Create your first release to get started</p>
        </div>
        <button
          onClick={() => setIsNewReleaseModalOpen(true)}
          className="flex items-center gap-1.5 transition-colors"
          style={{ ...primaryBtnStyle, padding: '8px 16px' }}
        >
          <Plus className="w-3.5 h-3.5" /> Create First Release
        </button>
      </div>
    );
  }

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div className="all-releases-page flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>
      {/* ═══ PAGE HEADER (52px) ═══ */}
      <header className="flex items-center justify-between px-6 border-b" style={{ height: '52px', flexShrink: 0, borderColor: 'var(--ds-border, #e2e8f0)', background: 'var(--ds-surface, #ffffff)' }}>
        <div className="flex items-center gap-3">
          <CatalystPageHeader title="All Releases" />
          <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-subtlest, #94a3b8)' }}>{releases.length} releases</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Export */}
          <div className="relative" data-dropdown ref={exportRef}>
            <button
              onClick={() => setIsExportDropdownOpen(p => !p)}
              className="flex items-center gap-1.5 transition-colors"
              style={{ height: '32px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'var(--bg-app, #fff)', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-subtle, #334155)' }}
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-1 z-50" style={{ background: 'var(--bg-app, #fff)', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '4px', minWidth: '200px' }}>
                <DropdownItem icon={<FileText className="w-3.5 h-3.5" />} label="Export as CSV" onClick={handleExportCSV} />
                <DropdownItem icon={<FileSpreadsheet className="w-3.5 h-3.5" />} label="Export as Excel" onClick={() => { toast.info('Coming soon'); setIsExportDropdownOpen(false); }} />
                <DropdownItem icon={<FileDown className="w-3.5 h-3.5" />} label="Export as PDF" onClick={() => { toast.info('Coming soon'); setIsExportDropdownOpen(false); }} />
                <div style={{ height: '1px', background: 'var(--ds-border, #e2e8f0)', margin: '4px 0' }} />
                <DropdownItem icon={<Clipboard className="w-3.5 h-3.5" />} label="Copy to Clipboard" onClick={handleCopyClipboard} />
              </div>
            )}
          </div>
          {/* New Release */}
          <button
            onClick={() => setIsNewReleaseModalOpen(true)}
            className="flex items-center gap-1.5 transition-colors"
            style={{ height: '32px', padding: '0 14px', borderRadius: '6px', background: 'var(--ds-text-brand, #2563eb)', color: 'var(--ds-surface, #fff)', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-brand-bold-hovered, #1d4ed8)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--ds-text-brand, #2563eb)')}
          >
            <Plus className="w-3.5 h-3.5" /> New Release
          </button>
        </div>
      </header>

      {/* ═══ STAT STRIP (48px) ═══ */}
      <div className="flex items-center px-6" style={{ height: '48px', flexShrink: 0 }}>
        <div className="flex items-center justify-between w-full" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: 'var(--bg-app, #fff)', padding: '6px 16px' }}>
          <div className="flex items-center" style={{ gap: '16px' }}>
            <StatItem number={statCounts.total} label="Total" />
            <StatItem number={statCounts.planning} label="Planning" dotColor="var(--ds-text-subtlest, #94a3b8)" />
            <StatItem number={statCounts.staging} label="Staging" dotColor="#8b5cf6" />
            <StatItem number={statCounts.testing} label="Testing" dotColor="var(--ds-text-warning, #d97706)" />
            <StatItem number={statCounts.atRisk} label="At Risk" dotColor="var(--ds-text-danger, #ef4444)" />
            <StatItem number={statCounts.released} label="Released" dotColor="#0d9488" />
          </div>
          <button
            onClick={() => setIsAIDrawerOpen(true)}
            className="flex items-center gap-1.5 transition-colors"
            style={{ border: '1px solid rgba(139,92,246,0.3)', borderRadius: '16px', padding: '4px 12px', color: '#8b5cf6', fontSize: '12px', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Sparkles className="w-3 h-3" /> AI Insights
          </button>
        </div>
      </div>

      {/* ═══ TOOLBAR (44px) ═══ */}
      <div className="flex items-center px-6 gap-3" style={{ height: '44px', flexShrink: 0 }}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--ds-text-subtlest, #94a3b8)' }} />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); }}
            placeholder="Search releases..."
            className="focus:outline-none"
            style={{ width: '200px', height: '32px', paddingLeft: '32px', paddingRight: searchQuery ? '28px' : '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: 'var(--ds-surface-sunken, #f8fafc)' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--ds-text-brand, #2563eb)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ds-border, #e2e8f0)')}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); }} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--ds-text-subtlest, #94a3b8)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <FilterPill
          label="Status"
          active={statusFilter.length > 0}
          count={statusFilter.length}
          isOpen={activeFilterDropdown === 'status'}
          onToggle={() => setActiveFilterDropdown(p => p === 'status' ? null : 'status')}
        >
          {uniqueStatuses.map(s => (
            <CheckboxRow key={s} checked={statusFilter.includes(s)} label={`${getStatusConfig(s).label} (${releases.filter(r => r.status === s).length})`}
              onChange={() => { setStatusFilter(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]); }} />
          ))}
          <div style={filterDividerStyle}>
            <button onClick={() => setStatusFilter([])} style={clearBtnStyle}>Clear</button>
            <button onClick={() => setActiveFilterDropdown(null)} style={applyBtnStyle}>Apply</button>
          </div>
        </FilterPill>

        <FilterPill
          label="Health"
          active={healthFilter.length > 0}
          count={healthFilter.length}
          isOpen={activeFilterDropdown === 'health'}
          onToggle={() => setActiveFilterDropdown(p => p === 'health' ? null : 'health')}
        >
          {(['critical', 'at-risk', 'attention', 'healthy'] as const).map(h => {
            const labels: Record<string, string> = { critical: 'Critical (0–39)', 'at-risk': 'At Risk (40–59)', attention: 'Attention (60–79)', healthy: 'Healthy (80–100)' };
            return <CheckboxRow key={h} checked={healthFilter.includes(h)} label={labels[h]}
              onChange={() => { setHealthFilter(p => p.includes(h) ? p.filter(x => x !== h) : [...p, h]); }} />;
          })}
          <div style={filterDividerStyle}>
            <button onClick={() => setHealthFilter([])} style={clearBtnStyle}>Clear</button>
            <button onClick={() => setActiveFilterDropdown(null)} style={applyBtnStyle}>Apply</button>
          </div>
        </FilterPill>

        <FilterPill
          label="Quarter"
          active={quarterFilter.length > 0}
          count={quarterFilter.length}
          isOpen={activeFilterDropdown === 'quarter'}
          onToggle={() => setActiveFilterDropdown(p => p === 'quarter' ? null : 'quarter')}
        >
          {['Q1 2026', 'Q2 2026', 'Q3 2026'].map(q => (
            <CheckboxRow key={q} checked={quarterFilter.includes(q)} label={q}
              onChange={() => { setQuarterFilter(p => p.includes(q) ? p.filter(x => x !== q) : [...p, q]); }} />
          ))}
          <div style={filterDividerStyle}>
            <button onClick={() => setQuarterFilter([])} style={clearBtnStyle}>Clear</button>
            <button onClick={() => setActiveFilterDropdown(null)} style={applyBtnStyle}>Apply</button>
          </div>
        </FilterPill>

        <div className="flex-1" />

        {/* Sort */}
        <button
          onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1 transition-colors"
          style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-subtle, #334155)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowUpDown className="w-3.5 h-3.5" style={{ color: 'var(--ds-text-brand, #2563eb)' }} />
          {sortFieldLabel} {sortArrow}
        </button>

        {/* View toggle */}
        <div className="flex" style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
          {([
            { key: 'cards' as const, icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Cards' },
            { key: 'timeline' as const, icon: <Clock className="w-3.5 h-3.5" />, label: 'Timeline' },
            { key: 'table' as const, icon: <Table2 className="w-3.5 h-3.5" />, label: 'Table' },
          ]).map(v => (
            <button
              key={v.key}
              onClick={() => setActiveView(v.key)}
              className="flex items-center gap-1 transition-colors"
              style={{
                padding: '4px 12px', fontSize: '13px', fontWeight: 500,
                background: activeView === v.key ? 'var(--ds-text-brand, #2563eb)' : 'var(--ds-surface, #fff)',
                color: activeView === v.key ? 'var(--ds-surface, #ffffff)' : 'var(--ds-text-subtlest, #64748b)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CONTENT AREA (flex:1) ═══ */}
      <div className="all-releases-content flex-1 min-h-0 overflow-hidden relative px-6 pt-2 pb-0" style={{ background: 'var(--ds-surface-sunken, #f8fafc)' }}>
        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div
            className="absolute top-0 left-6 right-6 z-10 flex items-center gap-3 px-4"
            style={{ height: '44px', background: '#1e293b', borderRadius: '0 0 8px 8px', color: 'var(--ds-surface, #fff)', fontSize: '13px', animation: 'slideDown 200ms ease' }}
          >
            <span style={{ fontWeight: 500 }}>{selectedIds.size} releases selected</span>
            <div className="relative" data-dropdown>
              <button onClick={() => setBulkStatusDropdown(p => !p)} className="flex items-center gap-1" style={bulkBarBtnStyle}>
                Change Status <ChevronDown className="w-3 h-3" />
              </button>
              {bulkStatusDropdown && (
                <div className="absolute top-full mt-1 left-0 z-50" style={{ background: 'var(--bg-app, #fff)', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: '140px' }}>
                  {(['planned', 'active', 'testing', 'uat', 'released'] as const).map(s => (
                    <button key={s} onClick={() => handleBulkStatus(s)} className="block w-full text-left px-3 py-1.5 transition-colors hover:bg-[var(--ds-surface-sunken,#f8fafc)]" style={{ fontSize: '13px', color: 'var(--ds-text-subtle, #334155)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                      {getStatusConfig(s).label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleExportSelected} style={bulkBarBtnStyle}>
              Export Selected
            </button>
            <button onClick={() => setDeleteConfirm(true)} style={{ ...bulkBarBtnStyle, borderColor: 'rgba(239,68,68,0.5)', color: 'var(--ds-border-danger, #fca5a5)' }}>
              Delete
            </button>
            <div className="flex-1" />
            <button onClick={() => setSelectedIds(new Set())} style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✕</button>
          </div>
        )}

        {/* Views */}
        <div className="h-full overflow-y-auto" style={{ paddingTop: selectedIds.size > 0 ? '48px' : 0 }} key={activeView}>
          {filteredReleases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ animation: 'fadeInUp 0.3s ease both' }}>
              <Rocket className="w-12 h-12 mb-4" style={{ color: 'var(--ds-text-subtlest, #94a3b8)' }} />
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text, #0f172a)' }}>
                {releases.length === 0 ? 'No releases yet' : 'No releases match your filters'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ds-text-subtlest, #64748b)', marginTop: '4px' }}>
                {releases.length === 0 ? 'Create your first release to get started' : 'Try adjusting your search or filter criteria'}
              </div>
              {releases.length === 0 ? (
                <button
                  onClick={() => setIsNewReleaseModalOpen(true)}
                  className="mt-4 transition-colors"
                  style={primaryBtnStyle}
                >
                  Create Release
                </button>
              ) : (
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter([]); setHealthFilter([]); setQuarterFilter([]); }}
                  className="mt-4 transition-colors"
                  style={primaryBtnStyle}
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : activeView === 'table' ? (
            <table className="all-releases-table w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ height: '50px', maxHeight: '50px', background: 'var(--ds-surface-sunken, #f8fafc)', position: 'sticky', top: 0, zIndex: 2 }}>
                  <th style={{ width: '40px', textAlign: 'center', padding: '0 4px', height: '50px', lineHeight: '36px' }}>
                    <input
                      type="checkbox"
                      checked={selectAllState === 'all'}
                      ref={el => { if (el) el.indeterminate = selectAllState === 'some'; }}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: 'var(--ds-text-brand, #2563eb)' }}
                    />
                  </th>
                  <SortableHeader label="RELEASE" field="name" current={sortField} direction={sortDirection} onClick={handleSort} style={{ minWidth: '240px' }} />
                  <SortableHeader label="STATUS" field="status" current={sortField} direction={sortDirection} onClick={handleSort} style={{ width: '100px' }} />
                  <SortableHeader label="PROGRESS" field="progress" current={sortField} direction={sortDirection} onClick={handleSort} style={{ width: '130px' }} />
                  <th style={colHeaderStyle}>TESTS</th>
                  <SortableHeader label="DEFECTS" field="defects" current={sortField} direction={sortDirection} onClick={handleSort} style={{ width: '70px' }} />
                  <th style={{ ...colHeaderStyle, width: '80px' }}>COVERAGE</th>
                  <SortableHeader label="HEALTH" field="health" current={sortField} direction={sortDirection} onClick={handleSort} style={{ width: '80px' }} />
                  <SortableHeader label="DAYS" field="daysRemaining" current={sortField} direction={sortDirection} onClick={handleSort} style={{ width: '60px' }} />
                  <th style={{ ...colHeaderStyle, width: '100px' }}>OWNER</th>
                </tr>
              </thead>
              <tbody>
                {filteredReleases.map((r, i) => (
                  <ReleaseRow
                    key={r.id}
                    release={r}
                    index={i}
                    selected={selectedIds.has(r.id)}
                    onToggle={() => toggleSelect(r.id)}
                    onClick={() => setDetailRelease(r)}
                  />
                ))}
              </tbody>
            </table>
          ) : activeView === 'cards' ? (
            <CardsView
              releases={filteredReleases}
              selectedIds={selectedIds}
              onToggle={toggleSelect}
              onCardClick={setDetailRelease}
            />
          ) : (
            <TimelineView
              releases={filteredReleases}
              onBarClick={setDetailRelease}
            />
          )}
        </div>
      </div>

      {/* ═══ STATUS BAR (32px) ═══ */}
      <div className="all-releases-pagination flex items-center px-6" style={{ height: '32px', flexShrink: 0, borderTop: '1px solid #e2e8f0', background: 'var(--bg-app, #fff)' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-subtlest, #64748b)' }}>
          {filteredReleases.length} of {releases.length} releases
        </span>
      </div>

      {/* ═══ DETAIL DRAWER ═══ */}
      {detailRelease && (
        <>
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDetailRelease(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-[201] overflow-y-auto" style={{ width: '480px', background: 'var(--bg-app, #fff)', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', animation: 'slideInRight 200ms ease' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--ds-border, #e2e8f0)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text, #0f172a)' }}>{detailRelease.name}</h2>
              <button onClick={() => setDetailRelease(null)} style={closeBtnStyle}>✕</button>
            </div>
            <div className="px-6 py-5">
              <div className="flex gap-4 mb-6">
                <MetricBox value={detailRelease.health} label="Health Score" color={getHealthColor(detailRelease.health)} />
                <MetricBox value={`${detailRelease.progress}%`} label="Progress" color="var(--ds-text-brand, #2563eb)" />
                <MetricBox value={detailRelease.defects} label="Defects" color={detailRelease.defects > 0 ? 'var(--ds-text-danger, #ef4444)' : '#0d9488'} />
              </div>
              <div className="space-y-0">
                <DetailRow label="Version" value={detailRelease.version} />
                <DetailRow label="Status" value={<StatusPill status={detailRelease.status} />} />
                <DetailRow label="Target Date" value={detailRelease.targetDate} />
                <DetailRow label="Days Remaining" value={
                  detailRelease.status === 'released' ? <span style={{ color: '#0d9488', fontWeight: 600 }}>Released</span> :
                  detailRelease.overdue ? <span style={{ color: 'var(--ds-text-danger, #ef4444)', fontWeight: 600 }}>Overdue</span> :
                  `${detailRelease.daysRemaining}d`
                } />
                <DetailRow label="Tests" value={`${detailRelease.testsPass} / ${detailRelease.testsTotal}`} />
                <DetailRow label="Coverage" value={detailRelease.coverage !== null ? `${detailRelease.coverage}%` : '—'} />
                <DetailRow label="Owner" value={detailRelease.owner} />
              </div>
              {detailRelease.description && (
                <div className="mt-6">
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-subtlest, #64748b)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '6px' }}>DESCRIPTION</div>
                  <p style={{ fontSize: '13px', color: 'var(--ds-text-subtle, #334155)', lineHeight: '1.6' }}>{detailRelease.description}</p>
                </div>
              )}
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => { navigate(`/releasehub/command-center?releaseId=${detailRelease.id}`); }}
                  className="flex-1 transition-colors"
                  style={{ ...primaryBtnStyle, padding: '8px 0' }}
                >
                  Open in Command Center
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ AI INSIGHTS DRAWER ═══ */}
      {isAIDrawerOpen && (
        <>
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={() => setIsAIDrawerOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-[201] overflow-y-auto" style={{ width: '400px', background: 'var(--bg-app, #fff)', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', animation: 'slideInRight 200ms ease' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--ds-border, #e2e8f0)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: '#8b5cf6' }} />
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text, #0f172a)' }}>AI Insights</h2>
              </div>
              <button onClick={() => setIsAIDrawerOpen(false)} style={closeBtnStyle}>✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {generateDynamicInsights(releases).map((insight, i) => {
                const INSIGHT_ICONS: Record<string, React.ReactNode> = {
                  critical: <AlertTriangle className="w-4 h-4" style={{ color: 'var(--ds-text-danger, #ef4444)' }} />,
                  warning: <AlertTriangle className="w-4 h-4" style={{ color: 'var(--ds-text-warning, #d97706)' }} />,
                  chart: <ArrowUpDown className="w-4 h-4" style={{ color: 'var(--ds-text-brand, #2563eb)' }} />,
                  check: <Check className="w-4 h-4" style={{ color: '#0d9488' }} />,
                  info: <Sparkles className="w-4 h-4" style={{ color: '#8b5cf6' }} />,
                };
                return (
                  <div key={i} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fafafa' }}>
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{INSIGHT_ICONS[insight.iconType]}</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text, #0f172a)' }}>{insight.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--ds-text-subtlest, #64748b)', marginTop: '2px', lineHeight: '1.5' }}>{insight.desc}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══ NEW RELEASE MODAL ═══ */}
      {isNewReleaseModalOpen && (
        <NewReleaseModal
          onClose={() => setIsNewReleaseModalOpen(false)}
          onCreate={handleCreateRelease}
          isCreating={createReleaseMutation.isPending}
        />
      )}

      {/* ═══ DELETE CONFIRM ═══ */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setDeleteConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50" style={{ width: '400px', background: 'var(--bg-app, #fff)', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text, #0f172a)', marginBottom: '8px' }}>Archive {selectedIds.size} releases?</h3>
            <p style={{ fontSize: '13px', color: 'var(--ds-text-subtlest, #64748b)', marginBottom: '20px' }}>These releases will be archived and hidden from the list. They can be restored later.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(false)} style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'var(--bg-app, #fff)', color: 'var(--ds-text-subtle, #334155)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                style={{ ...primaryBtnStyle, background: 'var(--ds-text-danger, #ef4444)' }}
              >
                {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes barGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        
        /* Force 36px compact rows */
        table tbody tr { height: 36px !important; max-height: 36px !important; }
        table tbody td { height: 36px !important; max-height: 36px !important; padding-top: 0 !important; padding-bottom: 0 !important; vertical-align: middle !important; line-height: 1.2 !important; font-size: 13px !important; }
        table thead th { height: 36px !important; max-height: 36px !important; padding-top: 0 !important; padding-bottom: 0 !important; vertical-align: middle !important; }
      `}</style>
    </div>
  );
}

// ─── Dynamic AI Insights (generated from real data) ─────────────
function generateDynamicInsights(releases: ViewRelease[]) {
  const insights: { iconType: 'critical' | 'warning' | 'chart' | 'check' | 'info'; title: string; desc: string }[] = [];

  const critical = releases.filter(r => r.health < 40);
  if (critical.length > 0) {
    insights.push({
      iconType: 'critical',
      title: `${critical.length} Release${critical.length > 1 ? 's' : ''} in Critical Health`,
      desc: `${critical.map(r => r.name).join(', ')} ${critical.length > 1 ? 'have' : 'has'} health below 40. Consider reallocating testing resources.`,
    });
  }

  const overdue = releases.filter(r => r.overdue);
  if (overdue.length > 0) {
    insights.push({
      iconType: 'warning',
      title: `${overdue.length} Overdue Release${overdue.length > 1 ? 's' : ''}`,
      desc: `${overdue.map(r => r.name).join(', ')} ${overdue.length > 1 ? 'are' : 'is'} past target date. Escalation recommended.`,
    });
  }

  const noCoverage = releases.filter(r => r.coverage === null || r.coverage === 0);
  if (noCoverage.length > 0) {
    insights.push({
      iconType: 'chart',
      title: 'Coverage Gap',
      desc: `${noCoverage.length} of ${releases.length} releases have no test coverage data. Run initial test suites for baseline metrics.`,
    });
  }

  const completed = releases.filter(r => r.status === 'released' && r.health >= 80);
  if (completed.length > 0) {
    insights.push({
      iconType: 'check',
      title: `${completed.length} Successfully Released`,
      desc: `${completed.map(r => r.name).join(', ')} completed with healthy metrics. Ready for post-release retrospective.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      iconType: 'info',
      title: 'All Looking Good',
      desc: 'No immediate concerns detected across your release portfolio.',
    });
  }

  return insights;
}

// ─── Sub-components ────────────────────────────────────────────

const colHeaderStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-subtlest, #64748b)', textTransform: 'uppercase',
  letterSpacing: '0.05em', textAlign: 'left', padding: '8px 12px', whiteSpace: 'nowrap',
  height: '32px', lineHeight: '32px', borderBottom: '1px solid #e2e8f0', background: 'var(--ds-surface-sunken, #f8fafc)',
};

const filterDividerStyle: React.CSSProperties = {
  borderTop: '1px solid #e2e8f0', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between',
};
const clearBtnStyle: React.CSSProperties = {
  fontSize: '12px', color: 'var(--ds-text-subtlest, #64748b)', background: 'none', border: 'none', cursor: 'pointer',
};
const applyBtnStyle: React.CSSProperties = {
  fontSize: '12px', color: 'var(--ds-text-brand, #2563eb)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
};
const bulkBarBtnStyle: React.CSSProperties = {
  padding: '4px 10px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', color: 'var(--ds-surface, #fff)', background: 'transparent', fontSize: '12px', cursor: 'pointer',
};
const closeBtnStyle: React.CSSProperties = {
  color: 'var(--ds-text-subtlest, #64748b)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px',
};
const primaryBtnStyle: React.CSSProperties = {
  padding: '6px 16px', borderRadius: '6px', background: 'var(--ds-text-brand, #2563eb)', color: 'var(--ds-surface, #fff)', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
};


function StatItem({ number, label, dotColor }: { number: number; label: string; dotColor?: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ gap: '6px' }}>
      {dotColor && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor }} />}
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text, #0f172a)' }}>{number}</span>
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-subtlest, #64748b)' }}>{label}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const c = getStatusConfig(status);
  return (
    <span className="inline-flex items-center gap-1" style={{ padding: '0 8px', borderRadius: '11px', background: c.bg, color: c.text, fontSize: '11px', fontWeight: 500, height: '22px', lineHeight: '22px', border: `1px solid ${c.bg === 'var(--ds-surface-sunken, #f1f5f9)' ? 'var(--ds-border, #e2e8f0)' : 'transparent'}` }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.dot }} />
      {c.label}
    </span>
  );
}

function SortableHeader({ label, field, current, direction, onClick, style }: {
  label: string; field: SortableField; current: SortableField; direction: 'asc' | 'desc'; onClick: (f: SortableField) => void; style?: React.CSSProperties;
}) {
  const isActive = current === field;
  return (
    <th
      onClick={() => onClick(field)}
      className="cursor-pointer select-none transition-colors hover:text-[var(--ds-text-subtle,#334155)]"
      style={{ ...colHeaderStyle, ...style, color: isActive ? 'var(--ds-text-brand, #2563eb)' : 'var(--ds-text-subtlest, #64748b)' }}
    >
      {label} {isActive && <span style={{ color: 'var(--ds-text-brand, #2563eb)' }}>{direction === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}

function ReleaseRow({ release: r, index = 0, selected, onToggle, onClick, onNavigate }: {
  release: ViewRelease; index?: number; selected: boolean; onToggle: () => void; onClick: () => void; onNavigate?: () => void;
}) {
  const cellStyle: React.CSSProperties = { padding: '0 16px', height: '50px', maxHeight: '50px', lineHeight: '36px', verticalAlign: 'middle', whiteSpace: 'nowrap' as const };
  // Test bar color based on pass ratio
  const testRatio = r.testsTotal > 0 ? r.testsPass / r.testsTotal : 0;
  const testBarColor = testRatio <= 0.3 ? 'var(--ds-text-danger, #ef4444)' : testRatio <= 0.6 ? 'var(--ds-text-warning, #d97706)' : '#0d9488';
  // Coverage color
  const covColor = r.coverage === null ? 'var(--ds-text-subtlest, #94a3b8)' : r.coverage <= 30 ? 'var(--ds-text-danger, #ef4444)' : r.coverage <= 60 ? 'var(--ds-text-warning, #d97706)' : '#0d9488';

  return (
    <tr
      onClick={onClick}
      className="group cursor-pointer transition-colors hover:bg-muted/50"
      style={{
        height: '50px', maxHeight: '50px', borderBottom: '1px solid #f1f5f9',
        background: selected ? 'var(--ds-background-selected, #eff6ff)' : undefined,
        animation: `fadeInUp 0.3s ease both`,
        animationDelay: `${index * 25}ms`,
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget.style.background = 'var(--ds-surface-sunken, #f8fafc)'); }}
      onMouseLeave={e => { if (!selected) (e.currentTarget.style.background = ''); }}
    >
      <td style={{ textAlign: 'center', padding: '0 4px', position: 'relative', width: '40px', height: '50px', verticalAlign: 'middle' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'var(--ds-text-brand, #2563eb)', opacity: 0, transition: 'opacity 100ms' }} className="group-hover:!opacity-100" />
        <input
          type="checkbox"
          checked={selected}
          onChange={e => { e.stopPropagation(); onToggle(); }}
          onClick={e => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ opacity: selected ? 1 : undefined, cursor: 'pointer', accentColor: 'var(--ds-text-brand, #2563eb)', width: '16px', height: '16px' }}
        />
      </td>
      <td style={{ ...cellStyle, minWidth: '280px' }}>
        <span style={{ display: 'inline-block', padding: '2px 6px', background: 'var(--ds-surface-sunken, #f1f5f9)', color: 'var(--ds-text-subtlest, #94a3b8)', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: 500, fontFamily: 'var(--cp-font-mono)', marginRight: '6px', verticalAlign: 'middle' }}>{r.version}</span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #0f172a)' }}>{r.name}</span>
      </td>
      <td style={{ ...cellStyle, width: '100px' }}><StatusPill status={r.status} /></td>
      <td style={{ ...cellStyle, width: '130px' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: '64px', height: '6px', background: 'var(--ds-border, #e2e8f0)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${r.progress}%`, height: '100%', background: r.progress <= 30 ? 'var(--ds-text-danger, #ef4444)' : r.progress <= 60 ? 'var(--ds-text-warning, #d97706)' : '#0d9488', borderRadius: '4px' }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-subtlest, #64748b)', fontFamily: 'var(--cp-font-mono)' }}>{r.progress}%</span>
        </div>
      </td>
      <td style={cellStyle}>
        <div className="flex items-center gap-2">
          <div className="flex" style={{ width: '60px', height: '6px', borderRadius: '4px', overflow: 'hidden', background: 'var(--ds-border, #e2e8f0)' }}>
            {r.testsTotal > 0 && (
              <>
                <div style={{ width: `${testRatio * 100}%`, background: testBarColor }} />
                {testRatio < 0.8 && <div style={{ width: `${(1 - testRatio) * 100}%`, background: 'var(--ds-text-danger, #ef4444)' }} />}
              </>
            )}
          </div>
          <span style={{ fontSize: '13px', fontWeight: testRatio < 0.8 ? 600 : 400, color: 'var(--ds-text-subtlest, #64748b)', fontFamily: 'var(--cp-font-mono)' }}>{r.testsPass}/{r.testsTotal}</span>
        </div>
      </td>
      <td style={{ ...cellStyle, width: '72px', fontSize: '14px', fontWeight: 600, color: r.defects >= 20 ? 'var(--ds-text-danger, #ef4444)' : r.defects >= 10 ? 'var(--ds-text-warning, #d97706)' : r.defects > 0 ? '#10b981' : 'var(--ds-text-subtlest, #94a3b8)', fontFamily: 'var(--cp-font-mono)' }}>
        {r.defects > 0 ? r.defects : '—'}
      </td>
      <td style={{ ...cellStyle, width: '100px' }}>
        {r.coverage !== null ? (
          <div className="flex items-center gap-2">
            <div style={{ width: '48px', height: '4px', background: 'var(--ds-border, #e2e8f0)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${r.coverage}%`, height: '100%', background: covColor, borderRadius: '4px' }} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: covColor, fontFamily: 'var(--cp-font-mono)' }}>{r.coverage}%</span>
          </div>
        ) : (
          <span style={{ fontSize: '13px', color: 'var(--ds-text-subtlest, #94a3b8)' }}>—</span>
        )}
      </td>
      <td style={{ ...cellStyle, width: '80px' }}>
        <div className="flex items-center gap-1.5">
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getHealthColor(r.health) }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: getHealthColor(r.health) }}>{r.health}</span>
        </div>
      </td>
      <td style={{ ...cellStyle, width: '80px' }}>
        {r.status === 'released' ? (
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#059669', textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>Released</span>
        ) : (
          <span style={{ fontSize: '13px', fontWeight: r.daysRemaining <= 7 ? 600 : 500, color: r.daysRemaining <= 7 ? 'var(--ds-text-danger, #ef4444)' : r.daysRemaining <= 14 ? 'var(--ds-text-warning, #d97706)' : 'var(--ds-text-subtlest, #64748b)', fontFamily: 'var(--cp-font-mono)' }}>
            {r.overdue ? `-${r.daysRemaining}d` : `${r.daysRemaining}d`}
          </span>
        )}
      </td>
      <td style={{ ...cellStyle, width: '100px' }}>
        {r.owner === 'Unassigned' ? (
          <div className="flex items-center gap-1.5" style={{ color: 'var(--ds-text-brand, #2563eb)' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--ds-surface-sunken, #f1f5f9)', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus className="w-2.5 h-2.5" style={{ color: 'var(--ds-text-subtlest, #94a3b8)' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-brand, #2563eb)' }}>Assign</span>
          </div>
        ) : (
          <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ds-text-subtle, #334155)' }}>{r.owner}</span>
        )}
      </td>
    </tr>
  );
}

function CheckboxRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--ds-surface-sunken,#f8fafc)]" style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--ds-text-subtle, #334155)' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: 'var(--ds-text-brand, #2563eb)' }} />
      {label}
    </label>
  );
}

function FilterPill({ label, active, count, isOpen, onToggle, children }: {
  label: string; active: boolean; count: number; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative" data-dropdown>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 transition-colors"
        style={{
          height: '32px', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          border: `1px solid ${active ? 'var(--ds-text-brand, #2563eb)' : 'var(--ds-border, #e2e8f0)'}`,
          background: active ? '#dbeafe' : 'var(--ds-surface, #fff)',
          color: active ? 'var(--ds-text-brand, #2563eb)' : 'var(--ds-text-subtle, #334155)',
        }}
      >
        {label}{active && count > 0 ? ` (${count})` : ''} <ChevronDown className="w-3 h-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 z-50" style={{ background: 'var(--bg-app, #fff)', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '4px', minWidth: '200px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left transition-colors hover:bg-[var(--ds-surface-sunken,#f8fafc)]"
      style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--ds-text-subtle, #334155)', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px' }}
    >
      {icon} {label}
    </button>
  );
}

function MetricBox({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="flex-1 text-center" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-subtlest, #64748b)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-subtlest, #64748b)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--ds-text-subtle, #334155)' }}>{value}</span>
    </div>
  );
}

// ─── New Release Modal ─────────────────────────────────────────
function NewReleaseModal({ onClose, onCreate, isCreating }: { onClose: () => void; onCreate: (r: { name: string; version: string; status: string; targetDate: string; description: string }) => void; isCreating: boolean }) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [status, setStatus] = useState('planned');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Release name is required'); return; }
    onCreate({ name: name.trim(), version, status, targetDate, description });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-subtlest, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block',
  };

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50" style={{ width: '500px', background: 'var(--bg-app, #fff)', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', animation: 'scaleIn 200ms ease' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--ds-border, #e2e8f0)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text, #0f172a)' }}>Create New Release</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label style={labelStyle}>RELEASE NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Q2 2026 Release" autoFocus onFocus={e => (e.currentTarget.style.borderColor = 'var(--ds-text-brand, #2563eb)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--ds-border, #e2e8f0)')} />
          </div>
          <div>
            <label style={labelStyle}>VERSION</label>
            <input value={version} onChange={e => setVersion(e.target.value)} style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = 'var(--ds-text-brand, #2563eb)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--ds-border, #e2e8f0)')} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label style={labelStyle}>STATUS</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="testing">Testing</option>
                <option value="uat">UAT</option>
              </select>
            </div>
            <div className="flex-1">
              <label style={labelStyle}>TARGET DATE</label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = 'var(--ds-text-brand, #2563eb)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--ds-border, #e2e8f0)')} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>DESCRIPTION (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => (e.currentTarget.style.borderColor = 'var(--ds-text-brand, #2563eb)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--ds-border, #e2e8f0)')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: 'var(--ds-border, #e2e8f0)' }}>
          <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'var(--bg-app, #fff)', color: 'var(--ds-text-subtle, #334155)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isCreating}
            style={{ ...primaryBtnStyle, opacity: isCreating ? 0.7 : 1 }}
          >
            {isCreating ? 'Creating...' : 'Create Release'}
          </button>
        </div>
        <style>{`@keyframes scaleIn { from { transform: translate(-50%,-50%) scale(0.95); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }`}</style>
      </div>
    </>
  );
}

// ─── Cards View ────────────────────────────────────────────────
const HEALTH_BADGE: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'rgba(239,68,68,0.1)', text: 'var(--ds-text-danger, #ef4444)' },
  'at-risk': { bg: 'rgba(217,119,6,0.1)', text: 'var(--ds-text-warning, #d97706)' },
  attention: { bg: 'rgba(37,99,235,0.1)', text: 'var(--ds-text-brand, #2563eb)' },
  healthy: { bg: 'rgba(13,148,136,0.1)', text: '#0d9488' },
};

function CardsView({ releases, selectedIds, onToggle, onCardClick }: {
  releases: ViewRelease[]; selectedIds: Set<string>; onToggle: (id: string) => void; onCardClick: (r: ViewRelease) => void;
}) {
  return (
    <div style={{ padding: '16px 0', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="max-[1199px]:!grid-cols-2 max-[767px]:!grid-cols-1">
        {releases.map((r, i) => {
          const selected = selectedIds.has(r.id);
          const hl = getHealthLabel(r.health);
          const hBadge = HEALTH_BADGE[hl] || HEALTH_BADGE.critical;
          return (
            <div
              key={r.id}
              onClick={() => onCardClick(r)}
              className="group cursor-pointer transition-all relative"
              style={{
                background: selected ? 'var(--ds-background-selected, #eff6ff)' : 'var(--ds-surface, #fff)',
                border: `1px solid ${selected ? 'var(--ds-text-brand, #2563eb)' : 'var(--ds-border, #e2e8f0)'}`,
                borderRadius: '8px', padding: '16px',
                animation: `fadeInUp 0.3s ease both`,
                animationDelay: `${i * 30}ms`,
              }}
              onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = 'var(--ds-text-disabled, #cbd5e1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; } }}
              onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = 'var(--ds-border, #e2e8f0)'; e.currentTarget.style.boxShadow = 'none'; } }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={e => { e.stopPropagation(); onToggle(r.id); }}
                onClick={e => e.stopPropagation()}
                className="absolute transition-opacity"
                style={{ top: '12px', left: '12px', opacity: selected ? 1 : 0, cursor: 'pointer', accentColor: 'var(--ds-text-brand, #2563eb)' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.opacity = '0'; }}
              />
              <div className="flex items-center gap-1.5 mb-2">
                <span style={{ padding: '1px 6px', background: 'var(--ds-surface-sunken, #f1f5f9)', color: 'var(--ds-text-subtle, #475569)', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{r.version}</span>
                <span className="flex-1 truncate" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ds-text, #0f172a)' }}>{r.name}</span>
                <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: hBadge.bg, color: hBadge.text, flexShrink: 0 }}>
                  {getHealthDisplay(r.health)}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div style={{ flex: 1, height: '4px', background: 'var(--ds-border, #e2e8f0)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${r.health}%`, height: '100%', background: getHealthColor(r.health), borderRadius: '4px', transition: 'width 400ms ease-out' }} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-subtlest, #64748b)' }}>{r.health}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '12px' }}>
                <StatusPill status={r.status} />
                <span style={{ color: 'var(--ds-text-subtlest, #64748b)' }}><Calendar className="w-3 h-3 inline-block mr-0.5" style={{ verticalAlign: 'middle' }} /> {r.targetDate}</span>
                {r.overdue && (
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--ds-text-danger, #ef4444)', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '1px 6px' }}>
                    {r.daysRemaining}d overdue
                  </span>
                )}
                {r.owner === 'Unassigned' ? (
                  <div className="ml-auto flex items-center gap-1" style={{ color: 'var(--ds-text-subtlest, #94a3b8)' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--ds-surface-sunken, #f1f5f9)', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus className="w-2.5 h-2.5" style={{ color: 'var(--ds-text-subtlest, #94a3b8)' }} />
                    </div>
                  </div>
                ) : (
                  <span className="ml-auto" style={{ color: 'var(--ds-text-subtle, #334155)', fontSize: '12px' }}>{r.owner}</span>
                )}
              </div>
              <div className="flex items-center gap-4" style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--ds-text-subtlest, #64748b)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ds-text-subtle, #334155)' }}>{r.testsPass}/{r.testsTotal}</span> Tests
                </span>
                <span style={{ fontSize: '11px', color: 'var(--ds-text-subtlest, #64748b)' }}>
                  <span style={{ fontWeight: 600, color: r.defects > 0 ? 'var(--ds-text-danger, #ef4444)' : 'var(--ds-text-subtlest, #64748b)' }}>{r.defects}</span> Defects
                </span>
                <span style={{ fontSize: '11px', color: 'var(--ds-text-subtlest, #64748b)' }}>
                  {r.coverage !== null ? (
                    <span className="inline-flex items-center gap-1">
                      <span style={{ display: 'inline-block', width: '32px', height: '3px', background: 'var(--ds-border, #e2e8f0)', borderRadius: '4px', overflow: 'hidden', verticalAlign: 'middle' }}>
                        <span style={{ display: 'block', width: `${r.coverage}%`, height: '100%', background: r.coverage <= 30 ? 'var(--ds-text-danger, #ef4444)' : r.coverage <= 60 ? 'var(--ds-text-warning, #d97706)' : '#0d9488', borderRadius: '4px' }} />
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--ds-text-subtle, #334155)' }}>{r.coverage}%</span>
                    </span>
                  ) : (
                    <span style={{ fontWeight: 600, color: 'var(--ds-text-subtlest, #94a3b8)' }}>—</span>
                  )} Coverage
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Timeline View ─────────────────────────────────────────────
const MONTHS = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026'];
function getTimelineBarColor(r: ViewRelease): string {
  if (r.status === 'released') return '#0d9488';
  if (r.progress === 0) return 'var(--ds-text-disabled, #cbd5e1)';
  if (r.health < 40) return 'var(--ds-text-danger, #ef4444)';
  if (r.health < 60) return 'var(--ds-text-warning, #d97706)';
  if (r.health < 80) return 'var(--ds-text-brand, #2563eb)';
  return '#0d9488';
}
const LEGEND_ITEMS = [
  { label: 'Critical', color: 'var(--ds-text-danger, #ef4444)', shape: 'circle' },
  { label: 'At Risk', color: 'var(--ds-text-warning, #d97706)', shape: 'circle' },
  { label: 'Healthy', color: '#0d9488', shape: 'circle' },
  { label: 'Today', color: 'var(--ds-text-danger, #ef4444)', shape: 'line' },
];

function TimelineView({ releases, onBarClick }: {
  releases: ViewRelease[]; onBarClick: (r: ViewRelease) => void;
}) {
  const [hoveredRelease, setHoveredRelease] = useState<ViewRelease | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleBarHover = (e: React.MouseEvent, r: ViewRelease | null) => {
    setHoveredRelease(r);
    if (r) setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  // Calculate today marker position
  const timelineStart = new Date('2026-01-01').getTime();
  const timelineEnd = new Date('2026-11-01').getTime();
  const todayPos = Math.max(0, Math.min(100, ((Date.now() - timelineStart) / (timelineEnd - timelineStart)) * 100));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div />
        <div className="flex items-center gap-4">
          {LEGEND_ITEMS.map(l => (
            <div key={l.label} className="flex items-center" style={{ gap: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-subtlest, #64748b)' }}>
              {l.shape === 'circle' ? (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }} />
              ) : (
                <div style={{ width: '12px', height: '2px', background: l.color, borderRadius: '1px' }} />
              )}
              {l.label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-app, #fff)' }}>
        <div style={{ width: '260px', flexShrink: 0, borderRight: '1px solid #e2e8f0' }}>
          <div style={{ height: '32px', background: 'var(--ds-surface-sunken, #f8fafc)', display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-subtlest, #64748b)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>RELEASE</span>
          </div>
          {releases.map(r => (
            <div
              key={r.id}
              onClick={() => onBarClick(r)}
              className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--ds-surface-sunken,#f8fafc)]"
              style={{ height: '50px', padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getHealthColor(r.health), flexShrink: 0 }} />
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #0f172a)', lineHeight: '36px' }}>{r.name}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto relative">
          <div className="flex" style={{ height: '32px', background: 'var(--ds-surface-sunken, #f8fafc)', borderBottom: '1px solid #e2e8f0' }}>
            {MONTHS.map(m => (
              <div key={m} className="flex-1" style={{ minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--ds-text-subtlest, #64748b)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderRight: '1px solid #f1f5f9' }}>
                {m}
              </div>
            ))}
          </div>

          {/* Today marker */}
          <div className="absolute" style={{ left: `${todayPos}%`, top: '32px', bottom: 0, width: '2px', background: 'var(--ds-text-danger, #ef4444)', zIndex: 5 }}>
            <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-danger, #ef4444)', whiteSpace: 'nowrap' }}>Today</span>
          </div>

          {releases.map((r, i) => {
            const isPlanned = r.progress === 0 && r.status !== 'released';
            const barColor = getTimelineBarColor(r);
            return (
              <div key={r.id} className="relative" style={{ height: '50px', borderBottom: '1px solid #f1f5f9' }}>
                <div
                  onClick={() => onBarClick(r)}
                  onMouseMove={e => handleBarHover(e, r)}
                  onMouseLeave={e => { setHoveredRelease(null); e.currentTarget.style.filter = ''; }}
                  className="absolute cursor-pointer"
                  style={{
                    left: `${r.barLeft}%`, width: `${r.barWidth}%`,
                    height: '24px', top: '6px', borderRadius: '4px',
                    background: isPlanned ? 'transparent' : barColor,
                    border: isPlanned ? `1.5px dashed #cbd5e1` : 'none',
                    animation: 'barGrow 0.4s ease-out both',
                    animationDelay: `${i * 40}ms`,
                    transformOrigin: 'left center',
                    transition: 'filter 100ms',
                    zIndex: 1,
                    overflow: 'hidden',
                    minWidth: '40px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.88)')}
                >
                  {/* Progress fill inside bar */}
                  {r.progress > 0 && !isPlanned && (
                    <div style={{ width: `${r.progress}%`, height: '100%', background: 'rgba(255,255,255,0.35)', position: 'absolute', left: 0, top: 0 }} />
                  )}
                  <span style={{ fontSize: '11px', fontWeight: 700, color: isPlanned ? 'var(--ds-text-subtlest, #94a3b8)' : 'var(--ds-surface, #fff)', padding: '0 6px', lineHeight: '24px', position: 'relative', zIndex: 1, textShadow: isPlanned ? 'none' : '0 1px 2px rgba(0,0,0,0.3)' }}>
                    {r.progress}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hoveredRelease && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPos.x + 8, top: tooltipPos.y + 8,
            background: 'var(--bg-app, #fff)', border: '1px solid #e2e8f0', borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '12px',
            animation: 'fadeInUp 150ms ease both', minWidth: '200px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text, #0f172a)' }}>{hoveredRelease.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-subtlest, #64748b)', marginTop: '4px' }}>Status: {getStatusConfig(hoveredRelease.status).label}</div>
          <div style={{ fontSize: '12px', marginTop: '2px' }}>
            <span style={{ color: 'var(--ds-text-subtlest, #64748b)' }}>Health: </span>
            <span style={{ color: getHealthColor(hoveredRelease.health), fontWeight: 600 }}>{hoveredRelease.health} ({getHealthDisplay(hoveredRelease.health)})</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-subtlest, #64748b)', marginTop: '2px' }}>Progress: {hoveredRelease.progress}%</div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-subtlest, #64748b)', marginTop: '2px' }}>Target: {hoveredRelease.targetDate}</div>
        </div>
      )}
    </div>
  );
}
