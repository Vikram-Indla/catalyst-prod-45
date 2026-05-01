import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, X } from 'lucide-react';

interface CopyWorkflowSectionProps {
  projectId: string;
  onCopied: () => void;
}

export function CopyWorkflowSection({ projectId, onCopied }: CopyWorkflowSectionProps) {
  const [sourceProjectId, setSourceProjectId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['ph-projects-for-copy-workflow'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id, name, key')
        .neq('id', projectId)
        .order('name');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const selectedProject = projects.find(p => p.id === sourceProjectId);

  const handleCopy = async () => {
    if (!sourceProjectId) return;
    setLoading(true);
    try {
      // Fetch source statuses
      const { data: sourceStatuses, error: fetchErr } = await supabase
        .from('ph_workflow_statuses')
        .select('*')
        .eq('project_id', sourceProjectId)
        .order('position');
      if (fetchErr) throw new Error(fetchErr.message);
      if (!sourceStatuses?.length) { toast.error('Source project has no workflow statuses'); return; }

      // Delete current statuses
      const { error: delErr } = await supabase
        .from('ph_workflow_statuses')
        .delete()
        .eq('project_id', projectId);
      if (delErr) throw new Error(delErr.message);

      // Insert copied statuses
      const newStatuses = sourceStatuses.map((s, i) => ({
        project_id: projectId,
        name: s.name,
        color: s.color,
        category: s.category,
        position: i,
        is_default: s.is_default,
      }));
      const { error: insErr } = await supabase
        .from('ph_workflow_statuses')
        .insert(newStatuses);
      if (insErr) throw new Error(insErr.message);

      toast.success('Workflow copied successfully');
      onCopied();
    } catch (err: any) {
      toast.error(err.message || 'Failed to copy workflow');
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    height: 50, padding: '8px 12px', fontSize: 13,
    color: 'var(--fg-1)', border: '1px solid var(--divider)',
    borderRadius: 6, outline: 'none', fontFamily: 'var(--cp-font-body)',
    flex: 1, minWidth: 0,
  };

  return (
    <>
      <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--divider)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', flexShrink: 0 }}>Copy from:</label>
          <select
            value={sourceProjectId}
            onChange={e => setSourceProjectId(e.target.value)}
            className="bg-[var(--cp-float)] dark:bg-[var(--ds-surface-raised, #1A1A1A)]"
            style={{ ...inputStyle, cursor: 'pointer', maxWidth: 260 }}
          >
            <option value="">Select a project...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.key})</option>)}
          </select>
          <button
            onClick={() => sourceProjectId && setConfirmOpen(true)}
            disabled={!sourceProjectId}
            className="flex items-center gap-1.5 hover:bg-[var(--ds-surface-sunken, #F8FAFC)] transition-colors disabled:opacity-40"
            style={{
              height: 50, padding: '0 14px', fontSize: 13, fontWeight: 500,
              color: 'var(--fg-2)', border: '1px solid var(--divider)', borderRadius: 6,
              background: 'transparent', cursor: sourceProjectId ? 'pointer' : 'default',
            }}
          >
            <Copy size={14} />
            Copy Workflow
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
        >
          <div className="bg-[var(--cp-float)] dark:bg-[var(--ds-surface-raised, #1A1A1A)]" style={{ width: 440, borderRadius: 12, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,.1)', fontFamily: 'var(--cp-font-body)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-heading)' }}>Copy Workflow</h3>
              <button onClick={() => setConfirmOpen(false)} className="flex items-center justify-center rounded-md hover:bg-[var(--cp-bd-zone)] transition-colors" style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={16} color="var(--fg-3)" />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}>
              This will replace your current workflow with the workflow from <strong>{selectedProject?.name}</strong>. Continue?
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setConfirmOpen(false)} className="bg-[var(--cp-float)] dark:bg-[var(--ds-surface-raised, #1A1A1A)]" style={{ height: 50, padding: '0 16px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', border: '1px solid var(--divider)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={handleCopy}
                disabled={loading}
                className="hover:opacity-90 transition-opacity disabled:opacity-50 bg-[var(--cp-blue)]"
                style={{ height: 50, padding: '0 16px', fontSize: 13, fontWeight: 600, color: 'var(--ds-text-inverse, #FFFFFF)', border: 'none', borderRadius: 6, cursor: loading ? 'default' : 'pointer' }}
              >
                {loading ? 'Copying...' : 'Copy Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
