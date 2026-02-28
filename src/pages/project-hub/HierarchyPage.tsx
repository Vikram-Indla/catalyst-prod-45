/**
 * HierarchyPage — Work Item Hierarchy from Jira sync data
 * Route: /project-hub/:key/hierarchy
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, Zap, Puzzle, BookOpen, ListChecks, RefreshCw } from 'lucide-react';
import { HIERARCHY_LEVELS } from '@/types/hierarchy';
import type { WorkItem } from '@/types/hierarchy';
import type { LucideProps } from 'lucide-react';
import { useJiraHierarchyTree, useMoveJiraHierarchyItem } from '@/hooks/useJiraHierarchy';
import { WorkItemTree, TreeSkeleton } from '@/components/hierarchy/WorkItemTree';
import { DetailPanel } from '@/components/hierarchy/DetailPanel';
import { toast } from 'sonner';

/** Find an item by id in the tree */
function findItem(items: WorkItem[], id: string): WorkItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findItem(item.children, id);
    if (found) return found;
  }
  return null;
}

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
  const { data: treeItems = [], isLoading, isError, refetch } = useJiraHierarchyTree(projectKey);

  const moveMutation = useMoveJiraHierarchyItem(projectKey);

  const [allExpanded, setAllExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

  const totalItems = useMemo(() => countAll(treeItems), [treeItems]);
  const completedItems = useMemo(() => countCompleted(treeItems), [treeItems]);

  const handleDeselect = useCallback(() => { setSelectedItem(null); }, []);

  const handleMove = useCallback(async (itemId: string, newParentId: string) => {
    const draggedItem = findItem(treeItems, itemId);
    try {
      await moveMutation.mutateAsync({
        issueKey: itemId,
        newParentKey: newParentId,
        originalParentKey: draggedItem?.parentId || null,
      });
      toast.success('Hierarchy updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to move item');
    }
  }, [moveMutation, treeItems]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8FAFC', fontFamily: "'Inter', sans-serif" }}>
      {/* PAGE HEADER */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
          Work Item Hierarchy
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
          {projectKey?.toUpperCase() || 'Project'} · {totalItems} items · {completedItems} completed
          <span style={{ marginLeft: 8, fontSize: 11, color: '#94A3B8' }}>Source: Jira Sync</span>
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
        <button onClick={() => refetch()} style={{ height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#334155', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={14} /> Refresh
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
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>There was an error fetching the work items from Jira sync.</p>
              <button onClick={() => refetch()} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#FFFFFF', background: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : treeItems.length === 0 ? (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center', padding: 24 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
              </svg>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>No work items found</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0', maxWidth: 320 }}>
                  No Jira issues found for {projectKey?.toUpperCase()}. Run a Jira sync to populate the hierarchy.
                </p>
              </div>
            </div>
          ) : (
            <WorkItemTree
              items={treeItems}
              selectedId={selectedItem?.id || null}
              onSelect={setSelectedItem}
              onDeselect={handleDeselect}
              onMove={handleMove}
              allExpanded={allExpanded}
            />
          )}
        </div>
        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          <DetailPanel item={selectedItem} />
        </div>
      </div>
    </div>
  );
}
