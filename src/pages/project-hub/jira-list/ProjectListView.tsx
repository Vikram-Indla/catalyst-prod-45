/**
 * @deprecated 2026-04-18 — List tab removed per Vikram directive.
 *   No longer imported by ProjectJiraLayout. Safe to delete once you've
 *   confirmed no other routes reference ProjectListView.
 *
 * ProjectListView — List tab: Table mode + 3-column Split mode
 */
import React, { useState, useMemo, useCallback } from 'react';
import { AllWorkTable } from './components/AllWorkTable';
import { WorkItemDetailPanel } from './components/WorkItemDetailPanel';
import { WorkListPanel } from './components/WorkListPanel';
import { useProjectListItems } from '@/hooks/useProjectListItems';
import { LayoutGrid, Columns } from 'lucide-react';

interface Props {
  projectKey: string;
  projectId?: string;
}

type ViewMode = 'list' | 'detail';

export default function ProjectListView({ projectKey, projectId }: Props) {
  const { data: items = [], isLoading } = useProjectListItems(projectKey);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const activeItem = useMemo(() =>
    activeItemId ? items.find(i => i.id === activeItemId) ?? null : (items[0] ?? null),
    [activeItemId, items]
  );

  const handleOpenItem = useCallback((key: string) => {
    const found = items.find(i => i.jiraKey === key);
    if (found) {
      setActiveItemId(found.id);
      setViewMode('detail');
    }
  }, [items]);

  const handleNavigate = useCallback((id: string) => {
    setActiveItemId(id);
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* View toggle bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 16px',
        borderBottom: '0.75px solid var(--cp-border-default)',
        background: 'var(--cp-bg-elevated)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 2 }}>
          <ToggleBtn active={viewMode === 'list'} onClick={() => setViewMode('list')} title="Table view" side="left">
            <LayoutGrid size={14} />
          </ToggleBtn>
          <ToggleBtn active={viewMode === 'detail'} onClick={() => { setViewMode('detail'); if (!activeItemId && items.length) setActiveItemId(items[0].id); }} title="Split view" side="right">
            <Columns size={14} />
          </ToggleBtn>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <AllWorkTable items={items} isLoading={isLoading} onOpenItem={handleOpenItem} pageTitle="List" />
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--cp-bg-page)' }}>
          {/* Left: WorkListPanel */}
          <div style={{
            width: 320, flexShrink: 0, background: 'var(--cp-bg-elevated)',
            border: '1px solid var(--cp-border-default)', borderRadius: '10px 0 0 10px',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <WorkListPanel
              items={items}
              selectedKey={activeItem?.id ?? null}
              onSelect={id => setActiveItemId(id)}
            />
          </div>

          {/* Center + Right: WorkItemDetailPanel */}
          {activeItem ? (
            <WorkItemDetailPanel
              item={activeItem}
              allItems={items}
              onNavigate={handleNavigate}
              onClose={() => { setActiveItemId(null); setViewMode('list'); }}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cp-text-tertiary)', fontSize: 14, fontFamily: 'var(--cp-font-body)' }}>
              Select an item to view details
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToggleBtn({ active, onClick, title, side, children }: {
  active: boolean; onClick: () => void; title: string; side: 'left' | 'right'; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 28, border: '1px solid',
        borderColor: active ? 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' : 'var(--cp-border-default)',
        borderRadius: side === 'left' ? '4px 0 0 4px' : '0 4px 4px 0',
        background: active ? 'var(--cp-interact-selected)' : 'var(--cp-bg-elevated)',
        color: active ? 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginLeft: side === 'right' ? -1 : 0,
      }}
    >
      {children}
    </button>
  );
}
