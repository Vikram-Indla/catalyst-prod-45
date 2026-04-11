import React, { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoryBacklog } from '../hooks/useBacklogData';
import { groupByStatus, STORY_GROUP_ORDER, STORY_STATUS_LOZENGE, getLozengeStyle, formatDueDate, getPriorityLabel, getPriorityColor, getInitials } from '../utils/backlog.utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { ParentEpicChip } from '../components/shared/ParentEpicChip';
import { DeleteConfirmDialog } from '../components/dialogs/DeleteConfirmDialog';
import { CreateStoryDialog } from '../components/dialogs/CreateStoryDialog';
import { EditStoryDialog } from '../components/dialogs/EditStoryDialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import type { BacklogStory } from '../types/backlog.types';
import { FilterTriggerButton, JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';

const StoryDetailModal = lazy(() => import('../components/dialogs/StoryDetailModal'));

export default function StoryBacklogPage({ projectId: propProjectId, projectKey }: { projectId?: string; projectKey?: string }) {
  const params = useParams<{ projectId: string }>();
  const projectId = propProjectId || params.projectId;
  const queryClient = useQueryClient();
  const { data: stories, isLoading, error } = useStoryBacklog(projectId || '');
  const avatarsByName = useProfileAvatarsByName();
  const { isDark } = useTheme();
  const tk = isDark ? DK : LK;
  const COL_HEADER: React.CSSProperties = { fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color: tk.t2 };

  // ── Column definitions for drag reordering ──
  type ColKey = 'key' | 'summary' | 'status' | 'parent' | 'assignee' | 'created' | 'updated' | 'due' | 'priority';
  interface ColDef { key: ColKey; label: string; width: number; compactWidth?: number; flex?: boolean; compactHide?: boolean }
  const ALL_COLS: ColDef[] = useMemo(() => [
    { key: 'key' as ColKey, label: 'KEY', width: 110, compactWidth: 80 },
    { key: 'summary' as ColKey, label: 'SUMMARY', width: 0, flex: true },
    { key: 'status' as ColKey, label: 'STATUS', width: 138, compactWidth: 100 },
    { key: 'parent' as ColKey, label: 'PARENT', width: 240, compactHide: true },
    { key: 'assignee' as ColKey, label: 'ASSIGNEE', width: 160, compactWidth: 120 },
    { key: 'created' as ColKey, label: 'CREATED', width: 90, compactHide: true },
    { key: 'updated' as ColKey, label: 'UPDATED', width: 90, compactHide: true },
    { key: 'due' as ColKey, label: 'DUE DATE', width: 90, compactHide: true },
    { key: 'priority' as ColKey, label: 'PRIORITY', width: 78, compactHide: true },
  ], []);

  const [columnOrder, setColumnOrder] = useState<ColKey[]>(['key', 'summary', 'status', 'parent', 'assignee', 'created', 'updated', 'due', 'priority']);
  const [dragCol, setDragCol] = useState<ColKey | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColKey | null>(null);

  const orderedCols = useMemo(() => columnOrder.map(k => ALL_COLS.find(c => c.key === k)!).filter(Boolean), [columnOrder, ALL_COLS]);

  const handleColDragStart = useCallback((colKey: ColKey) => { setDragCol(colKey); }, []);
  const handleColDragOver = useCallback((e: React.DragEvent, colKey: ColKey) => {
    e.preventDefault();
    if (dragCol && colKey !== dragCol) setDragOverCol(colKey);
  }, [dragCol]);
  const handleColDrop = useCallback((colKey: ColKey) => {
    if (!dragCol || dragCol === colKey) { setDragCol(null); setDragOverCol(null); return; }
    setColumnOrder(prev => {
      const from = prev.indexOf(dragCol);
      const to = prev.indexOf(colKey);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, dragCol);
      return next;
    });
    setDragCol(null);
    setDragOverCol(null);
  }, [dragCol]);
  const handleColDragEnd = useCallback(() => { setDragCol(null); setDragOverCol(null); }, []);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editStoryId, setEditStoryId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BacklogStory | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState(false);
  const [panelDividerWidth, setPanelDividerWidth] = useState(55);

  // Resizable panel divider
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingPanel = useRef(false);

  const handlePanelMouseDown = useCallback(() => {
    isDraggingPanel.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingPanel.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setPanelDividerWidth(Math.max(25, Math.min(75, pct)));
    };
    const handleMouseUp = () => {
      if (isDraggingPanel.current) {
        isDraggingPanel.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const groups = useMemo(() => groupByStatus(stories || [], STORY_GROUP_ORDER), [stories]);

  // Flat list of all visible stories for navigation
  const flatStories = useMemo(() => {
    const result: { id: string; summary: string; issue_key?: string }[] = [];
    groups.forEach(group => {
      if (!collapsed[group.status]) {
        group.items.forEach(s => result.push({ id: s.id, summary: s.title, issue_key: s.story_key || undefined }));
      }
    });
    return result;
  }, [groups, collapsed]);

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

  const handleTogglePanelMode = useCallback(() => {
    setPanelMode(p => !p);
  }, []);

  const handleCloseDetail = useCallback(() => {
    if (panelMode) {
      setPanelMode(false);
    }
    setDetailItemId(null);
  }, [panelMode]);

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

  const renderBacklogList = (compact?: boolean) => (
    <>
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
        <div style={{ minWidth: compact ? 400 : 1440 }}>
          {/* Column headers — draggable */}
          <div className="flex items-center h-[32px] px-2 border-b" style={{ borderColor: tk.border, background: tk.tableHeaderBg }}>
            <div style={{ width: 38, flexShrink: 0 }} />
            {!compact && <div style={{ width: 26, flexShrink: 0 }} />}
            <div style={{ width: compact ? 20 : 38, flexShrink: 0 }} />
            {orderedCols.filter(c => !(compact && c.compactHide)).map(col => (
              <div
                key={col.key}
                draggable
                onDragStart={() => handleColDragStart(col.key)}
                onDragOver={(e) => handleColDragOver(e, col.key)}
                onDrop={() => handleColDrop(col.key)}
                onDragEnd={handleColDragEnd}
                style={{
                  ...(col.flex ? { flex: 1, minWidth: 0 } : { width: compact && col.compactWidth ? col.compactWidth : col.width, flexShrink: 0 }),
                  ...COL_HEADER,
                  cursor: 'grab',
                  userSelect: 'none',
                  borderLeft: dragOverCol === col.key ? '2px solid #4C9AFF' : '2px solid transparent',
                  opacity: dragCol === col.key ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                  padding: '0 4px',
                }}
              >
                {col.label}
              </div>
            ))}
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
                const isSelected = panelMode && detailItemId === story.id;
                return (
                  <div key={story.id} className="group flex items-center h-[50px] px-2 border-b cursor-pointer" style={{
                    borderColor: tk.divider, maxHeight: 50, transition: 'background 120ms',
                    background: isSelected ? '#DEEBFF' : undefined,
                  }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = tk.hoverBg; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = ''; }}
                    onClick={() => setDetailItemId(story.id)}>
                    <div style={{ width: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <input type="checkbox" onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 14, height: 14 }} />
                    </div>
                    {!compact && (
                      <div style={{ width: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); setDetailItemId(story.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <ChevronRight className="h-3.5 w-3.5" style={{ color: tk.t3 }} />
                        </button>
                      </div>
                    )}
                    <div style={{ width: compact ? 20 : 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <JiraIssueTypeIcon type="story" size={compact ? 14 : undefined} />
                    </div>
                    {/* Dynamic ordered columns */}
                    {orderedCols.filter(c => !(compact && c.compactHide)).map((col, colIdx) => {
                      const w = compact && col.compactWidth ? col.compactWidth : col.width;
                      const baseStyle: React.CSSProperties = col.flex
                        ? { flex: 1, minWidth: 0 }
                        : { width: w, flexShrink: 0 };

                      switch (col.key) {
                        case 'key':
                          return <div key={col.key} style={{ ...baseStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: compact ? 12 : 13, fontWeight: 500, color: story.story_key ? tk.blueKey : tk.t3 }}>{story.story_key || '—'}</div>;
                        case 'summary':
                          return <div key={col.key} style={{ ...baseStyle, fontSize: 13, fontWeight: 400, color: tk.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.title}</div>;
                        case 'status':
                          return <div key={col.key} style={baseStyle}>{sc && ls && <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.03em', background: ls.bg, color: ls.text }}>{sc.label}</span>}</div>;
                        case 'parent':
                          return (
                            <div key={col.key} style={{ ...baseStyle, overflow: 'hidden' }}>
                              {story.feature?.epic ? (
                                <ParentEpicChip epicId={story.feature.epic.id} epicKey={story.feature.epic.epic_key} epicName={story.feature.epic.name} />
                              ) : (
                                <span style={{ color: tk.t3, fontSize: 12 }}>—</span>
                              )}
                            </div>
                          );
                        case 'assignee':
                          return (
                            <div key={col.key} style={{ ...baseStyle, fontSize: 13, color: story.assignee_name ? tk.t1 : tk.t3, fontStyle: story.assignee_name ? 'normal' : 'italic', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                              {avatarUrl ? (
                                <img src={avatarUrl} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                              ) : (
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: tk.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: tk.t2, flexShrink: 0 }}>{getInitials(story.assignee_name || null)}</div>
                              )}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.assignee_name || 'Unassigned'}</span>
                            </div>
                          );
                        case 'created':
                          return <div key={col.key} style={{ ...baseStyle, fontSize: 12, color: tk.t2, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{formatDueDate(story.jira_created_at ?? null)}</div>;
                        case 'updated':
                          return <div key={col.key} style={{ ...baseStyle, fontSize: 12, color: tk.t2, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{formatDueDate(story.jira_updated_at ?? null)}</div>;
                        case 'due':
                          return <div key={col.key} style={{ ...baseStyle, fontSize: 12, color: tk.t2, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{formatDueDate(story.start_date)}</div>;
                        case 'priority':
                          return (
                            <div key={col.key} style={{ ...baseStyle, fontSize: 12, position: 'relative' }}>
                              <span style={{ color: getPriorityColor(story.priority) }}>{getPriorityLabel(story.priority)}</span>
                              {colIdx === orderedCols.filter(c => !(compact && c.compactHide)).length - 1 && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1" style={{ background: isDark ? 'rgba(10,10,10,0.95)' : '#EDEDED' }}>
                                  <button onClick={(e) => { e.stopPropagation(); setEditStoryId(story.id); }} className="p-1 rounded" onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = '')} title="Edit"><Pencil className="h-3.5 w-3.5" style={{ color: tk.t2 }} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(story); }} className="p-1 rounded" onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = '')} title="Delete"><Trash2 className="h-3.5 w-3.5" style={{ color: '#DC2626' }} /></button>
                                </div>
                              )}
                            </div>
                          );
                        default:
                          return null;
                      }
                    })}
                    {/* Row actions always at the end if priority isn't last */}
                    {orderedCols.filter(c => !(compact && c.compactHide)).at(-1)?.key !== 'priority' && !compact && (
                      <div style={{ width: 60, flexShrink: 0, position: 'relative' }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1" style={{ background: isDark ? 'rgba(10,10,10,0.95)' : '#EDEDED' }}>
                          <button onClick={(e) => { e.stopPropagation(); setEditStoryId(story.id); }} className="p-1 rounded" onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = '')} title="Edit"><Pencil className="h-3.5 w-3.5" style={{ color: tk.t2 }} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(story); }} className="p-1 rounded" onMouseEnter={(e) => (e.currentTarget.style.background = tk.hoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = '')} title="Delete"><Trash2 className="h-3.5 w-3.5" style={{ color: '#DC2626' }} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div ref={containerRef} className="h-full flex flex-col" style={{ background: tk.pageBg }}>
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

      {panelMode && detailItemId ? (
        /* ═══ PANEL MODE — split layout ═══ */
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Left: compact backlog list */}
          <div style={{
            width: `${panelDividerWidth}%`, flexShrink: 0,
            overflow: 'auto', transition: isDraggingPanel.current ? 'none' : 'width 0.15s ease',
          }}>
            {renderBacklogList(true)}
          </div>

          {/* Resizable divider */}
          <div
            onMouseDown={handlePanelMouseDown}
            style={{
              width: 6, minWidth: 6, cursor: 'col-resize', flexShrink: 0,
              background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s', position: 'relative', zIndex: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
            onMouseLeave={e => { if (!isDraggingPanel.current) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ width: 1.5, height: 40, borderRadius: 1, background: '#E2E8F0' }} />
          </div>

          {/* Right: detail panel */}
          <div style={{
            flex: 1, minWidth: 0, overflow: 'hidden',
            transition: isDraggingPanel.current ? 'none' : 'flex 0.15s ease',
          }}>
            <Suspense fallback={<div style={{ padding: 24, color: '#97A0AF' }}>Loading…</div>}>
              <StoryDetailModal
                isOpen={true}
                onClose={handleCloseDetail}
                itemId={detailItemId}
                projectId={projectId || ''}
                projectKey={projectKey || ''}
                onOpenItem={(id) => setDetailItemId(id)}
                panelMode={true}
                onTogglePanelMode={handleTogglePanelMode}
                navigationItems={flatStories}
                onNavigate={(id) => setDetailItemId(id)}
              />
            </Suspense>
          </div>
        </div>
      ) : (
        /* ═══ NORMAL MODE — full-width list ═══ */
        <div className="flex-1 overflow-auto">
          {renderBacklogList(false)}
        </div>
      )}

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

      {/* Modal mode — standard centered modal */}
      {!panelMode && detailItemId && (
        <Suspense fallback={null}>
          <StoryDetailModal
            isOpen={!!detailItemId}
            onClose={() => setDetailItemId(null)}
            itemId={detailItemId}
            projectId={projectId || ''}
            projectKey={projectKey || ''}
            onOpenItem={(id) => setDetailItemId(id)}
            onTogglePanelMode={handleTogglePanelMode}
          />
        </Suspense>
      )}

    </div>
  );
}
