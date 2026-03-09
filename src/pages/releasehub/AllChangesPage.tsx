import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Upload, List, CalendarDays, Calendar, ChevronDown, RefreshCw } from 'lucide-react';
import { useChanges, useReleases } from '@/hooks/useReleaseHub';
import { RH, CHG_STATUS_LABELS, CHG_STATUS_STYLES, RISK_STYLES, SECTION_ACCENT } from '@/constants/releasehub.design';
import { groupChangesBySection, type ChangeSection, getSaudiWeekDays } from '@/utils/releasehub.utils';
import { ChgStatusBadge } from '@/components/releasehub/ChgStatusBadge';
import { WorkItemTag } from '@/components/releasehub/WorkItemTag';
import { CatalystAIChip } from '@/components/releasehub/CatalystAIChip';
import { ChgDrawer } from '@/components/releasehub/ChgDrawer';
import { CreateChgModal } from '@/components/releasehub/CreateChgModal';
import { CreateReleaseModal } from '@/components/releasehub/CreateReleaseModal';
import { SNImportModal } from '@/components/releasehub/SNImportModal';
import { ReleaseHubFAB } from '@/components/releasehub/ReleaseHubFAB';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { EmptyState, ErrorState } from '@/components/releasehub/EmptyState';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, isToday, addMonths, isSameMonth } from 'date-fns';
import { differenceInHours } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

const SECTION_LABELS: Record<ChangeSection, string> = {
  past: 'Past', today: 'Today', this_week: 'This Week', upcoming: 'Upcoming', future: 'Future',
};
const SECTION_SUBLABELS: Record<ChangeSection, (d: Date) => string> = {
  past: () => 'Previously deployed',
  today: (d) => format(d, 'MMM d, yyyy'),
  this_week: (d) => `${format(d, 'MMM d')}–${format(addDays(d, 4), 'd')}`,
  upcoming: () => 'Next 30 days',
  future: () => `${format(addMonths(new Date(), 1), 'MMM yyyy')} onwards`,
};

function CustomDropdown({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#475569] flex items-center gap-1.5 hover:bg-[#F4F7FA] min-w-[140px]">
        {options.find(o => o.value === value)?.label || label} <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-[#E2E8F0] z-50 py-1 max-h-60 overflow-y-auto">
            {options.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full px-3 h-9 text-left text-[13px] font-medium hover:bg-[#F4F7FA] ${value === o.value ? 'text-[#2563EB] font-semibold' : 'text-[#475569]'}`}>
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
  const { data: changes = [], isLoading, error, refetch } = useChanges();
  const { data: releases = [] } = useReleases();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const sectionFilter = params.get('section') || 'all';
  const statusFilter = params.get('status') || 'all';
  const releaseFilter = params.get('release') || 'all';
  const view = (params.get('view') || 'list') as 'list' | 'weekly' | 'monthly';
  const [selectedChg, setSelectedChg] = useState<any>(null);
  const [showCreateChg, setShowCreateChg] = useState(false);
  const [showCreateRelease, setShowCreateRelease] = useState(false);
  const [showSNImport, setShowSNImport] = useState(false);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'all' || value === 'list') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setShowCreateChg(true); }
      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setShowCreateRelease(true); }
      if (e.key === 'Escape') { setSelectedChg(null); setShowCreateChg(false); setShowCreateRelease(false); setShowSNImport(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filtered = useMemo(() => {
    return changes.filter((c: any) => {
      if (search && !c.chg_number?.toLowerCase().includes(search.toLowerCase()) && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (releaseFilter !== 'all' && c.release_id !== releaseFilter) return false;
      return true;
    });
  }, [changes, search, statusFilter, releaseFilter]);

  const sections = useMemo(() => groupChangesBySection(filtered), [filtered]);

  const statusOptions = [{ value: 'all', label: 'All Statuses' }, ...Object.entries(CHG_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))];
  const releaseOptions = [{ value: 'all', label: 'All Releases' }, ...releases.map((r: any) => ({ value: r.id, label: r.name }))];

  const hasFilters = search || statusFilter !== 'all' || releaseFilter !== 'all' || sectionFilter !== 'all';

  return (
    <div className="rh-page">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>All Changes</h1>
          <p className="text-[13px] text-[#64748B] max-w-xl" style={{ fontFamily: RH.fontBody }}>Every deployment change — past, present & future</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSNImport(true)} className="h-8 px-3 rounded-md border border-[#C9D3E0] bg-white text-[13px] font-semibold text-[#1E293B] flex items-center gap-1.5 hover:bg-[#F4F7FA] active:scale-[0.98] transition-transform">
            <Upload size={14} /> Import SN CHG
          </button>
          <button onClick={() => setShowCreateChg(true)} className="h-8 px-3.5 rounded-md bg-[#2563EB] text-white text-[13px] font-semibold flex items-center gap-1.5 hover:bg-[#1D4ED8] active:scale-[0.98] transition-transform">
            <Plus size={14} /> New Change
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input type="text" placeholder="Search CHG..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-9 w-56 pl-9 pr-3 rounded border border-[#E2E8F0] bg-white text-[13px] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>
          <div className="flex items-center gap-0.5 bg-white border border-[#E2E8F0] rounded-md p-0.5">
            {['all', 'past', 'today', 'this_week', 'upcoming', 'future'].map(s => (
              <button key={s} onClick={() => setParam('section', s)}
                className={`h-7 px-2.5 rounded text-[11px] font-semibold transition-colors ${sectionFilter === s ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#64748B] hover:text-[#475569]'}`}
                style={{ transition: 'all 80ms ease' }}>
                {s === 'all' ? 'All' : SECTION_LABELS[s as ChangeSection]}
              </button>
            ))}
          </div>
          <CustomDropdown label="Status" value={statusFilter} options={statusOptions} onChange={v => setParam('status', v)} />
          <CustomDropdown label="Release" value={releaseFilter} options={releaseOptions} onChange={v => setParam('release', v)} />
        </div>
        <div className="flex items-center gap-1 border border-[#E2E8F0] rounded-md p-0.5 bg-white">
          {[{ key: 'list', icon: List, label: 'List' }, { key: 'weekly', icon: CalendarDays, label: 'Weekly' }, { key: 'monthly', icon: Calendar, label: 'Monthly' }].map(v => (
            <button key={v.key} onClick={() => setParam('view', v.key)}
              className={`h-7 px-2 rounded flex items-center gap-1 text-[11px] font-medium ${view === v.key ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#94A3B8] hover:text-[#475569]'}`}>
              <v.icon size={12} /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows count={5} />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : changes.length === 0 ? (
        <EmptyState icon={RefreshCw} title="No changes yet" subtitle="Changes will appear here once created or imported from ServiceNow."
          actions={[
            { label: '+ New Change', onClick: () => setShowCreateChg(true), variant: 'primary' },
            { label: 'Import ServiceNow CHG', onClick: () => setShowSNImport(true), variant: 'ghost' },
          ]} />
      ) : filtered.length === 0 && hasFilters ? (
        <EmptyState icon={Search} title="No changes match your filters" subtitle="Try adjusting your search or filter criteria."
          actions={[{ label: 'Clear filters', onClick: () => { setSearch(''); setParams({}); }, variant: 'ghost' }]} />
      ) : view === 'list' ? (
        <ListView sections={sections} sectionFilter={sectionFilter} onSelect={setSelectedChg} />
      ) : view === 'weekly' ? (
        <WeeklyView changes={filtered} onSelect={setSelectedChg} />
      ) : (
        <MonthlyView changes={filtered} onSelect={setSelectedChg} />
      )}

      {selectedChg && <ChgDrawer change={selectedChg} onClose={() => setSelectedChg(null)} />}
      {showCreateChg && <CreateChgModal onClose={() => setShowCreateChg(false)} />}
      {showCreateRelease && <CreateReleaseModal onClose={() => setShowCreateRelease(false)} />}
      {showSNImport && <SNImportModal onClose={() => setShowSNImport(false)} />}
      <ReleaseHubFAB onNewRelease={() => setShowCreateRelease(true)} onNewChange={() => setShowCreateChg(true)} onImportSN={() => setShowSNImport(true)} />
    </div>
  );
}

function ListView({ sections, sectionFilter, onSelect }: { sections: Record<ChangeSection, any[]>; sectionFilter: string; onSelect: (c: any) => void }) {
  const visibleSections = sectionFilter === 'all'
    ? (['past', 'today', 'this_week', 'upcoming', 'future'] as ChangeSection[])
    : [sectionFilter as ChangeSection];

  return (
    <div className="space-y-2">
      {visibleSections.map(sec => {
        const items = sections[sec];
        if (!items?.length) return null;
        return (
          <div key={sec}>
            <div className="sticky top-0 z-10 py-2" style={{ background: RH.pageBg }}>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-extrabold uppercase tracking-[0.04em]" style={{ color: SECTION_ACCENT[sec] }}>{SECTION_LABELS[sec]}</span>
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white" style={{ background: SECTION_ACCENT[sec] }}>{items.length}</span>
                <span className="text-[11px] text-[#64748B]">{SECTION_SUBLABELS[sec](new Date())}</span>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((c: any) => (
                <ChangeRow key={c.id} change={c} section={sec} onClick={() => onSelect(c)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChangeRow({ change: c, section, onClick }: { change: any; section: ChangeSection; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const workItems = c.rh_change_work_items || [];
  const visibleWI = expanded ? workItems : workItems.slice(0, 3);
  const remaining = workItems.length - 3;
  const waitHours = c.oldest_pending_signoff_at ? differenceInHours(new Date(), new Date(c.oldest_pending_signoff_at)) : 0;
  const deployDate = c.deployment_date ? new Date(c.deployment_date) : null;

  return (
    <div onClick={onClick}
      className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden cursor-pointer hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-[1px] flex"
      style={{ minHeight: 80, transition: 'box-shadow 0.15s ease, transform 0.15s ease' }}>
      <div className="w-[5px] shrink-0 rounded-l-lg" style={{ background: SECTION_ACCENT[section] }} />
      <div className="w-[72px] shrink-0 flex flex-col items-center justify-center border-r border-[#E2E8F0] py-2">
        {deployDate ? (
          section === 'today' ? (
            <div className="w-10 h-10 rounded-full bg-[#DC2626] text-white flex items-center justify-center text-[18px] font-extrabold" style={{ fontFamily: RH.fontDisplay }}>{deployDate.getDate()}</div>
          ) : (
            <>
              <span className="text-[22px] font-extrabold leading-none" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>{deployDate.getDate()}</span>
              <span className="text-[10px] font-bold uppercase text-[#64748B] tracking-wide">{format(deployDate, 'MMM')}</span>
              <span className="text-[9px] text-[#94A3B8]">{format(deployDate, 'yyyy')}</span>
            </>
          )
        ) : <span className="text-[#94A3B8] text-[11px]">TBD</span>}
      </div>
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[13px] font-black text-[#0D9488] truncate max-w-[140px]" style={{ fontFamily: RH.fontMono }} title={c.chg_number}>{c.chg_number}</span>
          {c.sn_imported && <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-[#DBEAFE] text-[#1E40AF]">SN</span>}
          <ChgStatusBadge status={c.status} />
          {(c.risk_score > 0 || c.risk_level !== 'low') && <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${RISK_STYLES[c.risk_level] || ''}`}>{c.risk_level}</span>}
        </div>
        <p className="text-[14px] font-extrabold truncate mb-1.5" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }} title={c.title}>{c.title}</p>
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
            style={{ background: c.source === 'jira' ? '#FFF7ED' : c.source === 'servicenow' ? '#DBEAFE' : '#F0FDFA', color: c.source === 'jira' ? '#9A3412' : c.source === 'servicenow' ? '#1E40AF' : '#0D9488' }}>{c.source}</span>
          {c.release_name ? (
            <>
              <span className="text-[10px] text-[#64748B]">Release:</span>
              <span className="text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded">{c.release_name} {c.release_version}</span>
            </>
          ) : (
            <span className="text-[10px] text-[#94A3B8]">— Not linked</span>
          )}
          {c.frontend_required && !c.frontend_commit && <span className="text-[10px] font-bold text-[#C2840A] bg-[#FFFBEB] px-1.5 py-0.5 rounded border border-[#FCD34D]">⚠ FE commit missing</span>}
          {c.frontend_commit && <span className="text-[10px] bg-[#F4F7FA] text-[#475569] px-1.5 py-0.5 rounded border border-[#E2E8F0]" style={{ fontFamily: RH.fontMono }}>FE: {c.frontend_commit.slice(0, 8)}</span>}
          {c.backend_required && !c.backend_commit && <span className="text-[10px] font-bold text-[#C2840A] bg-[#FFFBEB] px-1.5 py-0.5 rounded border border-[#FCD34D]">⚠ BE commit missing</span>}
          {c.backend_commit && <span className="text-[10px] bg-[#F4F7FA] text-[#475569] px-1.5 py-0.5 rounded border border-[#E2E8F0]" style={{ fontFamily: RH.fontMono }}>BE: {c.backend_commit.slice(0, 8)}</span>}
        </div>
        {workItems.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-[#64748B]">Work Items:</span>
            {visibleWI.map((wi: any) => (
              <WorkItemTag key={wi.id || wi.work_item_key} workItemKey={wi.work_item_key} title={wi.work_item_title} type={wi.work_item_type} status={wi.work_item_status}
                onClick={() => {}} />
            ))}
            {!expanded && remaining > 0 && (
              <button onClick={e => { e.stopPropagation(); setExpanded(true); }}
                className="text-[10px] font-bold text-[#0D9488] bg-[#F0FDFA] border border-[#99F6E4] px-1.5 py-0.5 rounded hover:bg-[#CCFBF1]">
                +{remaining} more
              </button>
            )}
          </div>
        )}
      </div>
      <div className="w-[200px] shrink-0 border-l p-3 flex flex-col justify-center gap-1.5" style={{ borderColor: 'var(--cp-border-default)' }}>
        {c.work_item_count > 0 && <span className="text-[11px]" style={{ color: 'var(--cp-text-tertiary)' }}>{c.work_item_count} work items</span>}
        {c.pending_signoffs > 0 && (
          <span className="text-[11px] font-bold" style={{ color: waitHours > 48 ? 'var(--cp-danger-60)' : waitHours > 24 ? 'var(--cp-warning-60)' : 'var(--cp-text-muted)', fontWeight: waitHours > 24 ? 'var(--cp-weight-bold)' : undefined }}>
            Sign-off: {c.oldest_pending_signoff_at ? `${Math.round(waitHours)}h wait` : 'pending'}
          </span>
        )}
        {waitHours > 48 && <CatalystAIChip label="escalate" />}
        {c.category && <span className="text-[11px]" style={{ color: 'var(--cp-text-muted)' }}>{c.category}</span>}
      </div>
    </div>
  );
}

function WeeklyView({ changes, onSelect }: { changes: any[]; onSelect: (c: any) => void }) {
  const weekDays = getSaudiWeekDays(new Date());
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  const changesByDay = weekDays.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return changes.filter((c: any) => c.deployment_date === dayStr);
  });

  return (
    <div className="grid grid-cols-5 gap-px bg-[#E2E8F0] rounded-lg overflow-hidden border border-[#E2E8F0]">
      {dayLabels.map((d, i) => (
        <div key={d} className={`bg-[#F4F7FA] px-3 py-2 text-center ${isToday(weekDays[i]) ? 'bg-[#EFF6FF]' : ''}`}>
          <span className="text-[11px] font-extrabold uppercase text-[#475569] tracking-[0.04em]">{d}</span>
          <span className={`block text-[16px] font-bold ${isToday(weekDays[i]) ? 'text-[#2563EB]' : 'text-[#475569]'}`}>{format(weekDays[i], 'd')}</span>
        </div>
      ))}
      {changesByDay.map((dayChanges, i) => (
        <div key={i} className={`bg-white p-2 min-h-[120px] ${isToday(weekDays[i]) ? 'ring-2 ring-inset ring-[#2563EB]/20' : ''}`}>
          {dayChanges.map((c: any) => (
            <button key={c.id} onClick={() => onSelect(c)} className="w-full mb-1 p-1.5 rounded border border-[#E2E8F0] text-left hover:bg-[#F4F7FA]" style={{ transition: 'background 80ms ease' }}>
              <span className="text-[10px] font-bold text-[#0D9488] block" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</span>
              <span className="text-[11px] text-[#475569] truncate block">{c.title}</span>
              <ChgStatusBadge status={c.status} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function MonthlyView({ changes, onSelect }: { changes: any[]; onSelect: (c: any) => void }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const currentMonth = useMemo(() => addMonths(new Date(), monthOffset), [monthOffset]);
  const allDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = addDays(endOfMonth(currentMonth), 6 - endOfMonth(currentMonth).getDay());
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonthOffset(o => o - 1)} className="h-8 px-3 rounded-md border border-[#E2E8F0] text-[13px] text-[#475569] hover:bg-[#F4F7FA]">← Prev</button>
        <span className="text-[15px] font-bold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>{format(currentMonth, 'MMMM yyyy')}</span>
        <button onClick={() => setMonthOffset(o => o + 1)} className="h-8 px-3 rounded-md border border-[#E2E8F0] text-[13px] text-[#475569] hover:bg-[#F4F7FA]">Next →</button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-[#E2E8F0] rounded-lg overflow-hidden border border-[#E2E8F0]">
        {dayHeaders.map(d => (
          <div key={d} className="bg-[#F4F7FA] px-2 py-2 text-center text-[10px] font-extrabold uppercase text-[#475569] tracking-[0.04em]">{d}</div>
        ))}
        {allDays.map((day, i) => {
          const dayOfWeek = day.getDay();
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayChanges = changes.filter((c: any) => c.deployment_date === dayStr);
          const inMonth = isSameMonth(day, currentMonth);
          return (
            <div key={i} className={`bg-white p-1.5 min-h-[80px] ${isWeekend ? 'opacity-40 bg-[#F1F5F9]' : ''} ${!inMonth ? 'opacity-30' : ''} ${isToday(day) ? 'ring-2 ring-inset ring-[#DC2626]/30' : ''}`}>
              <span className={`text-[11px] font-bold block mb-1 ${isToday(day) ? 'text-white bg-[#DC2626] w-5 h-5 rounded-full inline-flex items-center justify-center' : 'text-[#64748B]'}`}>
                {day.getDate()}
              </span>
              {isWeekend && <span className="text-[8px] text-[#94A3B8]">Weekend</span>}
              {!isWeekend && dayChanges.map((c: any) => (
                <button key={c.id} onClick={() => onSelect(c)} className="w-full mb-0.5 px-1 py-0.5 rounded text-left hover:bg-[#F0FDFA] text-[10px] truncate border border-[#E2E8F0]">
                  <span className="font-bold text-[#0D9488]" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
