/**
 * EpicBacklogPage — /project-hub/:key/epic-backlog
 *
 * V2 only. The legacy hand-rolled div-grid has been removed; the canonical
 * DynamicTable molecule is the single implementation standard for this surface.
 *
 * Row click integrates with main's ticket-origin pattern: writes a breadcrumb
 * origin record and navigates to /project-hub/:key/issue/:epicKey so the
 * full-page detail can offer a "Back to Epic backlog" affordance.
 */
import React, { useState, useMemo } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEpicBacklog } from '../hooks/useBacklogData';
import { useProject } from '@/hooks/useProjects';
import { groupByStatus, EPIC_GROUP_ORDER } from '../utils/backlog.utils';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { DeleteConfirmDialog } from '../components/dialogs/DeleteConfirmDialog';
import { CreateEpicDialog, EditEpicDialog } from '@/modules/program-epics';
import { Button } from '@/components/ui/button';
import { Plus, Box } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import type { BacklogEpic } from '../types/backlog.types';
import { EpicBacklogTable } from '../components/EpicBacklogTable';
import { writeTicketOrigin } from '../hooks/useTicketOrigin';

export default function EpicBacklogPage({ projectId: propProjectId }: { projectId?: string }) {
  const params = useParams<{ projectId: string }>();
  const projectId = propProjectId || params.projectId;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId || '');
  const { data: epics, isLoading, error } = useEpicBacklog(projectId || '');
  const avatarsByName = useProfileAvatarsByName();
  const { isDark } = useTheme();
  const tk = isDark ? DK : LK;

  const [showCreate, setShowCreate] = useState(false);
  const [editEpicId, setEditEpicId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BacklogEpic | null>(null);

  const groups = useMemo(() => groupByStatus(epics || [], EPIC_GROUP_ORDER), [epics]);

  /** Row click → write ticket-origin breadcrumb + navigate to full-page detail. */
  const openEpicDetail = (epic: BacklogEpic) => {
    const epicKey = epic.epic_key;
    if (!epicKey || !project?.key) return;
    const origin = {
      fromUrl: window.location.pathname + window.location.search,
      fromLabel: 'Epic backlog',
      fromType: 'epic-backlog' as const,
    };
    writeTicketOrigin(origin);
    navigate(`/project-hub/${project.key}/issue/${epicKey}`, { state: { ticketOrigin: origin } });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('epics').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
      toast.success('Epic archived successfully');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to archive epic'),
  });

  if (!project?.program_id) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ background: tk.pageBg }}>
        <Box className="h-12 w-12 mb-4" style={{ color: tk.t3 }} />
        <p className="text-base font-medium" style={{ color: tk.t1 }}>This project is not linked to a program</p>
        <p className="text-sm mt-1" style={{ color: tk.t3 }}>Epics require a program. Contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: tk.pageBg }}>
      <CatalystPageHeader
        title="Epic Backlog"
        actions={
          <Button
            onClick={() => setShowCreate(true)}
            size="sm"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6 }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Epic
          </Button>
        }
      />

      <div className="flex-1 min-h-0">
        <EpicBacklogTable
          groups={groups}
          avatarsByName={avatarsByName}
          isLoading={isLoading}
          error={error instanceof Error ? error : error ? new Error(String(error)) : null}
          onRowClick={openEpicDetail}
          onEdit={(epic) => setEditEpicId(epic.id)}
          onDelete={(epic) => setDeleteTarget(epic)}
          projectId={projectId}
          emptyState={
            <div className="flex flex-col items-center justify-center py-8">
              <Box className="h-12 w-12 mb-4" style={{ color: tk.t3 }} />
              <p className="text-base font-medium" style={{ color: tk.t1 }}>No epics yet</p>
              <p className="text-sm mt-1 mb-4" style={{ color: tk.t3 }}>Create the first epic to get started</p>
              <Button
                onClick={() => setShowCreate(true)}
                size="sm"
                style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6 }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Epic
              </Button>
            </div>
          }
        />
      </div>

      <CreateEpicDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        programId={project?.program_id ?? null}
        onCreated={() => {
          setShowCreate(false);
          queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
        }}
      />

      {editEpicId && (
        <EditEpicDialog
          open={!!editEpicId}
          onOpenChange={(open) => !open && setEditEpicId(null)}
          epicId={editEpicId}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] })}
        />
      )}

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        itemType="Epic"
        itemKey={deleteTarget?.epic_key || null}
        itemName={deleteTarget?.name || ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
