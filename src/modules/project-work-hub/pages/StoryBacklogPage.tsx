import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoryBacklog } from '../hooks/useBacklogData';
import { groupByStatus, STORY_GROUP_ORDER, STORY_STATUS_LOZENGE, getLozengeStyle, formatDueDate, getPriorityLabel, getPriorityColor, getInitials } from '../utils/backlog.utils';
import { WorkItemIcon } from '../components/shared/WorkItemIcon';
import { ParentEpicChip } from '../components/shared/ParentEpicChip';
import { StoryDetailDrawer } from '../components/drawers/StoryDetailDrawer';
import { DeleteConfirmDialog } from '../components/dialogs/DeleteConfirmDialog';
import { CreateStoryDialog } from '../components/dialogs/CreateStoryDialog';
import { EditStoryDialog } from '../components/dialogs/EditStoryDialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { BacklogStory } from '../types/backlog.types';

export default function StoryBacklogPage({ projectId: propProjectId }: { projectId?: string }) {
  const params = useParams<{ projectId: string }>();
  const projectId = propProjectId || params.projectId;
  const queryClient = useQueryClient();
  const { data: stories, isLoading, error } = useStoryBacklog(projectId || '');

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editStoryId, setEditStoryId] = useState<string | null>(null);
  const [drawerStoryId, setDrawerStoryId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BacklogStory | null>(null);

  const groups = useMemo(() => groupByStatus(stories || [], STORY_GROUP_ORDER), [stories]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
      toast.success('Story archived successfully');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to archive story'),
  });

  const toggleGroup = (status: string) => setCollapsed(prev => ({ ...prev, [status]: !prev[status] }));

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

  if (error) return <div className="h-full flex items-center justify-center" style={{ background: '#FFFFFF', color: '#DC2626' }}>Error loading stories</div>;

  const total = stories?.length || 0;

  return (
    <div className="h-full flex flex-col" style={{ background: '#FFFFFF' }}>
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex items-center gap-3">
          <WorkItemIcon type="story" size={20} />
          <h1 className="text-base font-semibold" style={{ color: '#0F172A', fontWeight: 650 }}>Story Backlog</h1>
          <span className="text-xs" style={{ color: '#64748B' }}>{total} stories across {groups.length} groups</span>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6 }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Create Story
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {total === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <BookOpen className="h-12 w-12 mb-4" style={{ color: '#9CA3AF' }} />
            <p className="text-base font-medium" style={{ color: '#334155' }}>No stories yet</p>
            <p className="text-sm mt-1 mb-4" style={{ color: '#9CA3AF' }}>Create the first story to get started</p>
            <Button onClick={() => setShowCreate(true)} size="sm" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6 }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Story
            </Button>
          </div>
        ) : (
          <div style={{ minWidth: 1320 }}>
            {/* Column headers — includes Parent column for stories */}
            <div className="flex items-center h-[32px] px-2 border-b" style={{ borderColor: '#E2E8F0', background: '#FAFBFC' }}>
              <div style={{ width: 38, flexShrink: 0 }} />
              <div style={{ width: 26, flexShrink: 0 }} />
              <div style={{ width: 38, flexShrink: 0 }} />
              <div style={{ width: 110, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>KEY</div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>SUMMARY</div>
              <div style={{ width: 138, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>STATUS</div>
              <div style={{ width: 230, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>PARENT</div>
              <div style={{ width: 158, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>ASSIGNEE</div>
              <div style={{ width: 96, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>DATE</div>
              <div style={{ width: 88, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>PRIORITY</div>
            </div>

            {groups.map(group => (
              <div key={group.status}>
                <div className="flex items-center h-[32px] px-2 cursor-pointer select-none" style={{ background: '#F8FAFC', borderBottom: '0.75px solid #E2E8F0' }} onClick={() => toggleGroup(group.status)}>
                  {collapsed[group.status] ? <ChevronRight className="h-3.5 w-3.5 mr-2" style={{ color: '#64748B' }} /> : <ChevronDown className="h-3.5 w-3.5 mr-2" style={{ color: '#64748B' }} />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{group.label}</span>
                  <span className="ml-2 inline-flex items-center justify-center rounded-full" style={{ fontSize: 10, fontWeight: 600, color: '#64748B', background: '#E2E8F0', minWidth: 20, height: 18, padding: '0 6px' }}>{group.items.length}</span>
                </div>

                {!collapsed[group.status] && group.items.map((story) => {
                  const sc = story.status ? STORY_STATUS_LOZENGE[story.status] : null;
                  const ls = sc ? getLozengeStyle(sc.color) : null;
                  return (
                    <div key={story.id} className="group flex items-center h-[36px] px-2 border-b" style={{ borderColor: '#F1F5F9', maxHeight: 36, transition: 'background 120ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                      <div style={{ width: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input type="checkbox" className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 14, height: 14 }} />
                      </div>
                      <div style={{ width: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button onClick={() => setDrawerStoryId(story.id)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <ChevronRight className="h-3.5 w-3.5" style={{ color: '#94A3B8' }} />
                        </button>
                      </div>
                      <div style={{ width: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <WorkItemIcon type="story" />
                      </div>
                      <div style={{ width: 110, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: story.story_key ? '#2563EB' : '#9CA3AF' }}>
                        {story.story_key || '—'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.title}</div>
                      <div style={{ width: 138, flexShrink: 0 }}>
                        {sc && ls && <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.03em', background: ls.bg, color: ls.text }}>{sc.label}</span>}
                      </div>
                      {/* Parent column */}
                      <div style={{ width: 230, flexShrink: 0 }}>
                        {story.feature?.epic ? (
                          <ParentEpicChip epicId={story.feature.epic.id} epicKey={story.feature.epic.epic_key} epicName={story.feature.epic.name} />
                        ) : (
                          <span style={{ color: '#9CA3AF', fontSize: 12 }}>—</span>
                        )}
                      </div>
                      <div style={{ width: 158, flexShrink: 0, fontSize: 12, color: story.assignee_name ? '#334155' : '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>{getInitials(story.assignee_name || null)}</div>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.assignee_name || 'Unassigned'}</span>
                      </div>
                      <div style={{ width: 96, flexShrink: 0, fontSize: 12, color: '#6B7280' }}>{formatDueDate(story.start_date)}</div>
                      <div style={{ width: 88, flexShrink: 0, fontSize: 12, position: 'relative' }}>
                        <span style={{ color: getPriorityColor(story.priority) }}>{getPriorityLabel(story.priority)}</span>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.95)' }}>
                          <button onClick={() => setEditStoryId(story.id)} className="p-1 rounded hover:bg-gray-100" title="Edit"><Pencil className="h-3.5 w-3.5" style={{ color: '#64748B' }} /></button>
                          <button onClick={() => setDeleteTarget(story)} className="p-1 rounded hover:bg-gray-100" title="Delete"><Trash2 className="h-3.5 w-3.5" style={{ color: '#DC2626' }} /></button>
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

      <CreateStoryDialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        projectId={projectId || ''}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] })}
      />

      {editStoryId && (
        <EditStoryDialog
          isOpen={!!editStoryId}
          onClose={() => setEditStoryId(null)}
          storyId={editStoryId}
          projectId={projectId || ''}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] })}
        />
      )}

      <StoryDetailDrawer
        isOpen={!!drawerStoryId}
        onClose={() => setDrawerStoryId(null)}
        storyId={drawerStoryId}
        projectId={projectId || ''}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        itemType="Story"
        itemKey={deleteTarget?.story_key || null}
        itemName={deleteTarget?.title || ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
