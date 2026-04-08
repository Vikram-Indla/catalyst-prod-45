import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoryBacklog } from '../hooks/useBacklogData';
import { groupByStatus, STORY_GROUP_ORDER, STORY_STATUS_LOZENGE, getLozengeStyle, formatDueDate, getPriorityLabel, getPriorityColor, getInitials } from '../utils/backlog.utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
export default function StoryBacklogPage({ projectId: propProjectId, projectKey }: { projectId?: string; projectKey?: string }) {
  const params = useParams<{ projectId: string }>();
  const projectId = propProjectId || params.projectId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: stories, isLoading, error } = useStoryBacklog(projectId || '');
  const avatarsByName = useProfileAvatarsByName();
  const { isDark } = useTheme();
  const tk = isDark ? DK : LK;
  const COL_HEADER: React.CSSProperties = { fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color: tk.t2 };

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editStoryId, setEditStoryId] = useState<string | null>(null);
  
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

  if (error) return <div className="h-full flex items-center justify-center" style={{ background: tk.pageBg, color: '#DC2626' }}>Error loading stories</div>;

  const total = stories?.length || 0;

  return (
    <div className="h-full flex flex-col" style={{ background: tk.pageBg }}>
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: tk.border }}>
        <div className="flex items-center gap-3">
          <JiraIssueTypeIcon type="story" size={20} />
          <h1 className="text-base font-semibold" style={{ color: tk.t1, fontWeight: 650 }}>Story Backlog</h1>
          <span className="text-xs" style={{ color: tk.t2 }}>{total} stories across {groups.length} groups</span>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6 }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Create Story
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {total === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <BookOpen className="h-12 w-12 mb-4" style={{ color: tk.t3 }} />
            <p className="text-base font-medium" style={{ color: tk.t1 }}>No stories yet</p>
            <p className="text-sm mt-1 mb-4" style={{ color: tk.t3 }}>Create the first story to get started</p>
            <Button onClick={() => setShowCreate(true)} size="sm" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6 }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Story
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
              <div style={{ width: 240, flexShrink: 0, ...COL_HEADER }}>PARENT</div>
              <div style={{ width: 160, flexShrink: 0, ...COL_HEADER }}>ASSIGNEE</div>
              <div style={{ width: 90, flexShrink: 0, ...COL_HEADER }}>CREATED</div>
              <div style={{ width: 90, flexShrink: 0, ...COL_HEADER }}>UPDATED</div>
              <div style={{ width: 90, flexShrink: 0, ...COL_HEADER }}>DUE DATE</div>
              <div style={{ width: 78, flexShrink: 0, ...COL_HEADER }}>PRIORITY</div>
            </div>

            {groups.map(group => (
              <div key={group.status}>
                <div className="flex items-center h-[32px] px-2 cursor-pointer select-none" style={{ background: tk.tableHeaderBg, borderBottom: `0.75px solid ${tk.border}` }} onClick={() => toggleGroup(group.status)}>
                  {collapsed[group.status] ? <ChevronRight className="h-3.5 w-3.5 mr-2" style={{ color: tk.t2 }} /> : <ChevronDown className="h-3.5 w-3.5 mr-2" style={{ color: tk.t2 }} />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: tk.t2, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{group.label}</span>
                  <span className="ml-2 inline-flex items-center justify-center rounded-full" style={{ fontSize: 10, fontWeight: 600, color: tk.t2, background: tk.chipBg, minWidth: 20, height: 18, padding: '0 6px' }}>{group.items.length}</span>
                </div>

                {!collapsed[group.status] && group.items.map((story) => {
                  const sc = story.status ? STORY_STATUS_LOZENGE[story.status] : null;
                  const ls = sc ? getLozengeStyle(sc.color) : null;
                  const avatarUrl = story.assignee_name ? avatarsByName.get(story.assignee_name.toLowerCase()) : null;
                  return (
                    <div key={story.id} className="group flex items-center h-[50px] px-2 border-b cursor-pointer" style={{ borderColor: tk.divider, maxHeight: 50, transition: 'background 120ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      onClick={() => navigate(`/project-hub/${projectKey}/story/${story.id}`)}>
                      <div style={{ width: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input type="checkbox" onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 14, height: 14 }} />
                      </div>
                      <div style={{ width: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/project-hub/${projectKey}/story/${story.id}`); }} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <ChevronRight className="h-3.5 w-3.5" style={{ color: tk.t3 }} />
                        </button>
                      </div>
                      <div style={{ width: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <JiraIssueTypeIcon type="story" />
                      </div>
                      {/* KEY — blue, monospace */}
                      <div style={{ width: 110, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, color: story.story_key ? tk.blueKey : tk.t3 }}>
                        {story.story_key || '—'}
                      </div>
                      {/* SUMMARY — high contrast */}
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 400, color: tk.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.title}</div>
                      {/* STATUS — 3-color guardrail */}
                      <div style={{ width: 138, flexShrink: 0 }}>
                        {sc && ls && <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.03em', background: ls.bg, color: ls.text }}>{sc.label}</span>}
                      </div>
                      {/* PARENT */}
                      <div style={{ width: 240, flexShrink: 0, overflow: 'hidden' }}>
                        {story.feature?.epic ? (
                          <ParentEpicChip epicId={story.feature.epic.id} epicKey={story.feature.epic.epic_key} epicName={story.feature.epic.name} />
                        ) : (
                          <span style={{ color: tk.t3, fontSize: 12 }}>—</span>
                        )}
                      </div>
                      {/* ASSIGNEE — real name or italic Unassigned */}
                      <div style={{ width: 160, flexShrink: 0, fontSize: 13, color: story.assignee_name ? tk.t1 : tk.t3, fontStyle: story.assignee_name ? 'normal' : 'italic', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                        ) : (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: tk.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: tk.t2, flexShrink: 0 }}>{getInitials(story.assignee_name || null)}</div>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.assignee_name || 'Unassigned'}</span>
                      </div>
                      {/* CREATED — monospace */}
                      <div style={{ width: 90, flexShrink: 0, fontSize: 12, color: tk.t2, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{formatDueDate(story.jira_created_at ?? null)}</div>
                      {/* UPDATED — monospace */}
                      <div style={{ width: 90, flexShrink: 0, fontSize: 12, color: tk.t2, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{formatDueDate(story.jira_updated_at ?? null)}</div>
                      {/* DUE DATE */}
                      <div style={{ width: 90, flexShrink: 0, fontSize: 12, color: tk.t2, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{formatDueDate(story.start_date)}</div>
                      {/* PRIORITY */}
                      <div style={{ width: 78, flexShrink: 0, fontSize: 12, position: 'relative' }}>
                        <span style={{ color: getPriorityColor(story.priority) }}>{getPriorityLabel(story.priority)}</span>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1" style={{ background: isDark ? 'rgba(10,10,10,0.95)' : '#EDEDED' }}>
                          <button onClick={(e) => { e.stopPropagation(); setEditStoryId(story.id); }} className="p-1 rounded" onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = '')} title="Edit"><Pencil className="h-3.5 w-3.5" style={{ color: tk.t2 }} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(story); }} className="p-1 rounded" onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = '')} title="Delete"><Trash2 className="h-3.5 w-3.5" style={{ color: '#DC2626' }} /></button>
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
