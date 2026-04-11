/**
 * My Test Scope Page — TestHub
 * Route: /testhub/my-scope
 * Shows the current user's assigned tests in active cycles
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Play, Filter, UserCheck, Clock, AlertTriangle } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface ScopeItem {
  scope_id: string;
  current_status: string;
  due_date: string | null;
  priority: string | null;
  case_key: string;
  title: string;
  cycle_id: string;
  cycle_name: string;
  cycle_key: string;
  planned_end: string | null;
  cycle_status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  not_run:     { label: 'NOT RUN',     color: '#253858', bg: '#DFE1E6' },
  in_progress: { label: 'IN PROGRESS', color: '#0747A6', bg: '#DEEBFF' },
  passed:      { label: 'PASSED',      color: '#006644', bg: '#E3FCEF' },
  failed:      { label: 'FAILED',      color: '#253858', bg: '#DFE1E6' },
  blocked:     { label: 'BLOCKED',     color: '#253858', bg: '#DFE1E6' },
  skipped:     { label: 'SKIPPED',     color: '#253858', bg: '#DFE1E6' },
};

type StatusFilter = 'all' | 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked';

export default function MyTestScopePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ScopeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchMyScope = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await typedQuery('tm_cycle_scope')
        .select(`
          id,
          current_status,
          due_date,
          priority,
          test_case:tm_test_cases!tm_cycle_scope_test_case_id_fkey(case_key, title),
          cycle:tm_test_cycles!tm_cycle_scope_cycle_id_fkey(id, name, cycle_key, planned_end, status)
        `)
        .eq('assigned_to', user.id)
        .in('cycle.status', ['active', 'in_progress']);

      if (error) throw error;

      const mapped: ScopeItem[] = (data || [])
        .filter((row: any) => row.cycle && row.test_case)
        .map((row: any) => ({
          scope_id: row.id,
          current_status: row.current_status || 'not_run',
          due_date: row.due_date,
          priority: row.priority,
          case_key: row.test_case?.case_key || '—',
          title: row.test_case?.title || 'Untitled',
          cycle_id: row.cycle?.id,
          cycle_name: row.cycle?.name || 'Unknown Cycle',
          cycle_key: row.cycle?.cycle_key || '—',
          planned_end: row.cycle?.planned_end,
          cycle_status: row.cycle?.status || 'draft',
        }));

      setItems(mapped);
    } catch (err) {
      console.error('Failed to fetch scope:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMyScope(); }, [user?.id]);

  const filteredItems = statusFilter === 'all'
    ? items
    : items.filter(i => i.current_status === statusFilter);

  // Group by cycle
  const groupedByCycle = filteredItems.reduce<Record<string, ScopeItem[]>>((acc, item) => {
    const key = item.cycle_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (d: string | null) => {
    if (!d) return false;
    return new Date(d) < new Date();
  };

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'not_run', label: 'Not Run' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'passed', label: 'Completed' },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', color: '#2563EB' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserCheck size={22} style={{ color: '#2563EB' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1, #0F172A)', margin: 0, fontFamily: 'Sora, sans-serif' }}>
            My Test Scope
          </h1>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#64748B', backgroundColor: '#F1F5F9',
            padding: '2px 10px', borderRadius: 12,
          }}>
            {filteredItems.length} items
          </span>
        </div>
        <button
          onClick={fetchMyScope}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 50,
            padding: '0 14px', border: '1px solid var(--bd-default, #E2E8F0)', borderRadius: 8,
            backgroundColor: '#FFF', color: '#334155', fontSize: 13, cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              height: 32, padding: '0 14px', border: 'none', borderRadius: 6,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              backgroundColor: statusFilter === tab.key ? '#2563EB' : '#F1F5F9',
              color: statusFilter === tab.key ? '#FFF' : '#475569',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, backgroundColor: '#FFF',
          borderRadius: 12, border: '1px solid var(--bd-default, #E2E8F0)',
        }}>
          <UserCheck size={48} style={{ marginBottom: 16, opacity: 0.3, color: '#94A3B8' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#334155', margin: '0 0 8px' }}>
            No active assignments
          </h3>
          <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>
            Contact your Test Manager to get test cases assigned.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 40, backgroundColor: '#FFF',
          borderRadius: 12, border: '1px solid var(--bd-default, #E2E8F0)',
        }}>
          <Filter size={32} style={{ marginBottom: 12, opacity: 0.3, color: '#94A3B8' }} />
          <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>
            No items match the current filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(groupedByCycle).map(([cycleId, cycleItems]) => {
            const first = cycleItems[0];
            return (
              <div key={cycleId} style={{
                backgroundColor: '#FFF', borderRadius: 12, border: '1px solid var(--bd-default, #E2E8F0)',
                overflow: 'hidden',
              }}>
                {/* Cycle Header */}
                <div style={{
                  padding: '12px 16px', backgroundColor: 'var(--bg-1, #F8FAFC)',
                  borderBottom: '1px solid var(--bd-default, #E2E8F0)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: '#2563EB',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {first.cycle_key}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>
                      {first.cycle_name}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                      letterSpacing: '0.03em', padding: '2px 6px', borderRadius: 4, height: 20,
                      display: 'inline-flex', alignItems: 'center',
                      color: '#0747A6', backgroundColor: '#DEEBFF',
                    }}>
                      {first.cycle_status === 'active' ? 'IN PROGRESS' : first.cycle_status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                    <Clock size={13} />
                    Ends {formatDate(first.planned_end)}
                    {isOverdue(first.planned_end) && (
                      <AlertTriangle size={13} style={{ color: '#EF4444' }} />
                    )}
                  </div>
                </div>

                {/* Test Rows */}
                <div>
                  {cycleItems.map((item, idx) => {
                    const st = STATUS_CONFIG[item.current_status] || STATUS_CONFIG.not_run;
                    return (
                      <div
                        key={item.scope_id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 16px', height: 44,
                          borderBottom: idx < cycleItems.length - 1 ? '0.75px solid var(--bd-default, #E2E8F0)' : 'none',
                          transition: 'background-color 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                          <span style={{
                            fontSize: 12, fontWeight: 600, color: '#2563EB',
                            fontFamily: 'JetBrains Mono, monospace', minWidth: 70,
                          }}>
                            {item.case_key}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--fg-1, #0F172A)', fontWeight: 500 }}>
                            {item.title}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                            letterSpacing: '0.03em', padding: '2px 6px', borderRadius: 4,
                            color: st.color, backgroundColor: st.bg,
                          }}>
                            {st.label}
                          </span>
                          {item.due_date && (
                            <span style={{
                              fontSize: 12, color: isOverdue(item.due_date) ? '#EF4444' : '#64748B',
                              fontWeight: isOverdue(item.due_date) ? 600 : 400,
                            }}>
                              {formatDate(item.due_date)}
                            </span>
                          )}
                          <button
                            onClick={() => navigate(`/testhub/cycles/${item.cycle_id}/execute`)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              height: 28, padding: '0 10px', border: 'none', borderRadius: 6,
                              backgroundColor: '#2563EB', color: '#FFF',
                              fontSize: 12, fontWeight: 500, cursor: 'pointer',
                            }}
                          >
                            <Play size={12} /> Execute
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
