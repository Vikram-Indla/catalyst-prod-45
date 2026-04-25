import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArchiveConfirmModal } from './ArchiveConfirmModal';

interface DangerZoneProps {
  projectId: string;
  projectName: string;
}

export function DangerZone({ projectId, projectName }: DangerZoneProps) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ph_projects')
        .update({ is_archived: true, archived_at: new Date().toISOString() } as any)
        .eq('id', projectId);
      if (error) throw new Error(error.message);
      toast.success('Project archived.');
      navigate('/project-hub/projects');
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive project');
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <div
        className="ph-card"
        style={{ borderLeft: '4px solid var(--sem-danger)' }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--sem-danger)', fontFamily: 'var(--cp-font-heading)', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid var(--cp-bd-zone)' }}>
          Danger Zone
        </h3>
        <p style={{ fontSize: 13, color: 'var(--fg-3)', maxWidth: 520 }}>
          Archive this project. Archived projects are hidden from the project list but can be restored.
        </p>
        <button
          onClick={() => setConfirmOpen(true)}
          className="mt-4 transition-all"
          style={{
            height: 34, padding: '0 14px', fontSize: 13, fontWeight: 500,
            color: 'var(--sem-danger)', border: '1px solid var(--sem-danger)', borderRadius: 6,
            background: 'transparent', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--sem-danger-bg)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          Archive Project
        </button>
      </div>

      <ArchiveConfirmModal
        open={confirmOpen}
        projectName={projectName}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleArchive}
        loading={loading}
      />
    </>
  );
}
