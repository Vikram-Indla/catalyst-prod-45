/**
 * ProjectAllWorkView — All Work: Table mode + 3-column Split mode
 *
 * 2026-04-18 (WS7 of Jira-parity plan): Split mode now delegates the
 * center+right detail rendering to CatalystDetailRouter — the canonical
 * Atlaskit-native detail surface already used by BacklogPage.atlaskit.
 * This replaces ~460 lines of bespoke WorkItemDetailPanel with the same
 * type-aware views (story / epic / feature / defect / incident / task /
 * business_request / subtask) that /backlog uses, inheriting Jira-correct
 * typography, tokens, inline-edit fields, and description editor for free.
 */
import React, { lazy, Suspense, useState, useMemo, useCallback } from 'react';
import { token } from '@atlaskit/tokens';
import { AllWorkTable } from './components/AllWorkTable';
import { WorkListPanel } from './components/WorkListPanel';
import { useProjectAllWorkItems } from '@/hooks/useProjectListItems';
import { LayoutGrid, Columns } from 'lucide-react';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

interface Props {
  projectKey: string;
  /** Optional — enables inline-edit mutations that need the project UUID. */
  projectId?: string;
}

type ViewMode = 'list' | 'detail';

export default function ProjectAllWorkView({ projectKey, projectId }: Props) {
  const { data: items = [], isLoading } = useProjectAllWorkItems(projectKey);
  // Default to 'detail' (split view) — matches Jira's default behavior. Table
  // remains available via the view toggle for power users.
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
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
        borderBottom: '0.75px solid #DDDEE1',
        background: '#FFFFFF',
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
        <AllWorkTable items={items} isLoading={isLoading} onOpenItem={handleOpenItem} pageTitle="All Work" subtitle="Global work view — all types, all statuses" />
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#FFFFFF', gap: 8, padding: 8 }}>
          {/* Left: WorkListPanel — Jira parity container
              (measured 2026-04-18): 260px wide / #F8F8F8 / 4px radius / no border.
              Inner cards are white so they elevate against the gray backdrop. */}
          <div style={{
            width: 260, flexShrink: 0, background: '#F8F8F8',
            border: 'none', borderRadius: 4,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            padding: '0 2px',
          }}>
            <WorkListPanel
              items={items}
              selectedKey={activeItem?.id ?? null}
              onSelect={id => setActiveItemId(id)}
            />
          </div>

          {/* Center + Right: CatalystDetailRouter (canonical Atlaskit detail) */}
          {activeItem ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
              background: token('elevation.surface', '#FFFFFF'),
              borderRadius: '0 10px 10px 0', overflow: 'hidden',
            }}>
              <Suspense fallback={
                <div style={{ padding: 24, color: token('color.text.subtlest', '#6B778C'), fontSize: 14 }}>
                  Loading…
                </div>
              }>
                <CatalystDetailRouter
                  isOpen={true}
                  onClose={() => { setActiveItemId(null); setViewMode('list'); }}
                  itemId={activeItem.id}
                  itemType={activeItem.type}
                  projectId={projectId}
                  projectKey={projectKey}
                  onOpenItem={(id) => setActiveItemId(id)}
                  panelMode={true}
                  navigationItems={items.map(i => ({ id: i.id, summary: i.summary, issue_key: i.jiraKey }))}
                  onNavigate={handleNavigate}
                />
              </Suspense>
            </div>
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: token('color.text.subtlest', '#6B778C'), fontSize: 14,
              fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            }}>
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
        borderColor: active ? '#2563EB' : '#DDDEE1',
        borderRadius: side === 'left' ? '4px 0 0 4px' : '0 4px 4px 0',
        background: active ? 'rgba(37,99,235,0.08)' : '#fff',
        color: active ? '#2563EB' : '#94A3B8',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginLeft: side === 'right' ? -1 : 0,
      }}
    >
      {children}
    </button>
  );
}
