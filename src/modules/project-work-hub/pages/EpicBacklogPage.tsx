import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEpicBacklog } from '../hooks/useBacklogData';
import { useProject } from '@/hooks/useProjects';
import { groupByStatus, EPIC_GROUP_ORDER, EPIC_STATUS_LOZENGE, getLozengeStyle, formatDueDate, isDueDateOverdue, getInitials } from '../utils/backlog.utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));
import { DeleteConfirmDialog } from '../components/dialogs/DeleteConfirmDialog';
import { CreateEpicDialog } from '@/modules/program-epics';
import { EditEpicDialog } from '@/modules/program-epics';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Box } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import type { BacklogEpic } from '../types/backlog.types';

export default function EpicBacklogPage({ projectId: propProjectId }: { projectId?: string }) {
  const params = useParams<{ projectId: string }>();
  const projectId = propProjectId || params.projectId;
  const queryClient = useQueryClient();
  const { data: project } = useProject(projectId || '');
  const { data: epics, isLoading, error } = useEpicBacklog(projectId || '');
  const avatarsByName = useProfileAvatarsByName();
  const { isDark } = useTheme();
  const tk = isDark ? DK : LK;
  const COL_HEADER: React.CSSProperties = { fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color: tk.t2 };

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editEpicId, setEditEpicId] = useState<string | null>(null);
  const [drawerEpicId, setDrawerEpicId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BacklogEpic | null>(null);

  const groups = useMemo(() => groupByStatus(epics || [], EPIC_GROUP_ORDER), [epics]);

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

  const toggleGroup = (status: string) => setCollapsed(prev => ({ ...prev, [status]: !prev[status] }));

  if (!project?.program_id) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ background: tk.pageBg }}>
        <Box className="h-12 w-12 mb-4" style={{ color: tk.t3 }} />
        <p className="text-base font-medium" style={{ color: tk.t1 }}>This project is not linked to a program</p>
        <p className="text-sm mt-1" style={{ color: tk.t3 }}>Epics require a program. Contact your administrator.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full" style={{ background: tk.pageBg }}>
        <div className="px-6 py-4"><div className="h-8 w-48 rounded" style={{ background: tk.chipBg }} /></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="px-6 py-2 flex gap-3 animate-pulse">
            <div className="h-[50px] flex-1 rounded" style={{ background: tk.chipBg }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) return <div className="h-full flex items-center justify-center" style={{ background: tk.pageBg, color: '#DC2626' }}>Error loading epics</div>;

  const totalEpics = epics?.length || 0;

  return (
    <div className="h-full flex flex-col" style={{ background: tk.pageBg }}>
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: tk.border }}>
        <CatalystPageHeader title="Epic Backlog" actions={
          <Plus className="h-3.5 w-3.5 mr-1" /> Create Epic
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {totalEpics === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <Box className="h-12 w-12 mb-4" style={{ color: tk.t3 }} />
            <p className="text-base font-medium" style={{ color: tk.t1 }}>No epics yet</p>
            <p className="text-sm mt-1 mb-4" style={{ color: tk.t3 }}>Create the first epic to get started</p>
            <Button onClick={() => setShowCreate(true)} size="sm" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6 }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Epic
            </Button>
          </div>
        ) : (
          <div style={{ minWidth: 1440 }}>
            {/* Column headers — SRC column REMOVED */}
            <div className="flex items-center h-[32px] px-2 border-b" style={{ borderColor: tk.border, background: tk.tableHeaderBg }}>
              <div style={{ width: 38, flexShrink: 0 }} />
              <div style={{ width: 26, flexShrink: 0 }} />
              <div style={{ width: 38, flexShrink: 0 }} />
              <div style={{ width: 110, flexShrink: 0, ...COL_HEADER }}>KEY</div>
              <div style={{ flex: 1, minWidth: 0, ...COL_HEADER }}>SUMMARY</div>
              <div style={{ width: 138, flexShrink: 0, ...COL_HEADER }}>STATUS</div>
              <div style={{ width: 158, flexShrink: 0, ...COL_HEADER }}>ASSIGNEE</div>
              <div style={{ width: 90, flexShrink: 0, ...COL_HEADER }}>CREATED</div>
              <div style={{ width: 90, flexShrink: 0, ...COL_HEADER }}>UPDATED</div>
              <div style={{ width: 90, flexShrink: 0, ...COL_HEADER }}>DUE DATE</div>
            </div>

            {groups.map(group => (
              <div key={group.status}>
                <div className="flex items-center h-[32px] px-2 cursor-pointer select-none" style={{ background: tk.tableHeaderBg, borderBottom: `0.75px solid ${tk.border}` }} onClick={() => toggleGroup(group.status)}>
                  {collapsed[group.status] ? <ChevronRight className="h-3.5 w-3.5 mr-2" style={{ color: tk.t2 }} /> : <ChevronDown className="h-3.5 w-3.5 mr-2" style={{ color: tk.t2 }} />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: tk.t2, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{group.label}</span>
                  <span className="ml-2 inline-flex items-center justify-center rounded-full" style={{ fontSize: 10, fontWeight: 600, color: tk.t2, background: tk.chipBg, minWidth: 20, height: 18, padding: '0 6px' }}>{group.items.length}</span>
                </div>

                {!collapsed[group.status] && group.items.map((epic) => {
                  const sc = epic.status ? EPIC_STATUS_LOZENGE[epic.status] : null;
                  const ls = sc ? getLozengeStyle(sc.color) : null;
                  const overdue = isDueDateOverdue(epic.end_date, epic.status);
                  const avatarUrl = epic.assignee_name ? avatarsByName.get(epic.assignee_name.toLowerCase()) : null;
                  return (
                    <div key={epic.id} className="group flex items-center h-[50px] px-2 border-b cursor-pointer"
                      style={{ borderColor: tk.divider, maxHeight: 50, transition: 'background 120ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      onClick={() => setDrawerEpicId(epic.id)}>
                      <div style={{ width: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input type="checkbox" onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 14, height: 14, borderRadius: 2 }} />
                      </div>
                      <div style={{ width: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); setDrawerEpicId(epic.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <ChevronRight className="h-3.5 w-3.5" style={{ color: tk.t3 }} />
                        </button>
                      </div>
                      <div style={{ width: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <JiraIssueTypeIcon type="epic" />
                      </div>
                      {/* KEY */}
                      <div style={{ width: 110, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, color: epic.epic_key ? tk.blueKey : tk.t3 }}>
                        {epic.epic_key || '—'}
                      </div>
                      {/* SUMMARY */}
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 400, color: tk.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {epic.name}
                      </div>
                      {/* STATUS */}
                      <div style={{ width: 138, flexShrink: 0 }}>
                        {sc && ls && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.03em', background: ls.bg, color: ls.text }}>
                            {sc.label}
                          </span>
                        )}
                      </div>
                      {/* ASSIGNEE */}
                      <div style={{ width: 158, flexShrink: 0, fontSize: 13, color: epic.assignee_name ? tk.t1 : tk.t3, fontStyle: epic.assignee_name ? 'normal' : 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                        ) : (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: tk.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: tk.t2, flexShrink: 0 }}>
                            {getInitials(epic.assignee_name || null)}
                          </div>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{epic.assignee_name || 'Unassigned'}</span>
                      </div>
                      {/* CREATED */}
                      <div style={{ width: 90, flexShrink: 0, fontSize: 12, color: tk.t2, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                        {formatDueDate(epic.jira_created_at ?? null)}
                      </div>
                      {/* UPDATED */}
                      <div style={{ width: 90, flexShrink: 0, fontSize: 12, color: tk.t2, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                        {formatDueDate(epic.jira_updated_at ?? null)}
                      </div>
                      {/* DUE DATE */}
                      <div style={{ width: 90, flexShrink: 0, fontSize: 12, color: overdue ? '#DC2626' : tk.t2, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums', position: 'relative' }}>
                        <span>{formatDueDate(epic.end_date)}</span>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1" style={{ background: isDark ? 'rgba(10,10,10,0.95)' : '#EDEDED' }}>
                          <button onClick={(e) => { e.stopPropagation(); setEditEpicId(epic.id); }} className="p-1 rounded" onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = '')} title="Edit"><Pencil className="h-3.5 w-3.5" style={{ color: tk.t2 }} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(epic); }} className="p-1 rounded" onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = '')} title="Delete"><Trash2 className="h-3.5 w-3.5" style={{ color: '#DC2626' }} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
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

      <Suspense fallback={null}>
        <CatalystDetailRouter
          isOpen={!!drawerEpicId}
          onClose={() => setDrawerEpicId(null)}
          itemId={drawerEpicId || ''}
          itemType="epic"
          projectId={projectId || ''}
        />
      </Suspense>

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
