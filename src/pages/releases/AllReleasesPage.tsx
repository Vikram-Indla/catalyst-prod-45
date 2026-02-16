/**
 * ALL RELEASES PAGE — CATALYST10 Complete Rebuild (Prompt 1 of 2)
 * Viewport-locked layout, Table view default, all CTAs functional
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, ChevronDown, ChevronUp, Download, Plus, Sparkles,
  LayoutGrid, Clock, Table2, FileText, FileSpreadsheet, FileDown,
  Clipboard, Check, Loader2, ArrowUpDown, Calendar, Rocket,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────
interface Release {
  id: string;
  name: string;
  version: string;
  type: 'MAJOR' | 'MINOR' | 'PATCH';
  status: 'planning' | 'staging' | 'testing' | 'released';
  health: number;
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
}

// ─── Seed Data ──────────────────────────────────────────────────
const initialReleases: Release[] = [
  { id: "r1", name: "24 Jan Release", version: "v1.0", type: "MAJOR", status: "planning", health: 30, progress: 0, testsPass: 0, testsTotal: 1, defects: 0, coverage: null, targetDate: "Jan 29, 2026", daysRemaining: 0, overdue: true, owner: "Unassigned", description: "January maintenance release", barLeft: 5, barWidth: 14 },
  { id: "r2", name: "Cloud Integration v2.0", version: "2.0.0", type: "MAJOR", status: "staging", health: 53, progress: 75, testsPass: 152, testsTotal: 203, defects: 18, coverage: 76, targetDate: "Feb 20, 2026", daysRemaining: 3, overdue: false, owner: "Unassigned", description: "Cloud platform integration", barLeft: 10, barWidth: 18 },
  { id: "r3", name: "Legacy Migration v1.0", version: "1.0.0", type: "MAJOR", status: "released", health: 99, progress: 99, testsPass: 154, testsTotal: 156, defects: 0, coverage: 99, targetDate: "Jan 20, 2026", daysRemaining: 0, overdue: false, owner: "Unassigned", description: "Legacy system migration", barLeft: 2, barWidth: 12 },
  { id: "r4", name: "Microservices Suite v4.1", version: "4.1.0", type: "MINOR", status: "planning", health: 30, progress: 0, testsPass: 0, testsTotal: 389, defects: 0, coverage: null, targetDate: "Apr 30, 2026", daysRemaining: 72, overdue: false, owner: "Unassigned", description: "Microservices architecture update", barLeft: 35, barWidth: 20 },
  { id: "r5", name: "Platform Beta v3.0", version: "3.0.0", type: "MAJOR", status: "planning", health: 40, progress: 51, testsPass: 261, testsTotal: 512, defects: 34, coverage: 65, targetDate: "Mar 15, 2026", daysRemaining: 26, overdue: false, owner: "Unassigned", description: "Platform beta release", barLeft: 15, barWidth: 18 },
  { id: "r6", name: "Project Alpha v2.1", version: "2.1.0", type: "MINOR", status: "testing", health: 55, progress: 76, testsPass: 187, testsTotal: 245, defects: 12, coverage: 82, targetDate: "Feb 28, 2026", daysRemaining: 11, overdue: false, owner: "Unassigned", description: "Alpha project iteration", barLeft: 12, barWidth: 16 },
  { id: "r7", name: "Q1 2026 Release v1.0", version: "v1.0", type: "MAJOR", status: "planning", health: 30, progress: 0, testsPass: 0, testsTotal: 2, defects: 0, coverage: null, targetDate: "Mar 15, 2026", daysRemaining: 26, overdue: false, owner: "Unassigned", description: "Q1 quarterly release", barLeft: 18, barWidth: 14 },
  { id: "r8", name: "Q1 2026 Release v1.1", version: "v1.0", type: "MAJOR", status: "planning", health: 30, progress: 0, testsPass: 0, testsTotal: 1, defects: 0, coverage: null, targetDate: "Mar 31, 2026", daysRemaining: 42, overdue: false, owner: "Unassigned", description: "Q1 patch release", barLeft: 20, barWidth: 16 },
  { id: "r9", name: "Q2 2026 Release v2.0", version: "v1.0", type: "MAJOR", status: "planning", health: 70, progress: 0, testsPass: 0, testsTotal: 0, defects: 0, coverage: null, targetDate: "Jun 15, 2026", daysRemaining: 118, overdue: false, owner: "Unassigned", description: "Q2 major release", barLeft: 48, barWidth: 18 },
  { id: "r10", name: "Q2 2026 Release v2.1", version: "v1.0", type: "MAJOR", status: "planning", health: 70, progress: 0, testsPass: 0, testsTotal: 0, defects: 0, coverage: null, targetDate: "Jun 30, 2026", daysRemaining: 133, overdue: false, owner: "Unassigned", description: "Q2 patch release", barLeft: 52, barWidth: 18 },
  { id: "r11", name: "Q3 2026 Release v3.0", version: "v1.0", type: "MAJOR", status: "planning", health: 70, progress: 0, testsPass: 0, testsTotal: 0, defects: 0, coverage: null, targetDate: "Sep 15, 2026", daysRemaining: 210, overdue: false, owner: "Unassigned", description: "Q3 quarterly release", barLeft: 75, barWidth: 18 },
  { id: "r12", name: "Security Patch v1.2.3", version: "1.2.3", type: "PATCH", status: "testing", health: 60, progress: 82, testsPass: 71, testsTotal: 87, defects: 28, coverage: 91, targetDate: "Feb 10, 2026", daysRemaining: 0, overdue: true, owner: "Unassigned", description: "Critical security patch", barLeft: 8, barWidth: 14 },
];

// ─── Helpers ────────────────────────────────────────────────────
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
  if (h < 40) return '#ef4444';
  if (h < 60) return '#d97706';
  if (h < 80) return '#2563eb';
  return '#0d9488';
}
function getHealthBg(h: number) {
  if (h < 40) return '#fee2e2';
  if (h < 60) return '#fef3c7';
  if (h < 80) return '#dbeafe';
  return '#ccfbf1';
}

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  planning: { dot: '#94a3b8', bg: '#f1f5f9', text: '#475569', label: 'Planning' },
  staging:  { dot: '#6366f1', bg: '#e0e7ff', text: '#3730a3', label: 'Staging' },
  testing:  { dot: '#d97706', bg: '#fef3c7', text: '#92400e', label: 'Testing' },
  released: { dot: '#0d9488', bg: '#ccfbf1', text: '#115e59', label: 'Released' },
};

type SortableField = 'name' | 'status' | 'progress' | 'defects' | 'health' | 'daysRemaining';

// ─── Page Component ─────────────────────────────────────────────
export default function AllReleasesPage() {
  const navigate = useNavigate();

  // Core state
  const [releases, setReleases] = useState<Release[]>(initialReleases);
  const [activeView, setActiveView] = useState<'cards' | 'timeline' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [healthFilter, setHealthFilter] = useState<string[]>([]);
  const [quarterFilter, setQuarterFilter] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortableField>('health');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [perPage, setPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);

  // UI state
  const [isNewReleaseModalOpen, setIsNewReleaseModalOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [detailRelease, setDetailRelease] = useState<Release | null>(null);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);
  const [bulkStatusDropdown, setBulkStatusDropdown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Refs
  const searchRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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

  const totalPages = Math.ceil(filteredReleases.length / perPage);
  const paginatedReleases = filteredReleases.slice((currentPage - 1) * perPage, currentPage * perPage);

  const statCounts = useMemo(() => ({
    total: releases.length,
    planning: releases.filter(r => r.status === 'planning').length,
    staging: releases.filter(r => r.status === 'staging').length,
    testing: releases.filter(r => r.status === 'testing').length,
    released: releases.filter(r => r.status === 'released').length,
    atRisk: releases.filter(r => r.health >= 40 && r.health < 60).length,
  }), [releases]);

  // ─── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
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
      if (e.key === 'n' || e.key === 'N') setIsNewReleaseModalOpen(true);
      if (e.key === 'e' || e.key === 'E') setIsExportDropdownOpen(p => !p);
      if (e.key === '1') setActiveView('cards');
      if (e.key === '2') setActiveView('timeline');
      if (e.key === '3') setActiveView('table');
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
    if (selectedIds.size === paginatedReleases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedReleases.map(r => r.id)));
    }
  };

  const handleExportCSV = () => {
    const headers = "Release,Version,Type,Status,Health,Progress,Tests,Defects,Coverage,Days,Owner";
    const rows = filteredReleases.map(r =>
      `"${r.name}",${r.version},${r.type},${r.status},${r.health},${r.progress}%,${r.testsPass}/${r.testsTotal},${r.defects},${r.coverage ?? '—'},${r.daysRemaining}d,${r.owner}`
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
    const headers = "Release\tVersion\tType\tStatus\tHealth\tProgress\tTests\tDefects\tCoverage\tDays\tOwner";
    const rows = filteredReleases.map(r =>
      `${r.name}\t${r.version}\t${r.type}\t${r.status}\t${r.health}\t${r.progress}%\t${r.testsPass}/${r.testsTotal}\t${r.defects}\t${r.coverage ?? '—'}\t${r.daysRemaining}d\t${r.owner}`
    );
    navigator.clipboard.writeText([headers, ...rows].join('\n'));
    toast.success("Copied to clipboard!");
    setIsExportDropdownOpen(false);
  };

  const handleBulkDelete = () => {
    setReleases(prev => prev.filter(r => !selectedIds.has(r.id)));
    toast.success(`Deleted ${selectedIds.size} releases`);
    setSelectedIds(new Set());
    setDeleteConfirm(false);
  };

  const handleBulkStatus = (newStatus: Release['status']) => {
    setReleases(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, status: newStatus } : r));
    toast.success(`Updated ${selectedIds.size} releases to ${STATUS_CONFIG[newStatus].label}`);
    setSelectedIds(new Set());
    setBulkStatusDropdown(false);
  };

  const handleExportSelected = () => {
    const sel = filteredReleases.filter(r => selectedIds.has(r.id));
    const headers = "Release,Version,Type,Status,Health,Progress,Tests,Defects,Coverage,Days,Owner";
    const rows = sel.map(r =>
      `"${r.name}",${r.version},${r.type},${r.status},${r.health},${r.progress}%,${r.testsPass}/${r.testsTotal},${r.defects},${r.coverage ?? '—'},${r.daysRemaining}d,${r.owner}`
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

  // Select all checkbox state
  const selectAllState: 'none' | 'some' | 'all' =
    selectedIds.size === 0 ? 'none' :
    selectedIds.size === paginatedReleases.length ? 'all' : 'some';

  // ─── Render Helpers ─────────────────────────────────────────
  const sortArrow = sortDirection === 'asc' ? '↑' : '↓';
  const sortFieldLabel = { name: 'Name', status: 'Status', progress: 'Progress', defects: 'Defects', health: 'Health', daysRemaining: 'Days' }[sortField];

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>
      {/* ═══ PAGE HEADER (52px) ═══ */}
      <header className="flex items-center justify-between px-6 border-b" style={{ height: '52px', flexShrink: 0, borderColor: '#e2e8f0', background: '#ffffff' }}>
        <div className="flex items-center gap-3">
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>All Releases</h1>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>{releases.length} releases</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Export */}
          <div className="relative" data-dropdown ref={exportRef}>
            <button
              onClick={() => setIsExportDropdownOpen(p => !p)}
              className="flex items-center gap-1.5 transition-colors"
              style={{ height: '32px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', fontSize: '13px', fontWeight: 500, color: '#334155' }}
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-1 z-50" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '4px', minWidth: '200px' }}>
                <DropdownItem icon={<FileText className="w-3.5 h-3.5" />} label="Export as CSV" onClick={handleExportCSV} />
                <DropdownItem icon={<FileSpreadsheet className="w-3.5 h-3.5" />} label="Export as Excel" onClick={() => { toast.info('Coming soon'); setIsExportDropdownOpen(false); }} />
                <DropdownItem icon={<FileDown className="w-3.5 h-3.5" />} label="Export as PDF" onClick={() => { toast.info('Coming soon'); setIsExportDropdownOpen(false); }} />
                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                <DropdownItem icon={<Clipboard className="w-3.5 h-3.5" />} label="Copy to Clipboard" onClick={handleCopyClipboard} />
              </div>
            )}
          </div>
          {/* New Release */}
          <button
            onClick={() => setIsNewReleaseModalOpen(true)}
            className="flex items-center gap-1.5 transition-colors"
            style={{ height: '32px', padding: '0 14px', borderRadius: '6px', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
            onMouseLeave={e => (e.currentTarget.style.background = '#2563eb')}
          >
            <Plus className="w-3.5 h-3.5" /> New Release
          </button>
        </div>
      </header>

      {/* ═══ STAT STRIP (48px) ═══ */}
      <div className="flex items-center px-6" style={{ height: '48px', flexShrink: 0 }}>
        <div className="flex items-center justify-between w-full" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '6px 16px' }}>
          <div className="flex items-center gap-5">
            <StatItem number={statCounts.total} label="Total" />
            <StatItem number={statCounts.planning} label="Planning" dotColor="#94a3b8" />
            <StatItem number={statCounts.staging} label="Staging" dotColor="#6366f1" />
            <StatItem number={statCounts.testing} label="Testing" dotColor="#d97706" />
            <StatItem number={statCounts.atRisk} label="At Risk" dotColor="#ef4444" />
            <StatItem number={statCounts.released} label="Released" dotColor="#0d9488" />
          </div>
          <button
            onClick={() => setIsAIDrawerOpen(true)}
            className="flex items-center gap-1.5 transition-colors"
            style={{ border: '1px solid #6366f1', borderRadius: '16px', padding: '4px 12px', color: '#6366f1', fontSize: '12px', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}
          >
            <Sparkles className="w-3 h-3" /> AI Insights <span style={{ background: '#6366f1', color: '#fff', borderRadius: '8px', padding: '0 5px', fontSize: '10px', fontWeight: 700, marginLeft: '2px' }}>5</span>
          </button>
        </div>
      </div>

      {/* ═══ TOOLBAR (44px) ═══ */}
      <div className="flex items-center px-6 gap-3" style={{ height: '44px', flexShrink: 0 }}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search releases..."
            className="focus:outline-none"
            style={{ width: '200px', height: '32px', paddingLeft: '32px', paddingRight: searchQuery ? '28px' : '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: '#f8fafc' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
            onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
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
          {(['planning', 'staging', 'testing', 'released'] as const).map(s => (
            <CheckboxRow key={s} checked={statusFilter.includes(s)} label={`${STATUS_CONFIG[s].label} (${releases.filter(r => r.status === s).length})`}
              onChange={() => { setStatusFilter(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]); setCurrentPage(1); }} />
          ))}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStatusFilter([])} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
            <button onClick={() => setActiveFilterDropdown(null)} style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Apply</button>
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
              onChange={() => { setHealthFilter(p => p.includes(h) ? p.filter(x => x !== h) : [...p, h]); setCurrentPage(1); }} />;
          })}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setHealthFilter([])} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
            <button onClick={() => setActiveFilterDropdown(null)} style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Apply</button>
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
              onChange={() => { setQuarterFilter(p => p.includes(q) ? p.filter(x => x !== q) : [...p, q]); setCurrentPage(1); }} />
          ))}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setQuarterFilter([])} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
            <button onClick={() => setActiveFilterDropdown(null)} style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Apply</button>
          </div>
        </FilterPill>

        <div className="flex-1" />

        {/* Sort */}
        <button
          onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1 transition-colors"
          style={{ fontSize: '13px', fontWeight: 500, color: '#334155', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowUpDown className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
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
                padding: '4px 10px', fontSize: '12px', fontWeight: activeView === v.key ? 600 : 400,
                background: activeView === v.key ? '#dbeafe' : '#fff',
                color: activeView === v.key ? '#2563eb' : '#64748b',
                border: 'none', cursor: 'pointer',
              }}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CONTENT AREA (flex:1) ═══ */}
      <div className="flex-1 min-h-0 overflow-hidden relative px-6 pt-2 pb-0">
        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div
            className="absolute top-0 left-6 right-6 z-10 flex items-center gap-3 px-4"
            style={{ height: '44px', background: '#1e293b', borderRadius: '0 0 8px 8px', color: '#fff', fontSize: '13px', animation: 'slideDown 200ms ease' }}
          >
            <span style={{ fontWeight: 500 }}>{selectedIds.size} releases selected</span>
            <div className="relative" data-dropdown>
              <button onClick={() => setBulkStatusDropdown(p => !p)} className="flex items-center gap-1" style={{ padding: '4px 10px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', color: '#fff', background: 'transparent', fontSize: '12px', cursor: 'pointer' }}>
                Change Status <ChevronDown className="w-3 h-3" />
              </button>
              {bulkStatusDropdown && (
                <div className="absolute top-full mt-1 left-0 z-50" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: '140px' }}>
                  {(['planning', 'staging', 'testing', 'released'] as const).map(s => (
                    <button key={s} onClick={() => handleBulkStatus(s)} className="block w-full text-left px-3 py-1.5 transition-colors hover:bg-[#f8fafc]" style={{ fontSize: '13px', color: '#334155', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleExportSelected} style={{ padding: '4px 10px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', color: '#fff', background: 'transparent', fontSize: '12px', cursor: 'pointer' }}>
              Export Selected
            </button>
            <button onClick={() => setDeleteConfirm(true)} style={{ padding: '4px 10px', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '4px', color: '#fca5a5', background: 'transparent', fontSize: '12px', cursor: 'pointer' }}>
              Delete
            </button>
            <div className="flex-1" />
            <button onClick={() => setSelectedIds(new Set())} style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✕</button>
          </div>
        )}

        {/* Views with crossfade */}
        <div className="h-full overflow-y-auto" style={{ paddingTop: selectedIds.size > 0 ? '48px' : 0 }} key={activeView}>
          {paginatedReleases.length === 0 ? (
            /* ═══ EMPTY STATE ═══ */
            <div className="flex flex-col items-center justify-center h-full" style={{ animation: 'fadeInUp 0.3s ease both' }}>
              <Rocket className="w-12 h-12 mb-4" style={{ color: '#94a3b8' }} />
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>No releases match your filters</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Try adjusting your search or filter criteria</div>
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter([]); setHealthFilter([]); setQuarterFilter([]); setCurrentPage(1); }}
                className="mt-4 transition-colors"
                style={{ padding: '6px 16px', borderRadius: '6px', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Clear all filters
              </button>
            </div>
          ) : activeView === 'table' ? (
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ height: '34px', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 2 }}>
                  <th style={{ width: '36px', textAlign: 'center', padding: '0 4px' }}>
                    <input
                      type="checkbox"
                      checked={selectAllState === 'all'}
                      ref={el => { if (el) el.indeterminate = selectAllState === 'some'; }}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: '#2563eb' }}
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
                {paginatedReleases.map((r, i) => (
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
              releases={paginatedReleases}
              selectedIds={selectedIds}
              onToggle={toggleSelect}
              onCardClick={setDetailRelease}
            />
          ) : (
            <TimelineView
              releases={paginatedReleases}
              onBarClick={setDetailRelease}
            />
          )}
        </div>
      </div>

      {/* ═══ PAGINATION (40px) ═══ */}
      <div className="flex items-center justify-between px-6" style={{ height: '40px', flexShrink: 0, borderTop: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>
          Showing {filteredReleases.length > 0 ? (currentPage - 1) * perPage + 1 : 0}–{Math.min(currentPage * perPage, filteredReleases.length)} of {filteredReleases.length} releases
        </span>
        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <div className="flex items-center gap-1 mr-3">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ ...paginationBtnStyle, opacity: currentPage === 1 ? 0.4 : 1 }}>← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i + 1} onClick={() => setCurrentPage(i + 1)}
                  style={{ ...paginationBtnStyle, ...(currentPage === i + 1 ? activePaginationStyle : {}) }}>{i + 1}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ ...paginationBtnStyle, opacity: currentPage === totalPages ? 0.4 : 1 }}>Next →</button>
            </div>
          )}
          <span style={{ fontSize: '12px', color: '#64748b', marginRight: '4px' }}>Per page:</span>
          {[6, 12, 24].map(size => (
            <button
              key={size}
              onClick={() => { setPerPage(size); setCurrentPage(1); }}
              style={{
                width: '28px', height: '24px', borderRadius: '4px', fontSize: '12px', fontWeight: perPage === size ? 600 : 400,
                border: `1px solid ${perPage === size ? '#2563eb' : '#e2e8f0'}`,
                background: perPage === size ? '#dbeafe' : '#fff',
                color: perPage === size ? '#2563eb' : '#64748b',
                cursor: 'pointer',
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ DETAIL DRAWER ═══ */}
      {detailRelease && (
        <>
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDetailRelease(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-[201] overflow-y-auto" style={{ width: '480px', background: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', animation: 'slideInRight 200ms ease' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e2e8f0' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{detailRelease.name}</h2>
              <button onClick={() => setDetailRelease(null)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <div className="px-6 py-5">
              <div className="flex gap-4 mb-6">
                <MetricBox value={detailRelease.health} label="Health" color={getHealthColor(detailRelease.health)} />
                <MetricBox value={`${detailRelease.progress}%`} label="Progress" color="#2563eb" />
                <MetricBox value={detailRelease.defects} label="Defects" color={detailRelease.defects > 0 ? '#ef4444' : '#64748b'} />
              </div>
              <div className="space-y-3" style={{ fontSize: '13px' }}>
                <DetailRow label="STATUS" value={<StatusPill status={detailRelease.status} />} />
                <DetailRow label="VERSION" value={<span>{detailRelease.version} <span style={{ color: '#64748b', fontSize: '11px' }}>{detailRelease.type}</span></span>} />
                <DetailRow label="TARGET" value={detailRelease.targetDate} />
                <DetailRow label="TESTS" value={`${detailRelease.testsPass}/${detailRelease.testsTotal}${detailRelease.coverage !== null ? ` (${detailRelease.coverage}% coverage)` : ''}`} />
                <DetailRow label="DAYS" value={detailRelease.status === 'released' ? <span style={{ color: '#0d9488', fontWeight: 600 }}>Released</span> : detailRelease.overdue ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{detailRelease.daysRemaining}d overdue</span> : `${detailRelease.daysRemaining}d remaining`} />
                <DetailRow label="OWNER" value={<span style={{ color: detailRelease.owner === 'Unassigned' ? '#94a3b8' : '#334155' }}>{detailRelease.owner}</span>} />
              </div>
              <div className="mt-5">
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>DESCRIPTION</span>
                <p style={{ fontSize: '13px', color: '#334155', marginTop: '4px', lineHeight: 1.6 }}>{detailRelease.description}</p>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => { navigate(`/releasehub/${detailRelease.id}`); }} style={{ flex: 1, height: '36px', borderRadius: '6px', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Open Dashboard</button>
                <button onClick={() => toast.info('Edit mode coming soon')} style={{ flex: 1, height: '36px', borderRadius: '6px', background: '#fff', color: '#334155', fontSize: '13px', fontWeight: 500, border: '1px solid #e2e8f0', cursor: 'pointer' }}>Edit Release</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ AI INSIGHTS DRAWER ═══ */}
      {isAIDrawerOpen && (
        <>
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setIsAIDrawerOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-[201] overflow-y-auto" style={{ width: '420px', background: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', animation: 'slideInRight 200ms ease' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e2e8f0' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>AI Insights</h2>
              <button onClick={() => setIsAIDrawerOpen(false)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {AI_INSIGHTS.map((insight, i) => (
                <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }} className="transition-colors hover:border-[#cbd5e1]">
                  <div className="flex items-start gap-2">
                    <span style={{ fontSize: '16px' }}>{insight.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{insight.title}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, marginTop: '4px' }}>{insight.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ NEW RELEASE MODAL ═══ */}
      {isNewReleaseModalOpen && (
        <NewReleaseModal
          onClose={() => setIsNewReleaseModalOpen(false)}
          onCreate={(r) => {
            setReleases(prev => [...prev, r]);
            setIsNewReleaseModalOpen(false);
            toast.success('Release created successfully');
          }}
        />
      )}

      {/* ═══ DELETE CONFIRM ═══ */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setDeleteConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50" style={{ width: '400px', background: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Delete {selectedIds.size} releases?</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDeleteConfirm(false)} style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleBulkDelete} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </>
      )}

      {/* Global keyframe styles */}
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes barGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      `}</style>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

const colHeaderStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
  letterSpacing: '0.5px', textAlign: 'left', padding: '0 8px', whiteSpace: 'nowrap',
};

const paginationBtnStyle: React.CSSProperties = {
  padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff',
  color: '#64748b', fontSize: '12px', cursor: 'pointer',
};

const activePaginationStyle: React.CSSProperties = {
  background: '#dbeafe', color: '#2563eb', borderColor: '#2563eb', fontWeight: 600,
};

function StatItem({ number, label, dotColor }: { number: number; label: string; dotColor?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {dotColor && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor }} />}
      <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{number}</span>
      <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>{label}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.planning;
  return (
    <span className="inline-flex items-center gap-1" style={{ padding: '2px 8px', borderRadius: '12px', background: c.bg, color: c.text, fontSize: '12px', fontWeight: 500 }}>
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
      className="cursor-pointer select-none transition-colors hover:text-[#334155]"
      style={{ ...colHeaderStyle, ...style, color: isActive ? '#2563eb' : '#64748b' }}
    >
      {label} {isActive && <span style={{ color: '#2563eb' }}>{direction === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}

function ReleaseRow({ release: r, index = 0, selected, onToggle, onClick }: {
  release: Release; index?: number; selected: boolean; onToggle: () => void; onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className="group cursor-pointer transition-colors"
      style={{
        height: '36px', borderBottom: '1px solid #f1f5f9',
        background: selected ? '#eff6ff' : undefined,
        animation: `fadeInUp 0.3s ease both`,
        animationDelay: `${index * 25}ms`,
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget.style.background = '#f8fafc'); }}
      onMouseLeave={e => { if (!selected) (e.currentTarget.style.background = ''); }}
    >
      {/* Checkbox */}
      <td style={{ textAlign: 'center', padding: '0 4px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#2563eb', opacity: 0, transition: 'opacity 100ms' }} className="group-hover:!opacity-100" />
        <input
          type="checkbox"
          checked={selected}
          onChange={e => { e.stopPropagation(); onToggle(); }}
          onClick={e => e.stopPropagation()}
          className="transition-opacity"
          style={{ opacity: selected ? 1 : 0, cursor: 'pointer', accentColor: '#2563eb' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => { if (!selected) e.currentTarget.style.opacity = '0'; }}
        />
      </td>
      {/* Release */}
      <td style={{ padding: '0 8px' }}>
        <span style={{ display: 'inline-block', padding: '1px 6px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: 600, marginRight: '6px' }}>{r.version}</span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{r.name}</span>
      </td>
      {/* Status */}
      <td style={{ padding: '0 8px' }}><StatusPill status={r.status} /></td>
      {/* Progress */}
      <td style={{ padding: '0 8px' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: '80px', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${r.progress}%`, height: '100%', background: '#2563eb', borderRadius: '2px' }} />
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{r.progress}%</span>
        </div>
      </td>
      {/* Tests */}
      <td style={{ padding: '0 8px' }}>
        <div className="flex items-center gap-2">
          <div className="flex" style={{ width: '60px', height: '4px', borderRadius: '2px', overflow: 'hidden', background: '#e2e8f0' }}>
            {r.testsTotal > 0 && (
              <>
                <div style={{ width: `${(r.testsPass / r.testsTotal) * 100}%`, background: '#0d9488' }} />
                <div style={{ width: `${((r.testsTotal - r.testsPass) / r.testsTotal) * 100}%`, background: '#ef4444' }} />
              </>
            )}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{r.testsPass}/{r.testsTotal}</span>
        </div>
      </td>
      {/* Defects */}
      <td style={{ padding: '0 8px', fontSize: '13px', fontWeight: r.defects > 0 ? 600 : 400, color: r.defects > 0 ? '#ef4444' : '#94a3b8' }}>
        {r.defects > 0 ? r.defects : '—'}
      </td>
      {/* Coverage */}
      <td style={{ padding: '0 8px', fontSize: '13px', color: '#64748b' }}>
        {r.coverage !== null ? `${r.coverage}%` : '—'}
      </td>
      {/* Health */}
      <td style={{ padding: '0 8px' }}>
        <div className="flex items-center gap-1.5">
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getHealthColor(r.health) }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: getHealthColor(r.health) }}>{r.health}</span>
        </div>
      </td>
      {/* Days */}
      <td style={{ padding: '0 8px', fontSize: '13px', fontWeight: r.overdue || r.status === 'released' ? 600 : 400, color: r.status === 'released' ? '#0d9488' : r.overdue ? '#ef4444' : '#334155' }}>
        {r.status === 'released' ? 'Released' : `${r.daysRemaining}d`}
      </td>
      {/* Owner */}
      <td style={{ padding: '0 8px', fontSize: '13px', fontWeight: 400, color: r.owner === 'Unassigned' ? '#94a3b8' : '#334155' }}>
        {r.owner}
      </td>
    </tr>
  );
}

function CheckboxRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-[#f8fafc]" style={{ padding: '6px 12px', fontSize: '13px', color: '#334155' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: '#2563eb' }} />
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
          height: '30px', padding: '0 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          border: `1px solid ${active ? '#2563eb' : '#e2e8f0'}`,
          background: active ? '#dbeafe' : '#fff',
          color: active ? '#2563eb' : '#334155',
        }}
      >
        {label}{active && count > 0 ? ` (${count})` : ''} <ChevronDown className="w-3 h-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 z-50" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '4px', minWidth: '200px' }}>
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
      className="flex items-center gap-2 w-full text-left transition-colors hover:bg-[#f8fafc]"
      style={{ padding: '8px 12px', fontSize: '13px', color: '#334155', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px' }}
    >
      {icon} {label}
    </button>
  );
}

function MetricBox({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="flex-1 text-center" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#334155' }}>{value}</span>
    </div>
  );
}

const AI_INSIGHTS = [
  { icon: '🔴', title: '4 Releases in Critical Health', desc: '24 Jan Release, Microservices Suite, Q1 v1.0, and Q1 v1.1 all have health below 40. Consider reallocating testing resources.' },
  { icon: '⚠️', title: 'Security Patch Overdue', desc: 'Security Patch v1.2.3 is 6 days overdue with 28 open defects. Escalation recommended.' },
  { icon: '📊', title: 'Coverage Gap', desc: '7 of 12 releases have no test coverage data. Run initial test suites for baseline metrics.' },
  { icon: '✅', title: 'Legacy Migration Complete', desc: '99% health with 154/156 tests passing. Ready for post-release retrospective.' },
  { icon: '💡', title: 'Consolidation Opportunity', desc: 'Q1 v1.0 and v1.1 have similar timelines. Consider merging to reduce coordination overhead.' },
];

// ─── New Release Modal ─────────────────────────────────────────
function NewReleaseModal({ onClose, onCreate }: { onClose: () => void; onCreate: (r: Release) => void }) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [type, setType] = useState<Release['type']>('MAJOR');
  const [status, setStatus] = useState<Release['status']>('planning');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Release name is required'); return; }
    const release: Release = {
      id: `r${Date.now()}`,
      name: name.trim(),
      version,
      type,
      status,
      health: 50,
      progress: 0,
      testsPass: 0,
      testsTotal: 0,
      defects: 0,
      coverage: null,
      targetDate: targetDate || 'TBD',
      daysRemaining: targetDate ? Math.max(0, Math.floor((new Date(targetDate).getTime() - Date.now()) / 86400000)) : 0,
      overdue: false,
      owner: 'Unassigned',
      description: description || '',
      barLeft: 0,
      barWidth: 10,
    };
    onCreate(release);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block',
  };

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50" style={{ width: '500px', background: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', animation: 'scaleIn 200ms ease' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e2e8f0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Create New Release</h2>
          <button onClick={onClose} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label style={labelStyle}>RELEASE NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Q2 2026 Release" autoFocus onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')} />
          </div>
          <div>
            <label style={labelStyle}>VERSION</label>
            <input value={version} onChange={e => setVersion(e.target.value)} style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label style={labelStyle}>TYPE</label>
              <select value={type} onChange={e => setType(e.target.value as Release['type'])} style={inputStyle}>
                <option value="MAJOR">MAJOR</option>
                <option value="MINOR">MINOR</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div className="flex-1">
              <label style={labelStyle}>STATUS</label>
              <select value={status} onChange={e => setStatus(e.target.value as Release['status'])} style={inputStyle}>
                <option value="planning">Planning</option>
                <option value="staging">Staging</option>
                <option value="testing">Testing</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>TARGET DATE</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')} />
          </div>
          <div>
            <label style={labelStyle}>DESCRIPTION (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#e2e8f0' }}>
          <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Create Release</button>
        </div>
        <style>{`@keyframes scaleIn { from { transform: translate(-50%,-50%) scale(0.95); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }`}</style>
      </div>
    </>
  );
}

// ─── Cards View ────────────────────────────────────────────────
const HEALTH_BADGE: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#fee2e2', text: '#991b1b' },
  'at-risk': { bg: '#fef3c7', text: '#92400e' },
  attention: { bg: '#dbeafe', text: '#1e40af' },
  healthy: { bg: '#ccfbf1', text: '#115e59' },
};

function CardsView({ releases, selectedIds, onToggle, onCardClick }: {
  releases: Release[]; selectedIds: Set<string>; onToggle: (id: string) => void; onCardClick: (r: Release) => void;
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
                background: selected ? '#eff6ff' : '#fff',
                border: `1px solid ${selected ? '#2563eb' : '#e2e8f0'}`,
                borderRadius: '8px', padding: '16px',
                animation: `fadeInUp 0.3s ease both`,
                animationDelay: `${i * 30}ms`,
              }}
              onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; } }}
              onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; } }}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected}
                onChange={e => { e.stopPropagation(); onToggle(r.id); }}
                onClick={e => e.stopPropagation()}
                className="absolute transition-opacity"
                style={{ top: '12px', left: '12px', opacity: selected ? 1 : 0, cursor: 'pointer', accentColor: '#2563eb' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.opacity = '0'; }}
              />

              {/* Row 1: Header */}
              <div className="flex items-center gap-1.5 mb-2">
                <span style={{ padding: '1px 6px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{r.version}</span>
                <span style={{ padding: '1px 5px', background: '#f1f5f9', borderRadius: '4px', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }}>{r.type}</span>
                <span className="flex-1 truncate" style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{r.name}</span>
                <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: hBadge.bg, color: hBadge.text, flexShrink: 0 }}>
                  {getHealthDisplay(r.health)}
                </span>
              </div>

              {/* Row 2: Progress bar */}
              <div className="flex items-center gap-2 mb-2">
                <div style={{ flex: 1, height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${r.health}%`, height: '100%', background: getHealthColor(r.health), borderRadius: '2px', transition: 'width 400ms ease-out' }} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>{r.health}</span>
              </div>

              {/* Row 3: Metadata */}
              <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '12px' }}>
                <StatusPill status={r.status} />
                <span style={{ color: '#64748b' }}>📅 {r.targetDate}</span>
                {r.overdue && (
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#ef4444', background: '#fee2e2', borderRadius: '8px', padding: '1px 6px' }}>
                    {r.daysRemaining}d overdue
                  </span>
                )}
                <span className="ml-auto" style={{ color: '#94a3b8', fontSize: '12px' }}>{r.owner}</span>
              </div>

              {/* Row 4: Stats footer */}
              <div className="flex items-center gap-4" style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{r.testsPass}/{r.testsTotal}</span> Tests
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  <span style={{ fontWeight: 600, color: r.defects > 0 ? '#ef4444' : '#334155' }}>{r.defects}</span> Defects
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{r.coverage !== null ? `${r.coverage}%` : '—'}</span> Coverage
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
const BAR_COLORS: Record<string, string> = {
  planning: '#e2e8f0',
  staging: '#a5b4fc',
  testing: '#fcd34d',
  released: '#6ee7b7',
};
const LEGEND_ITEMS = [
  { label: 'Critical', color: '#ef4444', shape: 'circle' },
  { label: 'At Risk', color: '#d97706', shape: 'circle' },
  { label: 'Attention', color: '#2563eb', shape: 'circle' },
  { label: 'Healthy', color: '#0d9488', shape: 'circle' },
  { label: 'Code Freeze', color: '#d97706', shape: 'diamond' },
  { label: 'Go Live', color: '#0d9488', shape: 'diamond' },
];

function TimelineView({ releases, onBarClick }: {
  releases: Release[]; onBarClick: (r: Release) => void;
}) {
  const [timeScale, setTimeScale] = useState<'week' | 'month' | 'quarter'>('month');
  const [hoveredRelease, setHoveredRelease] = useState<Release | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleBarHover = (e: React.MouseEvent, r: Release | null) => {
    setHoveredRelease(r);
    if (r) setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex" style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
          {(['week', 'month', 'quarter'] as const).map(t => (
            <button
              key={t}
              onClick={() => t === 'month' ? setTimeScale(t) : toast.info('Coming soon')}
              style={{
                padding: '4px 10px', fontSize: '12px', fontWeight: timeScale === t ? 600 : 400,
                background: timeScale === t ? '#dbeafe' : '#fff',
                color: timeScale === t ? '#2563eb' : '#64748b',
                border: 'none', cursor: 'pointer', textTransform: 'capitalize' as const,
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          {LEGEND_ITEMS.map(l => (
            <div key={l.label} className="flex items-center gap-1" style={{ fontSize: '11px', color: '#64748b' }}>
              {l.shape === 'circle' ? (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }} />
              ) : (
                <div style={{ width: '8px', height: '8px', background: l.color, transform: 'rotate(45deg)' }} />
              )}
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Chart body */}
      <div className="flex flex-1 min-h-0" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
        {/* Left column */}
        <div style={{ width: '260px', flexShrink: 0, borderRight: '1px solid #e2e8f0' }}>
          <div style={{ height: '32px', background: '#f8fafc', display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>RELEASE</span>
          </div>
          {releases.map(r => (
            <div
              key={r.id}
              onClick={() => onBarClick(r)}
              className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-[#f8fafc]"
              style={{ height: '44px', padding: '0 12px', borderBottom: '1px solid #f1f5f9' }}
            >
              <span style={{ padding: '1px 6px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>{r.version}</span>
              <div className="min-w-0">
                <div className="truncate" style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{r.name}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{STATUS_CONFIG[r.status]?.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right column — chart area */}
        <div className="flex-1 overflow-x-auto relative">
          {/* Month headers */}
          <div className="flex" style={{ height: '32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {MONTHS.map(m => (
              <div key={m} className="flex-1" style={{ minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, color: '#64748b', borderRight: '1px solid #f1f5f9' }}>
                {m}
              </div>
            ))}
          </div>

          {/* Today marker */}
          <div className="absolute" style={{ left: '15%', top: '32px', bottom: 0, width: '2px', background: '#ef4444', zIndex: 5 }}>
            <span style={{ position: 'absolute', top: '-16px', left: '-12px', fontSize: '10px', fontWeight: 600, color: '#ef4444' }}>Today</span>
          </div>

          {/* Bars */}
          {releases.map((r, i) => (
            <div key={r.id} className="relative" style={{ height: '44px', borderBottom: '1px solid #f1f5f9' }}>
              {/* Bar */}
              <div
                onClick={() => onBarClick(r)}
                onMouseMove={e => handleBarHover(e, r)}
                onMouseLeave={() => setHoveredRelease(null)}
                className="absolute cursor-pointer"
                style={{
                  left: `${r.barLeft}%`, width: `${r.barWidth}%`,
                  height: '24px', top: '10px', borderRadius: '4px',
                  background: BAR_COLORS[r.status] || '#e2e8f0',
                  animation: 'barGrow 0.4s ease-out both',
                  animationDelay: `${i * 40}ms`,
                  transformOrigin: 'left center',
                  transition: 'filter 100ms',
                  zIndex: 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.88)')}
              >
                {r.progress > 0 && (
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#334155', padding: '0 6px', lineHeight: '24px' }}>{r.progress}%</span>
                )}
              </div>
              {/* Code Freeze diamond */}
              <div
                className="absolute transition-transform hover:scale-[1.3]"
                title={`Code Freeze: ${r.targetDate}`}
                style={{
                  left: `${r.barLeft + r.barWidth - 2}%`, top: '17px',
                  width: '10px', height: '10px', background: '#d97706',
                  transform: 'rotate(45deg)', zIndex: 2,
                }}
              />
              {/* Go Live diamond */}
              <div
                className="absolute transition-transform hover:scale-[1.3]"
                title={`Go Live: ${r.targetDate}`}
                style={{
                  left: `${r.barLeft + r.barWidth + 1}%`, top: '17px',
                  width: '10px', height: '10px', background: '#0d9488',
                  transform: 'rotate(45deg)', zIndex: 2,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredRelease && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPos.x + 8, top: tooltipPos.y + 8,
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '12px',
            animation: 'fadeInUp 150ms ease both', minWidth: '200px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{hoveredRelease.name}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Status: {STATUS_CONFIG[hoveredRelease.status]?.label}</div>
          <div style={{ fontSize: '12px', marginTop: '2px' }}>
            <span style={{ color: '#64748b' }}>Health: </span>
            <span style={{ color: getHealthColor(hoveredRelease.health), fontWeight: 600 }}>{hoveredRelease.health} ({getHealthDisplay(hoveredRelease.health)})</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Progress: {hoveredRelease.progress}%</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Target: {hoveredRelease.targetDate}</div>
        </div>
      )}
    </div>
  );
}
