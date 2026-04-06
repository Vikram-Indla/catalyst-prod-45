/**
 * IncidentListPage — V13 with Avatars, Reporter, Updated, Parent columns
 * Catalyst V12 Hybrid Precision | 36px rows | 3-color lozenges
 * NOCTURNE dark mode support via useTheme
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Search, Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useIncidentListView, useIncidentStats } from '@/hooks/useIncidentHub';
import { useTheme } from '@/hooks/useTheme';
import { StatusLozenge } from './components/StatusLozenge';
import { SeverityChip } from './components/SeverityChip';
import { PriorityChip } from './components/PriorityChip';
import { NewIncidentModal } from './components/NewIncidentModal';

const GRID_COLS = '36px 110px 1fr 64px 54px 96px 86px 130px 130px 90px 90px 100px';

export default function IncidentListPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
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

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const statusChips = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'triage', label: 'Triage' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'to_committee', label: 'Committee' },
    { key: 'resolved', label: 'Resolved' },
  ];

  // NOCTURNE color helpers
  const pageBg = isDark ? '#0A0A0A' : '#FFFFFF';
  const surfaceBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const elevatedBg = isDark ? '#1A1A1A' : '#F1F5F9';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)';
  const borderSubtle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)';
  const textPrimary = isDark ? '#EDEDED' : '#0F172A';
  const textSecondary = isDark ? '#A1A1A1' : '#64748B';
  const textMuted = isDark ? '#878787' : '#94A3B8';
  const textBody = isDark ? '#A1A1A1' : '#334155';
  const rowBg = isDark ? '#0A0A0A' : '#FFFFFF';
  const rowHoverBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)';

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: pageBg }}>
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-md" style={{ width: 32, height: 32, backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : '#FEE2E2' }}>
              <AlertTriangle size={18} style={{ color: '#DC2626' }} />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: textPrimary }}>Incident List</h1>
              <p style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, color: textSecondary }}>
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
            { label: 'Active Incidents', value: stats.active, accent: isDark ? '#60A5FA' : '#2563EB' },
            { label: 'Committee Pending', value: stats.committeePending, accent: textSecondary },
            { label: 'Resolved (7d)', value: stats.resolvedWeek, accent: '#16A34A' },
          ].map(s => (
            <div key={s.label} className="p-3" style={{ backgroundColor: surfaceBg, border: `1px solid ${borderColor}`, borderRadius: 6 }}>
              <div style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 11, color: textSecondary, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative" style={{ minWidth: 240 }}>
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
            <Input
              placeholder="Search incidents, keys..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-8 text-xs"
              style={{ borderRadius: 4, fontFamily: 'Geist, -apple-system, sans-serif' }}
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
                  fontFamily: 'Geist, -apple-system, sans-serif',
                  fontWeight: statusFilter === c.key ? 650 : 400,
                  backgroundColor: statusFilter === c.key ? (isDark ? 'rgba(37,99,235,0.16)' : '#EFF6FF') : 'transparent',
                  color: statusFilter === c.key ? (isDark ? '#93C5FD' : '#2563EB') : textSecondary,
                  border: statusFilter === c.key ? `1px solid ${isDark ? 'rgba(37,99,235,0.3)' : '#BFDBFE'}` : '1px solid transparent',
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
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: 6, overflow: 'hidden' }}>
          {/* Table Header */}
          <div className="grid items-center" style={{
            gridTemplateColumns: GRID_COLS,
            backgroundColor: elevatedBg,
            height: 50,
            borderBottom: `0.75px solid ${borderSubtle}`,
          }}>
            <div className="flex justify-center"><Checkbox className="h-3.5 w-3.5" /></div>
            {['KEY', 'TITLE', 'SEV', 'PRI', 'STATUS', 'PROJECT', 'ASSIGNEE', 'REPORTER', 'UPDATED', 'PARENT', 'REPORTED'].map(h => (
              <div key={h} className="px-2" style={{
                fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: textSecondary,
              }}>{h}</div>
            ))}
          </div>

          {/* Loading */}
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid items-center" style={{
              gridTemplateColumns: GRID_COLS, height: 50,
              borderBottom: `0.75px solid ${borderSubtle}`,
            }}>
              {Array.from({ length: 12 }).map((_, j) => (
                <div key={j} className="px-2"><Skeleton className="h-3 w-full" /></div>
              ))}
            </div>
          ))}

          {/* Empty State */}
          {!isLoading && paginated.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle size={32} style={{ color: textMuted }} />
              <p style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 13, color: textMuted, marginTop: 8 }}>
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
          {paginated.map(item => (
            <div
              key={item.id}
              className="grid items-center cursor-pointer transition-colors"
              style={{
                gridTemplateColumns: GRID_COLS,
                height: 50, maxHeight: 50,
                borderBottom: `0.75px solid ${borderSubtle}`,
                backgroundColor: rowBg,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = rowHoverBg)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = rowBg)}
              onClick={() => navigate(`/incident-hub/view/${item.id}`)}
            >
              <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                <Checkbox className="h-3.5 w-3.5" checked={selectedIds.has(item.id!)} onCheckedChange={() => toggleSelect(item.id!)} />
              </div>
              {/* Key */}
              <div className="px-2 flex items-center gap-1.5">
                {item.type_icon_url ? (
                  <img src={item.type_icon_url} alt="" style={{ width: 14, height: 14, flexShrink: 0 }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
                    <path fill="#FF5630" fillRule="evenodd" d="M4.78545267,10 L11.2145473,10 L10.5007848,8 L5.49921516,8 L4.78545267,10 Z M4,11 C3.44771525,11 3,11.4477153 3,12 L3,13 L13,13 L13,12 C13,11.4477153 12.5522847,11 12,11 L4,11 Z M5.8560964,7 L10.1439036,7 L8.94181993,3.63169838 C8.8409899,3.34916733 8.61864892,3.12682636 8.33611787,3.02599632 C7.81596508,2.84036355 7.24381284,3.1115456 7.05818007,3.63169838 L5.8560964,7 Z M2,0 L14,0 C15.1045695,-2.02906125e-16 16,0.8954305 16,2 L16,14 C16,15.1045695 15.1045695,16 14,16 L2,16 C0.8954305,16 1.3527075e-16,15.1045695 0,14 L0,2 C-1.3527075e-16,0.8954305 0.8954305,2.02906125e-16 2,0 Z"/>
                  </svg>
                )}
                <span className="inline-flex items-center px-1" style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
                  color: isDark ? '#93C5FD' : '#2563EB', backgroundColor: isDark ? 'rgba(37,99,235,0.16)' : '#EFF6FF', borderRadius: 4,
                }}>
                  {item.incident_key || '\u2014'}
                </span>
              </div>
              {/* Title */}
              <div className="px-2 truncate" style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 13, fontWeight: 650, color: textPrimary }}>
                {item.title || '\u2014'}
              </div>
              <div className="px-2"><SeverityChip severity={item.severity || 'SEV4'} /></div>
              <div className="px-2"><PriorityChip priority={item.priority || 'P4'} /></div>
              <div className="px-2"><StatusLozenge status={item.status || 'open'} /></div>
              {/* Project */}
              <div className="px-2 truncate" style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, color: textSecondary }}>
                {item.project_name || '\u2014'}
              </div>
              {/* Assignee with Avatar */}
              <div className="px-2 flex items-center gap-1.5 min-w-0">
                {item.assignee_name ? (
                  <>
                    <Avatar size="xs" className="shrink-0">
                      <AvatarFallback name={item.assignee_name} className="text-[9px]">{getInitials(item.assignee_name)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate" style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, color: textBody }}>
                      {item.assignee_name}
                    </span>
                  </>
                ) : (
                  <span style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, color: textMuted }}>Unassigned</span>
                )}
              </div>
              {/* Reporter with Avatar */}
              <div className="px-2 flex items-center gap-1.5 min-w-0">
                {item.reporter_name ? (
                  <>
                    <Avatar size="xs" className="shrink-0">
                      <AvatarFallback name={item.reporter_name} className="text-[9px]">{getInitials(item.reporter_name)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate" style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, color: textBody }}>
                      {item.reporter_name}
                    </span>
                  </>
                ) : (
                  <span style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, color: textMuted }}>&mdash;</span>
                )}
              </div>
              {/* Updated */}
              <div className="px-2" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textSecondary }}>
                {formatDate(item.updated_at)}
              </div>
              {/* Parent */}
              <div className="px-2 truncate" style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 11 }}>
                {item.parent_key ? <span style={{ color: isDark ? '#93C5FD' : '#2563EB' }}>{item.parent_key}</span> : '\u2014'}
              </div>
              {/* Reported */}
              <div className="px-2" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textSecondary }}>
                {formatDate(item.created_at)}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-3">
            <span style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, color: textSecondary }}>
              Showing {(page - 1) * perPage + 1}&ndash;{Math.min(page * perPage, filtered.length)} of {filtered.length} incidents
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 28, height: 28, borderRadius: 4, fontSize: 12,
                    fontFamily: 'Geist, -apple-system, sans-serif',
                    fontWeight: page === p ? 650 : 400,
                    backgroundColor: page === p ? '#2563EB' : 'transparent',
                    color: page === p ? '#FFFFFF' : textSecondary,
                    border: page === p ? 'none' : `1px solid ${borderColor}`,
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
