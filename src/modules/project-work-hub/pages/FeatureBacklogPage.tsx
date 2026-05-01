import React, { useState, useMemo } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureBacklog } from '../hooks/useBacklogData';
import { groupByStatus, FEATURE_GROUP_ORDER, FEATURE_STATUS_LOZENGE, getLozengeStyle, formatDueDate, isDueDateOverdue, getPriorityLabel, getPriorityColor, getInitials } from '../utils/backlog.utils';
import { WorkItemIcon } from '../components/shared/WorkItemIcon';
import { DeleteConfirmDialog } from '../components/dialogs/DeleteConfirmDialog';
import { CreateFeatureDialog } from '../components/dialogs/CreateFeatureDialog';
import { EditFeatureDialog } from '../components/dialogs/EditFeatureDialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import type { BacklogFeature } from '../types/backlog.types';

export default function FeatureBacklogPage({ projectId: propProjectId }: { projectId?: string }) {
  const params = useParams<{ projectId: string }>();
  const projectId = propProjectId || params.projectId;
  const queryClient = useQueryClient();
  const { data: features, isLoading, error } = useFeatureBacklog(projectId || '');
  const { isDark } = useTheme();
  const tk = isDark ? DK : LK;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editFeatureId, setEditFeatureId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BacklogFeature | null>(null);

  const groups = useMemo(() => groupByStatus(features || [], FEATURE_GROUP_ORDER), [features]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('features').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-features', projectId] });
      toast.success('Feature archived successfully');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to archive feature'),
  });

  const toggleGroup = (status: string) => setCollapsed(prev => ({ ...prev, [status]: !prev[status] }));

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

  if (error) return <div className="h-full flex items-center justify-center" style={{ background: tk.pageBg, color: '#DC2626' }}>Error loading features</div>;

  const total = features?.length || 0;

  return (
    <div className="h-full flex flex-col" style={{ background: tk.pageBg }}>
      <CatalystPageHeader title="Feature Backlog" actions={
        <Button onClick={() => setShowCreate(true)} size="sm" style={{ backgroundColor: '#2563EB', color: 'var(--ds-text-inverse, #FFFFFF)', borderRadius: 6 }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Create Feature
        </Button>
      } />

      <div className="flex-1 overflow-auto">
        {total === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <Layers className="h-12 w-12 mb-4" style={{ color: tk.t3 }} />
            <p className="text-base font-medium" style={{ color: tk.t1 }}>No features yet</p>
            <p className="text-sm mt-1 mb-4" style={{ color: tk.t3 }}>Create the first feature to get started</p>
            <Button onClick={() => setShowCreate(true)} size="sm" style={{ backgroundColor: '#2563EB', color: 'var(--ds-text-inverse, #FFFFFF)', borderRadius: 6 }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Feature
            </Button>
          </div>
        ) : (
          <div style={{ minWidth: 1320 }}>
            <div className="flex items-center h-[32px] px-2 border-b" style={{ borderColor: tk.border, background: tk.tableHeaderBg }}>
              <div style={{ width: 38, flexShrink: 0 }} />
              <div style={{ width: 26, flexShrink: 0 }} />
              <div style={{ width: 38, flexShrink: 0 }} />
              <div style={{ width: 110, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: tk.t2 }}>KEY</div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: tk.t2 }}>SUMMARY</div>
              <div style={{ width: 138, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: tk.t2 }}>STATUS</div>
              <div style={{ width: 158, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: tk.t2 }}>ASSIGNEE</div>
              <div style={{ width: 96, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: tk.t2 }}>DUE DATE</div>
              <div style={{ width: 88, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: tk.t2 }}>PRIORITY</div>
            </div>

            {groups.map(group => (
              <div key={group.status}>
                <div className="flex items-center h-[32px] px-2 cursor-pointer select-none" style={{ background: tk.tableHeaderBg, borderBottom: `0.75px solid ${tk.border}` }} onClick={() => toggleGroup(group.status)}>
                  {collapsed[group.status] ? <ChevronRight className="h-3.5 w-3.5 mr-2" style={{ color: tk.t2 }} /> : <ChevronDown className="h-3.5 w-3.5 mr-2" style={{ color: tk.t2 }} />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: tk.t2, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{group.label}</span>
                  <span className="ml-2 inline-flex items-center justify-center rounded-full" style={{ fontSize: 10, fontWeight: 600, color: tk.t2, background: tk.chipBg, minWidth: 20, height: 18, padding: '0 6px' }}>{group.items.length}</span>
                </div>

                {!collapsed[group.status] && group.items.map((feat) => {
                  const sc = feat.status ? FEATURE_STATUS_LOZENGE[feat.status] : null;
                  const ls = sc ? getLozengeStyle(sc.color) : null;
                  const overdue = isDueDateOverdue(feat.planned_end_date, feat.status);
                  return (
                    <div key={feat.id} className="group flex items-center h-[50px] px-2 border-b" style={{ borderColor: tk.divider, maxHeight: 50, transition: 'background 120ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                      <div style={{ width: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input type="checkbox" className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 14, height: 14 }} />
                      </div>
                      <div style={{ width: 26, flexShrink: 0 }} />
                      <div style={{ width: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <WorkItemIcon type="feature" />
                      </div>
                      <div style={{ width: 110, flexShrink: 0, fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: feat.display_id ? tk.blueKey : tk.t3 }}>
                        {feat.display_id || '—'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: tk.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{feat.name}</div>
                      <div style={{ width: 138, flexShrink: 0 }}>
                        {sc && ls && <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.03em', background: ls.bg, color: ls.text }}>{sc.label}</span>}
                      </div>
                      <div style={{ width: 158, flexShrink: 0, fontSize: 12, color: tk.t3, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: tk.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: tk.t2, flexShrink: 0 }}>{getInitials(null)}</div>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Unassigned</span>
                      </div>
                      <div style={{ width: 96, flexShrink: 0, fontSize: 12, color: overdue ? '#DC2626' : tk.t2 }}>{formatDueDate(feat.planned_end_date)}</div>
                      <div style={{ width: 88, flexShrink: 0, fontSize: 12, position: 'relative' }}>
                        <span style={{ color: getPriorityColor(feat.priority) }}>{getPriorityLabel(feat.priority)}</span>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1" style={{ background: isDark ? 'rgba(10,10,10,0.95)' : '#EDEDED' }}>
                          <button onClick={() => setEditFeatureId(feat.id)} className="p-1 rounded" onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = '')} title="Edit"><Pencil className="h-3.5 w-3.5" style={{ color: tk.t2 }} /></button>
                          <button onClick={() => setDeleteTarget(feat)} className="p-1 rounded" onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = '')} title="Delete"><Trash2 className="h-3.5 w-3.5" style={{ color: '#DC2626' }} /></button>
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

      <CreateFeatureDialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        projectId={projectId || ''}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['backlog-features', projectId] })}
      />

      {editFeatureId && (
        <EditFeatureDialog
          isOpen={!!editFeatureId}
          onClose={() => setEditFeatureId(null)}
          featureId={editFeatureId}
          projectId={projectId || ''}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['backlog-features', projectId] })}
        />
      )}

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        itemType="Feature"
        itemKey={deleteTarget?.display_id || null}
        itemName={deleteTarget?.name || ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
