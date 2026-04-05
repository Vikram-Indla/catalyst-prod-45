import React, { useState, useEffect, useRef } from 'react';
import { Plus, RefreshCw, Search, ChevronLeft, ChevronRight, UserX, Copy, Loader2, Share2, Download, Users2, FolderSearch } from 'lucide-react';
import UserDetailPanel from '@/components/admin/UserDetailPanel';
import { toast } from 'sonner';
import {
  useJiraSyncStats,
  useTriggerUserSync,
  useJiraSyncUsers,
  useToggleUserStatus,
  useCopyPermissions,
} from '@/hooks/useJiraUserSync';
import type { SyncFilter } from '@/types/jiraSync';
import CreateCatalystUserModal from '@/components/admin/CreateCatalystUserModal';

/* ── Stats Config ── */
const STATS_CONFIG = [
  { key: 'jiraSynced',   dot: '#16A34A', label: 'Jira Synced',    sub: 'from last sync' },
  { key: 'catalystOnly', dot: '#7C3AED', label: 'Catalyst Only',  sub: 'Not in Jira' },
  { key: 'proxyAuth',    dot: '#2563EB', label: 'Proxy Auth',     sub: 'Jira password active' },
  { key: 'conflicts',    dot: '#D97706', label: 'Conflicts',      sub: 'Needs resolution' },
  { key: 'inactive',     dot: '#DC2626', label: 'Inactive',       sub: 'Access revoked' },
  { key: 'webhooks24h',  dot: '#0D9488', label: 'Webhooks / 24h', sub: 'Real-time events' },
] as const;

type StatsKey = typeof STATS_CONFIG[number]['key'];

const FILTERS: { value: SyncFilter; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'jira',     label: 'Jira Synced' },
  { value: 'local',    label: 'Catalyst Only' },
  { value: 'conflict', label: '⚠ Conflicts' },
  { value: 'inactive', label: 'Inactive' },
];

const PER_PAGE = 15;

const AVATAR_COLORS = [
  { bg: '#DBEAFE', text: '#1D4ED8' }, { bg: '#DCFCE7', text: '#15803D' },
  { bg: '#FEF3C7', text: '#92400E' }, { bg: '#EDE9FE', text: '#5B21B6' },
  { bg: '#FEE2E2', text: '#991B1B' }, { bg: '#F0FDF4', text: '#0F766E' },
  { bg: '#EFF6FF', text: '#1D4ED8' }, { bg: '#E0F2FE', text: '#0369A1' },
  { bg: '#F5F3FF', text: '#7C3AED' }, { bg: '#CCFBF1', text: '#0F766E' },
];

const HEADERS = ['User / Jira Identity', 'Auth Mode', 'Projects & Permissions', 'Synced At', 'Last Jira Login', 'Last in Catalyst', 'Status', ''];

/* ── Permission dot colors ── */
const PERM_DOT: Record<string, string> = {
  full: '#16A34A',
  edit: '#2563EB',
  view: '#9CA3AF',
};

/* ── Debounce hook ── */
function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Format relative date ── */
function formatSyncDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Yesterday ${time}`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ` ${time}`;
}

function relativeTime(ts: string | null): string {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function getInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

/* ── Pagination pages helper ── */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}

/* ── Main Component ── */
const JiraUserSync: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<SyncFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: statsData, isLoading: statsLoading } = useJiraSyncStats();
  const { data: usersResult, isLoading: usersLoading, isFetching: usersFetching } = useJiraSyncUsers(page, filter, debouncedSearch);
  const { mutate: triggerSync, isPending: isSyncing } = useTriggerUserSync();
  const { mutate: toggleStatus } = useToggleUserStatus();
  const { mutate: copyPerms } = useCopyPermissions();

  const users = usersResult?.data ?? [];
  const totalCount = usersResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  useEffect(() => { setPage(1); }, [filter, debouncedSearch]);
  useEffect(() => { setSelected(new Set()); }, [page, filter, debouncedSearch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeUserId && !createModalOpen) {
        setActiveUserId(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeUserId, createModalOpen]);

  const getStatValue = (key: StatsKey): string | number => {
    if (statsLoading || !statsData) return '—';
    return (statsData as any)[key] ?? 0;
  };

  const handleSync = () => {
    triggerSync(undefined, {
      onSuccess: () => toast.success('Sync completed — users refreshed'),
      onError: () => toast.error('Sync failed — check Jira connection settings'),
    });
  };

  const handleToggleStatus = (e: React.MouseEvent, user: any) => {
    e.stopPropagation();
    setTogglingId(user.id);
    toggleStatus(
      { id: user.id, active: !user.is_active_in_catalyst },
      {
        onSuccess: () => {
          toast.success(user.is_active_in_catalyst ? 'User deactivated' : 'User reactivated');
          setTogglingId(null);
        },
        onError: () => { toast.error('Failed to update user status'); setTogglingId(null); },
      }
    );
  };

  const handleBulkDeactivate = () => {
    const ids = Array.from(selected);
    Promise.all(
      ids.map(id => new Promise<void>((resolve, reject) => {
        toggleStatus({ id, active: false }, { onSuccess: () => resolve(), onError: () => reject() });
      }))
    ).then(() => {
      setSelected(new Set());
      toast.success(`${ids.length} users deactivated`);
    }).catch(() => toast.error('Some deactivations failed'));
  };

  const handleCopyPermissions = () => {
    if (!activeUserId) { toast.warning('Open a user first to copy permissions from'); return; }
    const targetIds = Array.from(selected).filter(id => id !== activeUserId);
    if (!targetIds.length) { toast.warning('Select target users in the table'); return; }
    copyPerms(
      { sourceId: activeUserId, targetIds },
      {
        onSuccess: () => { toast.success(`Permissions copied to ${targetIds.length} user(s)`); setSelected(new Set()); },
        onError: () => toast.error('Failed to copy permissions'),
      }
    );
  };

  const toggleSelectRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(users.map((u: any) => u.id)));
  const clearAll = () => setSelected(new Set());
  const allSelected = selected.size === users.length && users.length > 0;
  const someSelected = selected.size > 0 && selected.size < users.length;

  const headerCheckRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCheckRef.current) headerCheckRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const showStart = totalCount > 0 ? (page - 1) * PER_PAGE + 1 : 0;
  const showEnd = Math.min(page * PER_PAGE, totalCount);

  return (
    /* Layer 1 — Page background */
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-[#0F1114]">

      {/* Layer 2 — Main content surface */}
      <div className="flex flex-col flex-1 overflow-hidden mx-5 my-4 bg-white dark:bg-[#181A1E] rounded-lg border border-[rgba(15,23,42,0.06)] dark:border-[rgba(200,210,225,0.08)]">

        {/* ══ Page Header ══ */}
        <div className="shrink-0" style={{ padding: '14px 20px 0', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
          <div className="flex items-start justify-between pb-3">
            <div>
              <h1 className="text-[#0F172A] dark:text-[#F5F3F0]"
                style={{ fontFamily: "'Sora', sans-serif", fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px', margin: 0, lineHeight: 1.3 }}>
                Jira User Sync
              </h1>
              <p className="text-[#64748B] dark:text-[#6B6560]"
                style={{ fontSize: '11px', margin: '2px 0 0' }}>
                Bidirectional identity bridge · Jira Cloud ↔ Catalyst · Live proxy auth · Webhooks active
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-1 bg-white dark:bg-[#232019] text-[#334155] dark:text-[#A09890]"
                style={{ padding: '5px 11px', borderRadius: '5px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', lineHeight: 1, border: '1px solid rgba(15,23,42,0.10)' }}>
                <Plus size={11} /> Create User
              </button>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: '#2563EB', color: '#FFFFFF', border: 'none',
                  padding: '6px 14px', borderRadius: '5px', fontSize: '12px', fontWeight: 600,
                  cursor: isSyncing ? 'not-allowed' : 'pointer', opacity: isSyncing ? 0.7 : 1, lineHeight: 1,
                }}>
                <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>
          </div>
        </div>

        {/* ══ FIX 1 — Stat Cards with surface ══ */}
        <div className="shrink-0 flex gap-3 flex-wrap" style={{ padding: '14px 20px', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
          {STATS_CONFIG.map((card) => (
            <div
              key={card.key}
              className="bg-white dark:bg-[#1E2027]"
              style={{
                flex: '1 1 160px',
                minWidth: '160px',
                padding: '16px 20px',
                borderRadius: '6px',
                border: '0.75px solid rgba(15,23,42,0.08)',
              }}
            >
              <div className="flex items-center gap-[5px] mb-[4px]">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: card.dot, flexShrink: 0 }} />
                <span className="text-[#6B7280] dark:text-[rgba(200,210,225,0.50)]"
                  style={{ fontSize: '11px', fontWeight: 500 }}>{card.label}</span>
              </div>
              <div className="text-[#111827] dark:text-[rgba(225,230,240,0.95)]"
                style={{ fontSize: '24px', fontWeight: 650, lineHeight: 1.1 }}>
                {getStatValue(card.key)}
              </div>
              <div className="text-[#9CA3AF] dark:text-[rgba(200,210,225,0.35)]"
                style={{ fontSize: '11px', marginTop: '2px' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* ══ FIX 9 — Toolbar (no Group by Project) ══ */}
        <div className="shrink-0 flex items-center gap-[7px] flex-wrap bg-white dark:bg-[#181A1E]"
          style={{ padding: '9px 18px', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
          <div className="relative w-[220px]">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              className="w-full bg-white dark:bg-[#181A1E] text-[#0F172A] dark:text-[#F5F3F0]"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, email, Jira ID, project…"
              style={{ padding: '5px 10px 5px 26px', borderRadius: '4px', fontSize: '12px', outline: 'none', border: '1px solid rgba(15,23,42,0.10)' }}
            />
          </div>
          <div className="flex gap-[6px]">
            {FILTERS.map(f => (
              <button
                key={f.value}
                className={
                  filter === f.value
                    ? 'bg-[#EFF6FF] dark:bg-[rgba(37,99,235,0.12)] text-[#2563EB] dark:text-[#F5F3F0]'
                    : 'bg-white dark:bg-[#232019] text-[#334155] dark:text-[#A09890]'
                }
                onClick={() => setFilter(f.value)}
                style={{
                  padding: '4px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                  transition: 'all 120ms ease',
                  border: filter === f.value ? '1px solid #BFDBFE' : '1px solid rgba(15,23,42,0.10)',
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-[6px]">
            {selected.size > 0 && (
              <button onClick={handleCopyPermissions}
                className="inline-flex items-center gap-1 bg-white dark:bg-[#232019] text-[#334155] dark:text-[#A09890]"
                style={{ padding: '4px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', border: '1px solid rgba(15,23,42,0.10)' }}>
                <Copy size={11} /> Copy Permissions
              </button>
            )}
            <button
              className="inline-flex items-center gap-1 bg-white dark:bg-[#232019] text-[#334155] dark:text-[#A09890]"
              style={{ padding: '4px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', border: '1px solid rgba(15,23,42,0.10)' }}>
              <Download size={11} /> Export
            </button>
          </div>
        </div>

        {/* ══ Selection Bar ══ */}
        {selected.size > 0 && (
          <div className="shrink-0 flex items-center gap-[9px] bg-[#EFF6FF] dark:bg-[rgba(37,99,235,0.12)]"
            style={{ padding: '7px 18px', borderBottom: '1px solid #BFDBFE' }}>
            <input type="checkbox" checked onChange={clearAll} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
            <span className="text-[#2563EB] dark:text-[#93C5FD]" style={{ fontSize: '12px', fontWeight: 500 }}>
              {selected.size} users selected
            </span>
            <button onClick={handleCopyPermissions}
              className="inline-flex items-center gap-1 bg-white dark:bg-[#232019] text-[#334155] dark:text-[#A09890]"
              style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', border: '1px solid rgba(15,23,42,0.10)' }}>
              <Copy size={11} /> Copy permissions to selected
            </button>
            <button onClick={handleBulkDeactivate}
              className="inline-flex items-center gap-1 bg-white dark:bg-[#232019] text-[#DC2626] dark:text-[#FCA5A5]"
              style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', border: '1px solid rgba(15,23,42,0.10)' }}>
              <UserX size={11} /> Make Inactive
            </button>
            <button onClick={clearAll}
              className="ml-auto text-[#64748B] dark:text-[#6B6560]"
              style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              Clear
            </button>
          </div>
        )}

        {/* ══ Table + Detail Panel ══ */}
        <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">

        {/* ══ Table ══ */}
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            {/* FIX 8 — Table headers: Layer 3 sunken */}
            <thead>
              <tr className="bg-[#F1F5F9] dark:bg-[#12141A]" style={{ borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
                <th style={{ width: '36px', padding: '10px 12px', textAlign: 'center' }}>
                  <input
                    ref={headerCheckRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => allSelected ? clearAll() : selectAll()}
                    style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                  />
                </th>
                {HEADERS.map(h => (
                  <th key={h || 'action'}
                    className="text-[#6B7280] dark:text-[rgba(200,210,225,0.45)]"
                    style={{
                      padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={`skel-${i}`}
                    style={{ height: '40px', maxHeight: '40px', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
                    <td style={{ padding: '0 12px' }}><div className="animate-pulse bg-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)]" style={{ width: 14, height: 14, borderRadius: 2 }} /></td>
                    <td style={{ padding: '0 12px' }}>
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse bg-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)]" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                        <div>
                          <div className="animate-pulse bg-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)]" style={{ width: 120, height: 10, borderRadius: 2, marginBottom: 4 }} />
                          <div className="animate-pulse bg-[#F1F5F9] dark:bg-[rgba(255,255,255,0.05)]" style={{ width: 160, height: 8, borderRadius: 2 }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0 12px' }}><div className="animate-pulse bg-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)]" style={{ width: 70, height: 16, borderRadius: 3 }} /></td>
                    <td style={{ padding: '0 12px' }}><div className="animate-pulse bg-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)]" style={{ width: 100, height: 16, borderRadius: 3 }} /></td>
                    <td style={{ padding: '0 12px' }}><div className="animate-pulse bg-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)]" style={{ width: 80, height: 10, borderRadius: 2 }} /></td>
                    <td style={{ padding: '0 12px' }}><div className="animate-pulse bg-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)]" style={{ width: 60, height: 10, borderRadius: 2 }} /></td>
                    <td style={{ padding: '0 12px' }}><div className="animate-pulse bg-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)]" style={{ width: 60, height: 10, borderRadius: 2 }} /></td>
                    <td style={{ padding: '0 12px' }}><div className="animate-pulse bg-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)]" style={{ width: 50, height: 18, borderRadius: 3 }} /></td>
                    <td />
                  </tr>
                ))
              ) : users.length === 0 && !usersFetching ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    {debouncedSearch ? (
                      <>
                        <Search size={24} className="text-[#94A3B8] dark:text-[#6B6560] mx-auto mb-[10px] block" />
                        <div className="text-[#334155] dark:text-[#F5F3F0]" style={{ fontSize: '14px', fontWeight: 500 }}>No users match '{debouncedSearch}'</div>
                        <button onClick={() => setSearch('')} className="text-[#2563EB] dark:text-[#93C5FD]"
                          style={{ marginTop: 8, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>Clear search</button>
                      </>
                    ) : filter !== 'all' ? (
                      <>
                        <FolderSearch size={24} className="text-[#94A3B8] dark:text-[#6B6560] mx-auto mb-[10px] block" />
                        <div className="text-[#334155] dark:text-[#F5F3F0]" style={{ fontSize: '14px', fontWeight: 500 }}>
                          {filter === 'conflict' ? 'No conflicts found' : filter === 'inactive' ? 'No inactive users' : `No ${filter} users found`}
                        </div>
                        <button onClick={() => setFilter('all')} className="text-[#2563EB] dark:text-[#93C5FD]"
                          style={{ marginTop: 8, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>View all users</button>
                      </>
                    ) : (
                      <>
                        <Users2 size={32} className="text-[#94A3B8] dark:text-[#6B6560] mx-auto mb-[10px] block" />
                        <div className="text-[#334155] dark:text-[#F5F3F0]" style={{ fontSize: '14px', fontWeight: 500 }}>No synced users yet</div>
                        <button onClick={handleSync} disabled={isSyncing}
                          style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: '5px', fontSize: '12px', fontWeight: 600, cursor: isSyncing ? 'not-allowed' : 'pointer' }}>
                          <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
                          Sync Now to pull users from Jira
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ) : users.map((user: any, idx: number) => {
                const isInactive = !user.is_active_in_catalyst;
                const isCatalystOnly = user.catalyst_only;
                const hasConflicts = user.conflict_fields && user.conflict_fields.length > 0;
                const isActiveRow = activeUserId === user.id;
                const isSelected = selected.has(user.id);
                const perms = user.jira_user_project_perms ?? [];
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                return (
                  <tr key={user.id}
                    className={`group ${hasConflicts ? 'bg-[rgba(251,191,36,0.04)] dark:bg-[rgba(251,191,36,0.06)]' : ''} ${isActiveRow || isSelected ? 'bg-[rgba(37,99,235,0.07)] dark:bg-[rgba(37,99,235,0.12)]' : ''}`}
                    onClick={() => setActiveUserId(user.id === activeUserId ? null : user.id)}
                    style={{
                      height: '40px', maxHeight: '40px',
                      borderBottom: '0.75px solid rgba(15,23,42,0.06)',
                      borderLeft: isCatalystOnly ? '2px solid #7C3AED' : 'none',
                      cursor: 'pointer', opacity: isInactive ? 0.5 : 1,
                      transition: 'background 120ms ease',
                    }}>

                    {/* Checkbox */}
                    <td style={{ padding: '0 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(user.id)} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
                    </td>

                    {/* FIX 4 — User / Jira Identity: full email */}
                    <td style={{ padding: '0 12px' }}>
                      <div className="flex items-center gap-2">
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: user.avatar_url ? 'transparent' : avatarColor.bg, color: avatarColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, overflow: 'hidden' }}>
                          {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} /> : getInitials(user.display_name || '?')}
                        </div>
                        <div style={{ minWidth: 0, maxWidth: '220px' }}>
                          <div className="flex items-center gap-[5px]">
                            <span className="text-[#0F172A] dark:text-[#F5F3F0]" style={{ fontSize: '12px', fontWeight: 500, textDecoration: isInactive ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.display_name}</span>
                            {isCatalystOnly && <span className="text-[#7C3AED] dark:text-[#C4B5FD]" style={{ fontSize: '9px', fontWeight: 600, whiteSpace: 'nowrap' }}>◆ Local</span>}
                          </div>
                          <div className="text-[#6B7280] dark:text-[rgba(200,210,225,0.50)]" style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.email || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* FIX 3 — Auth Mode: Jira = BLUE, Catalyst = purple */}
                    <td style={{ padding: '0 12px' }}>
                      {user.auth_mode === 'jira_proxy' ? (
                        <span className="dark:text-[#93C5FD]" style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          padding: '1px 6px', borderRadius: '3px',
                          fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
                          background: '#EFF6FF', color: '#1D4ED8',
                          border: '0.75px solid rgba(37,99,235,0.25)',
                        }}><Share2 size={9} /> JIRA</span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          padding: '1px 6px', borderRadius: '3px',
                          fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
                          background: '#EDE9FE', color: '#5B21B6',
                        }}>CATALYST</span>
                      )}
                    </td>

                    {/* FIX 6 — Projects & Permissions: dots encode level */}
                    <td style={{ padding: '0 12px', maxWidth: '200px' }}>
                      <div className="flex gap-1 flex-nowrap overflow-hidden items-center">
                        {perms.slice(0, 2).map((p: any) => {
                          const dotColor = PERM_DOT[p.permission_level];
                          return (
                            <span key={p.id}
                              className="bg-[#F1F5F9] dark:bg-[rgba(200,210,225,0.08)] text-[#374151] dark:text-[rgba(200,210,225,0.75)]"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {dotColor && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
                              {p.project_key}
                            </span>
                          );
                        })}
                        {perms.length > 2 && <span className="text-[#64748B] dark:text-[#A09890]" style={{ fontSize: '10px', fontWeight: 500, whiteSpace: 'nowrap' }}>+{perms.length - 2} more</span>}
                        {perms.length === 0 && <span className="text-[#94A3B8] dark:text-[#6B6560]" style={{ fontSize: '10px' }}>—</span>}
                      </div>
                    </td>

                    {/* Synced At */}
                    <td style={{ padding: '0 12px' }}>
                      {isCatalystOnly ? (
                        <span className="text-[#94A3B8] dark:text-[#6B6560]" style={{ fontSize: '11px', fontStyle: 'italic' }}>Not synced</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                          <span className="text-[#64748B] dark:text-[#A09890]" style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{formatSyncDate(user.last_synced_at)}</span>
                        </div>
                      )}
                    </td>

                    {/* Last Jira Login */}
                    <td className="text-[#64748B] dark:text-[#A09890]" style={{ padding: '0 12px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>{relativeTime(user.last_jira_login_at)}</td>

                    {/* Last in Catalyst */}
                    <td className="text-[#64748B] dark:text-[#A09890]" style={{ padding: '0 12px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>{relativeTime(user.last_catalyst_login_at)}</td>

                    {/* FIX 5 — Status lozenge: 3-colour guardrail */}
                    <td style={{ padding: '0 12px' }}>
                      {hasConflicts ? (
                        <span className="bg-[#FEF3C7] dark:bg-[#451A03] text-[#92400E] dark:text-[#FCD34D]"
                          style={{ display: 'inline-block', padding: '0 7px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', height: '20px', lineHeight: '20px', letterSpacing: '0.03em' }}>CONFLICT</span>
                      ) : isInactive ? (
                        <span className="bg-[#FEE2E2] dark:bg-[#450A0A] text-[#991B1B] dark:text-[#FCA5A5]"
                          style={{ display: 'inline-block', padding: '0 7px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', height: '20px', lineHeight: '20px', letterSpacing: '0.03em' }}>INACTIVE</span>
                      ) : (
                        <span className="bg-[#E3FCEF] dark:bg-[#064E3B] text-[#006644] dark:text-[#6EE7B7]"
                          style={{ display: 'inline-block', padding: '0 7px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', height: '20px', lineHeight: '20px', letterSpacing: '0.03em' }}>ACTIVE</span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '0 12px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#232019]"
                        onClick={(e) => handleToggleStatus(e, user)} disabled={togglingId === user.id}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                          border: `1px solid ${user.is_active_in_catalyst ? '#DC2626' : '#16A34A'}`,
                          color: user.is_active_in_catalyst ? '#DC2626' : '#16A34A',
                          cursor: togglingId === user.id ? 'not-allowed' : 'pointer',
                          opacity: togglingId === user.id ? 0.6 : undefined, whiteSpace: 'nowrap',
                        }}>
                        {togglingId === user.id ? <Loader2 size={10} className="animate-spin" /> : <UserX size={10} />}
                        {user.is_active_in_catalyst ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ══ Pagination ══ */}
        <div className="shrink-0 flex items-center justify-between bg-[#F8FAFC] dark:bg-[#12141A]"
          style={{ padding: '9px 16px', borderTop: '0.75px solid rgba(15,23,42,0.06)' }}>
          <span className="text-[#64748B] dark:text-[#A09890]" style={{ fontSize: '11px' }}>
            {totalCount > 0 ? `Showing ${showStart}–${showEnd} of ${totalCount} users` : 'No results'}
          </span>
          <div className="flex gap-1 items-center">
            <button
              className="bg-white dark:bg-[#232019]"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.4 : 1, border: '1px solid rgba(15,23,42,0.10)',
              }}
            >
              <ChevronLeft size={13} className="text-[#334155] dark:text-[#A09890]" />
            </button>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ell-${i}`} className="text-[#94A3B8] dark:text-[#6B6560]" style={{ width: '28px', textAlign: 'center', fontSize: '11px' }}>…</span>
              ) : (
                <button
                  className={
                    page === p
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white dark:bg-[#232019] text-[#64748B] dark:text-[#A09890]'
                  }
                  key={p}
                  onClick={() => setPage(p as number)}
                  style={{
                    width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                    border: page === p ? 'none' : '1px solid rgba(15,23,42,0.10)',
                  }}
                >
                  {p}
                </button>
              )
            )}
            <button
              className="bg-white dark:bg-[#232019]"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.4 : 1, border: '1px solid rgba(15,23,42,0.10)',
              }}
            >
              <ChevronRight size={13} className="text-[#334155] dark:text-[#A09890]" />
            </button>
          </div>
        </div>

        </div>{/* end table column */}

        {activeUserId && (
          <UserDetailPanel
            userId={activeUserId}
            onClose={() => setActiveUserId(null)}
          />
        )}
        </div>{/* end flex row */}

      </div>{/* end Layer 2 content surface */}

      <CreateCatalystUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
};

export default JiraUserSync;
