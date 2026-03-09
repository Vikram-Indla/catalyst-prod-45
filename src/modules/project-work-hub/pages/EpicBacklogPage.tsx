import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEpicBacklog } from '../hooks/useBacklogData';
import { useProject } from '@/hooks/useProjects';
import { groupByStatus, EPIC_GROUP_ORDER, EPIC_STATUS_LOZENGE, getLozengeStyle, formatDueDate, isDueDateOverdue, getInitials } from '../utils/backlog.utils';
import { WorkItemIcon } from '../components/shared/WorkItemIcon';
import { EpicDetailDrawer } from '../components/drawers/EpicDetailDrawer';
import { DeleteConfirmDialog } from '../components/dialogs/DeleteConfirmDialog';
import { CreateEpicDialog } from '@/modules/program-epics';
import { EditEpicDialog } from '@/modules/program-epics';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Box } from 'lucide-react';
import { toast } from 'sonner';
import type { BacklogEpic } from '../types/backlog.types';

export default function EpicBacklogPage({ projectId: propProjectId }: { projectId?: string }) {
  const params = useParams<{ projectId: string }>();
  const projectId = propProjectId || params.projectId;
  const queryClient = useQueryClient();
  const { data: project } = useProject(projectId || '');
  const { data: epics, isLoading, error } = useEpicBacklog(projectId || '');

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
      <div className="h-full flex flex-col items-center justify-center" style={{ background: '#FFFFFF' }}>
        <Box className="h-12 w-12 mb-4" style={{ color: '#9CA3AF' }} />
        <p className="text-base font-medium" style={{ color: '#334155' }}>This project is not linked to a program</p>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Epics require a program. Contact your administrator.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full" style={{ background: '#FFFFFF' }}>
        <div className="px-6 py-4"><div className="h-8 w-48 rounded" style={{ background: '#F1F5F9' }} /></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="px-6 py-2 flex gap-3 animate-pulse">
            <div className="h-[36px] flex-1 rounded" style={{ background: '#F1F5F9' }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="h-full flex items-center justify-center" style={{ background: '#FFFFFF', color: '#DC2626' }}>Error loading epics</div>;
  }

  const totalEpics = epics?.length || 0;

  return (
    <div className="h-full flex flex-col" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex items-center gap-3">
          <WorkItemIcon type="epic" size={20} />
          <h1 className="text-base font-semibold" style={{ color: '#0F172A', fontWeight: 650 }}>Epic Backlog</h1>
          <span className="text-xs" style={{ color: '#64748B' }}>{totalEpics} epics across {groups.length} groups</span>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6 }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Create Epic
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {totalEpics === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <Box className="h-12 w-12 mb-4" style={{ color: '#9CA3AF' }} />
            <p className="text-base font-medium" style={{ color: '#334155' }}>No epics yet</p>
            <p className="text-sm mt-1 mb-4" style={{ color: '#9CA3AF' }}>Create the first epic to get started</p>
            <Button onClick={() => setShowCreate(true)} size="sm" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6 }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Epic
            </Button>
          </div>
        ) : (
          <div style={{ minWidth: 1320 }}>
            {/* Column header */}
            <div className="flex items-center h-[32px] px-2 border-b" style={{ borderColor: '#E2E8F0', background: '#FAFBFC' }}>
              <div style={{ width: 38, flexShrink: 0 }} />
              <div style={{ width: 26, flexShrink: 0 }} />
              <div style={{ width: 38, flexShrink: 0 }} />
              <div style={{ width: 110, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>KEY</div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>SUMMARY</div>
              <div style={{ width: 138, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>STATUS</div>
              <div style={{ width: 158, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>ASSIGNEE</div>
              <div style={{ width: 96, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>DUE DATE</div>
              <div style={{ width: 88, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>HEALTH</div>
            </div>

            {groups.map(group => (
              <div key={group.status}>
                {/* Group header */}
                <div
                  className="flex items-center h-[32px] px-2 cursor-pointer select-none"
                  style={{ background: '#F8FAFC', borderBottom: '0.75px solid #E2E8F0' }}
                  onClick={() => toggleGroup(group.status)}
                >
                  {collapsed[group.status] ? <ChevronRight className="h-3.5 w-3.5 mr-2" style={{ color: '#64748B' }} /> : <ChevronDown className="h-3.5 w-3.5 mr-2" style={{ color: '#64748B' }} />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{group.label}</span>
                  <span className="ml-2 inline-flex items-center justify-center rounded-full" style={{ fontSize: 10, fontWeight: 600, color: '#64748B', background: '#E2E8F0', minWidth: 20, height: 18, padding: '0 6px' }}>{group.items.length}</span>
                </div>

                {/* Rows */}
                {!collapsed[group.status] && group.items.map((epic) => {
                  const sc = epic.status ? EPIC_STATUS_LOZENGE[epic.status] : null;
                  const ls = sc ? getLozengeStyle(sc.color) : null;
                  const overdue = isDueDateOverdue(epic.end_date, epic.status);
                  return (
                    <div
                      key={epic.id}
                      className="group flex items-center h-[36px] px-2 border-b"
                      style={{ borderColor: '#F1F5F9', maxHeight: 36, transition: 'background 120ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      {/* Checkbox */}
                      <div style={{ width: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input type="checkbox" className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 14, height: 14, borderRadius: 2 }} />
                      </div>
                      {/* Expand */}
                      <div style={{ width: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button onClick={() => setDrawerEpicId(epic.id)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <ChevronRight className="h-3.5 w-3.5" style={{ color: '#94A3B8' }} />
                        </button>
                      </div>
                      {/* Type icon */}
                      <div style={{ width: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <WorkItemIcon type="epic" />
                      </div>
                      {/* Key */}
                      <div style={{ width: 110, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: epic.epic_key ? '#2563EB' : '#9CA3AF' }}>
                        {epic.epic_key || '—'}
                      </div>
                      {/* Summary */}
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {epic.name}
                      </div>
                      {/* Status */}
                      <div style={{ width: 138, flexShrink: 0 }}>
                        {sc && ls && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.03em', background: ls.bg, color: ls.text }}>
                            {sc.label}
                          </span>
                        )}
                      </div>
                      {/* Assignee */}
                      <div style={{ width: 158, flexShrink: 0, fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
                          {getInitials(null)}
                        </div>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Unassigned</span>
                      </div>
                      {/* Due date */}
                      <div style={{ width: 96, flexShrink: 0, fontSize: 12, color: overdue ? '#DC2626' : '#6B7280' }}>
                        {formatDueDate(epic.end_date)}
                      </div>
                      {/* Health (replacing priority for epics) */}
                      <div style={{ width: 88, flexShrink: 0, fontSize: 12, color: '#6B7280', position: 'relative' }}>
                        <span>{epic.health ? epic.health.charAt(0).toUpperCase() + epic.health.slice(1) : '—'}</span>
                        {/* Row actions */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.95)' }}>
                          <button onClick={() => setEditEpicId(epic.id)} className="p-1 rounded hover:bg-gray-100" title="Edit"><Pencil className="h-3.5 w-3.5" style={{ color: '#64748B' }} /></button>
                          <button onClick={() => setDeleteTarget(epic)} className="p-1 rounded hover:bg-gray-100" title="Delete"><Trash2 className="h-3.5 w-3.5" style={{ color: '#DC2626' }} /></button>
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

      {/* Dialogs */}
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

      <EpicDetailDrawer
        isOpen={!!drawerEpicId}
        onClose={() => setDrawerEpicId(null)}
        epicId={drawerEpicId}
        projectId={projectId || ''}
      />

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
