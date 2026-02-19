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
        className="rounded-xl"
        style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
          borderLeft: '4px solid #DC2626', padding: '20px 24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', fontFamily: "'Sora', sans-serif" }}>
          Danger Zone
        </h3>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, maxWidth: 520 }}>
          Archive this project. Archived projects are hidden from the project list but can be restored.
        </p>
        <button
          onClick={() => setConfirmOpen(true)}
          className="mt-4 hover:bg-[#FEF2F2] transition-colors"
          style={{
            height: 34, padding: '0 14px', fontSize: 13, fontWeight: 500,
            color: '#DC2626', border: '1px solid #DC2626', borderRadius: 6,
            background: 'transparent', cursor: 'pointer',
          }}
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
