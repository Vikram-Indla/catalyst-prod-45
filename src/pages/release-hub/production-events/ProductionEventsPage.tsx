import { useState, useCallback, useEffect, useMemo } from 'react';
import { FileDown, RefreshCw } from 'lucide-react';
import { PeriodControls } from './components/PeriodControls';
import { ProductionEventsTable } from './components/ProductionEventsTable';
import { useProductionEvents } from './hooks/useProductionEvents';
import { usePeriodNavigation } from './hooks/usePeriodNavigation';

export default function ProductionEventsPage() {
  const { periodType, label, startISO, endISO, handlePeriodTypeChange, handleNavigate } = usePeriodNavigation();
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: events = [], isLoading: eventsLoading } = useProductionEvents(periodType, startISO, endISO);

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
    return events.filter(e => e.issue_type.toLowerCase() === filterType);
  }, [events, filterType]);

  // Compute counts for chips
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      const t = e.issue_type.toLowerCase();
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [events]);

  const syncedAt = events.length > 0
    ? `Last deployed: ${new Date(events[0].jira_updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';

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
            Tickets marked "In Production" from Jira, grouped by deployment date
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncedAt && <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginRight: 8 }}>{syncedAt}</span>}
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              borderRadius: 6, border: '1px solid #E2E8F0',
              background: '#FFFFFF', color: '#475569', cursor: 'pointer',
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
            }}
          >
            <RefreshCw size={14} />
            Sync
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mt-4 mb-4">
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
          {events.length} items in production
        </div>
        {Object.entries(typeCounts).map(([type, count]) => (
          <span key={type} style={{ fontSize: 12, color: '#64748B' }}>
            {type}: <strong>{count}</strong>
          </span>
        ))}
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
