/**
 * HierarchyPage — Work Item Hierarchy (Stage D: Full DB wiring)
 * Route: /project-hub/:key/hierarchy
 * Realtime, toasts, delete confirmation, skeleton loading, error retry
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, Zap, Puzzle, BookOpen, ListChecks, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { HIERARCHY_LEVELS } from '@/types/hierarchy';
import type { WorkItem } from '@/types/hierarchy';
import type { LucideProps } from 'lucide-react';
import { useProjectId } from '@/hooks/useProjectDashboard';
import { useFullHierarchyTree, useDeleteWorkItem } from '@/hooks/useHierarchy';
import { supabase } from '@/integrations/supabase/client';
import { WorkItemTree, TreeSkeleton } from '@/components/hierarchy/WorkItemTree';
import { DetailPanel } from '@/components/hierarchy/DetailPanel';
import { CreateWorkItemModal } from '@/components/hierarchy/CreateWorkItemModal';
import { toast } from 'sonner';

const ICON_MAP: Record<string, React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>> = {
  zap: Zap, puzzle: Puzzle, 'book-open': BookOpen, 'list-checks': ListChecks,
};

function countAll(items: WorkItem[]): number {
  let c = items.length;
  for (const item of items) c += countAll(item.children);
  return c;
}
function countCompleted(items: WorkItem[]): number {
  let c = 0;
  for (const item of items) { if (item.status.isTerminal) c++; c += countCompleted(item.children); }
  return c;
}

export default function HierarchyPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const { data: projectId } = useProjectId(projectKey);
  const { data: treeItems = [], isLoading, isError, refetch } = useFullHierarchyTree(projectId || '');
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteWorkItem(projectId || '');

  const [allExpanded, setAllExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createParent, setCreateParent] = useState<WorkItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<WorkItem | null>(null);

  const totalItems = useMemo(() => countAll(treeItems), [treeItems]);
  const completedItems = useMemo(() => countCompleted(treeItems), [treeItems]);

  // ── Realtime subscription (project-scoped) ──
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`hierarchy-${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'hi_work_items', filter: `project_id=eq.${projectId}` },
        () => { queryClient.invalidateQueries({ queryKey: ['hierarchy', projectId] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, queryClient]);

  const handleAddChild = (parent: WorkItem) => { setCreateParent(parent); setCreateOpen(true); };
  const handleCreateRoot = () => { setCreateParent(null); setCreateOpen(true); };

  const handleDeleteRequest = (item: WorkItem) => { setDeleteConfirm(item); };
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      toast.success(`${deleteConfirm.key} deleted`);
      if (selectedItem?.id === deleteConfirm.id) setSelectedItem(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete work item');
    }
    setDeleteConfirm(null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* PAGE HEADER */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
          Work Item Hierarchy
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
          {projectKey?.toUpperCase() || 'Project'} · {totalItems} items · {completedItems} completed
        </p>
      </div>

      {/* TOOLBAR */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid #F1F5F9', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setAllExpanded(true)} style={{ height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#334155', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronDown size={14} /> Expand All
        </button>
        <button onClick={() => setAllExpanded(false)} style={{ height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#334155', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronRight size={14} /> Collapse All
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={handleCreateRoot} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#FFFFFF', background: '#2563EB', border: '1px solid #2563EB', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={14} /> Create
        </button>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, overflow: 'hidden', minHeight: 0, padding: 24 }}>
        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          {isLoading ? (
            <TreeSkeleton rows={5} />
          ) : isError ? (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 12, padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: 0 }}>Failed to load hierarchy</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>There was an error fetching the work items.</p>
              <button onClick={() => refetch()} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#FFFFFF', background: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : treeItems.length === 0 ? (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center', padding: 24 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                {HIERARCHY_LEVELS.map((level) => {
                  const Icon = ICON_MAP[level.icon] || Zap;
                  return (
                    <div key={level.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: level.colorText, padding: '4px 10px', borderRadius: 9999, background: `${level.color}10`, border: `1px solid ${level.color}30` }}>
                      <Icon size={12} /> {level.name}
                    </div>
                  );
                })}
              </div>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
              </svg>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>No work items yet</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0', maxWidth: 320 }}>
                  Create your first Epic to start building the hierarchy for {projectKey?.toUpperCase() || 'this project'}.
                </p>
              </div>
              <button onClick={handleCreateRoot} style={{ height: 34, padding: '0 16px', fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#FFFFFF', background: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Plus size={14} /> Create Epic
              </button>
            </div>
          ) : (
            <WorkItemTree items={treeItems} selectedId={selectedItem?.id || null} onSelect={setSelectedItem} onDelete={handleDeleteRequest} allExpanded={allExpanded} />
          )}
        </div>
        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          <DetailPanel item={selectedItem} onAddChild={handleAddChild} />
        </div>
      </div>

      {/* CREATE MODAL */}
      {projectId && (
        <CreateWorkItemModal
          open={createOpen}
          onClose={() => { setCreateOpen(false); setCreateParent(null); }}
          projectId={projectId}
          parentItem={createParent}
        />
      )}

      {/* DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div style={{ width: '100%', maxWidth: 400, background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0', fontFamily: "'Inter', sans-serif", padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>Delete {deleteConfirm.key}?</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
              This will also orphan all children. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600, color: '#334155', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}
                style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: '#DC2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: "'Inter', sans-serif", opacity: deleteMutation.isPending ? 0.7 : 1 }}>
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
