/**
 * HierarchyPage — Work Item Hierarchy (Stage C)
 * Route: /project-hub/:key/hierarchy
 * Two-column layout: tree panel (2fr) + detail panel (1fr)
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, Zap, Puzzle, BookOpen, ListChecks } from 'lucide-react';
import { HIERARCHY_LEVELS } from '@/types/hierarchy';
import type { WorkItem } from '@/types/hierarchy';
import type { LucideProps } from 'lucide-react';
import { useProjectId } from '@/hooks/useProjectDashboard';
import { useFullHierarchyTree } from '@/hooks/useHierarchy';
import { WorkItemTree } from '@/components/hierarchy/WorkItemTree';
import { DetailPanel } from '@/components/hierarchy/DetailPanel';
import { CreateWorkItemModal } from '@/components/hierarchy/CreateWorkItemModal';

const ICON_MAP: Record<string, React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>> = {
  zap: Zap,
  puzzle: Puzzle,
  'book-open': BookOpen,
  'list-checks': ListChecks,
};

function countAll(items: WorkItem[]): number {
  let c = items.length;
  for (const item of items) c += countAll(item.children);
  return c;
}

function countCompleted(items: WorkItem[]): number {
  let c = 0;
  for (const item of items) {
    if (item.status.isTerminal) c++;
    c += countCompleted(item.children);
  }
  return c;
}

export default function HierarchyPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const { data: projectId } = useProjectId(projectKey);
  const { data: treeItems = [], isLoading } = useFullHierarchyTree(projectId || '');

  const [allExpanded, setAllExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createParent, setCreateParent] = useState<WorkItem | null>(null);

  const totalItems = useMemo(() => countAll(treeItems), [treeItems]);
  const completedItems = useMemo(() => countCompleted(treeItems), [treeItems]);

  const handleAddChild = (parent: WorkItem) => {
    setCreateParent(parent);
    setCreateOpen(true);
  };

  const handleCreateRoot = () => {
    setCreateParent(null);
    setCreateOpen(true);
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#F8FAFC',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* PAGE HEADER */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF',
      }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#0F172A',
          margin: 0,
          letterSpacing: '-0.025em',
          lineHeight: 1.2,
        }}>
          Work Item Hierarchy
        </h1>
        <p style={{
          fontSize: 13,
          color: '#64748B',
          margin: '4px 0 0',
        }}>
          {projectKey?.toUpperCase() || 'Project'} · {totalItems} items · {completedItems} completed
        </p>
      </div>

      {/* TOOLBAR */}
      <div style={{
        padding: '10px 24px',
        borderBottom: '1px solid #F1F5F9',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={() => setAllExpanded(true)}
          style={{
            height: 32,
            padding: '0 12px',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            color: '#334155',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ChevronDown size={14} />
          Expand All
        </button>
        <button
          onClick={() => setAllExpanded(false)}
          style={{
            height: 32,
            padding: '0 12px',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            color: '#334155',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ChevronRight size={14} />
          Collapse All
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleCreateRoot}
          style={{
            height: 32,
            padding: '0 14px',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            color: '#FFFFFF',
            background: '#2563EB',
            border: '1px solid #2563EB',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Plus size={14} />
          Create
        </button>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 24,
        overflow: 'hidden',
        minHeight: 0,
        padding: 24,
      }}>
        {/* TREE PANEL */}
        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#64748B', fontSize: 13 }}>
              Loading hierarchy…
            </div>
          ) : treeItems.length === 0 ? (
            /* EMPTY STATE */
            <div style={{
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              background: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
              gap: 16,
              textAlign: 'center',
              padding: 24,
            }}>
              {/* Level legend */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                {HIERARCHY_LEVELS.map((level) => {
                  const Icon = ICON_MAP[level.icon] || Zap;
                  return (
                    <div key={level.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 11,
                      fontWeight: 600,
                      color: level.colorText,
                      padding: '4px 10px',
                      borderRadius: 9999,
                      background: `${level.color}10`,
                      border: `1px solid ${level.color}30`,
                    }}>
                      <Icon size={12} />
                      {level.name}
                    </div>
                  );
                })}
              </div>

              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
              </svg>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  No work items yet
                </p>
                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0', maxWidth: 320 }}>
                  Create your first Epic to start building the hierarchy for {projectKey?.toUpperCase() || 'this project'}.
                </p>
              </div>
              <button
                onClick={handleCreateRoot}
                style={{
                  height: 34,
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  color: '#FFFFFF',
                  background: '#2563EB',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <Plus size={14} />
                Create Epic
              </button>
            </div>
          ) : (
            <WorkItemTree
              items={treeItems}
              selectedId={selectedItem?.id || null}
              onSelect={setSelectedItem}
              allExpanded={allExpanded}
            />
          )}
        </div>

        {/* DETAIL PANEL */}
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
    </div>
  );
}
