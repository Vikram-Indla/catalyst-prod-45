/**
 * ProjectListView — List tab (Jira-parity AllWorkTable + Split toggle)
 */
import React, { useState, useMemo, useCallback } from 'react';
import { AllWorkTable } from './components/AllWorkTable';
import { WorkItemDetailPanel } from './components/WorkItemDetailPanel';
import { useProjectListItems } from '@/hooks/useProjectListItems';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { LayoutGrid, Columns } from 'lucide-react';
import type { WorkItem as PhWorkItem } from '@/types/workItem.types';

interface Props {
  projectKey: string;
  projectId?: string;
}

type ViewMode = 'list' | 'detail';

function SplitListCard({ item, isActive, onClick }: { item: PhWorkItem; isActive: boolean; onClick: () => void }) {
  const isRTL = /[\u0600-\u06FF]/.test(item.summary);
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderBottom: '0.75px solid #DDDEE1',
        cursor: 'pointer',
        background: isActive ? 'rgba(37,99,235,0.06)' : 'transparent',
        borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
        transition: 'background 100ms',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget).style.background = 'rgba(0,0,0,0.02)'; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget).style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          <WorkItemTypeIcon type={item.type} size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{
              fontSize: 13, fontWeight: 500, color: '#292A2E',
              lineHeight: 1.4, marginBottom: 4,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {item.summary || '(No title)'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: '#2563EB' }}>
              {item.jiraKey}
            </span>
            {item.assignee && (
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: item.assignee.color || '#6554C0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: '#fff',
                marginLeft: 'auto', flexShrink: 0,
              }}>
                {item.assignee.initials}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
        borderBottom: '0.75px solid #DDDEE1',
        background: '#FFFFFF',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            style={{
              width: 30, height: 28, border: '1px solid',
              borderColor: viewMode === 'list' ? '#2563EB' : '#DDDEE1',
              borderRadius: '4px 0 0 4px',
              background: viewMode === 'list' ? 'rgba(37,99,235,0.08)' : '#fff',
              color: viewMode === 'list' ? '#2563EB' : '#94A3B8',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => { setViewMode('detail'); if (!activeItemId && items.length) setActiveItemId(items[0].id); }}
            title="Detail view"
            style={{
              width: 30, height: 28, border: '1px solid',
              borderColor: viewMode === 'detail' ? '#2563EB' : '#DDDEE1',
              borderRadius: '0 4px 4px 0',
              background: viewMode === 'detail' ? 'rgba(37,99,235,0.08)' : '#fff',
              color: viewMode === 'detail' ? '#2563EB' : '#94A3B8',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginLeft: -1,
            }}
          >
            <Columns size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <AllWorkTable
          items={items}
          isLoading={isLoading}
          onOpenItem={handleOpenItem}
          pageTitle="List"
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: scrollable card list */}
          <div style={{
            width: 280, flexShrink: 0,
            borderRight: '0.75px solid #DDDEE1',
            overflowY: 'auto',
            background: '#fff',
          }}>
            <div style={{
              padding: '8px 12px', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: '#44546F', background: '#F7F8F9',
              borderBottom: '0.75px solid #DDDEE1',
              fontFamily: 'Inter, sans-serif',
              position: 'sticky', top: 0, zIndex: 1,
            }}>
              {items.length} ITEMS
            </div>
            {items.map(item => (
              <SplitListCard
                key={item.id}
                item={item}
                isActive={activeItem?.id === item.id}
                onClick={() => setActiveItemId(item.id)}
              />
            ))}
          </div>
          {/* Right: detail panel */}
          {activeItem ? (
            <WorkItemDetailPanel
              item={activeItem}
              allItems={items}
              onNavigate={handleNavigate}
              onClose={() => { setActiveItemId(null); setViewMode('list'); }}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6E76', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
              Select an item to view details
            </div>
          )}
        </div>
      )}
    </div>
  );
}
