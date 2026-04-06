import React, { useState, useMemo } from 'react';
import { Search, Plus, List, Columns, RefreshCw } from 'lucide-react';
import { useChanges, useReleases } from '@/hooks/useReleaseHub';
import { RH, CHG_STATUS_LABELS } from '@/constants/releasehub.design';
import { useTheme } from '@/hooks/useTheme';
import { StatusLozenge } from '@/components/releasehub/StatusLozenge';
import { SourceBadge } from '@/components/releasehub/SourceBadge';
import { RiskBadge } from '@/components/releasehub/RiskBadge';
import { DeployResultBadge } from '@/components/releasehub/DeployResultBadge';
import { ChgDrawer } from '@/components/releasehub/ChgDrawer';
import { CreateChgModal } from '@/components/releasehub/CreateChgModal';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { useSearchParams } from 'react-router-dom';

function mapRisk(risk: string) {
  const r = risk?.toLowerCase() || 'standard';
  if (r === 'low' || r === 'medium') return 'standard';
  if (r === 'critical') return 'emergency';
  return r;
}

function CustomDropdown({ label, value, options, onChange, isDark }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; isDark?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="h-9 px-3 rounded-md text-[13px] font-medium flex items-center gap-1.5 min-w-[140px]"
        style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)'}`, background: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#475569' }}>
        {options.find(o => o.value === value)?.label || label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-48 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto"
            style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)'}` }}>
            {options.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className="w-full px-3 h-9 text-left text-[13px] font-medium"
                style={{ color: value === o.value ? '#2563EB' : (isDark ? '#A1A1A1' : '#475569') }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#292929' : '#F8FAFC')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AllChangesPage() {
  const { isDark } = useTheme();
  const { data: changes = [], isLoading, error, refetch } = useChanges();
  const { data: releases = [] } = useReleases();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const statusFilter = params.get('status') || 'all';
  const releaseFilter = params.get('release') || 'all';
  const view = (params.get('view') || 'list') as 'list' | 'kanban';
  const [selectedChg, setSelectedChg] = useState<any>(null);
  const [showCreateChg, setShowCreateChg] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'all' || value === 'list') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    return changes.filter((c: any) => {
      if (search && !c.chg_number?.toLowerCase().includes(search.toLowerCase()) && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (releaseFilter !== 'all' && c.release_id !== releaseFilter) return false;
      return true;
    });
  }, [changes, search, statusFilter, releaseFilter]);

  const statusOptions = [{ value: 'all', label: 'All Statuses' }, ...Object.entries(CHG_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))];
  const releaseOptions = [{ value: 'all', label: 'All Releases' }, ...releases.map((r: any) => ({ value: r.id, label: r.name }))];

  const hasFilters = search || statusFilter !== 'all' || releaseFilter !== 'all';

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c: any) => c.id)));
  };

  return (
    <div style={{ background: isDark ? '#0A0A0A' : '#FFFFFF', minHeight: '100%', padding: '24px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: isDark ? '#EDEDED' : RH.ink1 }}>All Changes</h1>
          <p className="text-[13px]" style={{ fontFamily: RH.fontBody, color: isDark ? '#878787' : '#64748B' }}>Every deployment change — past, present & future</p>
        </div>
        <button onClick={() => setShowCreateChg(true)}
          className="h-9 px-4 rounded-md text-white text-[13px] font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(to bottom, #3B82F6, #2563EB)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
          <Plus size={14} /> New Change
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
            <input type="text" placeholder="Search changes..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-9 w-[280px] pl-9 pr-3 rounded text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)'}`, background: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#EDEDED' : '#0F172A' }} />
          </div>
          <CustomDropdown label="Status" value={statusFilter} options={statusOptions} onChange={v => setParam('status', v)} isDark={isDark} />
          <CustomDropdown label="Release" value={releaseFilter} options={releaseOptions} onChange={v => setParam('release', v)} isDark={isDark} />
        </div>
        <div className="flex items-center gap-1 rounded-md p-0.5" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)'}`, background: isDark ? '#1A1A1A' : '#FFFFFF' }}>
          <button onClick={() => setParam('view', 'list')}
            className="h-7 px-2.5 rounded flex items-center gap-1 text-[11px] font-medium"
            style={view === 'list' ? { background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', color: '#2563EB' } : { color: isDark ? '#878787' : '#94A3B8' }}>
            <List size={12} /> List
          </button>
          <button onClick={() => setParam('view', 'kanban')}
            className="h-7 px-2.5 rounded flex items-center gap-1 text-[11px] font-medium"
            style={view === 'kanban' ? { background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', color: '#2563EB' } : { color: isDark ? '#878787' : '#94A3B8' }}>
            <Columns size={12} /> Kanban
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonRows count={5} />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : changes.length === 0 ? (
        <EmptyState icon={RefreshCw} title="No changes yet" subtitle="Changes will appear here once created."
          actions={[{ label: '+ New Change', onClick: () => setShowCreateChg(true), variant: 'primary' }]} />
      ) : filtered.length === 0 && hasFilters ? (
        <EmptyState icon={Search} title="No changes match your filters" subtitle="Try adjusting your search or filter criteria."
          actions={[{ label: 'Clear filters', onClick: () => { setSearch(''); setParams({}); }, variant: 'ghost' }]} />
      ) : view === 'kanban' ? (
        <KanbanView changes={filtered} onSelect={setSelectedChg} isDark={isDark} />
      ) : (
        /* V12 Table */
        <div className="rounded overflow-hidden" style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)'}` }}>
          <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }} role="table">
            <thead>
              <tr style={{ background: isDark ? '#1A1A1A' : '#F1F5F9' }}>
                <th className="w-[40px] px-3 py-0 h-[50px] text-center">
                  <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                {['KEY', 'TITLE', 'STATUS', 'RISK', 'RELEASE', 'SOURCE', 'SIGN-OFFS'].map(h => (
                  <th key={h} className="px-3 py-0 h-[50px] text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: isDark ? '#878787' : '#64748B' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const relName = c.release_name || releases.find((r: any) => r.id === c.release_id)?.name;
                return (
                  <tr key={c.id} onClick={() => setSelectedChg(c)}
                    className="cursor-pointer"
                    style={{ height: 50, background: isDark ? '#1A1A1A' : '#FFFFFF', transition: 'background 120ms', borderBottom: `0.75px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)'}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#1A1A1A' : 'rgba(15,23,42,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isDark ? '#1A1A1A' : '#FFFFFF')}>
                    <td className="px-3 py-0 text-center" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-0">
                      <span className="text-[13px] font-medium text-[#2563EB] hover:underline" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</span>
                    </td>
                    <td className="px-3 py-0 max-w-[300px]">
                      <span className="text-[13px] font-medium truncate block" style={{ color: isDark ? '#EDEDED' : '#0F172A' }}>{c.title}</span>
                    </td>
                    <td className="px-3 py-0"><StatusLozenge status={c.status} /></td>
                    <td className="px-3 py-0"><RiskBadge risk={mapRisk(c.risk_level)} /></td>
                    <td className="px-3 py-0">
                      {relName ? <span className="text-[12px] font-medium text-[#2563EB]">{relName}</span> : <span style={{ color: isDark ? '#878787' : '#94A3B8' }}>—</span>}
                    </td>
                    <td className="px-3 py-0"><SourceBadge source={c.source} /></td>
                    <td className="px-3 py-0">
                      <span className="text-[12px]" style={{ fontFamily: RH.fontMono, color: isDark ? '#878787' : '#64748B' }}>
                        {c.pending_signoffs > 0 ? `${c.pending_signoffs} pending` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedChg && <ChgDrawer change={selectedChg} onClose={() => setSelectedChg(null)} />}
      {showCreateChg && <CreateChgModal onClose={() => setShowCreateChg(false)} />}
    </div>
  );
}

function KanbanView({ changes, onSelect, isDark }: { changes: any[]; onSelect: (c: any) => void; isDark?: boolean }) {
  const columns = [
    { key: 'new', label: 'NEW' },
    { key: 'in_uat', label: 'IN UAT' },
    { key: 'in_beta', label: 'IN BETA' },
    { key: 'in_production', label: 'IN PRODUCTION' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {columns.map(col => {
        const items = changes.filter((c: any) => c.status === col.key);
        return (
          <div key={col.key} className="rounded-lg" style={{ background: isDark ? '#1A1A1A' : '#F1F5F9', minHeight: 200 }}>
            <div className="px-3 py-2 flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: isDark ? '#878787' : '#64748B' }}>{col.label}</span>
              <span className="text-[10px] font-bold rounded-full px-1.5" style={{ color: isDark ? '#878787' : '#94A3B8', background: isDark ? '#1A1A1A' : '#FFFFFF' }}>{items.length}</span>
            </div>
            <div className="px-2 pb-2 space-y-2">
              {items.map((c: any) => (
                <button key={c.id} onClick={() => onSelect(c)}
                  className="w-full rounded-md p-3 text-left hover:shadow-sm transition-shadow"
                  style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)'}` }}>
                  <span className="text-[11px] font-medium text-[#2563EB] block mb-1" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</span>
                  <span className="text-[13px] font-medium block truncate" style={{ color: isDark ? '#EDEDED' : '#0F172A' }}>{c.title}</span>
                  <div className="flex items-center gap-2 mt-2">
                    <RiskBadge risk={c.risk_level?.toLowerCase() === 'low' || c.risk_level?.toLowerCase() === 'medium' ? 'standard' : c.risk_level} />
                    <SourceBadge source={c.source} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
