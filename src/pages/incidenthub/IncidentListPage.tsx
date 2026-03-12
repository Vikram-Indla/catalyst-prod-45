/**
 * IncidentListPage — V12 Redesigned Incident List
 * Catalyst V12 Hybrid Precision | 36px rows | 3-color lozenges
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Search, Download, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useIncidentListView, useIncidentStats } from '@/hooks/useIncidentHub';
import { StatusLozenge } from './components/StatusLozenge';
import { SeverityChip } from './components/SeverityChip';
import { PriorityChip } from './components/PriorityChip';
import { NewIncidentModal } from './components/NewIncidentModal';
import { formatDistanceToNow } from 'date-fns';

export default function IncidentListPage() {
  const navigate = useNavigate();
  const { data: incidents, isLoading } = useIncidentListView();
  const stats = useIncidentStats();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);

  const filtered = useMemo(() => {
    if (!incidents) return [];
    let list = [...incidents];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.incident_key?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter(i => i.status === statusFilter);
    }
    return list;
  }, [incidents, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  };

  const getSlaDisplay = (item: any) => {
    if (item.resolution_breached) return { text: 'BREACHED', color: '#DC2626' };
    if (item.response_breached) return { text: '\u26A0 WARNING', color: '#D97706' };
    if (item.resolution_due_at) {
      const remaining = new Date(item.resolution_due_at).getTime() - Date.now();
      if (remaining <= 0) return { text: 'BREACHED', color: '#DC2626' };
      if (remaining <= 3600000) return { text: '\u26A0 WARNING', color: '#D97706' };
      const hours = Math.floor(remaining / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      return { text: `${hours}h ${mins}m`, color: '#16A34A' };
    }
    return { text: '\u2014', color: '#94A3B8' };
  };

  const statusChips = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'triage', label: 'Triage' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'to_committee', label: 'Committee' },
    { key: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, backgroundColor: '#FEE2E2' }}>
              <AlertTriangle size={18} style={{ color: '#DC2626' }} />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Incident List</h1>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748B' }}>
                Ministry of Industry &middot; {stats.active} open incidents
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5" style={{ borderRadius: 6 }}>
              <Download size={14} /> Export
            </Button>
            <Button size="sm" className="gap-1.5" style={{ backgroundColor: '#2563EB', borderRadius: 6 }} onClick={() => setShowCreateModal(true)}>
              <Plus size={14} /> New Incident
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Critical (SEV-1)', value: stats.sev1, accent: '#DC2626' },
            { label: 'High (SEV-2)', value: stats.sev2, accent: '#D97706' },
            { label: 'Active Incidents', value: stats.active, accent: '#2563EB' },
            { label: 'Committee Pending', value: stats.committeePending, accent: '#64748B' },
            { label: 'Resolved (7d)', value: stats.resolvedWeek, accent: '#16A34A' },
          ].map(s => (
            <div key={s.label} className="p-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6 }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748B', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative" style={{ minWidth: 240 }}>
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <Input
              placeholder="Search incidents, keys..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-8 text-xs"
              style={{ borderRadius: 4, fontFamily: 'Inter, sans-serif' }}
            />
          </div>
          <div className="flex items-center gap-1">
            {statusChips.map(c => (
              <button
                key={c.key}
                onClick={() => { setStatusFilter(c.key); setPage(1); }}
                className="px-2.5 py-1 text-xs transition-colors"
                style={{
                  borderRadius: 4,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: statusFilter === c.key ? 650 : 400,
                  backgroundColor: statusFilter === c.key ? '#EFF6FF' : 'transparent',
                  color: statusFilter === c.key ? '#2563EB' : '#64748B',
                  border: statusFilter === c.key ? '1px solid #BFDBFE' : '1px solid transparent',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 pb-6">
        <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, overflow: 'hidden' }}>
          {/* Table Header */}
          <div className="grid items-center" style={{
            gridTemplateColumns: '36px 130px 1fr 80px 70px 105px 90px 90px 130px 100px',
            backgroundColor: '#F1F5F9',
            height: 36,
            borderBottom: '0.75px solid rgba(15,23,42,0.06)',
          }}>
            <div className="flex justify-center"><Checkbox className="h-3.5 w-3.5" /></div>
            {['KEY', 'TITLE', 'SEV', 'PRI', 'STATUS', 'PROJECT', 'ASSIGNEE', 'SLA', 'REPORTED'].map(h => (
              <div key={h} className="px-3" style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
                color: '#64748B',
              }}>{h}</div>
            ))}
          </div>

          {/* Loading */}
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid items-center" style={{
              gridTemplateColumns: '36px 130px 1fr 80px 70px 105px 90px 90px 130px 100px',
              height: 36,
              borderBottom: '0.75px solid rgba(15,23,42,0.06)',
            }}>
              {Array.from({ length: 10 }).map((_, j) => (
                <div key={j} className="px-3"><Skeleton className="h-3 w-full" /></div>
              ))}
            </div>
          ))}

          {/* Empty State */}
          {!isLoading && paginated.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle size={32} style={{ color: '#CBD5E1' }} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#94A3B8', marginTop: 8 }}>
                {search ? 'No incidents match your search' : 'No incidents found. Create your first incident.'}
              </p>
              {!search && (
                <Button size="sm" className="mt-3" style={{ backgroundColor: '#2563EB', borderRadius: 6 }} onClick={() => setShowCreateModal(true)}>
                  <Plus size={14} className="mr-1" /> Create Incident
                </Button>
              )}
            </div>
          )}

          {/* Data Rows */}
          {paginated.map(item => {
            const sla = getSlaDisplay(item);
            return (
              <div
                key={item.id}
                className="grid items-center cursor-pointer transition-colors"
                style={{
                  gridTemplateColumns: '36px 130px 1fr 80px 70px 105px 90px 90px 130px 100px',
                  height: 36,
                  maxHeight: 36,
                  borderBottom: '0.75px solid rgba(15,23,42,0.06)',
                  backgroundColor: '#FFFFFF',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(15,23,42,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                onClick={() => navigate(`/incident-hub/view/${item.id}`)}
              >
                <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    className="h-3.5 w-3.5"
                    checked={selectedIds.has(item.id!)}
                    onCheckedChange={() => toggleSelect(item.id!)}
                  />
                </div>
                <div className="px-3">
                  <span
                    className="inline-flex items-center px-1.5"
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#2563EB',
                      backgroundColor: '#EFF6FF',
                      borderRadius: 3,
                    }}
                  >
                    {item.incident_key || '\u2014'}
                  </span>
                </div>
                <div className="px-3 truncate" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 650, color: '#0F172A' }}>
                  {item.title || '\u2014'}
                </div>
                <div className="px-3"><SeverityChip severity={item.severity || 'SEV4'} /></div>
                <div className="px-3"><PriorityChip priority={item.priority || 'P4'} /></div>
                <div className="px-3"><StatusLozenge status={item.status || 'open'} /></div>
                <div className="px-3 truncate" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748B' }}>
                  {'\u2014'}
                </div>
                <div className="px-3 truncate" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#334155' }}>
                  {item.assignee_name || 'Unassigned'}
                </div>
                <div className="px-3" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: sla.color }}>
                  {sla.text}
                </div>
                <div className="px-3" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#64748B' }}>
                  {formatDate(item.created_at)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-3">
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748B' }}>
              Showing {(page - 1) * perPage + 1}&ndash;{Math.min(page * perPage, filtered.length)} of {filtered.length} incidents
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: page === p ? 650 : 400,
                    backgroundColor: page === p ? '#2563EB' : 'transparent',
                    color: page === p ? '#FFFFFF' : '#64748B',
                    border: page === p ? 'none' : '1px solid rgba(15,23,42,0.12)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <NewIncidentModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
