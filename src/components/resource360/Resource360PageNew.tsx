import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { Resource360Item, StatusCategory, ViewMode } from '@/types/resource360';
import { getStatusCategory, getStaleIndicator } from '@/types/resource360';
import { useResource360Items } from './hooks/useResource360Items';
import { useResource360Summary } from './hooks/useResource360Summary';
import { Resource360Banner } from './Resource360Banner';
import RingViewV16 from './RingViewV16';
import { Resource360Chronology } from './Resource360Chronology';
import { Resource360Board } from './Resource360Board';
import { Resource360AIPanel } from './Resource360AIPanel';
import AiIntelligencePanelV16 from './AiIntelligencePanelV16';
import './r360-tokens.css';

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: 'ring', label: 'Ring' },
  { key: 'chronology', label: 'Chronology' },
  { key: 'board', label: 'Board' },
];

export default function Resource360PageNew() {
  const { resourceId } = useParams<{ resourceId: string }>();

  const [activeView, setActiveView] = useState<ViewMode>('ring');
  const [statusFilter, setStatusFilter] = useState<StatusCategory>('all');
  const [selectedItem, setSelectedItem] = useState<Resource360Item | null>(null);
  const [aiOpen, setAIOpen] = useState(false);

  const { data: items = [], isLoading: itemsLoading } = useResource360Items(resourceId);
  const { data: summary, isLoading: summaryLoading } = useResource360Summary(resourceId);

  const staleCount = useMemo(() =>
    items.filter(i => getStaleIndicator(i.age_days, i.status, i.status_category) !== null).length,
    [items]
  );

  const handleItemClick = useCallback((item: Resource360Item) => setSelectedItem(item), []);
  const handleModalClose = useCallback(() => setSelectedItem(null), []);

  const resourceName = summary?.name ?? 'Resource';
  const jobRole = summary?.role ?? '';

  if (!resourceId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>👤</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>No resource selected</p>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Select a team member to view their 360° workload</p>
        </div>
      </div>
    );
  }

  const isInitialLoad = (itemsLoading || summaryLoading) && !items.length && !summary;
  if (isInitialLoad) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <div className="r360-skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="r360-skeleton" style={{ height: 20, borderRadius: 6, width: '40%' }} />
            <div className="r360-skeleton" style={{ height: 14, borderRadius: 6, width: '25%' }} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
          <div style={{ textAlign: 'center', color: '#64748B', fontSize: 13 }}>Loading Resource 360°...</div>
        </div>
        <style>{skeletonCSS}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
      fontFamily: "'Inter', sans-serif", overflow: 'hidden',
    }}>
      {/* Banner */}
      <Resource360Banner summary={summary ?? null} isLoading={summaryLoading} />

      {/* Toolbar: View tabs + AI button */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', height: 40, flexShrink: 0,
        background: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
      }}>
        {VIEW_TABS.map(tab => {
          const active = activeView === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              style={{
                padding: '0 12px', height: 40, fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? '#2563EB' : '#64748B', background: 'transparent',
                border: 'none', borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >{tab.label}</button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setAIOpen(true)}
          style={{
            background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 8,
            padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 28,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800 }}>✦</span>
          Intelligence
        </button>
      </div>

      {/* View content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeView === 'ring' && (
          <RingViewV16
            resource={summary}
            items={items}
            onItemClick={handleItemClick}
            onAiClick={() => setAIOpen(true)}
          />
        )}
        {activeView === 'chronology' && <Resource360Chronology items={items} onItemClick={handleItemClick} />}
        {activeView === 'board' && <Resource360Board items={items} onItemClick={handleItemClick} />}
      </div>

      {/* AI Intelligence Panel */}
      {aiOpen && (
        <AiIntelligencePanelV16
          resourceName={resourceName}
          onClose={() => setAIOpen(false)}
        />
      )}

      <style>{skeletonCSS}</style>
    </div>
  );
}

const skeletonCSS = `
  .r360-skeleton {
    background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
    background-size: 200% 100%;
    animation: r360shimmer 1.5s infinite;
  }
  @keyframes r360shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
