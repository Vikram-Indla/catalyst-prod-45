import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, RefreshCw, Search, ChevronLeft, ChevronRight, UserX, Copy, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useJiraSyncStats,
  useTriggerUserSync,
  useJiraSyncUsers,
  useToggleUserStatus,
  useCopyPermissions,
} from '@/hooks/useJiraUserSync';
import type { SyncFilter } from '@/types/jiraSync';

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
  { value: 'all',      label: 'All Users' },
  { value: 'jira',     label: 'Jira Synced' },
  { value: 'local',    label: 'Catalyst Only' },
  { value: 'conflict', label: 'Conflicts' },
  { value: 'inactive', label: 'Inactive' },
];

const PER_PAGE = 10;

/* ── Debounce hook ── */
function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
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

  // Queries
  const { data: statsData, isLoading: statsLoading } = useJiraSyncStats();
  const { data: usersResult, isLoading: usersLoading } = useJiraSyncUsers(page, filter, debouncedSearch);
  const { mutate: triggerSync, isPending: isSyncing } = useTriggerUserSync();
  const { mutate: toggleStatus } = useToggleUserStatus();
  const { mutate: copyPerms } = useCopyPermissions();

  const users = usersResult?.data ?? [];
  const totalCount = usersResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  // Reset page when filter/search changes
  useEffect(() => { setPage(1); }, [filter, debouncedSearch]);
  // Clear selection on page/filter change
  useEffect(() => { setSelected(new Set()); }, [page, filter, debouncedSearch]);

  /* ── Stat helper ── */
  const getStatValue = (key: StatsKey): string | number => {
    if (statsLoading || !statsData) return '—';
    return (statsData as any)[key] ?? 0;
  };

  /* ── Sync Now ── */
  const handleSync = () => {
    triggerSync(undefined, {
      onSuccess: () => toast.success('Sync completed — users refreshed'),
      onError: () => toast.error('Sync failed — check Jira connection settings'),
    });
  };

  /* ── Toggle Status ── */
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
        onError: () => {
          toast.error('Failed to update user status');
          setTogglingId(null);
        },
      }
    );
  };

  /* ── Bulk Deactivate ── */
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

  /* ── Copy Permissions ── */
  const handleCopyPermissions = () => {
    if (!activeUserId) { toast.warning('Open a user first to copy permissions from'); return; }
    const targetIds = Array.from(selected).filter(id => id !== activeUserId);
    if (!targetIds.length) { toast.warning('Select target users in the table'); return; }
    copyPerms(
      { sourceId: activeUserId, targetIds },
      {
        onSuccess: () => {
          toast.success(`Permissions copied to ${targetIds.length} user(s)`);
          setSelected(new Set());
        },
        onError: () => toast.error('Failed to copy permissions'),
      }
    );
  };

  /* ── Row Selection ── */
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

  /* ── Indeterminate checkbox ref ── */
  const headerCheckRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  /* ── Pagination ── */
  const showStart = totalCount > 0 ? (page - 1) * PER_PAGE + 1 : 0;
  const showEnd = Math.min(page * PER_PAGE, totalCount);

  /* ── Auth mode badge ── */
  const authBadge = (mode: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      jira_proxy: { bg: '#DEEBFF', color: '#0747A6', label: 'JIRA PROXY' },
      local:      { bg: '#E3FCEF', color: '#006644', label: 'LOCAL' },
      sso:        { bg: '#DFE1E6', color: '#253858', label: 'SSO' },
    };
    const b = map[mode] ?? map.local;
    return (
      <span style={{
        display: 'inline-block', padding: '1px 6px', borderRadius: '3px',
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em',
        background: b.bg, color: b.color, textTransform: 'uppercase',
      }}>
        {b.label}
      </span>
    );
  };

  /* ── Status dot ── */
  const statusDot = (active: boolean) => (
    <span style={{
      display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%',
      background: active ? '#16A34A' : '#DC2626',
    }} />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FFFFFF' }}>
      {/* ══ Page Header ══ */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: '#FFFFFF',
        borderBottom: '1px solid rgba(15,23,42,0.10)', padding: '14px 20px 0',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '12px',
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Sora', sans-serif", fontSize: '17px', fontWeight: 700,
              color: '#0F172A', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.3,
            }}>
              Jira User Sync
            </h1>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>
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
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(15,23,42,0.10)' }}>
        {STATS_CONFIG.map((card, i) => (
          <div
            key={card.key}
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
              <span style={{ fontSize: '10px', fontWeight: 500, color: '#64748B' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
              {getStatValue(card.key)}
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '1px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ══ Toolbar: Search + Filter ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px',
        borderBottom: '1px solid rgba(15,23,42,0.06)',
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
          <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or Jira ID…"
            style={{
              width: '100%', padding: '5px 8px 5px 26px', border: '1px solid rgba(15,23,42,0.10)',
              borderRadius: '5px', fontSize: '12px', color: '#0F172A', outline: 'none', background: '#FFFFFF',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                border: filter === f.value ? '1px solid #2563EB' : '1px solid rgba(15,23,42,0.10)',
                background: filter === f.value ? '#EFF6FF' : '#FFFFFF',
                color: filter === f.value ? '#2563EB' : '#64748B',
                cursor: 'pointer', transition: 'all 120ms ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ Selection Bar ══ */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 20px',
          background: '#EFF6FF', borderBottom: '1px solid rgba(37,99,235,0.15)',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>
            {selected.size} selected
          </span>
          <button onClick={handleBulkDeactivate} style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
            background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)', color: '#DC2626', cursor: 'pointer',
          }}>
            <UserX size={11} /> Make Inactive
          </button>
          <button onClick={handleCopyPermissions} style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
            background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)', color: '#334155', cursor: 'pointer',
          }}>
            <Copy size={11} /> Copy Permissions
          </button>
          <button onClick={clearAll} style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center',
            padding: '2px', background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer',
          }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* ══ Table ══ */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(15,23,42,0.10)', background: '#F8FAFC' }}>
              <th style={{ width: '36px', padding: '8px 12px', textAlign: 'center' }}>
                <input
                  ref={headerCheckRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => allSelected ? clearAll() : selectAll()}
                  style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                />
              </th>
              {['Name', 'Email', 'Auth Mode', 'Status', 'Last Synced', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 600,
                  color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usersLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '13px' }}>
                <Loader2 size={18} className="animate-spin" style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' }} />
                Loading users…
              </td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '13px' }}>
                No users found
              </td></tr>
            ) : (
              users.map((user: any) => {
                const isInactive = !user.is_active_in_catalyst;
                return (
                  <tr
                    key={user.id}
                    onClick={() => setActiveUserId(user.id === activeUserId ? null : user.id)}
                    style={{
                      borderBottom: '0.75px solid rgba(15,23,42,0.06)',
                      cursor: 'pointer',
                      height: '44px',
                      opacity: isInactive ? 0.5 : 1,
                      transition: 'background 120ms ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.025)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '0 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(user.id)}
                        onChange={() => toggleSelectRow(user.id)}
                        style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                      />
                    </td>
                    <td style={{ padding: '0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                        ) : (
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%', background: '#E2E8F0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: 700, color: '#64748B',
                          }}>
                            {(user.display_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span style={{
                          fontSize: '13px', fontWeight: 500, color: '#0F172A',
                          textDecoration: isInactive ? 'line-through' : 'none',
                        }}>
                          {user.display_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0 12px', fontSize: '12px', color: '#334155' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '0 12px' }}>
                      {authBadge(user.auth_mode)}
                    </td>
                    <td style={{ padding: '0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {statusDot(user.is_active_in_catalyst)}
                        <span style={{ fontSize: '12px', color: user.is_active_in_catalyst ? '#16A34A' : '#DC2626' }}>
                          {user.is_active_in_catalyst ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0 12px', fontSize: '11px', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                      {user.last_synced_at
                        ? new Date(user.last_synced_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td style={{ padding: '0 12px' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleToggleStatus(e, user)}
                        disabled={togglingId === user.id}
                        title={user.is_active_in_catalyst ? 'Deactivate' : 'Reactivate'}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 500,
                          border: '1px solid rgba(15,23,42,0.10)', background: '#FFFFFF',
                          color: user.is_active_in_catalyst ? '#DC2626' : '#16A34A',
                          cursor: togglingId === user.id ? 'not-allowed' : 'pointer',
                          opacity: togglingId === user.id ? 0.6 : 1,
                        }}
                      >
                        {togglingId === user.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <UserX size={10} />
                        )}
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
        padding: '8px 20px', borderTop: '1px solid rgba(15,23,42,0.10)',
        background: '#FFFFFF', flexShrink: 0,
      }}>
        <span style={{ fontSize: '11px', color: '#64748B' }}>
          {totalCount > 0 ? `Showing ${showStart}–${showEnd} of ${totalCount}` : 'No results'}
        </span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: '4px 6px', borderRadius: '4px', border: '1px solid rgba(15,23,42,0.10)',
              background: '#FFFFFF', cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.4 : 1, display: 'inline-flex',
            }}
          >
            <ChevronLeft size={13} color="#334155" />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                  border: page === p ? '1px solid #2563EB' : '1px solid rgba(15,23,42,0.10)',
                  background: page === p ? '#EFF6FF' : '#FFFFFF',
                  color: page === p ? '#2563EB' : '#64748B',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: '4px 6px', borderRadius: '4px', border: '1px solid rgba(15,23,42,0.10)',
              background: '#FFFFFF', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.4 : 1, display: 'inline-flex',
            }}
          >
            <ChevronRight size={13} color="#334155" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default JiraUserSync;
