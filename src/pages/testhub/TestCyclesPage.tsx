/**
 * Test Cycles Page — TestHub Module
 * Route: /testhub/cycles
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import {
  Plus, RefreshCw, Search, Filter, ArrowUpDown,
  Calendar, ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { TestCycleCard } from '@/components/testhub/TestCycleCard';
import { CreateTestCycleModal } from '@/components/testhub/CreateTestCycleModal';

import { DeleteTestCycleModal } from '@/components/testhub/DeleteTestCycleModal';
import { CloneTestCycleModal } from '@/components/testhub/CloneTestCycleModal';

interface TestCycle {
  id: string;
  cycle_key: string;
  name: string;
  description: string | null;
  status: string;
  planned_start: string | null;
  planned_end: string | null;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
  in_progress_count: number;
  created_at: string;
  updated_at: string;
  environment_id: string | null;
  project_id: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'DRAFT', color: '#253858', bg: '#DFE1E6' },
  planned: { label: 'PLANNED', color: '#253858', bg: '#DFE1E6' },
  active: { label: 'IN PROGRESS', color: '#0747A6', bg: 'rgba(59,130,246,0.10)' },
  completed: { label: 'COMPLETED', color: '#006644', bg: 'rgba(74,222,128,0.10)' },
  archived: { label: 'ARCHIVED', color: '#253858', bg: '#DFE1E6' },
  paused: { label: 'PAUSED', color: '#253858', bg: '#DFE1E6' },
};

export default function TestCyclesPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [cycles, setCycles] = useState<TestCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortField, setSortField] = useState<'start_date' | 'name' | 'progress_percent'>('start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editCycle, setEditCycle] = useState<TestCycle | null>(null);
  const [deleteCycle, setDeleteCycle] = useState<TestCycle | null>(null);
  const [cloneCycle, setCloneCycle] = useState<TestCycle | null>(null);

  // NOCTURNE tokens
  const pageBg = isDark ? '#0A0A0A' : '#F8FAFC';
  const surfaceBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const elevatedBg = isDark ? '#1A1A1A' : '#F8FAFC';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
  const textPrimary = isDark ? '#EDEDED' : '#0F172A';
  const textBody = isDark ? '#A1A1A1' : '#334155';
  const textSecondary = isDark ? '#A1A1A1' : '#64748B';
  const textMuted = isDark ? '#878787' : '#94A3B8';

  const fetchCycles = async () => {
    setIsLoading(true);
    try {
      const safeSortField = ['created_at', 'name', 'status', 'cycle_key', 'planned_start', 'planned_end', 'updated_at'].includes(sortField) ? sortField : 'created_at';
      let query = (supabase as any)
        .from('tm_test_cycles')
        .select('id, cycle_key, name, description, status, planned_start, planned_end, environment_id, project_id, total_cases, passed_count, failed_count, blocked_count, skipped_count, not_run_count, in_progress_count, created_at, updated_at')
        .eq('project_id', '00000000-0000-0000-0000-000000000001')
        .order(safeSortField, { ascending: sortDirection === 'asc' });
      if (statusFilter.length > 0) query = query.in('status', statusFilter);
      if (searchQuery.trim()) query = query.or(`name.ilike.%${searchQuery}%,cycle_key.ilike.%${searchQuery}%`);
      if (dateFrom) query = query.gte('planned_start', dateFrom);
      if (dateTo) query = query.lte('planned_end', dateTo);
      const { data, error } = await query;
      if (error) { catalystToast.error('Failed to load test cycles'); console.error('Cycles query error:', error); return; }

      // Live stats: fetch scope rows for all cycles in one query
      const cycleIds = (data || []).map((c: any) => c.id);
      let scopeStats: Record<string, { passed: number; failed: number; blocked: number; not_run: number; total: number }> = {};
      if (cycleIds.length > 0) {
        const { data: scopeRows } = await supabase
          .from('tm_cycle_scope')
          .select('cycle_id, current_status')
          .in('cycle_id', cycleIds);
        if (scopeRows) {
          for (const row of scopeRows) {
            if (!scopeStats[row.cycle_id]) scopeStats[row.cycle_id] = { passed: 0, failed: 0, blocked: 0, not_run: 0, total: 0 };
            const s = scopeStats[row.cycle_id];
            s.total++;
            if (row.current_status === 'passed') s.passed++;
            else if (row.current_status === 'failed') s.failed++;
            else if (row.current_status === 'blocked') s.blocked++;
            else s.not_run++;
          }
        }
      }

      // Override denormalized counters with live data
      const enriched = (data || []).map((c: any) => {
        const live = scopeStats[c.id];
        if (live) {
          return { ...c, total_cases: live.total, passed_count: live.passed, failed_count: live.failed, blocked_count: live.blocked, not_run_count: live.not_run, skipped_count: 0 };
        }
        return c;
      });

      setCycles(enriched);
    } catch { catalystToast.error('Failed to load test cycles'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchCycles(); }, [searchQuery, statusFilter, sortField, sortDirection, dateFrom, dateTo]);

  useEffect(() => {
    const handleClickOutside = () => { setIsFilterOpen(false); setIsSortOpen(false); setIsDateFilterOpen(false); };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleStatusChange = async (cycleId: string, newStatus: string, label: string) => {
    try {
      const { error } = await (supabase as any).from('tm_test_cycles').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', cycleId);
      if (error) throw error;
      catalystToast.success(`Cycle ${label.toLowerCase()}`, { title: `Cycle ${label}` });
      fetchCycles();
    } catch (err: any) { catalystToast.error(err.message || `Failed to ${label.toLowerCase()} cycle`); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: pageBg }}>
      <TestHubPageHeader title="Test Cycles" subtitle="Plan and track test execution across cycles and releases">
            <button onClick={() => { fetchCycles(); catalystToast.success('Test cycles refreshed'); }} title="Refresh"
              style={{ width: 40, height: 40, padding: 0, border: `1.5px solid ${borderColor}`, borderRadius: 8, backgroundColor: surfaceBg, color: textSecondary, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={18} />
            </button>
            <button onClick={() => setIsCreateModalOpen(true)}
              style={{ height: 40, padding: '0 20px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>
              <Plus size={18} /> Create Test Cycle
            </button>
      </TestHubPageHeader>

      {/* Toolbar */}
      <div style={{ padding: '16px 32px', backgroundColor: surfaceBg, borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
          <input type="text" placeholder="Search cycles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', height: 40, paddingLeft: 40, paddingRight: 12, border: `1.5px solid ${borderColor}`, borderRadius: 8, fontSize: 14, color: textPrimary, backgroundColor: surfaceBg }} />
        </div>

        {/* Status Filter */}
        <div style={{ position: 'relative' }}>
          <button onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
            style={{ height: 40, padding: '0 14px', border: `1.5px solid ${statusFilter.length > 0 ? '#2563EB' : borderColor}`, borderRadius: 8, backgroundColor: statusFilter.length > 0 ? (isDark ? '#1e293b' : '#EFF6FF') : surfaceBg, color: statusFilter.length > 0 ? '#2563EB' : textBody, fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} /> Status
            {statusFilter.length > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: 11, fontWeight: 600, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{statusFilter.length}</span>}
            <ChevronDown size={14} />
          </button>
          {isFilterOpen && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 200, backgroundColor: surfaceBg, border: `1px solid ${borderColor}`, borderRadius: 12, boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.12)', zIndex: 200, padding: 8 }}>
              {Object.entries(statusConfig).map(([key, config]) => {
                const isChecked = statusFilter.includes(key);
                return (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', backgroundColor: isChecked ? (isDark ? '#1e293b' : '#EFF6FF') : 'transparent' }}>
                    <input type="checkbox" checked={isChecked} onChange={() => setStatusFilter(prev => isChecked ? prev.filter(s => s !== key) : [...prev, key])} style={{ width: 16, height: 16, accentColor: '#2563EB' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: config.color }} />
                    <span style={{ fontSize: 14, color: textBody }}>{config.label}</span>
                  </label>
                );
              })}
              {statusFilter.length > 0 && (
                <button onClick={() => setStatusFilter([])} style={{ width: '100%', marginTop: 8, padding: '8px 12px', border: 'none', backgroundColor: 'transparent', color: '#2563EB', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }}>Clear filters</button>
              )}
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div style={{ position: 'relative' }}>
          <button onClick={(e) => { e.stopPropagation(); setIsDateFilterOpen(!isDateFilterOpen); setIsFilterOpen(false); setIsSortOpen(false); }}
            style={{ height: 40, padding: '0 14px', border: `1.5px solid ${(dateFrom || dateTo) ? '#2563EB' : borderColor}`, borderRadius: 8, backgroundColor: (dateFrom || dateTo) ? (isDark ? '#1e293b' : '#EFF6FF') : surfaceBg, color: (dateFrom || dateTo) ? '#2563EB' : textBody, fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} /> Date
            {(dateFrom || dateTo) && <span style={{ minWidth: 8, height: 8, backgroundColor: '#2563EB', borderRadius: '50%', display: 'inline-block' }} />}
            <ChevronDown size={14} />
          </button>
          {isDateFilterOpen && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 260, backgroundColor: surfaceBg, border: `1px solid ${borderColor}`, borderRadius: 12, boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.12)', zIndex: 200, padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Date Range</p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: textBody, marginBottom: 4 }}>From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  style={{ width: '100%', height: 50, padding: '0 10px', border: `1.5px solid ${borderColor}`, borderRadius: 8, fontSize: 13, color: textPrimary, backgroundColor: surfaceBg }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: textBody, marginBottom: 4 }}>To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom}
                  style={{ width: '100%', height: 50, padding: '0 10px', border: `1.5px solid ${borderColor}`, borderRadius: 8, fontSize: 13, color: textPrimary, backgroundColor: surfaceBg }} />
              </div>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ width: '100%', padding: '8px 12px', border: 'none', backgroundColor: 'transparent', color: '#2563EB', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }}>Clear dates</button>
              )}
            </div>
          )}
        </div>

        {/* Sort */}
        <div style={{ position: 'relative' }}>
          <button onClick={(e) => { e.stopPropagation(); setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }}
            style={{ height: 40, padding: '0 14px', border: `1.5px solid ${borderColor}`, borderRadius: 8, backgroundColor: surfaceBg, color: textBody, fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ArrowUpDown size={16} /> Sort <ChevronDown size={14} />
          </button>
          {isSortOpen && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 200, backgroundColor: surfaceBg, border: `1px solid ${borderColor}`, borderRadius: 12, boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.12)', zIndex: 200, padding: 8 }}>
              {[
                { field: 'start_date' as const, label: 'Start Date', defaultDir: 'desc' as const },
                { field: 'name' as const, label: 'Name', defaultDir: 'asc' as const },
                { field: 'progress_percent' as const, label: 'Progress', defaultDir: 'desc' as const },
              ].map((option) => {
                const isActive = sortField === option.field;
                return (
                  <button key={option.field} onClick={() => {
                    if (isActive) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                    else { setSortField(option.field); setSortDirection(option.defaultDir); }
                    setIsSortOpen(false);
                  }} style={{ width: '100%', height: 40, padding: '8px 12px', border: 'none', borderRadius: 8, backgroundColor: isActive ? (isDark ? '#1e293b' : '#EFF6FF') : 'transparent', color: isActive ? '#2563EB' : textBody, fontSize: 14, fontWeight: isActive ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
                    <span>{option.label}</span>
                    {isActive && <span style={{ fontSize: 12 }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: textSecondary }}>{cycles.length} cycle{cycles.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: textSecondary }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${borderColor}`, borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              Loading test cycles...
            </div>
          </div>
        ) : cycles.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: textMuted }}>
            <Calendar size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 8px', color: textSecondary }}>
              {searchQuery || statusFilter.length > 0 ? 'No matching cycles' : 'No test cycles yet'}
            </p>
            <p style={{ fontSize: 14, margin: 0 }}>
              {searchQuery || statusFilter.length > 0 ? 'Try different search or filters' : 'Create your first test cycle to get started'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {cycles.map((cycle) => (
              <TestCycleCard
                key={cycle.id}
                cycle={cycle}
                onView={() => navigate(`/testhub/cycles/${cycle.id}`)}
                onEdit={() => setEditCycle(cycle)}
                onClone={() => setCloneCycle(cycle)}
                onDelete={() => setDeleteCycle(cycle)}
                onStart={() => {
                  if (cycle.status === 'draft') handleStatusChange(cycle.id, 'active', 'Activated');
                }}
                onComplete={() => handleStatusChange(cycle.id, 'completed', 'Completed')}
                onReopen={() => handleStatusChange(cycle.id, 'active', 'Reopened')}
                onArchive={() => handleStatusChange(cycle.id, 'archived', 'Archived')}
              />
            ))}
          </div>
        )}
      </div>

      <CreateTestCycleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => { fetchCycles(); setIsCreateModalOpen(false); }}
      />
      <CreateTestCycleModal
        isOpen={!!editCycle}
        onClose={() => setEditCycle(null)}
        onSuccess={() => { fetchCycles(); setEditCycle(null); }}
        mode="edit"
        cycle={editCycle}
      />
      <DeleteTestCycleModal
        isOpen={!!deleteCycle}
        cycle={deleteCycle}
        onClose={() => setDeleteCycle(null)}
        onSuccess={() => { fetchCycles(); setDeleteCycle(null); }}
      />
      <CloneTestCycleModal
        isOpen={!!cloneCycle}
        cycle={cloneCycle}
        onClose={() => setCloneCycle(null)}
        onSuccess={() => { fetchCycles(); setCloneCycle(null); }}
      />
    </div>
  );
}
