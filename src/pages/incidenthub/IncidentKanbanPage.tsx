/**
 * IncidentKanbanPage — V12 Kanban board grouped by status
 * Dot + label column headers (NOT lozenges)
 * NOCTURNE dark mode support via useTheme
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIncidentListView } from '@/hooks/useIncidentHub';
import { useTheme } from '@/hooks/useTheme';
import { SeverityChip } from './components/SeverityChip';
import { NewIncidentModal } from './components/NewIncidentModal';
import { Skeleton } from '@/components/ui/skeleton';

const COLUMNS = [
  { key: 'triage', label: 'TRIAGE', dotColor: '#DFE1E6' },
  { key: 'open', label: 'OPEN', dotColor: '#DFE1E6' },
  { key: 'in_progress', label: 'IN PROGRESS', dotColor: '#0C66E4' },
  { key: 'to_committee', label: 'COMMITTEE', dotColor: '#0C66E4' },
  { key: 'resolved', label: 'RESOLVED', dotColor: '#1B7F37' },
];

export default function IncidentKanbanPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
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

  // NOCTURNE tokens
  const pageBg = isDark ? '#0A0A0A' : '#FFFFFF';
  const surfaceBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const laneBg = isDark ? '#1A1A1A' : '#1A1A1A';
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)';
  const textPrimary = isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)';
  const textSecondary = isDark ? '#A1A1A1' : 'rgba(237,237,237,0.40)';
  const textMuted = isDark ? '#878787' : 'rgba(237,237,237,0.40)';
  const countBg = isDark ? '#1A1A1A' : '#1A1A1A';
  const avatarBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)';
  const avatarText = isDark ? '#A1A1A1' : '#475569';

  if (isLoading) {
    return <div className="flex-1 p-6" style={{ backgroundColor: pageBg }}><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: pageBg }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, backgroundColor: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(59,130,246,0.06)' }}>
              <LayoutGrid size={18} style={{ color: '#2563EB' }} />
            </div>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: textPrimary }}>Kanban Board</h1>
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
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: col.dotColor, display: 'inline-block', border: col.dotColor === '#DFE1E6' ? `1px solid ${isDark ? '#878787' : 'rgba(237,237,237,0.40)'}` : 'none' }} />
                <span style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: textSecondary }}>
                  {col.label}
                </span>
                <span className="ml-auto px-1.5" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: textSecondary, backgroundColor: countBg, borderRadius: 3 }}>
                  {grouped[col.key]?.length || 0}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 overflow-y-auto" style={{ backgroundColor: laneBg, borderRadius: 6, padding: 8, minHeight: 200 }}>
                {grouped[col.key]?.length === 0 && (
                  <p className="text-center py-8" style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 11, color: textMuted }}>No incidents</p>
                )}
                {grouped[col.key]?.map((item: any) => {
                  const isBreached = item.resolution_breached;
                  return (
                    <div
                      key={item.id}
                      className="cursor-pointer transition-all"
                      style={{
                        backgroundColor: cardBg,
                        border: `1px solid ${isBreached ? (isDark ? 'rgba(248,113,113,0.4)' : '#FECACA') : borderColor}`,
                        borderRadius: 6,
                        padding: 10,
                        boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                      onClick={() => navigate(`/incident-hub/view/${item.id}`)}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {item.type_icon_url ? (
                          <img src={item.type_icon_url} alt="Incident" style={{ width: 14, height: 14, flexShrink: 0 }} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
                            <path fill="#FF5630" fillRule="evenodd" d="M4.78545267,10 L11.2145473,10 L10.5007848,8 L5.49921516,8 L4.78545267,10 Z M4,11 C3.44771525,11 3,11.4477153 3,12 L3,13 L13,13 L13,12 C13,11.4477153 12.5522847,11 12,11 L4,11 Z M5.8560964,7 L10.1439036,7 L8.94181993,3.63169838 C8.8409899,3.34916733 8.61864892,3.12682636 8.33611787,3.02599632 C7.81596508,2.84036355 7.24381284,3.1115456 7.05818007,3.63169838 L5.8560964,7 Z M2,0 L14,0 C15.1045695,-2.02906125e-16 16,0.8954305 16,2 L16,14 C16,15.1045695 15.1045695,16 14,16 L2,16 C0.8954305,16 1.3527075e-16,15.1045695 0,14 L0,2 C-1.3527075e-16,0.8954305 0.8954305,2.02906125e-16 2,0 Z"/>
                          </svg>
                        )}
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isDark ? '#93C5FD' : '#2563EB' }}>
                          {item.incident_key}
                        </span>
                        <SeverityChip severity={item.severity || 'SEV4'} />
                      </div>
                      <p style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, fontWeight: 650, color: textPrimary, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 20, height: 20, backgroundColor: avatarBg, fontSize: 9, fontWeight: 650, color: avatarText }}>
                          {(item.assignee_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 11, color: textSecondary }}>{item.assignee_name || 'Unassigned'}</span>
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
