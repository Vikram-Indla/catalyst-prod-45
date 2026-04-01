/**
 * Test Cycles Page — TestHub Module
 * Route: /testhub/cycles
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  start_date: string | null;
  end_date: string | null;
  progress_percent: number;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
  created_at: string;
  updated_at: string;
  owner_id?: string | null;
  owner?: { id: string; full_name: string };
}

const statusConfig = {
  draft: { label: 'Draft', color: '#64748B', bg: '#F1F5F9' },
  active: { label: 'Active', color: '#059669', bg: '#ECFDF5' },
  completed: { label: 'Completed', color: '#2563EB', bg: '#EFF6FF' },
  archived: { label: 'Archived', color: '#94A3B8', bg: '#F8FAFC' },
};

export default function TestCyclesPage() {
  const navigate = useNavigate();
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

  const fetchCycles = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('th_test_cycles')
        .select(`*, owner:profiles!th_test_cycles_owner_id_fkey ( id, full_name )`)
        .order(sortField, { ascending: sortDirection === 'asc' });
      if (statusFilter.length > 0) query = query.in('status', statusFilter);
      if (searchQuery.trim()) query = query.or(`name.ilike.%${searchQuery}%,cycle_key.ilike.%${searchQuery}%`);
      if (dateFrom) query = query.gte('start_date', dateFrom);
      if (dateTo) query = query.lte('end_date', dateTo);
      const { data, error } = await query;
      if (error) { catalystToast.error('Failed to load test cycles'); return; }
      setCycles(data || []);
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
      const { error } = await supabase.from('th_test_cycles').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', cycleId);
      if (error) throw error;
      catalystToast.success(`Cycle ${label.toLowerCase()}`, { title: `Cycle ${label}` });
      fetchCycles();
    } catch (err: any) { catalystToast.error(err.message || `Failed to ${label.toLowerCase()} cycle`); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC' }}>
      <TestHubPageHeader title="Test Cycles" subtitle="Plan and track test execution across sprints and releases">
            <button onClick={() => { fetchCycles(); catalystToast.success('Test cycles refreshed'); }} title="Refresh"
              style={{ width: 40, height: 40, padding: 0, border: '1.5px solid #E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#64748B', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={18} />
            </button>
            <button onClick={() => setIsCreateModalOpen(true)}
              style={{ height: 40, padding: '0 20px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>
              <Plus size={18} /> Create Test Cycle
            </button>
      </TestHubPageHeader>

      {/* Toolbar */}
      <div style={{ padding: '16px 32px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input type="text" placeholder="Search cycles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', height: 40, paddingLeft: 40, paddingRight: 12, border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A', backgroundColor: '#FFFFFF' }} />
        </div>

        {/* Status Filter */}
        <div style={{ position: 'relative' }}>
          <button onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
            style={{ height: 40, padding: '0 14px', border: `1.5px solid ${statusFilter.length > 0 ? '#2563EB' : '#E2E8F0'}`, borderRadius: 8, backgroundColor: statusFilter.length > 0 ? '#EFF6FF' : '#FFFFFF', color: statusFilter.length > 0 ? '#2563EB' : '#334155', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} /> Status
            {statusFilter.length > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: 11, fontWeight: 600, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{statusFilter.length}</span>}
            <ChevronDown size={14} />
          </button>
          {isFilterOpen && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 200, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.12)', zIndex: 200, padding: 8 }}>
              {Object.entries(statusConfig).map(([key, config]) => {
                const isChecked = statusFilter.includes(key);
                return (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', backgroundColor: isChecked ? '#EFF6FF' : 'transparent' }}>
                    <input type="checkbox" checked={isChecked} onChange={() => setStatusFilter(prev => isChecked ? prev.filter(s => s !== key) : [...prev, key])} style={{ width: 16, height: 16, accentColor: '#2563EB' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: config.color }} />
                    <span style={{ fontSize: 14, color: '#334155' }}>{config.label}</span>
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
            style={{ height: 40, padding: '0 14px', border: `1.5px solid ${(dateFrom || dateTo) ? '#2563EB' : '#E2E8F0'}`, borderRadius: 8, backgroundColor: (dateFrom || dateTo) ? '#EFF6FF' : '#FFFFFF', color: (dateFrom || dateTo) ? '#2563EB' : '#334155', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} /> Date
            {(dateFrom || dateTo) && <span style={{ minWidth: 8, height: 8, backgroundColor: '#2563EB', borderRadius: '50%', display: 'inline-block' }} />}
            <ChevronDown size={14} />
          </button>
          {isDateFilterOpen && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 260, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.12)', zIndex: 200, padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Date Range</p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#334155', marginBottom: 4 }}>From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  style={{ width: '100%', height: 36, padding: '0 10px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#0F172A' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#334155', marginBottom: 4 }}>To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom}
                  style={{ width: '100%', height: 36, padding: '0 10px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#0F172A' }} />
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
            style={{ height: 40, padding: '0 14px', border: '1.5px solid #E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#334155', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ArrowUpDown size={16} /> Sort <ChevronDown size={14} />
          </button>
          {isSortOpen && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 200, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.12)', zIndex: 200, padding: 8 }}>
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
                  }} style={{ width: '100%', height: 40, padding: '0 12px', border: 'none', borderRadius: 8, backgroundColor: isActive ? '#EFF6FF' : 'transparent', color: isActive ? '#2563EB' : '#334155', fontSize: 14, fontWeight: isActive ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
                    <span>{option.label}</span>
                    {isActive && <span style={{ fontSize: 12 }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: '#64748B' }}>{cycles.length} cycle{cycles.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748B' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              Loading test cycles...
            </div>
          </div>
        ) : cycles.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: '#94A3B8' }}>
            <Calendar size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 8px', color: '#64748B' }}>
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
                onStart={() => handleStatusChange(cycle.id, 'active', 'Started')}
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
