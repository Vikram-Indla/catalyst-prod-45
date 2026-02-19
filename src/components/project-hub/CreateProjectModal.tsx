import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StepIndicator } from './wizard/StepIndicator';
import { StepDetails, StepDetailsData } from './wizard/StepDetails';
import { StepWorkflow, StepWorkflowData } from './wizard/StepWorkflow';
import { StepMembers, MemberEntry } from './wizard/StepMembers';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [step1Valid, setStep1Valid] = useState(false);

  // Step data
  const [details, setDetails] = useState<StepDetailsData>({
    name: '', key: '', department: '', description: '', icon: 'rocket', color: '#2563EB',
  });
  const [workflow, setWorkflow] = useState<StepWorkflowData>({
    useDefault: true, copyFromProject: null, featureLayer: false,
  });
  const [members, setMembers] = useState<MemberEntry[]>([]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0);
      setDetails({ name: '', key: '', department: '', description: '', icon: 'rocket', color: '#2563EB' });
      setWorkflow({ useDefault: true, copyFromProject: null, featureLayer: false });
      setMembers([]);
      setStep1Valid(false);
      setSubmitting(false);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in first'); setSubmitting(false); return; }

      // Call RPC
      const { data: projectId, error } = await supabase.rpc('ph_create_project', {
        p_name: details.name.trim(),
        p_key: details.key.trim().toUpperCase(),
        p_department: details.department,
        p_description: details.description.trim() || null,
        p_icon: details.icon,
        p_color: details.color,
        p_feature_layer: workflow.featureLayer,
        p_user_id: user.id,
      });

      if (error) throw new Error(error.message);

      // Add additional members
      if (members.length > 0 && projectId) {
        const rows = members.map(m => ({
          project_id: projectId,
          user_id: m.userId,
          role: m.role,
        }));
        const { error: memErr } = await supabase.from('ph_project_members').insert(rows);
        if (memErr) console.warn('Failed to add some members:', memErr.message);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['ph-projects'] });
      queryClient.invalidateQueries({ queryKey: ['ph-projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['ph-projects-full-list'] });

      toast.success('Project created successfully');
      onClose();
      navigate(`/project-hub/${details.key.toUpperCase()}/dashboard`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  }, [details, workflow, members, navigate, onClose, queryClient]);

  if (!open) return null;

  const canNext = step === 0 ? step1Valid : true;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col animate-scale-in"
        style={{
          width: 640,
          maxHeight: '90vh',
          background: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
            Create New Project
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md transition-colors hover:bg-[#F1F5F9]"
            style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={18} color="#64748B" />
          </button>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4" style={{ minHeight: 300 }}>
          {step === 0 && (
            <StepDetails data={details} onChange={setDetails} isValid={step1Valid} onValidChange={setStep1Valid} />
          )}
          {step === 1 && (
            <StepWorkflow data={workflow} onChange={setWorkflow} />
          )}
          {step === 2 && (
            <StepMembers members={members} onChange={setMembers} />
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid #E2E8F0' }}
        >
          <button
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="rounded-md transition-colors hover:bg-[#F8FAFC]"
            style={{
              height: 36,
              padding: '0 16px',
              fontSize: 13,
              fontWeight: 500,
              color: '#334155',
              border: '1px solid #E2E8F0',
              borderRadius: 6,
              background: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>

          <button
            onClick={step < 2 ? () => setStep(s => s + 1) : handleSubmit}
            disabled={!canNext || submitting}
            className="rounded-md transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{
              height: 36,
              padding: '0 20px',
              fontSize: 13,
              fontWeight: 600,
              color: '#FFFFFF',
              background: '#2563EB',
              border: 'none',
              borderRadius: 6,
              cursor: canNext && !submitting ? 'pointer' : 'default',
            }}
          >
            {submitting ? 'Creating...' : step < 2 ? 'Next →' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
