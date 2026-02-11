/**
 * Plan Detail Page — TestHub Module
 * Route: /testhub/test-plans/:planId
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ClipboardList, Trash2, Plus, Calendar, User, Tag,
  Target, FileText, CheckCircle2, XCircle, Clock,
  RefreshCw, Play, ChevronRight, Unlink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { AddCycleToPlanModal } from '@/components/testhub/plans/AddCycleToPlanModal';

interface TestPlan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  release_version: string | null;
  objectives: string | null;
  scope: string | null;
  total_cycles: number;
  total_test_cases: number;
  executed_count: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  not_run_count: number;
  progress_percent: number;
  created_at: string;
  owner?: { full_name: string } | null;
}

interface PlanCycle {
  id: string;
  cycle_id: string;
  sequence: number;
  cycle: {
    id: string;
    cycle_key: string;
    name: string;
    status: string;
    total_cases: number;
    passed_count: number;
    failed_count: number;
    blocked_count: number;
    not_run_count: number;
    progress_percent: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#64748B', bg: '#F1F5F9' },
  active: { label: 'Active', color: '#059669', bg: '#ECFDF5' },
  completed: { label: 'Completed', color: '#2563EB', bg: '#EFF6FF' },
  archived: { label: 'Archived', color: '#94A3B8', bg: '#F8FAFC' },
};

export default function PlanDetailPage() {
  const { planId } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<TestPlan | null>(null);
  const [cycles, setCycles] = useState<PlanCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCycleModal, setShowAddCycleModal] = useState(false);

  const fetchPlan = async () => {
    if (!planId) return;
    setIsLoading(true);

    try {
      const { data: planData } = await supabase
        .from('th_test_plans')
        .select(`*, owner:profiles!th_test_plans_owner_id_fkey(full_name)`)
        .eq('id', planId)
        .single();
      if (planData) setPlan(planData as any);

      const { data: cyclesData } = await supabase
        .from('th_plan_cycles')
        .select(`
          id,
          cycle_id,
          sequence,
          cycle:th_test_cycles(id, cycle_key, name, status, total_cases, passed_count, failed_count, blocked_count, not_run_count, progress_percent)
        `)
        .eq('plan_id', planId)
        .order('sequence', { ascending: true });
      if (cyclesData) setCycles(cyclesData as any[]);
    } catch (err) {
      console.error('Fetch plan error:', err);
      catalystToast.error('Failed to load plan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const updateStatus = async (newStatus: string) => {
    if (!plan) return;
    try {
      const { error } = await supabase
        .from('th_test_plans')
        .update({ status: newStatus } as any)
        .eq('id', plan.id);
      if (error) throw error;
      catalystToast.success(`Plan marked as ${newStatus}`);
      fetchPlan();
    } catch {
      catalystToast.error('Failed to update status');
    }
  };

  const removeCycleFromPlan = async (planCycleId: string) => {
    if (!confirm('Remove this cycle from the plan?')) return;
    try {
      const { error } = await supabase.from('th_plan_cycles').delete().eq('id', planCycleId);
      if (error) throw error;
      catalystToast.success('Cycle removed from plan');
      fetchPlan();
    } catch {
      catalystToast.error('Failed to remove cycle');
    }
  };

  const deletePlan = async () => {
    if (!plan) return;
    if (!confirm(`Delete ${plan.plan_key}? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('th_test_plans').delete().eq('id', plan.id);
      if (error) throw error;
      catalystToast.success('Plan deleted');
      navigate('/testhub/test-plans');
    } catch {
      catalystToast.error('Failed to delete plan');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPassRate = () => {
    if (!plan || plan.executed_count === 0) return 0;
    return Math.round((plan.passed_count / plan.executed_count) * 100);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F8FAFC' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#7C3AED' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!plan) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>Plan not found</div>;
  }

  const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.draft;
  const passRate = getPassRate();

  return (
    <div style={{ padding: 24, backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      <button onClick={() => navigate('/testhub/test-plans')} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
        border: '1px solid #E2E8F0', borderRadius: 8, backgroundColor: '#FFF',
        color: '#64748B', fontSize: 13, cursor: 'pointer', marginBottom: 16,
      }}>
        <ArrowLeft size={16} /> Back to Plans
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#7C3AED', backgroundColor: '#F5F3FF', padding: '6px 14px', borderRadius: 8 }}>
              {plan.plan_key}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: status.color, backgroundColor: status.bg, padding: '4px 10px', borderRadius: 6 }}>
              {status.label}
            </span>
            {plan.release_version && (
              <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B', backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: 6 }}>
                v{plan.release_version}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>{plan.name}</h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: '#64748B' }}>
            {plan.owner && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={14} /> {plan.owner.full_name}</span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={14} /> {formatDate(plan.start_date)} — {formatDate(plan.end_date)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {plan.status === 'draft' && (
            <button onClick={() => updateStatus('active')} style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px',
              border: 'none', borderRadius: 8, backgroundColor: '#059669', color: '#FFF',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}><Play size={16} /> Activate</button>
          )}
          {plan.status === 'active' && (
            <button onClick={() => updateStatus('completed')} style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px',
              border: 'none', borderRadius: 8, backgroundColor: '#2563EB', color: '#FFF',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}><CheckCircle2 size={16} /> Complete</button>
          )}
          <button onClick={deletePlan} style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px',
            border: '1px solid #FECACA', borderRadius: 8, backgroundColor: '#FEF2F2',
            color: '#DC2626', fontSize: 13, cursor: 'pointer',
          }}><Trash2 size={16} /></button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: RefreshCw, color: '#7C3AED', value: plan.total_cycles, label: 'Cycles' },
          { icon: FileText, color: '#2563EB', value: plan.total_test_cases, label: 'Test Cases' },
          { icon: CheckCircle2, color: '#10B981', value: plan.passed_count, label: 'Passed' },
          { icon: XCircle, color: '#EF4444', value: plan.failed_count, label: 'Failed' },
          { icon: Target, color: passRate >= 80 ? '#10B981' : passRate >= 50 ? '#D97706' : '#DC2626', value: `${passRate}%`, label: 'Pass Rate' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0', textAlign: 'center' }}>
              <Icon size={24} style={{ color: card.color, marginBottom: 8 }} />
              <p style={{ fontSize: 28, fontWeight: 700, color: typeof card.value === 'string' ? card.color : '#0F172A', margin: 0 }}>{card.value}</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Overall Progress</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED' }}>{plan.progress_percent}%</span>
        </div>
        <div style={{ height: 12, backgroundColor: '#E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${plan.progress_percent}%`, background: 'linear-gradient(90deg, #7C3AED, #6D28D9)', borderRadius: 6 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#64748B' }}>
          <span>{plan.executed_count} of {plan.total_test_cases} executed</span>
          <span>{plan.not_run_count} remaining</span>
        </div>
      </div>

      {/* Description & Objectives */}
      {(plan.description || plan.objectives) && (
        <div style={{ display: 'grid', gridTemplateColumns: plan.objectives ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
          {plan.description && (
            <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={16} style={{ color: '#7C3AED' }} /> Description
              </h3>
              <p style={{ fontSize: 14, color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>{plan.description}</p>
            </div>
          )}
          {plan.objectives && (
            <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={16} style={{ color: '#7C3AED' }} /> Objectives
              </h3>
              <p style={{ fontSize: 14, color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>{plan.objectives}</p>
            </div>
          )}
        </div>
      )}

      {/* Cycles Section */}
      <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={18} style={{ color: '#7C3AED' }} /> Test Cycles ({cycles.length})
          </h3>
          <button onClick={() => setShowAddCycleModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
            border: 'none', borderRadius: 8, backgroundColor: '#7C3AED', color: '#FFF',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}><Plus size={16} /> Add Cycle</button>
        </div>

        {cycles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
            <RefreshCw size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p style={{ margin: 0 }}>No cycles in this plan yet</p>
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>Add cycles to track testing progress</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cycles.map((pc) => {
              const c = pc.cycle;
              const cycleStatus = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
              const executed = c.total_cases - c.not_run_count;
              const cyclePassRate = executed > 0 ? Math.round((c.passed_count / executed) * 100) : 0;

              return (
                <div key={pc.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 16, backgroundColor: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: 4 }}>
                        {c.cycle_key}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: cycleStatus.color, backgroundColor: cycleStatus.bg, padding: '2px 8px', borderRadius: 4 }}>
                        {cycleStatus.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', margin: 0 }}>{c.name}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginRight: 16 }}>
                    {[
                      { value: c.total_cases, label: 'Tests', color: '#0F172A' },
                      { value: c.passed_count, label: 'Passed', color: '#10B981' },
                      { value: c.failed_count, label: 'Failed', color: '#EF4444' },
                      { value: `${cyclePassRate}%`, label: 'Pass', color: cyclePassRate >= 80 ? '#10B981' : cyclePassRate >= 50 ? '#D97706' : '#DC2626' },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 16, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => navigate(`/testhub/cycles/${c.id}`)} style={{
                      display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px',
                      border: '1px solid #E2E8F0', borderRadius: 6, backgroundColor: '#FFF',
                      color: '#334155', fontSize: 12, cursor: 'pointer',
                    }}>View <ChevronRight size={14} /></button>
                    <button onClick={() => removeCycleFromPlan(pc.id)} style={{
                      width: 32, height: 32, border: '1px solid #E2E8F0', borderRadius: 6,
                      backgroundColor: '#FFF', color: '#94A3B8', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Unlink size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddCycleModal && (
        <AddCycleToPlanModal
          isOpen={showAddCycleModal}
          onClose={() => setShowAddCycleModal(false)}
          planId={plan.id}
          onAdded={fetchPlan}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
