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

  const [details, setDetails] = useState<StepDetailsData>({
    name: '', key: '', department: '', description: '', icon: 'rocket', color: '#2563EB',
    lead_id: '', linkJira: false, jiraKey: '',
  });
  const [workflow, setWorkflow] = useState<StepWorkflowData>({
    useDefault: true, copyFromProject: null, featureLayer: false,
  });
  const [members, setMembers] = useState<MemberEntry[]>([]);

  useEffect(() => {
    if (open) {
      setStep(0);
      setDetails({ name: '', key: '', department: '', description: '', icon: 'rocket', color: '#2563EB', lead_id: '', linkJira: false, jiraKey: '' });
      setWorkflow({ useDefault: true, copyFromProject: null, featureLayer: false });
      setMembers([]);
      setStep1Valid(false);
      setSubmitting(false);
    }
  }, [open]);

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
      const { data: projectId, error } = await supabase.rpc('ph_create_project', {
        p_name: details.name.trim(), p_key: details.key.trim().toUpperCase(),
        p_department: details.department, p_description: details.description.trim() || null,
        p_icon: details.icon, p_color: details.color,
        p_feature_layer: workflow.featureLayer, p_user_id: user.id,
      });
      if (error) throw new Error(error.message);

      // Add lead as member with role 'lead'
      if (details.lead_id && projectId) {
        const { error: leadErr } = await supabase.from('ph_project_members').insert({
          project_id: projectId, user_id: details.lead_id, role: 'lead',
        });
        if (leadErr) console.warn('Failed to add lead as member:', leadErr.message);
      }

      // Link to Jira if enabled
      if (details.linkJira && details.jiraKey && projectId) {
        const { error: syncErr } = await supabase.from('sync_entity_map').insert({
          catalyst_entity_id: projectId, catalyst_entity_type: 'project',
          jira_entity_id: details.jiraKey.trim().toUpperCase(),
          jira_entity_type: 'project',
          jira_entity_key: details.jiraKey.trim().toUpperCase(),
          sync_direction: 'bidirectional',
        });
        if (syncErr) console.warn('Failed to create Jira link:', syncErr.message);
      }

      if (members.length > 0 && projectId) {
        const rows = members
          .filter(m => m.userId !== details.lead_id) // avoid duplicate if lead already added
          .map(m => ({ project_id: projectId, user_id: m.userId, role: m.role }));
        if (rows.length > 0) {
          const { error: memErr } = await supabase.from('ph_project_members').insert(rows);
          if (memErr) console.warn('Failed to add some members:', memErr.message);
        }
      }
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(0,0,0,0.5)]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col animate-scale-in bg-white dark:bg-[#1A1A1A]"
        style={{
          width: 640,
          maxHeight: '90vh',
          borderRadius: 12,
          fontFamily: 'var(--ds-font-family-body)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-[var(--fg-1)] dark:text-[#EDEDED]" style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--ds-font-family-heading)' }}>
            Create New Project
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md transition-colors hover:bg-[#F1F5F9] dark:hover:bg-[#1F1F1F]"
            style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={18} className="text-[#64748B] dark:text-[#878787]" />
          </button>
        </div>

        <StepIndicator current={step} />

        <div className="flex-1 overflow-y-auto px-6 pb-4" style={{ minHeight: 300 }}>
          {step === 0 && <StepDetails data={details} onChange={setDetails} isValid={step1Valid} onValidChange={setStep1Valid} />}
          {step === 1 && <StepWorkflow data={workflow} onChange={setWorkflow} />}
          {step === 2 && <StepMembers members={members} onChange={setMembers} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E]">
          <button
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="rounded-md transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1F1F1F] bg-white dark:bg-transparent border border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] text-[#334155] dark:text-[#A1A1A1]"
            style={{
              height: 50, padding: '0 16px', fontSize: 13, fontWeight: 500,
              borderRadius: 6, cursor: 'pointer',
            }}
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>

          <button
            onClick={step < 2 ? () => setStep(s => s + 1) : handleSubmit}
            disabled={!canNext || submitting}
            className="rounded-md transition-opacity hover:opacity-90 disabled:opacity-40 bg-[var(--cp-blue)]"
            style={{
              height: 50, padding: '0 20px', fontSize: 13, fontWeight: 600,
              color: '#FFFFFF', border: 'none',
              borderRadius: 6, cursor: canNext && !submitting ? 'pointer' : 'default',
            }}
          >
            {submitting ? 'Creating...' : step < 2 ? 'Next →' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}