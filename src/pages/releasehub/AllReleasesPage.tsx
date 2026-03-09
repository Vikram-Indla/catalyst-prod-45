import React, { useState } from 'react';
import { Search, LayoutGrid, List, Plus } from 'lucide-react';
import { useReleases, useUpdateReleaseStatus, useCreateRelease } from '@/hooks/useReleaseHub';
import { RH, RELEASE_STATUS_LABELS, RELEASE_STATUS_STYLES } from '@/constants/releasehub.design';
import { ReleaseStatusBadge } from '@/components/releasehub/ReleaseStatusBadge';
import { ReleaseDrawer } from '@/components/releasehub/ReleaseDrawer';
import { CreateReleaseModal } from '@/components/releasehub/CreateReleaseModal';
import type { ReleaseStatus } from '@/types/releasehub';

function DaysRemainingPill({ days, isOverdue }: { days: number; isOverdue: boolean }) {
  if (isOverdue) return <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#DC2626]">{Math.abs(days)}d OVERDUE</span>;
  const color = days > 14 ? '#15803D' : days > 7 ? '#C2840A' : '#DC2626';
  const bg = days > 14 ? '#F0FDF4' : days > 7 ? '#FFFBEB' : '#FEF2F2';
  return <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: bg, color }}>{days}d left</span>;
}

export default function AllReleasesPage() {
  const { data: releases = [], isLoading } = useReleases();
  const updateStatus = useUpdateReleaseStatus();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = releases.filter((r: any) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: releases.length,
    overdue: releases.filter((r: any) => r.is_overdue).length,
    in_progress: releases.filter((r: any) => r.status === 'in_progress').length,
    todo: releases.filter((r: any) => r.status === 'todo').length,
    done: releases.filter((r: any) => r.status === 'done').length,
  };

  const accentColor = (status: string) => {
    if (status === 'in_progress') return RH.primary;
    if (status === 'done') return RH.success;
    return '#CBD5E1';
  };

  return (
    <div className="rh-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>All Releases</h1>
          <p className="text-[13px] text-[#64748B]" style={{ fontFamily: RH.fontBody }}>Manage and track all releases</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="h-9 px-4 rounded-md bg-[#2563EB] text-white text-[13px] font-semibold flex items-center gap-1.5 hover:bg-[#1D4ED8]">
          <Plus size={14} /> New Release
        </button>
      </div>

      {/* Summary Stats */}
      <div className="flex items-center gap-3 mb-4">
        {[
          { key: 'all', label: 'Total', count: counts.total, color: '#475569', bg: '#F1F5F9' },
          { key: 'overdue', label: 'Overdue', count: counts.overdue, color: '#DC2626', bg: '#FEF2F2' },
          { key: 'in_progress', label: 'In Progress', count: counts.in_progress, color: '#1E40AF', bg: '#DBEAFE' },
          { key: 'todo', label: 'Todo', count: counts.todo, color: '#475569', bg: '#F1F5F9' },
          { key: 'done', label: 'Done', count: counts.done, color: '#15803D', bg: '#DCFCE7' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key === 'overdue' ? 'all' : s.key)}
            className={`h-8 px-3 rounded-md text-[12px] font-semibold flex items-center gap-1.5 border transition-colors ${filter === s.key ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'}`}
            style={{ color: s.color }}>
            {s.label}
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>{s.count}</span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input type="text" placeholder="Search releases..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-9 w-64 pl-9 pr-3 rounded-md border border-[#E2E8F0] bg-white text-[13px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            style={{ fontFamily: RH.fontBody }} />
        </div>
        <div className="flex items-center gap-1 border border-[#E2E8F0] rounded-md p-0.5 bg-white">
          <button onClick={() => setView('cards')} className={`h-7 w-7 rounded flex items-center justify-center ${view === 'cards' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#94A3B8] hover:text-[#475569]'}`}><LayoutGrid size={14} /></button>
          <button onClick={() => setView('table')} className={`h-7 w-7 rounded flex items-center justify-center ${view === 'table' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#94A3B8] hover:text-[#475569]'}`}><List size={14} /></button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]" /></div>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((r: any) => (
            <button key={r.id} onClick={() => setSelectedRelease(r)} className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all relative group">
              <div className="absolute left-0 top-0 bottom-0 w-[5px] rounded-l-lg" style={{ background: accentColor(r.status) }} />
              <div className="p-4 pl-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: r.source === 'jira' ? '#DBEAFE' : '#F0FDFA', color: r.source === 'jira' ? '#1E40AF' : '#0D9488' }}>{r.source}</span>
                  {r.version && <span className="text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">{r.version}</span>}
                </div>
                <h3 className="text-[14px] font-extrabold mb-2" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>{r.name}</h3>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <ReleaseStatusBadge status={r.status} />
                  <span className="text-[12px] text-[#64748B]">{r.target_date ? new Date(r.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                  <DaysRemainingPill days={r.days_remaining ?? 0} isOverdue={!!r.is_overdue} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0D9488] bg-[#F0FDFA] px-1.5 py-0.5 rounded">
                    {r.change_count || 0} CHGs
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-1.5 py-0.5 rounded">
                    {r.test_cycle_count || 0} cycles
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }}>
            <thead>
              <tr className="bg-[#F1F5F9] border-b border-[#E2E8F0]">
                {['RELEASE', 'SOURCE', 'STATUS', 'TARGET DATE', 'CHGs', 'TEST CYCLES', 'PASS RATE', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} onClick={() => setSelectedRelease(r)} className="border-b border-[#F1F5F9] hover:bg-[#FAFBFC] cursor-pointer">
                  <td className="px-4 py-2.5 font-semibold" style={{ color: RH.ink1 }}>{r.name}</td>
                  <td className="px-4 py-2.5"><span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: r.source === 'jira' ? '#DBEAFE' : '#F0FDFA', color: r.source === 'jira' ? '#1E40AF' : '#0D9488' }}>{r.source}</span></td>
                  <td className="px-4 py-2.5"><ReleaseStatusBadge status={r.status} /></td>
                  <td className="px-4 py-2.5 text-[#475569]">{r.target_date ? new Date(r.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                  <td className="px-4 py-2.5"><span className="font-bold text-[#0D9488]" style={{ fontFamily: RH.fontMono }}>{r.change_count || 0}</span></td>
                  <td className="px-4 py-2.5 text-[#64748B]">{r.test_cycle_count || 0}</td>
                  <td className="px-4 py-2.5 text-[#94A3B8]">—</td>
                  <td className="px-4 py-2.5 text-[#94A3B8]">→</td>
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
