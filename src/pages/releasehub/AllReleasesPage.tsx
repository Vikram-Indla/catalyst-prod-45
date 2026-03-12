import React, { useState } from 'react';
import { Search, LayoutGrid, List, Plus, Package } from 'lucide-react';
import { useReleases } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { StatusLozenge } from '@/components/releasehub/StatusLozenge';
import { SourceBadge } from '@/components/releasehub/SourceBadge';
import { ReleaseDrawer } from '@/components/releasehub/ReleaseDrawer';
import { CreateReleaseModal } from '@/components/releasehub/CreateReleaseModal';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';

function mapStatus(status: string) {
  if (status === 'todo') return 'planning';
  if (status === 'done') return 'released';
  return status;
}

export default function AllReleasesPage() {
  const { data: releases = [], isLoading, error, refetch } = useReleases();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = releases.filter((r: any) => {
    const mapped = mapStatus(r.status);
    if (filter !== 'all' && mapped !== filter) return false;
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: releases.length,
    planning: releases.filter((r: any) => mapStatus(r.status) === 'planning').length,
    in_progress: releases.filter((r: any) => mapStatus(r.status) === 'in_progress').length,
    released: releases.filter((r: any) => mapStatus(r.status) === 'released').length,
  };

  const accentColor = (status: string) => {
    const s = mapStatus(status);
    if (s === 'in_progress') return '#2563EB';
    if (s === 'released') return '#16A34A';
    if (s === 'planning') return '#0747A6';
    return 'rgba(15,23,42,0.12)';
  };

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100%', padding: '24px' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>All Releases</h1>
          <p className="text-[13px] text-[#64748B]" style={{ fontFamily: RH.fontBody }}>Manage and track all releases</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="h-9 px-4 rounded-md text-white text-[13px] font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(to bottom, #3B82F6, #2563EB)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
          <Plus size={14} /> New Release
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { key: 'all', label: 'All', count: counts.all },
          { key: 'planning', label: 'Planning', count: counts.planning },
          { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
          { key: 'released', label: 'Released', count: counts.released },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`h-8 px-3 rounded-md text-[12px] font-semibold flex items-center gap-1.5 border transition-colors ${filter === s.key ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[rgba(15,23,42,0.12)] bg-white hover:bg-[#F8FAFC] text-[#475569]'}`}>
            {s.label}
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold bg-[#F1F5F9] text-[#475569]">{s.count}</span>
          </button>
        ))}
      </div>

      {/* Search + View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input type="text" placeholder="Search releases..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-9 w-64 pl-9 pr-3 rounded border border-[rgba(15,23,42,0.12)] bg-white text-[13px] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
        </div>
        <div className="flex items-center gap-1 border border-[rgba(15,23,42,0.12)] rounded-md p-0.5 bg-white">
          <button onClick={() => setView('cards')} className={`h-7 w-7 rounded flex items-center justify-center ${view === 'cards' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#94A3B8] hover:text-[#475569]'}`}><LayoutGrid size={14} /></button>
          <button onClick={() => setView('table')} className={`h-7 w-7 rounded flex items-center justify-center ${view === 'table' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#94A3B8] hover:text-[#475569]'}`}><List size={14} /></button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        view === 'cards' ? <SkeletonRows variant="card" count={6} /> : <SkeletonRows count={6} />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : releases.length === 0 ? (
        <EmptyState icon={Package} title="No releases created yet" subtitle="Releases help you group and track deployment changes across your products."
          actions={[{ label: '+ New Release', onClick: () => setShowCreate(true), variant: 'primary' }]} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No releases match your filters" subtitle="Try adjusting your search or filter criteria."
          actions={[{ label: 'Clear filters', onClick: () => { setSearch(''); setFilter('all'); }, variant: 'ghost' }]} />
      ) : view === 'cards' ? (
        <div className="grid grid-cols-3 gap-3.5">
          {filtered.map((r: any) => (
            <button key={r.id} onClick={() => setSelectedRelease(r)}
              className="bg-white rounded-md border border-[rgba(15,23,42,0.12)] overflow-hidden text-left hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all relative group"
              style={{ borderRadius: 6 }}>
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accentColor(r.status), borderRadius: '6px 0 0 6px' }} />
              <div className="p-4 pl-5">
                {/* Title + Key */}
                <h3 className="text-[15px] font-bold mb-1" style={{ fontFamily: RH.fontDisplay, color: RH.ink1, fontWeight: 650 }}>{r.name}</h3>
                {r.jira_key && <span className="text-[11px] text-[#94A3B8] block mb-2" style={{ fontFamily: RH.fontMono }}>{r.jira_key}</span>}

                {/* Status lozenge top-right area */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <StatusLozenge status={mapStatus(r.status)} />
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-[12px] text-[#64748B] mb-3">
                  <span>{r.target_date ? new Date(r.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}</span>
                  <span>·</span>
                  <span>{r.change_count || r.chg_count || 0} changes</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: mapStatus(r.status) === 'released' ? '100%' : mapStatus(r.status) === 'in_progress' ? '50%' : '10%',
                    background: accentColor(r.status)
                  }} />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded border border-[rgba(15,23,42,0.12)] overflow-hidden">
          <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }} role="table">
            <thead>
              <tr style={{ background: '#F1F5F9' }}>
                {['RELEASE', 'SOURCE', 'STATUS', 'TARGET DATE', 'CHANGES', 'TEST CYCLES'].map(h => (
                  <th key={h} className="px-3 py-0 h-[36px] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} onClick={() => setSelectedRelease(r)}
                  className="border-b border-[rgba(15,23,42,0.06)] cursor-pointer"
                  style={{ height: 36, background: '#FFFFFF', transition: 'background 120ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}>
                  <td className="px-3 py-0 font-medium" style={{ color: RH.ink1 }}>{r.name}</td>
                  <td className="px-3 py-0"><SourceBadge source={r.source || 'catalyst'} /></td>
                  <td className="px-3 py-0"><StatusLozenge status={mapStatus(r.status)} /></td>
                  <td className="px-3 py-0 text-[#475569]" style={{ fontFamily: RH.fontMono, fontSize: 12 }}>
                    {r.target_date ? new Date(r.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-3 py-0"><span className="font-bold text-[#0F172A]" style={{ fontFamily: RH.fontMono }}>{r.change_count || r.chg_count || 0}</span></td>
                  <td className="px-3 py-0 text-[#64748B]">{r.test_cycle_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRelease && <ReleaseDrawer release={selectedRelease} onClose={() => setSelectedRelease(null)} />}
      {showCreate && <CreateReleaseModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
