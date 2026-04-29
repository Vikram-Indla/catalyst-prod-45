import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid, List, Plus, Package, Download, Clock, AlertTriangle } from 'lucide-react';
import { useReleaseSummary, useFreezeWindows } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { useTheme } from '@/hooks/useTheme';
import { StatusLozenge } from '@/components/releasehub/StatusLozenge';
import { SourceBadge } from '@/components/releasehub/SourceBadge';
import { ReleaseDrawer } from '@/components/releasehub/ReleaseDrawer';
import { CreateReleaseModal } from '@/components/releasehub/CreateReleaseModal';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ads';

function mapStatus(status: string) {
  if (status === 'todo') return 'planning';
  if (status === 'done') return 'released';
  return status;
}

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AllReleasesPage() {
  const { isDark } = useTheme();
  const { data: releases = [], isLoading, error, refetch } = useReleaseSummary();
  const { data: freezeWindows = [] } = useFreezeWindows();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [importing, setImporting] = useState(false);

  const freezeConflicts = useMemo(() => {
    if (!freezeWindows.length || !releases.length) return [];
    return releases.filter((r: any) => {
      if (!r.target_date) return false;
      const t = new Date(r.target_date);
      return freezeWindows.some((fw: any) => {
        const s = new Date(fw.start_date);
        const e = new Date(fw.end_date);
        return t >= s && t <= e;
      });
    });
  }, [releases, freezeWindows]);

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
    if (s === 'planning') return '#FFFFFF';
    return 'rgba(15,23,42,0.12)';
  };

  const getProgress = (r: any) => {
    const total = Number(r.change_count) || 0;
    const completed = Number(r.completed_change_count) || 0;
    if (total === 0) return { pct: 0, total, completed, empty: true };
    const pct = Math.min(Math.round((completed / total) * 100), 100);
    return { pct, total, completed, empty: false };
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('rh_import_jira_versions', { p_project_key: 'CATALYST' });
      if (rpcErr) throw rpcErr;
      const result = data as any;
      if (result?.queued) {
        toast.success('Import queued. Jira versions will sync shortly.');
      } else {
        toast.info(result?.reason || 'Import already requested recently.');
      }
    } catch (err) {
      toast.error('Failed to queue import: ' + String(err));
    } finally {
      setTimeout(() => setImporting(false), 3000);
    }
  };

  return (
    <div style={{ background: isDark ? 'var(--cp-bg-page, #1F1F21)' : '#FFFFFF', minHeight: '100%', padding: '24px' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: isDark ? '#EDEDED' : RH.ink1 }}>All Releases</h1>
          <p className="text-[13px]" style={{ fontFamily: RH.fontBody, color: isDark ? '#878787' : '#64748B' }}>Manage and track all releases</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleImport} disabled={importing}
            className="h-9 px-4 rounded-md text-[13px] font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#475569' }}>
            <Download size={14} /> Import from Jira
          </button>
          <button onClick={() => setShowCreate(true)}
            className="h-9 px-4 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-colors">
            <Plus size={14} /> New Release
          </button>
        </div>
      </div>

      {/* Freeze conflict banner */}
      {freezeConflicts.length > 0 && (
        <div style={{
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: '6px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
        }}>
          <AlertTriangle size={16} color="#D97706" />
          <span style={{ fontSize: '13px', color: '#92400E' }}>
            {freezeConflicts.length === 1
              ? `"${freezeConflicts[0].name}" targets a date within a freeze window.`
              : `${freezeConflicts.length} releases target dates within freeze windows.`}
            {' '}
            <a href="/release-hub/freeze-windows"
               style={{ color: '#B45309', textDecoration: 'underline', fontWeight: 600 }}>
              View freeze windows →
            </a>
          </span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { key: 'all', label: 'All', count: counts.all },
          { key: 'planning', label: 'Planning', count: counts.planning },
          { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
          { key: 'released', label: 'Released', count: counts.released },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className="h-8 px-3 rounded-md text-[12px] font-semibold flex items-center gap-1.5 border transition-colors"
            style={filter === s.key
              ? { borderColor: '#2563EB', background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', color: '#2563EB' }
              : { borderColor: isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)', background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#475569' }
            }>
            {s.label}
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold"
              style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9', color: isDark ? '#A1A1A1' : '#475569' }}>{s.count}</span>
          </button>
        ))}
      </div>

      {/* Search + View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#878787' : '#94A3B8' }} />
          <input type="text" placeholder="Search releases..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-9 w-64 pl-9 pr-3 rounded text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            style={{ border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}`, background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', color: isDark ? '#EDEDED' : '#0F172A' }} />
        </div>
        <div className="flex items-center gap-1 rounded-md p-0.5" style={{ border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}`, background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF' }}>
          <button onClick={() => setView('cards')} className="h-7 w-7 rounded flex items-center justify-center" style={view === 'cards' ? { background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', color: '#2563EB' } : { color: isDark ? '#878787' : '#94A3B8' }}><LayoutGrid size={14} /></button>
          <button onClick={() => setView('table')} className="h-7 w-7 rounded flex items-center justify-center" style={view === 'table' ? { background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', color: '#2563EB' } : { color: isDark ? '#878787' : '#94A3B8' }}><List size={14} /></button>
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
          {filtered.map((r: any) => {
            const progress = getProgress(r);
            return (
              <button key={r.id} onClick={() => setSelectedRelease(r)}
                className="rounded-md overflow-hidden text-left hover:-translate-y-0.5 transition-all relative group"
                style={{ borderRadius: 6, background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}` }}>
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accentColor(r.status), borderRadius: '6px 0 0 6px' }} />
                <div className="p-4 pl-5">
                  <h3 className="text-[15px] font-bold mb-1" style={{ fontFamily: RH.fontDisplay, color: isDark ? '#EDEDED' : RH.ink1, fontWeight: 650 }}>{r.name}</h3>
                  {r.jira_key && <span className="text-[11px] block mb-2" style={{ fontFamily: RH.fontMono, color: isDark ? '#878787' : '#94A3B8' }}>{r.jira_key}</span>}

                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <StatusLozenge status={mapStatus(r.status)} />
                    <SourceBadge source={r.source || 'catalyst'} />
                    {(r.source === 'jira') && relativeTime(r.synced_at || r.updated_at) && (
                      <Tooltip
                        position="top"
                        content={`Last synced: ${new Date(r.synced_at || r.updated_at).toLocaleString()}`}
                      >
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8] cursor-default">
                          <Clock size={12} />
                          Synced {relativeTime(r.synced_at || r.updated_at)}
                        </span>
                      </Tooltip>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[12px] mb-3" style={{ color: isDark ? '#878787' : '#64748B' }}>
                    <span>{r.target_date ? new Date(r.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}</span>
                    <span>·</span>
                    <span>{progress.total} {progress.total === 1 ? 'change' : 'changes'}</span>
                  </div>

                  {progress.empty ? (
                    <p className="text-[11px]" style={{ fontFamily: RH.fontBody, color: isDark ? '#878787' : '#94A3B8' }}>No changes yet</p>
                  ) : (
                    <>
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }}>
                        <div className="h-full rounded-full transition-all" style={{
                          width: progress.pct + '%',
                          background: accentColor(r.status)
                        }} />
                      </div>
                      <p className="text-[11px] mt-1" style={{ fontFamily: RH.fontBody, color: isDark ? '#878787' : '#94A3B8' }}>
                        {progress.pct}% · {progress.completed} of {progress.total} {progress.total === 1 ? 'change' : 'changes'} deployed
                      </p>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded overflow-hidden" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}` }}>
          <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }} role="table">
            <thead>
              <tr style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }}>
                {['RELEASE', 'SOURCE', 'STATUS', 'TARGET DATE', 'CHANGES', 'PROGRESS'].map(h => (
                  <th key={h} className="px-3 py-0 h-[50px] text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: isDark ? '#878787' : '#64748B' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => {
                const progress = getProgress(r);
                return (
                  <tr key={r.id} onClick={() => setSelectedRelease(r)}
                    className="cursor-pointer"
                    style={{ height: 50, background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', transition: 'background 120ms', borderBottom: `0.75px solid ${isDark ? '#292929' : 'rgba(15,23,42,0.06)'}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'var(--cp-bg-surface, #242528)' : 'rgba(15,23,42,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF')}>
                    <td className="px-3 py-0 font-medium" style={{ color: isDark ? '#EDEDED' : RH.ink1 }}>
                      <div className="flex items-center gap-2">
                        {r.name}
                        {r.source === 'jira' && relativeTime(r.synced_at || r.updated_at) && (
                          <Tooltip
                            position="top"
                            content={`Synced ${relativeTime(r.synced_at || r.updated_at)}`}
                          >
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-[#94A3B8] cursor-default">
                              <Clock size={12} />
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-0"><SourceBadge source={r.source || 'catalyst'} /></td>
                    <td className="px-3 py-0"><StatusLozenge status={mapStatus(r.status)} /></td>
                    <td className="px-3 py-0" style={{ fontFamily: RH.fontMono, fontSize: 12, color: isDark ? '#A1A1A1' : '#475569' }}>
                      {r.target_date ? new Date(r.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-3 py-0"><span className="font-bold" style={{ fontFamily: RH.fontMono, color: isDark ? '#EDEDED' : '#0F172A' }}>{progress.total}</span></td>
                    <td className="px-3 py-0">
                      {progress.empty ? (
                        <span className="text-[11px]" style={{ color: isDark ? '#878787' : '#94A3B8' }}>No changes yet</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }}>
                            <div className="h-full rounded-full" style={{ width: progress.pct + '%', background: accentColor(r.status) }} />
                          </div>
                          <span className="text-[11px]" style={{ fontFamily: RH.fontMono, color: isDark ? '#878787' : '#64748B' }}>{progress.pct}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedRelease && <ReleaseDrawer release={selectedRelease} onClose={() => setSelectedRelease(null)} />}
      {showCreate && <CreateReleaseModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
