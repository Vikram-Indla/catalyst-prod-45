import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { Resource360Item, StatusCategory, ViewMode } from '@/types/resource360';
import { getStaleIndicator } from '@/types/resource360';
import { useResource360Items } from './hooks/useResource360Items';
import { useResource360Summary } from './hooks/useResource360Summary';
import { Resource360Banner } from './Resource360Banner';
import RingViewV16 from './RingViewV16';
import { Resource360Chronology } from './Resource360Chronology';
import { Resource360Board } from './Resource360Board';
import { R360ItemDetailDrawer, mapToDrawerItem } from './R360ItemDetailDrawer';
import type { R360DrawerItem } from './R360ItemDetailDrawer';
import AIIntelligencePanel from '@/components/resources/AIIntelligencePanel';
import './r360-tokens.css';

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: 'ring', label: 'Ring' },
  { key: 'chronology', label: 'Chronology' },
  { key: 'board', label: 'Board' },
];

export default function Resource360PageNew() {
  const { resourceId } = useParams<{ resourceId: string }>();

  const [activeView, setActiveView] = useState<ViewMode>('ring');
  const [selectedItem, setSelectedItem] = useState<Resource360Item | null>(null);
  const [aiOpen, setAIOpen] = useState(false);
  const viewTabsRef = useRef<HTMLDivElement>(null);

  // ─── ITEM DETAIL DRAWER STATE ───
  const [drawerItem, setDrawerItem] = useState<R360DrawerItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpenDrawer = useCallback((item: Resource360Item) => {
    setDrawerItem(mapToDrawerItem(item));
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setTimeout(() => setDrawerItem(null), 250);
  }, []);

  // ESC key to close drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) handleCloseDrawer();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [drawerOpen, handleCloseDrawer]);

  useEffect(() => {
    if (viewTabsRef.current) {
      viewTabsRef.current.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      return;
    }
    const anchor = document.getElementById('r360-view-tabs');
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    }
  }, [activeView]);

  const { data: items = [], isLoading: itemsLoading } = useResource360Items(resourceId);
  const { data: summary, isLoading: summaryLoading } = useResource360Summary(resourceId);

  const handleItemClick = useCallback((item: Resource360Item) => {
    setSelectedItem(item);
    handleOpenDrawer(item);
  }, [handleOpenDrawer]);

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
        <div style={{ height: 66, display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E2E8F0' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: 120, height: 14, borderRadius: 4, background: '#E2E8F0' }} />
            <div style={{ width: 180, height: 10, borderRadius: 4, background: '#F1F5F9' }} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
          <div style={{ textAlign: 'center', color: '#64748B', fontSize: 13 }}>Loading Resource 360°...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      {/* §3 Banner — DEF-01: only Open + Stale KPIs */}
      <Resource360Banner summary={summary ?? null} isLoading={summaryLoading} items={items} />

      {/* §4 Tab Bar — 40px */}
      <div ref={viewTabsRef} id="r360-view-tabs" style={{
        display: 'flex', alignItems: 'center', gap: 0,
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
                padding: '0 12px', height: 40, fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? '#2563EB' : '#64748B',
                background: 'transparent', border: 'none',
                borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >{tab.label}</button>
          );
        })}
        <div style={{ flex: 1 }} />

        {/* Quarter select */}
        <select style={{
          height: 28, fontSize: 12, border: '1px solid #E2E8F0',
          borderRadius: 6, padding: '0 8px', marginRight: 8,
          background: '#FFFFFF', color: '#0F172A',
          fontFamily: "'Inter', sans-serif", cursor: 'pointer',
        }}>
          <option>Q1-2026</option>
          <option>Q4-2025</option>
          <option>Q3-2025</option>
        </select>

        {/* Intelligence button */}
        <button
          onClick={() => setAIOpen(true)}
          style={{
            background: '#2563EB',
            color: '#FFFFFF', border: 'none', borderRadius: 20,
            padding: '0 16px', height: 32, fontSize: 12, fontWeight: 600,
            letterSpacing: '0.3px', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'all 200ms ease',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 0 0 6px rgba(37,99,235,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = ''; }}
        >
          <Zap size={13} strokeWidth={2.2} />
          Intelligence
        </button>
      </div>

      {/* View content — flex:1 fills all remaining space */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
      {aiOpen && resourceId && (
        <AIIntelligencePanel
          resourceId={resourceId}
          onClose={() => setAIOpen(false)}
        />
      )}

      {/* Item Detail Drawer */}
      <R360ItemDetailDrawer
        item={drawerItem}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
