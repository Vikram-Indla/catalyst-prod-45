/**
 * IncidentKanbanPage — V12 Kanban board grouped by status
 * Dot + label column headers (NOT lozenges)
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIncidentListView } from '@/hooks/useIncidentHub';
import { SeverityChip } from './components/SeverityChip';
import { NewIncidentModal } from './components/NewIncidentModal';
import { Skeleton } from '@/components/ui/skeleton';

const COLUMNS = [
  { key: 'triage', label: 'TRIAGE', dotColor: '#DFE1E6' },
  { key: 'open', label: 'OPEN', dotColor: '#DFE1E6' },
  { key: 'in_progress', label: 'IN PROGRESS', dotColor: '#DEEBFF' },
  { key: 'to_committee', label: 'COMMITTEE', dotColor: '#DEEBFF' },
  { key: 'resolved', label: 'RESOLVED', dotColor: '#E3FCEF' },
];

export default function IncidentKanbanPage() {
  const navigate = useNavigate();
  const { data: incidents, isLoading } = useIncidentListView();
  const [showCreate, setShowCreate] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    COLUMNS.forEach(c => { map[c.key] = []; });
    incidents?.forEach(i => {
      const status = i.status || 'open';
      if (map[status]) map[status].push(i);
      else if (map.open) map.open.push(i);
    });
    return map;
  }, [incidents]);

  if (isLoading) {
    return <div className="flex-1 p-6" style={{ backgroundColor: '#FFFFFF' }}><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, backgroundColor: '#EFF6FF' }}>
              <LayoutGrid size={18} style={{ color: '#2563EB' }} />
            </div>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Kanban Board</h1>
          </div>
          <Button size="sm" className="gap-1.5" style={{ backgroundColor: '#2563EB', borderRadius: 6 }} onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Incident
          </Button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto px-6 pb-6">
        <div className="flex gap-3" style={{ minHeight: '100%' }}>
          {COLUMNS.map(col => (
            <div key={col.key} className="flex flex-col shrink-0" style={{ width: 260 }}>
              {/* Column Header */}
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: col.dotColor, display: 'inline-block', border: col.dotColor === '#DFE1E6' ? '1px solid #94A3B8' : 'none' }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>
                  {col.label}
                </span>
                <span className="ml-auto px-1.5" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: '#64748B', backgroundColor: '#F1F5F9', borderRadius: 3 }}>
                  {grouped[col.key]?.length || 0}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 overflow-y-auto" style={{ backgroundColor: '#F1F5F9', borderRadius: 6, padding: 8, minHeight: 200 }}>
                {grouped[col.key]?.length === 0 && (
                  <p className="text-center py-8" style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#94A3B8' }}>No incidents</p>
                )}
                {grouped[col.key]?.map((item: any) => {
                  const isBreached = item.resolution_breached;
                  return (
                    <div
                      key={item.id}
                      className="cursor-pointer transition-all"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: `1px solid ${isBreached ? '#FECACA' : 'rgba(15,23,42,0.12)'}`,
                        borderRadius: 6,
                        padding: 10,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                      onClick={() => navigate(`/incident-hub/view/${item.id}`)}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#2563EB' }}>
                          {item.incident_key}
                        </span>
                        <SeverityChip severity={item.severity || 'SEV4'} />
                      </div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 650, color: '#0F172A', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 20, height: 20, backgroundColor: '#E2E8F0', fontSize: 9, fontWeight: 650, color: '#475569' }}>
                          {(item.assignee_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748B' }}>{item.assignee_name || 'Unassigned'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <NewIncidentModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
