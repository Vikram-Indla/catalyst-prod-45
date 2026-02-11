/**
 * Test Plans List Page — TestHub Module
 * Route: /testhub/test-plans
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Plus, Search, X, Calendar, User, 
  RefreshCw, ChevronRight, CheckCircle2, Clock, Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { CreatePlanModal } from '@/components/testhub/plans/CreatePlanModal';

interface TestPlan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  release_version: string | null;
  total_cycles: number;
  total_test_cases: number;
  executed_count: number;
  passed_count: number;
  failed_count: number;
  progress_percent: number;
  created_at: string;
  owner?: { full_name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: 'Draft', color: '#64748B', bg: '#F1F5F9', icon: Clock },
  active: { label: 'Active', color: '#059669', bg: '#ECFDF5', icon: RefreshCw },
  completed: { label: 'Completed', color: '#2563EB', bg: '#EFF6FF', icon: CheckCircle2 },
  archived: { label: 'Archived', color: '#94A3B8', bg: '#F8FAFC', icon: Archive },
};

export default function TestPlansListPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('th_test_plans')
        .select(`*, owner:profiles!th_test_plans_owner_id_fkey(full_name)`)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      } else {
        query = query.neq('status', 'archived');
      }

      const { data, error } = await query;
      if (error) throw error;
      setPlans((data as any[]) || []);
    } catch (err) {
      console.error('Fetch plans error:', err);
      catalystToast.error('Failed to load test plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [statusFilter]);

  const filteredPlans = plans.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.plan_key.toLowerCase().includes(search) ||
      p.name.toLowerCase().includes(search) ||
      (p.release_version && p.release_version.toLowerCase().includes(search))
    );
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPassRate = (plan: TestPlan) => {
    if (plan.executed_count === 0) return 0;
    return Math.round((plan.passed_count / plan.executed_count) * 100);
  };

  return (
    <div style={{ padding: 24, backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ClipboardList size={24} style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>Test Plans</h1>
              <p style={{ fontSize: 14, color: '#64748B', margin: '4px 0 0' }}>
                Organize and track testing efforts across releases
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            height: 44, padding: '0 20px', border: 'none', borderRadius: 10,
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
            color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
          }}
        >
          <Plus size={18} /> Create Plan
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', height: 44, padding: '0 14px 0 44px',
              border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFFFFF',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            height: 44, padding: '0 36px 0 14px', border: '1.5px solid #E2E8F0',
            borderRadius: 10, fontSize: 14, backgroundColor: '#FFFFFF', cursor: 'pointer',
          }}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        {(searchTerm || statusFilter !== 'all') && (
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 44, padding: '0 16px', border: '1.5px solid #E2E8F0',
              borderRadius: 10, backgroundColor: '#FFFFFF', color: '#64748B', fontSize: 14, cursor: 'pointer',
            }}
          >
            <X size={16} /> Clear
          </button>
        )}
      </div>

      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
        Showing {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}
      </p>

      {/* Plans List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#7C3AED' }} />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: 12, padding: 60,
          textAlign: 'center', border: '1px solid #E2E8F0',
        }}>
          <ClipboardList size={48} style={{ color: '#CBD5E1', marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: '#64748B', margin: 0 }}>No test plans found</p>
          <p style={{ fontSize: 14, color: '#94A3B8', margin: '8px 0 0' }}>
            Create a plan to organize your test cycles
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredPlans.map((plan) => {
            const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.draft;
            const StatusIcon = status.icon;
            const passRate = getPassRate(plan);

            return (
              <div
                key={plan.id}
                onClick={() => navigate(`/testhub/test-plans/${plan.id}`)}
                style={{
                  backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24,
                  border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 600, color: '#7C3AED',
                        backgroundColor: '#F5F3FF', padding: '4px 10px', borderRadius: 6,
                      }}>{plan.plan_key}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: status.color, backgroundColor: status.bg,
                        padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <StatusIcon size={12} /> {status.label}
                      </span>
                      {plan.release_version && (
                        <span style={{
                          fontSize: 11, fontWeight: 500, color: '#64748B',
                          backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: 6,
                        }}>v{plan.release_version}</span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', margin: 0 }}>{plan.name}</h3>
                    {plan.description && (
                      <p style={{
                        fontSize: 14, color: '#64748B', margin: '8px 0 0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 600,
                      }}>{plan.description}</p>
                    )}
                  </div>
                  <ChevronRight size={20} style={{ color: '#94A3B8' }} />
                </div>

                <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>{plan.total_cycles}</p>
                    <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Cycles</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>{plan.total_test_cases}</p>
                    <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Test Cases</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>{plan.executed_count}</p>
                    <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Executed</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: passRate >= 80 ? '#059669' : passRate >= 50 ? '#D97706' : '#DC2626', margin: 0 }}>
                      {passRate}%
                    </p>
                    <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Pass Rate</p>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>Progress</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{plan.progress_percent}%</span>
                  </div>
                  <div style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${plan.progress_percent}%`,
                      background: plan.progress_percent >= 80 
                        ? 'linear-gradient(90deg, #10B981, #059669)'
                        : plan.progress_percent >= 50
                        ? 'linear-gradient(90deg, #7C3AED, #6D28D9)'
                        : 'linear-gradient(90deg, #94A3B8, #64748B)',
                      borderRadius: 4,
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#64748B' }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {plan.owner && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={14} /> {plan.owner.full_name}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={14} /> {formatDate(plan.start_date)} — {formatDate(plan.end_date)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreatePlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchPlans}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
