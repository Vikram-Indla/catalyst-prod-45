/**
 * CreateReportModal — Generate new test reports
 */
import { useState, useEffect } from 'react';
import { X, FileBarChart, Calendar, FileText, BarChart3, Shield, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase, typedQuery, typedRpc } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  preselectedCycleId?: string;
  preselectedPlanId?: string;
}

interface Cycle { id: string; cycle_key: string; name: string; }
interface Plan { id: string; plan_key: string; name: string; }

const REPORT_TYPES = [
  { value: 'cycle_summary', label: 'Cycle Summary', description: 'Execution results for a test cycle', icon: BarChart3, requiresCycle: true },
  { value: 'plan_summary', label: 'Plan Summary', description: 'Overview of a test plan and its cycles', icon: FileText, requiresPlan: true },
  { value: 'coverage', label: 'Coverage Report', description: 'Requirements coverage analysis', icon: Shield },
  { value: 'defect', label: 'Defect Report', description: 'Defect summary and statistics', icon: AlertCircle },
  { value: 'trend', label: 'Trend Analysis', description: 'Historical testing trends', icon: TrendingUp },
];

export function CreateReportModal({ isOpen, onClose, onCreated, preselectedCycleId, preselectedPlanId }: CreateReportModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState('cycle_summary');
  const [cycleId, setCycleId] = useState(preselectedCycleId || '');
  const [planId, setPlanId] = useState(preselectedPlanId || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      const [cyclesRes, plansRes] = await Promise.all([
        typedQuery('tm_test_cycles').select('id, cycle_key, name').order('created_at', { ascending: false }),
        typedQuery('tm_test_plans').select('id, plan_key, name').neq('status', 'archived').order('created_at', { ascending: false }),
      ]);
      if (cyclesRes.data) setCycles(cyclesRes.data);
      if (plansRes.data) setPlans(plansRes.data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isOpen) {
      const selectedType = REPORT_TYPES.find(t => t.value === reportType);
      setName(selectedType ? `${selectedType.label} - ${new Date().toLocaleDateString()}` : '');
      setDescription('');
      setCycleId(preselectedCycleId || '');
      setPlanId(preselectedPlanId || '');
      setDateFrom('');
      setDateTo('');
      setErrors({});
    }
  }, [isOpen, reportType, preselectedCycleId, preselectedPlanId]);

  const selectedTypeConfig = REPORT_TYPES.find(t => t.value === reportType);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (selectedTypeConfig?.requiresCycle && !cycleId) newErrors.cycleId = 'Please select a test cycle';
    if (selectedTypeConfig?.requiresPlan && !planId) newErrors.planId = 'Please select a test plan';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: report, error } = await typedQuery('th_reports')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          type: reportType,
          status: 'generating',
          cycle_id: cycleId || null,
          plan_id: planId || null,
          date_from: dateFrom || null,
          date_to: dateTo || null,
          generated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      let reportData = {};
      if (reportType === 'cycle_summary' && cycleId) {
        const { data } = await typedRpc('generate_cycle_report_data', { p_cycle_id: cycleId });
        reportData = data || {};
      } else if (reportType === 'defect') {
        const { data } = await typedRpc('generate_defect_report_data', {
          p_date_from: dateFrom || null,
          p_date_to: dateTo || null,
        });
        reportData = data || {};
      }

      await typedQuery('th_reports')
        .update({ report_data: reportData, status: 'ready', generated_at: new Date().toISOString() })
        .eq('id', report.id);

      catalystToast.success(`Report ${report.report_key} generated`, { title: 'Success' });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Create report error:', err);
      catalystToast.error('Failed to generate report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 550, maxHeight: '90vh', backgroundColor: 'var(--cp-float)', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #F59E0B 0%, var(--sem-warning) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileBarChart size={22} style={{ color: '#FFFFFF' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>Generate Report</h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 50, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Report Type */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 10 }}>Report Type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {REPORT_TYPES.map((type) => {
                const TypeIcon = type.icon;
                const isSelected = reportType === type.value;
                return (
                  <div key={type.value} onClick={() => setReportType(type.value)}
                    style={{ padding: 14, borderRadius: 12, border: `2px solid ${isSelected ? 'var(--sem-warning)' : 'var(--divider)'}`, backgroundColor: isSelected ? '#FFFBEB' : 'var(--cp-float)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <TypeIcon size={20} style={{ color: isSelected ? 'var(--sem-warning)' : 'var(--fg-3)' }} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>{type.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '2px 0 0' }}>{type.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
              Report Name <span style={{ color: 'var(--sem-danger)' }}>*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Release 5 Test Results"
              style={{ width: '100%', height: 44, padding: '0 14px', border: `1.5px solid ${errors.name ? 'var(--sem-danger)' : 'var(--divider)'}`, borderRadius: 12, fontSize: 14 }} />
            {errors.name && <p style={{ fontSize: 12, color: 'var(--sem-danger)', margin: '6px 0 0' }}>{errors.name}</p>}
          </div>

          {/* Cycle (for cycle_summary) */}
          {selectedTypeConfig?.requiresCycle && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
                Test Cycle <span style={{ color: 'var(--sem-danger)' }}>*</span>
              </label>
              <select value={cycleId} onChange={(e) => setCycleId(e.target.value)}
                style={{ width: '100%', height: 44, padding: '0 14px', border: `1.5px solid ${errors.cycleId ? 'var(--sem-danger)' : 'var(--divider)'}`, borderRadius: 12, fontSize: 14, backgroundColor: 'var(--cp-float)' }}>
                <option value="">Select a cycle</option>
                {cycles.map((c) => <option key={c.id} value={c.id}>{c.cycle_key} - {c.name}</option>)}
              </select>
              {errors.cycleId && <p style={{ fontSize: 12, color: 'var(--sem-danger)', margin: '6px 0 0' }}>{errors.cycleId}</p>}
            </div>
          )}

          {/* Plan (for plan_summary) */}
          {selectedTypeConfig?.requiresPlan && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
                Test Plan <span style={{ color: 'var(--sem-danger)' }}>*</span>
              </label>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)}
                style={{ width: '100%', height: 44, padding: '0 14px', border: `1.5px solid ${errors.planId ? 'var(--sem-danger)' : 'var(--divider)'}`, borderRadius: 12, fontSize: 14, backgroundColor: 'var(--cp-float)' }}>
                <option value="">Select a plan</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.plan_key} - {p.name}</option>)}
              </select>
              {errors.planId && <p style={{ fontSize: 12, color: 'var(--sem-danger)', margin: '6px 0 0' }}>{errors.planId}</p>}
            </div>
          )}

          {/* Date Range (for defect, trend, coverage) */}
          {!selectedTypeConfig?.requiresCycle && !selectedTypeConfig?.requiresPlan && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
                  <Calendar size={14} /> From Date
                </label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  style={{ width: '100%', height: 44, padding: '0 14px', border: '1.5px solid var(--divider)', borderRadius: 12, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>
                  <Calendar size={14} /> To Date
                </label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  style={{ width: '100%', height: 44, padding: '0 14px', border: '1.5px solid var(--divider)', borderRadius: 12, fontSize: 14 }} />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6 }}>Description (Optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional notes about this report..." rows={3}
              style={{ width: '100%', padding: 14, border: '1.5px solid var(--divider)', borderRadius: 12, fontSize: 14, resize: 'vertical' }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={isSubmitting}
            style={{ height: 44, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)', borderRadius: 12, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            style={{ height: 44, padding: '0 24px', background: 'linear-gradient(135deg, #F59E0B 0%, var(--sem-warning) 100%)', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--cp-float)', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileBarChart size={16} />
            {isSubmitting ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
