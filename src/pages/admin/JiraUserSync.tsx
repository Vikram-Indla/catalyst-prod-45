import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, RefreshCw, Search, ChevronLeft, ChevronRight, UserX, Copy, X, Loader2, Share2, Download, Users2, FolderSearch } from 'lucide-react';
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
  { key: 'jiraSynced',   dot: '#16A34A', label: 'Jira Synced',    sub: '↑ from last sync' },
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

const HEADERS = ['User / Jira Identity', 'Auth Mode', 'Projects & Permissions', 'Synced At', 'Last Login', 'Status', ''];

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

/* ── Permission level badge ── */
const PERM_STYLES: Record<string, { bg: string; color: string }> = {
  full: { bg: '#DCFCE7', color: '#006644' },
  edit: { bg: '#FEF3C7', color: '#92400E' },
  view: { bg: '#DEEBFF', color: '#0747A6' },
  none: { bg: '#F1F5F9', color: '#64748B' },
};

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

  // ESC key to close panel
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
    <div className="jus-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FFFFFF' }}>
      {/* ══ Page Header ══ */}
      <div className="jus-surface" style={{
        position: 'sticky', top: 0, zIndex: 10, background: '#FFFFFF',
        borderBottom: '1px solid rgba(15,23,42,0.10)', padding: '14px 20px 0',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '12px',
        }}>
          <div>
            <h1 className="jus-text-primary" style={{
              fontFamily: "'Sora', sans-serif", fontSize: '17px', fontWeight: 700,
              color: '#0F172A', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.3,
            }}>
              Jira User Sync
            </h1>
            <p className="jus-text-muted" style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>
              Bidirectional identity bridge · Jira Cloud ↔ Catalyst · Live proxy auth · Webhooks active
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                border: '1px solid rgba(15,23,42,0.10)', background: '#FFFFFF', color: '#334155',
                padding: '5px 11px', borderRadius: '5px', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', lineHeight: 1,
              }}
            >
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
              }}
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>
        </div>
      </div>

      {/* ══ Stats Row ══ */}
      <div className="jus-surface" style={{ display: 'flex', borderBottom: '1px solid rgba(15,23,42,0.10)' }}>
        {STATS_CONFIG.map((card, i) => (
          <div
            key={card.key}
            className="jus-stat-card"
            style={{
              flex: 1, padding: '10px 16px', background: '#FFFFFF',
              borderLeft: i > 0 ? '1px solid rgba(15,23,42,0.10)' : 'none',
              cursor: 'default', transition: 'background 120ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.035)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: card.dot, flexShrink: 0 }} />
              <span className="jus-stat-label" style={{ fontSize: '10px', fontWeight: 500, color: '#64748B' }}>{card.label}</span>
            </div>
            <div className="jus-stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
              {getStatValue(card.key)}
            </div>
            <div className="jus-text-muted" style={{ fontSize: '10px', color: '#94A3B8', marginTop: '1px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ══ Toolbar ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px',
        borderBottom: '1px solid rgba(15,23,42,0.06)', flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 5, background: '#FFFFFF',
      }}>
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name, email, Jira ID, project…"
            style={{
              width: '100%', padding: '5px 10px 5px 26px', border: '1px solid rgba(15,23,42,0.10)',
              borderRadius: '4px', fontSize: '12px', color: '#0F172A', outline: 'none', background: '#FFFFFF',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '4px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                border: filter === f.value ? '1px solid #BFDBFE' : '1px solid rgba(15,23,42,0.10)',
                background: filter === f.value ? '#EFF6FF' : '#FFFFFF',
                color: filter === f.value ? '#2563EB' : '#334155',
                cursor: 'pointer', transition: 'all 120ms ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          {selected.size > 0 && (
            <button onClick={handleCopyPermissions} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '4px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
              background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)', color: '#334155', cursor: 'pointer',
            }}>
              <Copy size={11} /> Copy Permissions
            </button>
          )}
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '4px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
            background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)', color: '#334155', cursor: 'pointer',
          }}>
            <Download size={11} /> Export
          </button>
        </div>
      </div>

      {/* ══ Selection Bar ══ */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 18px',
          background: '#EFF6FF', borderBottom: '1px solid #BFDBFE',
        }}>
          <input
            type="checkbox"
            checked
            onChange={clearAll}
            style={{ cursor: 'pointer', accentColor: '#2563EB' }}
          />
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#2563EB' }}>
            {selected.size} users selected
          </span>
          <button onClick={handleCopyPermissions} style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
            background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)', color: '#334155', cursor: 'pointer',
          }}>
            <Copy size={11} /> Copy permissions to selected
          </button>
          <button onClick={handleBulkDeactivate} style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
            background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)', color: '#DC2626', cursor: 'pointer',
          }}>
            <UserX size={11} /> Make Inactive
          </button>
          <button onClick={clearAll} style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center',
            padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
            background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer',
          }}>
            Clear
          </button>
        </div>
      )}

      {/* ══ Table + Detail Panel ══ */}
      <div className="flex flex-1 overflow-hidden">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ══ Table ══ */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr style={{ background: '#F1F5F9', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              <th style={{ width: '36px', padding: '8px 12px', textAlign: 'center' }}>
                <input
                  ref={headerCheckRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => allSelected ? clearAll() : selectAll()}
                  style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                />
              </th>
              {HEADERS.map(h => (
                <th key={h || 'action'} style={{
                  padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
                  color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usersLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={`skel-${i}`} style={{ height: '40px', maxHeight: '40px', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
                  <td style={{ padding: '0 12px' }}><div className="animate-pulse" style={{ width: 14, height: 14, borderRadius: 2, background: '#E2E8F0' }} /></td>
                  <td style={{ padding: '0 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="animate-pulse" style={{ width: 28, height: 28, borderRadius: '50%', background: '#E2E8F0' }} />
                      <div>
                        <div className="animate-pulse" style={{ width: 120, height: 10, borderRadius: 2, background: '#E2E8F0', marginBottom: 4 }} />
                        <div className="animate-pulse" style={{ width: 160, height: 8, borderRadius: 2, background: '#F1F5F9' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0 12px' }}><div className="animate-pulse" style={{ width: 70, height: 16, borderRadius: 3, background: '#E2E8F0' }} /></td>
                  <td style={{ padding: '0 12px' }}><div className="animate-pulse" style={{ width: 100, height: 16, borderRadius: 3, background: '#E2E8F0' }} /></td>
                  <td style={{ padding: '0 12px' }}><div className="animate-pulse" style={{ width: 80, height: 10, borderRadius: 2, background: '#E2E8F0' }} /></td>
                  <td style={{ padding: '0 12px' }}><div className="animate-pulse" style={{ width: 60, height: 10, borderRadius: 2, background: '#E2E8F0' }} /></td>
                  <td style={{ padding: '0 12px' }}><div className="animate-pulse" style={{ width: 50, height: 18, borderRadius: 3, background: '#E2E8F0' }} /></td>
                  <td />
                </tr>
              ))
            ) : users.length === 0 && !usersFetching ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px' }}>
                  {debouncedSearch ? (
                    <>
                      <Search size={24} style={{ color: '#94A3B8', margin: '0 auto 10px', display: 'block' }} />
                      <div style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>No users match '{debouncedSearch}'</div>
                      <button
                        onClick={() => setSearch('')}
                        style={{ marginTop: 8, fontSize: '12px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}
                      >Clear search</button>
                    </>
                  ) : filter !== 'all' ? (
                    <>
                      <FolderSearch size={24} style={{ color: '#94A3B8', margin: '0 auto 10px', display: 'block' }} />
                      <div style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                        {filter === 'conflict' ? 'No conflicts found' : filter === 'inactive' ? 'No inactive users' : `No ${filter} users found`}
                      </div>
                      <button
                        onClick={() => setFilter('all')}
                        style={{ marginTop: 8, fontSize: '12px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}
                      >View all users</button>
                    </>
                  ) : (
                    <>
                      <Users2 size={32} style={{ color: '#94A3B8', margin: '0 auto 10px', display: 'block' }} />
                      <div style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>No synced users yet</div>
                      <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        style={{
                          marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: '#2563EB', color: '#FFFFFF', border: 'none',
                          padding: '6px 14px', borderRadius: '5px', fontSize: '12px', fontWeight: 600,
                          cursor: isSyncing ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
                        Sync Now to pull users from Jira
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              users.map((user: any, idx: number) => {
                const isInactive = !user.is_active_in_catalyst;
                const isCatalystOnly = user.catalyst_only;
                const hasConflicts = user.conflict_fields && user.conflict_fields.length > 0;
                const isActive = activeUserId === user.id;
                const isSelected = selected.has(user.id);
                const perms = user.jira_user_project_perms ?? [];
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                let rowBg = 'transparent';
                if (isActive) rowBg = 'rgba(37,99,235,0.07)';
                else if (isSelected) rowBg = 'rgba(37,99,235,0.07)';
                else if (hasConflicts) rowBg = 'rgba(251,191,36,0.04)';

                return (
                  <tr
                    key={user.id}
                    className="group"
                    onClick={() => setActiveUserId(user.id === activeUserId ? null : user.id)}
                    style={{
                      height: '40px', maxHeight: '40px',
                      borderBottom: '0.75px solid rgba(15,23,42,0.06)',
                      borderLeft: isCatalystOnly ? '2px solid #7C3AED' : 'none',
                      cursor: 'pointer',
                      opacity: isInactive ? 0.5 : 1,
                      background: rowBg,
                      transition: 'background 120ms ease',
                    }}
                    onMouseEnter={e => { if (!isActive && !isSelected) e.currentTarget.style.background = hasConflicts ? 'rgba(251,191,36,0.07)' : 'rgba(15,23,42,0.035)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '0 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(user.id)}
                        style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                      />
                    </td>

                    {/* User / Jira Identity */}
                    <td style={{ padding: '0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                          background: user.avatar_url ? 'transparent' : avatarColor.bg,
                          color: avatarColor.text,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 700,
                          overflow: 'hidden',
                        }}>
                          {user.avatar_url
                            ? <img src={user.avatar_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                            : getInitials(user.display_name || '?')
                          }
                        </div>
                        <div style={{ minWidth: 0, maxWidth: '220px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{
                              fontSize: '12px', fontWeight: 500, color: '#0F172A',
                              textDecoration: isInactive ? 'line-through' : 'none',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {user.display_name}
                            </span>
                            {isCatalystOnly && (
                              <span style={{
                                fontSize: '9px', fontWeight: 600, color: '#7C3AED',
                                whiteSpace: 'nowrap',
                              }}>
                                ◆ Local
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '10px', color: '#64748B',
                            fontFamily: "'JetBrains Mono', monospace",
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Auth Mode */}
                    <td style={{ padding: '0 12px' }}>
                      {user.auth_mode === 'jira_proxy' ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700,
                          letterSpacing: '0.03em', textTransform: 'uppercase',
                          background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                        }}>
                          <Share2 size={9} /> Jira Proxy
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700,
                          letterSpacing: '0.03em', textTransform: 'uppercase',
                          background: '#F5F3FF', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.25)',
                        }}>
                          Local Auth
                        </span>
                      )}
                    </td>

                    {/* Projects & Permissions */}
                    <td style={{ padding: '0 12px', maxWidth: '200px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                        {perms.slice(0, 2).map((p: any) => {
                          const ps = PERM_STYLES[p.permission_level] ?? PERM_STYLES.none;
                          return (
                            <span key={p.id} style={{
                              display: 'inline-flex', alignItems: 'center', gap: '2px',
                              padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 500,
                              background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                              whiteSpace: 'nowrap',
                            }}>
                              {p.project_key}
                              <span style={{
                                fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase',
                                background: ps.bg, color: ps.color, borderRadius: '2px',
                                padding: '0 3px', height: '16px', lineHeight: '16px', marginLeft: '2px',
                              }}>
                                {p.permission_level}
                              </span>
                            </span>
                          );
                        })}
                        {perms.length > 2 && (
                          <span style={{
                            padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 500,
                            background: '#F8FAFC', color: '#64748B', whiteSpace: 'nowrap',
                          }}>
                            +{perms.length - 2}
                          </span>
                        )}
                        {perms.length === 0 && (
                          <span style={{ fontSize: '10px', color: '#94A3B8', fontStyle: 'italic' }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Synced At */}
                    <td style={{ padding: '0 12px' }}>
                      {isCatalystOnly ? (
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Not synced</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', color: '#64748B', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                            {formatSyncDate(user.last_synced_at)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Last Login */}
                    <td style={{ padding: '0 12px', fontSize: '11px', color: '#64748B' }}>
                      {user.last_catalyst_login_at
                        ? formatSyncDate(user.last_catalyst_login_at)
                        : '—'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0 12px' }}>
                      {hasConflicts ? (
                        <span style={{
                          display: 'inline-block', padding: '0 7px', borderRadius: '3px',
                          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                          height: '20px', lineHeight: '20px',
                          background: '#FEF3C7', color: '#92400E',
                        }}>
                          CONFLICT
                        </span>
                      ) : isInactive ? (
                        <span style={{
                          display: 'inline-block', padding: '0 7px', borderRadius: '3px',
                          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                          height: '20px', lineHeight: '20px',
                          background: '#FEE2E2', color: '#991B1B',
                        }}>
                          INACTIVE
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-block', padding: '0 7px', borderRadius: '3px',
                          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                          height: '20px', lineHeight: '20px',
                          background: '#E3FCEF', color: '#006644',
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </td>

                    {/* Action — hover reveal */}
                    <td style={{ padding: '0 12px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleToggleStatus(e, user)}
                        disabled={togglingId === user.id}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                          border: `1px solid ${user.is_active_in_catalyst ? '#DC2626' : '#16A34A'}`,
                          background: '#FFFFFF',
                          color: user.is_active_in_catalyst ? '#DC2626' : '#16A34A',
                          cursor: togglingId === user.id ? 'not-allowed' : 'pointer',
                          opacity: togglingId === user.id ? 0.6 : undefined,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {togglingId === user.id
                          ? <Loader2 size={10} className="animate-spin" />
                          : <UserX size={10} />
                        }
                        {user.is_active_in_catalyst ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ══ Pagination ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 16px', borderTop: '1px solid rgba(15,23,42,0.06)',
        background: '#F8FAFC', flexShrink: 0,
      }}>
        <span style={{ fontSize: '11px', color: '#64748B' }}>
          {totalCount > 0 ? `Showing ${showStart}–${showEnd} of ${totalCount} users` : 'No results'}
        </span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '4px', border: '1px solid rgba(15,23,42,0.10)',
              background: '#FFFFFF', cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={13} color="#334155" />
          </button>
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`ell-${i}`} style={{ width: '28px', textAlign: 'center', fontSize: '11px', color: '#94A3B8' }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                style={{
                  width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                  border: page === p ? 'none' : '1px solid rgba(15,23,42,0.10)',
                  background: page === p ? '#2563EB' : '#FFFFFF',
                  color: page === p ? '#FFFFFF' : '#64748B',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '4px', border: '1px solid rgba(15,23,42,0.10)',
              background: '#FFFFFF', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.4 : 1,
            }}
          >
            <ChevronRight size={13} color="#334155" />
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

      <CreateCatalystUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
};

export default JiraUserSync;
