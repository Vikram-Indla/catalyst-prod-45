import { useState, useCallback, useEffect, useMemo } from 'react';
import { FileDown, RefreshCw } from 'lucide-react';
import { PeriodSummary } from './components/PeriodSummary';
import { PeriodControls } from './components/PeriodControls';
import { ProductionEventsTable } from './components/ProductionEventsTable';
import { useProductionEvents, usePeriodSummary } from './hooks/useProductionEvents';
import { usePeriodNavigation } from './hooks/usePeriodNavigation';
import type { PcEventType } from './types/production-events.types';

export default function ProductionEventsPage() {
  const { periodType, label, startISO, endISO, handlePeriodTypeChange, handleNavigate } = usePeriodNavigation();
  const [filterType, setFilterType] = useState<PcEventType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: events = [], isLoading: eventsLoading } = useProductionEvents(periodType, startISO, endISO);
  const { data: summary, isLoading: summaryLoading } = usePeriodSummary(periodType, startISO);

  // ESC collapses expanded rows
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedId(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events;
    return events.filter(e => e.event_type === filterType);
  }, [events, filterType]);

  const syncedAt = 'Synced 24 Feb 2026, 09:15';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: '24px 28px', background: '#FFFFFF', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 750, color: '#020617',
            fontFamily: "'Inter', sans-serif", margin: 0, letterSpacing: '-0.3px',
          }}>
            Production Events
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', fontWeight: 400, margin: '4px 0 0' }}>
            Curated record of production deployments with AI-generated narratives
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginRight: 8 }}>{syncedAt}</span>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              borderRadius: 6, border: '1px solid #E2E8F0',
              background: '#FFFFFF', color: '#475569', cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <FileDown size={14} />
            Export PDF
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              borderRadius: 6, border: '1px solid #E2E8F0',
              background: '#FFFFFF', color: '#475569', cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <RefreshCw size={14} />
            Sync
          </button>
        </div>
      </div>

      {/* AI Summary */}
      <div style={{ margin: '20px 0 16px' }}>
        <PeriodSummary summary={summary ?? null} loading={summaryLoading} />
      </div>

      {/* Controls */}
      <div style={{ marginBottom: 16 }}>
        <PeriodControls
          periodType={periodType}
          onPeriodTypeChange={handlePeriodTypeChange}
          periodLabel={label}
          onNavigate={handleNavigate}
          filterType={filterType}
          onFilterChange={setFilterType}
        />
      </div>

      {/* Table */}
      <ProductionEventsTable
        events={filteredEvents}
        loading={eventsLoading}
        expandedId={expandedId}
        onToggleExpand={handleToggleExpand}
      />
    </div>
  );
}
