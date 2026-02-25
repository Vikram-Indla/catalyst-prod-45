import { useState, useCallback, useEffect, useMemo } from 'react';
import { FileDown, RefreshCw } from 'lucide-react';
import { PeriodControls } from './components/PeriodControls';
import { ProductionEventsTable } from './components/ProductionEventsTable';
import { useProductionEvents } from './hooks/useProductionEvents';
import { usePeriodNavigation } from './hooks/usePeriodNavigation';
import { classifyEventType } from './utils/event-colors';
import {
  generateSummaryLead,
  generateSummaryBody,
  generateQuarterlySummaryLead,
  groupEventsByMonth,
} from './utils/narrative-helpers';

export default function ProductionEventsPage() {
  const { periodType, label, startISO, endISO, handlePeriodTypeChange, handleNavigate } = usePeriodNavigation();
  // Fix 31: default filter = 'all'
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: rawEvents = [], isLoading: eventsLoading } = useProductionEvents(periodType, startISO, endISO);

  // Fix 4: Classify with summary keyword detection
  const events = useMemo(() =>
    rawEvents.map(e => ({
      ...e,
      eventType: classifyEventType(e.issueType, [], e.title + ' ' + (e.subtitle || '')),
    })),
    [rawEvents]
  );

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
    return events.filter(e => e.eventType === filterType);
  }, [events, filterType]);

  const syncedAt = events.length > 0
    ? `Synced ${new Date(events[0].deployedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${new Date(events[0].deployedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  // Fix 3: Summary generation — editorial prose
  const releaseSet = new Set(events.map(e => e.release).filter(Boolean));
  const periodLabel = periodType === 'weekly' ? 'week' : periodType === 'monthly' ? 'month' : 'quarter';
  const releaseCount = releaseSet.size;

  const summaryLead = useMemo(() => {
    if (events.length === 0) return '';
    if (periodType === 'quarterly') {
      const eventsByMonth = groupEventsByMonth(events);
      const startDate = new Date(startISO);
      const quarter = Math.ceil((startDate.getMonth() + 1) / 3);
      const year = startDate.getFullYear();
      return generateQuarterlySummaryLead(events, eventsByMonth, quarter, year);
    }
    return generateSummaryLead(events, periodLabel, releaseCount);
  }, [events, periodType, periodLabel, releaseCount, startISO]);

  const summaryBody = useMemo(() => {
    if (events.length === 0) return '';
    return generateSummaryBody(events, periodLabel);
  }, [events, periodLabel]);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: '24px 28px', background: '#FFFFFF', minHeight: '100vh' }}>
      {/* Page Header — Fix 13: weight 800 */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: '#020617',
            fontFamily: "'Inter', sans-serif", margin: 0, letterSpacing: '-0.02em',
          }}>
            Production Events
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', fontWeight: 400, margin: '4px 0 0' }}>
            Curated record of production deployments and their business impact
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncedAt && <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginRight: 8 }}>{syncedAt}</span>}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', fontSize: 12, fontWeight: 600,
            borderRadius: 6, border: '1px solid #E2E8F0',
            background: '#FFFFFF', color: '#475569', cursor: 'pointer',
          }}>
            <FileDown size={14} /> Export PDF
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', fontSize: 12, fontWeight: 600,
            borderRadius: 6, border: '1px solid #E2E8F0',
            background: '#FFFFFF', color: '#475569', cursor: 'pointer',
          }}>
            <RefreshCw size={14} /> Sync
          </button>
        </div>
      </div>

      {/* Fix 25: AI Summary Block with shadow */}
      {events.length > 0 && (
        <div
          className="mb-5 mt-4"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderLeft: '4px solid #2563EB',
            borderRadius: '2px 8px 8px 2px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ padding: '16px 24px' }}>
            <p style={{ fontSize: 14.5, fontWeight: 600, color: '#0F172A', lineHeight: 1.5, margin: 0 }}>
              {summaryLead}
            </p>
            {summaryBody && (
              <p style={{ fontSize: 14, fontWeight: 400, color: '#334155', lineHeight: 1.5, margin: '4px 0 0' }}>
                {summaryBody}
              </p>
            )}
          </div>
        </div>
      )}

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

      {/* Table — Fix 26: pass periodType for quarterly month dividers */}
      <ProductionEventsTable
        events={filteredEvents}
        loading={eventsLoading}
        expandedId={expandedId}
        onToggleExpand={handleToggleExpand}
        periodType={periodType}
      />

      {/* Fix 40: Print styles */}
      <style>{`
        @media print {
          nav, .sidebar, .controls-row, .btn-outline, .regen-btn, .filter-group { display: none !important; }
          tr[style*="display: none"] { display: table-row !important; }
          body { font-size: 12px; }
        }
      `}</style>
    </div>
  );
}
