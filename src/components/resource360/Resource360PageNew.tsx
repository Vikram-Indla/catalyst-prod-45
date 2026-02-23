import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { Resource360Item, StatusCategory, ViewMode, Quarter } from '@/types/resource360';
import { getStatusCategory, getStaleIndicator } from '@/types/resource360';
import { useResource360Items } from './hooks/useResource360Items';
import { useResource360Summary } from './hooks/useResource360Summary';
import { Resource360Banner } from './Resource360Banner';
import { Resource360Toolbar } from './Resource360Toolbar';
import { Resource360Ring } from './Resource360Ring';
import { Resource360Chronology } from './Resource360Chronology';
import { Resource360List } from './Resource360List';
import { Resource360Board } from './Resource360Board';
import { Resource360ContextModal } from './Resource360ContextModal';
import { Resource360AIPanel } from './Resource360AIPanel';
import './r360-tokens.css';

export default function Resource360PageNew() {
  const { resourceId } = useParams<{ resourceId: string }>();

  const [activeView, setActiveView] = useState<ViewMode>('ring');
  const [statusFilter, setStatusFilter] = useState<StatusCategory>('all');
  const [quarter, setQuarter] = useState<Quarter>('Q1-2026');
  const [selectedItem, setSelectedItem] = useState<Resource360Item | null>(null);
  const [aiOpen, setAIOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [prevQuarterStats, setPrevQuarterStats] = useState<{ label: string; total: number; closureRate: number; avgAge: number } | null>(null);

  const { data: items = [], isLoading: itemsLoading } = useResource360Items(resourceId);
  const { data: summary, isLoading: summaryLoading } = useResource360Summary(resourceId);

  const staleCount = useMemo(() =>
    items.filter(i => getStaleIndicator(i.age_days, i.status, i.status_category) !== null).length,
    [items]
  );

  const currentClosureRate = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.round((items.filter(i => getStatusCategory(i.status, i.status_category) === 'done').length / items.length) * 100);
  }, [items]);

  const currentAvgAge = useMemo(() => {
    if (items.length === 0) return 0;
    return +(items.reduce((s, i) => s + i.age_days, 0) / items.length).toFixed(1);
  }, [items]);

  const handleItemClick = useCallback((item: Resource360Item) => setSelectedItem(item), []);
  const handleModalClose = useCallback(() => setSelectedItem(null), []);
  const handleModalNavigate = useCallback((item: Resource360Item) => setSelectedItem(item), []);
  const handleFullscreenToggle = useCallback(() => setIsFullscreen(prev => !prev), []);

  const handleQuarterChange = useCallback((newQuarter: Quarter) => {
    setPrevQuarterStats({
      label: quarter,
      total: items.length,
      closureRate: currentClosureRate,
      avgAge: currentAvgAge,
    });
    setQuarter(newQuarter);
  }, [quarter, items.length, currentClosureRate, currentAvgAge]);

  const resourceName = summary?.name ?? 'Resource';
  const resourceAvatar = summary?.avatar_url ?? null;
  const jobRole = summary?.role ?? '';
  const department = summary?.department ?? '';

  if (!resourceId) {
    return (
      <div className="r360-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: "'Inter', sans-serif" }}>
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
      <div className="r360-root" style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <div className="r360-skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="r360-skeleton" style={{ height: 20, borderRadius: 6, width: '40%' }} />
            <div className="r360-skeleton" style={{ height: 14, borderRadius: 6, width: '25%' }} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading Resource 360°...</div>
        </div>
        <style>{skeletonCSS}</style>
      </div>
    );
  }

  return (
    <div className="r360-root" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', fontFamily: "'Inter', sans-serif" }}>
      {/* Banner — NO breadcrumb */}
      {!isFullscreen && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px' }}>
          <div style={{ flex: 1 }}>
            <Resource360Banner summary={summary ?? null} isLoading={summaryLoading} />
          </div>
          {/* Stale count badge */}
          {staleCount > 0 && (
            <div style={{ textAlign: 'center', padding: '2px 10px', background: '#FEE2E2', borderRadius: 6, border: '1px solid #FCA5A5' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#DC2626' }}>{staleCount}</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.04em' }}>STALE</div>
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <Resource360Toolbar
        activeView={activeView}
        onViewChange={setActiveView}
        quarter={quarter}
        onQuarterChange={handleQuarterChange}
        onAIOpen={() => setAIOpen(true)}
        isFullscreen={isFullscreen}
        onFullscreenToggle={handleFullscreenToggle}
      />

      {/* Cross-Quarter Comparison Stripe */}
      {prevQuarterStats && items.length > 0 && (() => {
        const done = items.filter(i => getStatusCategory(i.status, i.status_category) === 'done').length;
        const cr = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
        const aa = items.length > 0 ? +(items.reduce((s, i) => s + i.age_days, 0) / items.length).toFixed(1) : 0;
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '6px 20px', background: '#EFF6FF', borderBottom: '1px solid #BFDBFE',
            fontSize: 11, fontWeight: 600,
          }}>
            <span style={{ color: '#2563EB', fontWeight: 700 }}>vs {prevQuarterStats.label}</span>
            <span style={{ color: '#374151' }}>
              Items: {items.length}
              <ComparisonArrow current={items.length} prev={prevQuarterStats.total} />
            </span>
            <span style={{ color: '#374151' }}>
              Closure: {cr}%
              <ComparisonArrow current={cr} prev={prevQuarterStats.closureRate} />
            </span>
            <span style={{ color: '#374151' }}>
              Avg Age: {aa}d
              <ComparisonArrow current={aa} prev={prevQuarterStats.avgAge} lowerIsBetter />
            </span>
            <button onClick={() => setPrevQuarterStats(null)} style={{
              marginLeft: 'auto', fontSize: 9, color: '#6B7280', background: 'transparent',
              border: 'none', cursor: 'pointer', textDecoration: 'underline',
            }}>Dismiss</button>
          </div>
        );
      })()}

      {/* View container */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeView === 'ring' && (
          <Resource360Ring
            items={items} resourceName={resourceName} resourceAvatar={resourceAvatar}
            jobRole={jobRole} department={department}
            statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
            onItemClick={handleItemClick}
          />
        )}
        {activeView === 'chronology' && <Resource360Chronology items={items} onItemClick={handleItemClick} />}
        {activeView === 'list' && <Resource360List items={items} onItemClick={handleItemClick} />}
        {activeView === 'board' && <Resource360Board items={items} onItemClick={handleItemClick} />}
      </div>

      {selectedItem && (
        <Resource360ContextModal item={selectedItem} allItems={items} onClose={handleModalClose} onNavigate={handleModalNavigate} />
      )}

      <Resource360AIPanel items={items} summary={summary ?? null} resourceName={resourceName} isOpen={aiOpen} onClose={() => setAIOpen(false)} />

      <style>{skeletonCSS}</style>
    </div>
  );
}

function ComparisonArrow({ current, prev, lowerIsBetter }: { current: number; prev: number; lowerIsBetter?: boolean }) {
  const diff = +(current - prev).toFixed(1);
  if (diff === 0) return <span style={{ marginLeft: 4, fontSize: 9, color: '#6B7280' }}>→ same</span>;
  const isUp = diff > 0;
  const isGood = lowerIsBetter ? !isUp : isUp;
  const color = isGood ? '#0E8A5F' : '#E23636';
  return (
    <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, color }}>
      {isUp ? '↑' : '↓'} {Math.abs(diff)}
    </span>
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
