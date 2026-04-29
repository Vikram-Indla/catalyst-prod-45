import React, { useState, useEffect, useRef } from 'react';
import { Plus, RefreshCw, Search, ChevronLeft, ChevronRight, UserX, Copy, Loader2, Share2, Download, Users2, FolderSearch, FolderPlus, Check } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import UserDetailPanel from '@/components/admin/UserDetailPanel';
import { toast } from 'sonner';
import {
  useJiraSyncStats,
  useTriggerUserSync,
  useJiraSyncUsers,
  useToggleUserStatus,
  useCopyPermissions,
  useJiraProjects,
  useAssignUsersToProject,
} from '@/hooks/useJiraUserSync';
import type { SyncFilter } from '@/types/jiraSync';
import CreateCatalystUserModal from '@/components/admin/CreateCatalystUserModal';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/* ── Theme tokens (inline style object) ── */

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

const PER_PAGE = 10;

const AVATAR_COLORS = [
  { bg: '#DBEAFE', text: '#1D4ED8' }, { bg: '#DCFCE7', text: '#15803D' },
  { bg: '#FEF3C7', text: '#92400E' }, { bg: '#EDE9FE', text: '#5B21B6' },
  { bg: '#FEE2E2', text: '#991B1B' }, { bg: '#F0FDF4', text: '#0F766E' },
  { bg: '#EFF6FF', text: '#1D4ED8' }, { bg: '#E0F2FE', text: '#0369A1' },
  { bg: '#F5F3FF', text: '#7C3AED' }, { bg: '#CCFBF1', text: '#0F766E' },
];

const HEADERS = ['User / Jira Identity', 'Auth Mode', 'Projects & Permissions', 'Synced At', 'Last Jira Login', 'Last in Catalyst', 'Status', ''];

const PERM_DOT: Record<string, string> = {
  full: '#16A34A',
  edit: '#2563EB',
  view: '#9CA3AF',
};

/* ── Helpers ── */
function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

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

function displayEmail(email: string | null | undefined): string {
  if (!email || email.includes('@jira.placeholder')) return '—';
  return email;
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
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
  const [assignPermLevel, setAssignPermLevel] = useState<'view' | 'edit' | 'full'>('view');
  const [assignSearch, setAssignSearch] = useState('');
  const { isDark } = useTheme();

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: statsData, isLoading: statsLoading } = useJiraSyncStats();
  const { data: usersResult, isLoading: usersLoading, isFetching: usersFetching } = useJiraSyncUsers(page, filter, debouncedSearch);
  const { mutate: triggerSync, isPending: isSyncing } = useTriggerUserSync();
  const { mutate: toggleStatus } = useToggleUserStatus();
  const { mutate: copyPerms } = useCopyPermissions();
  const { data: jiraProjects } = useJiraProjects();
  const { mutate: assignToProject, isPending: isAssigning } = useAssignUsersToProject();

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
    <div
      className="flex flex-col h-full"
      style={{ background: isDark ? 'var(--cp-bg-page, #1F1F21)' : '#F8FAFC', minHeight: '100vh' }}
    >

      {/* Layer 2 — Main content surface */}
      <div className="jira-surface flex flex-col flex-1 overflow-hidden mx-5 my-4 rounded-lg"
        style={{
          background: isDark ? 'var(--cp-bg-page, #1F1F21)' : '#FFFFFF',
          border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}`,
        }}>

        {/* ══ Page Header ══ */}
        <div className="jira-header-area shrink-0" style={{ padding: '14px 20px 0', borderBottom: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}` }}>
          <div className="flex items-start justify-between pb-3">
            <div>
              <h1 className="jira-text-primary"
                style={{ fontFamily: 'var(--cp-font-heading)', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px', margin: 0, lineHeight: 1.3, color: isDark ? '#EDEDED' : '#0F172A' }}>
                Jira User Sync
              </h1>
              <p className="jira-text-secondary"
                style={{ fontSize: '11px', margin: '2px 0 0', color: isDark ? '#A1A1A1' : '#64748B' }}>
                Bidirectional identity bridge · Jira Cloud ↔ Catalyst · Live proxy auth · Webhooks active
              </p>
            </div>
            <div className="flex gap-2 shrink-0 items-center">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="jira-btn-secondary"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '5px 11px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', lineHeight: 1,
                  background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF',
                  color: isDark ? '#A1A1A1' : '#334155',
                  border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
                }}>
                <Plus size={11} /> Create User
              </button>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: '#2563EB', color: '#FFFFFF', border: 'none',
                  padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                  cursor: isSyncing ? 'not-allowed' : 'pointer', opacity: isSyncing ? 0.7 : 1, lineHeight: 1,
                }}>
                <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>
          </div>
        </div>

        {/* ══ Stat Cards ══ */}
        <div className="jira-stat-band shrink-0 flex flex-nowrap" style={{ gap: '12px', padding: '20px 24px 18px', borderBottom: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}` }}>
          {STATS_CONFIG.map((card) => (
            <div
              key={card.key}
              className="jira-card"
              style={{
                flex: 1, minWidth: '140px', padding: '16px 20px', borderRadius: '8px',
                background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF',
                border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.08)'}`,
              }}
            >
              <div className="flex items-center gap-[5px] mb-[4px]">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: card.dot, flexShrink: 0 }} />
                <span className="jira-stat-label"
                  style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em', fontFamily: 'var(--cp-font-body)', color: isDark ? '#878787' : '#64748B' }}>
                  {card.label}
                </span>
              </div>
              <div className="jira-stat-value"
                style={{ fontSize: '28px', fontWeight: 650, lineHeight: 1.1, fontFamily: 'var(--cp-font-heading)', color: isDark ? '#EDEDED' : '#0F172A' }}>
                {getStatValue(card.key)}
              </div>
              <div className="jira-stat-sub"
                style={{ fontSize: '11px', marginTop: '4px', color: isDark ? '#878787' : '#94A3B8' }}>
                {card.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ══ Toolbar ══ */}
        <div className="jira-toolbar shrink-0 flex items-center gap-[7px] flex-wrap"
          style={{ padding: '9px 18px', background: isDark ? 'var(--cp-bg-page, #1F1F21)' : '#FFFFFF', borderBottom: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}` }}>
          <div className="relative w-[220px]">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#878787' : '#64748B' }} />
            <input
              className="jira-input w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, email, Jira ID, project…"
              style={{
                padding: '5px 10px 5px 26px', borderRadius: '4px', fontSize: '12px', outline: 'none',
                background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF',
                color: isDark ? '#EDEDED' : '#0F172A',
                border: `1px solid ${isDark ? '#454545' : 'rgba(15,23,42,0.10)'}`,
              }}
            />
          </div>
          <div className="flex gap-[6px]">
            {FILTERS.map(f => (
              <button
                key={f.value}
                className={filter === f.value ? 'jira-filter-active' : 'jira-filter-inactive'}
                onClick={() => setFilter(f.value)}
                style={{
                  padding: '4px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                  transition: 'all 120ms ease',
                  background: filter === f.value
                    ? (isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF')
                    : (isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF'),
                  color: filter === f.value
                    ? (isDark ? '#93C5FD' : '#2563EB')
                    : (isDark ? '#A1A1A1' : '#334155'),
                  border: filter === f.value
                    ? `1px solid ${isDark ? 'rgba(37,99,235,0.25)' : '#BFDBFE'}`
                    : `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-[6px]">
            {selected.size > 0 && (
              <button onClick={handleCopyPermissions}
                className="jira-btn-secondary"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '4px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                  background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF',
                  color: isDark ? '#A1A1A1' : '#334155',
                  border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
                }}>
                <Copy size={11} /> Copy Permissions
              </button>
            )}
            <button
              className="jira-btn-secondary"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '4px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF',
                color: isDark ? '#A1A1A1' : '#334155',
                border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
              }}>
              <Download size={11} /> Export
            </button>
          </div>
        </div>

        {/* ══ Selection Bar ══ */}
        {selected.size > 0 && (
          <div className="jira-selection-bar shrink-0 flex items-center gap-[9px]"
            style={{
              padding: '7px 18px',
              background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF',
              borderBottom: `1px solid ${isDark ? 'rgba(37,99,235,0.25)' : '#BFDBFE'}`,
            }}>
            <input type="checkbox" checked onChange={clearAll} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
            <span className="jira-selection-count" style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#93C5FD' : '#2563EB' }}>
              {selected.size} users selected
            </span>
            <span style={{ fontSize: '11px', color: isDark ? '#2E2E2E' : '#94A3B8' }}>|</span>

            <Popover open={assignPopoverOpen} onOpenChange={setAssignPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', border: 'none', background: '#2563EB', color: '#FFFFFF',
                  }}>
                  <FolderPlus size={11} /> Assign to Project ▾
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="jira-popover-surface"
                style={{
                  width: '360px', padding: 0,
                  background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}`,
                }}
                align="start"
              >
                <div style={{ padding: '12px 14px 8px' }}>
                  <div className="jira-text-primary" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px', color: isDark ? '#EDEDED' : '#0F172A' }}>
                    Assign to Jira Space
                  </div>
                  <div className="jira-text-secondary" style={{ fontSize: '11px', marginBottom: '8px', color: isDark ? '#A1A1A1' : '#64748B' }}>
                    Select a project. Permission level applies to all {selected.size} selected users.
                  </div>
                  <input
                    value={assignSearch}
                    onChange={e => setAssignSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="jira-input w-full"
                    style={{
                      padding: '5px 8px', borderRadius: '4px', fontSize: '11px', outline: 'none', marginBottom: '6px',
                      background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F8FAFC',
                      color: isDark ? '#EDEDED' : '#0F172A',
                      border: `1px solid ${isDark ? '#454545' : 'rgba(15,23,42,0.10)'}`,
                    }}
                  />
                  <div className="flex items-center gap-1 mb-2">
                    <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', marginRight: '4px', color: isDark ? '#878787' : '#64748B' }}>Level:</span>
                    {(['view', 'edit', 'full'] as const).map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setAssignPermLevel(lvl)}
                        style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                          textTransform: 'uppercase', cursor: 'pointer',
                          border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
                          background: assignPermLevel === lvl
                            ? lvl === 'full' ? '#DCFCE7' : lvl === 'edit' ? '#EFF6FF' : '#F1F5F9'
                            : 'transparent',
                          color: assignPermLevel === lvl
                            ? lvl === 'full' ? '#006644' : lvl === 'edit' ? '#1D4ED8' : '#64748B'
                            : (isDark ? '#878787' : '#94A3B8'),
                        }}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', borderTop: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}` }}>
                  {(jiraProjects || [])
                    .filter(p => !assignSearch || p.project_key.toLowerCase().includes(assignSearch.toLowerCase()) || (p.project_name || '').toLowerCase().includes(assignSearch.toLowerCase()))
                    .map(proj => (
                      <button
                        key={proj.project_key}
                        className="jira-popover-item w-full flex items-center gap-2 text-left"
                        style={{ padding: '7px 14px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        disabled={isAssigning}
                        onClick={() => {
                          const ids = Array.from(selected);
                          assignToProject({
                            userIds: ids,
                            projectId: proj.project_id,
                            projectKey: proj.project_key,
                            projectName: proj.project_name || proj.project_key,
                            permissionLevel: assignPermLevel,
                          }, {
                            onSuccess: () => {
                              toast.success(`${ids.length} users assigned to ${proj.project_key} with ${assignPermLevel} access`);
                              setAssignPopoverOpen(false);
                              setAssignSearch('');
                            },
                            onError: () => toast.error('Failed to assign users'),
                          });
                        }}
                      >
                        <span className="jira-chip"
                          style={{
                            fontSize: '10px', fontWeight: 700, fontFamily: 'var(--cp-font-mono)', padding: '1px 5px', borderRadius: '4px',
                            background: isDark ? '#2E2E2E' : '#F1F5F9',
                            color: isDark ? '#A1A1A1' : '#374151',
                          }}>
                          {proj.project_key}
                        </span>
                        <span style={{ fontSize: '11px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isDark ? '#A1A1A1' : '#334155' }}>
                          {proj.project_name || proj.project_key}
                        </span>
                        <Check size={10} style={{ color: '#94A3B8', opacity: 0 }} />
                      </button>
                    ))}
                  {(jiraProjects || []).filter(p => !assignSearch || p.project_key.toLowerCase().includes(assignSearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: isDark ? '#878787' : '#94A3B8' }}>
                      No projects found
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <button onClick={handleBulkDeactivate}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF',
                color: '#DC2626',
                border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
              }}>
              <UserX size={11} /> Deactivate
            </button>
            <button onClick={handleCopyPermissions}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF',
                color: isDark ? '#A1A1A1' : '#334155',
                border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
              }}>
              <Copy size={11} /> Copy Permissions
            </button>
            <button onClick={clearAll}
              className="ml-auto"
              style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer', color: isDark ? '#878787' : '#64748B' }}>
              Clear selection
            </button>
          </div>
        )}

        {/* ══ Table + Detail Panel ══ */}
        <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">

        {/* ══ Table ══ */}
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr className="jira-table-header" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9', borderBottom: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}` }}>
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
                    className="jira-text-th"
                    style={{
                      padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      color: isDark ? '#878787' : '#6B7280',
                    }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="jira-row"
                    style={{ height: '50px', maxHeight: '50px', borderBottom: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}` }}>
                    <td style={{ padding: '8px 12px' }}><div className="jira-skeleton animate-pulse" style={{ width: 14, height: 14, borderRadius: 4, background: isDark ? '#2E2E2E' : '#E2E8F0' }} /></td>
                    <td style={{ padding: '8px 12px' }}>
                      <div className="flex items-center gap-2">
                        <div className="jira-skeleton animate-pulse" style={{ width: 28, height: 28, borderRadius: '50%', background: isDark ? '#2E2E2E' : '#E2E8F0' }} />
                        <div>
                          <div className="jira-skeleton animate-pulse" style={{ width: 120, height: 10, borderRadius: 4, marginBottom: 4, background: isDark ? '#2E2E2E' : '#E2E8F0' }} />
                          <div className="jira-skeleton animate-pulse" style={{ width: 160, height: 8, borderRadius: 4, background: isDark ? '#2E2E2E' : '#F1F5F9' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}><div className="jira-skeleton animate-pulse" style={{ width: 70, height: 16, borderRadius: 4, background: isDark ? '#2E2E2E' : '#E2E8F0' }} /></td>
                    <td style={{ padding: '8px 12px' }}><div className="jira-skeleton animate-pulse" style={{ width: 100, height: 16, borderRadius: 4, background: isDark ? '#2E2E2E' : '#E2E8F0' }} /></td>
                    <td style={{ padding: '8px 12px' }}><div className="jira-skeleton animate-pulse" style={{ width: 80, height: 10, borderRadius: 4, background: isDark ? '#2E2E2E' : '#E2E8F0' }} /></td>
                    <td style={{ padding: '8px 12px' }}><div className="jira-skeleton animate-pulse" style={{ width: 60, height: 10, borderRadius: 4, background: isDark ? '#2E2E2E' : '#E2E8F0' }} /></td>
                    <td style={{ padding: '8px 12px' }}><div className="jira-skeleton animate-pulse" style={{ width: 60, height: 10, borderRadius: 4, background: isDark ? '#2E2E2E' : '#E2E8F0' }} /></td>
                    <td style={{ padding: '8px 12px' }}><div className="jira-skeleton animate-pulse" style={{ width: 50, height: 18, borderRadius: 4, background: isDark ? '#2E2E2E' : '#E2E8F0' }} /></td>
                    <td />
                  </tr>
                ))
              ) : users.length === 0 && !usersFetching ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    {debouncedSearch ? (
                      <>
                        <Search size={24} style={{ color: isDark ? '#878787' : '#94A3B8', margin: '0 auto 10px', display: 'block' }} />
                        <div className="jira-text-primary" style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#EDEDED' : '#334155' }}>No users match '{debouncedSearch}'</div>
                        <button onClick={() => setSearch('')}
                          style={{ marginTop: 8, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB' }}>Clear search</button>
                      </>
                    ) : filter !== 'all' ? (
                      <>
                        <FolderSearch size={24} style={{ color: isDark ? '#878787' : '#94A3B8', margin: '0 auto 10px', display: 'block' }} />
                        <div className="jira-text-primary" style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#EDEDED' : '#334155' }}>
                          {filter === 'conflict' ? 'No conflicts found' : filter === 'inactive' ? 'No inactive users' : `No ${filter} users found`}
                        </div>
                        <button onClick={() => setFilter('all')}
                          style={{ marginTop: 8, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB' }}>View all users</button>
                      </>
                    ) : (
                      <>
                        <Users2 size={32} style={{ color: isDark ? '#878787' : '#94A3B8', margin: '0 auto 10px', display: 'block' }} />
                        <div className="jira-text-primary" style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#EDEDED' : '#334155' }}>No synced users yet</div>
                        <button onClick={handleSync} disabled={isSyncing}
                          style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: isSyncing ? 'not-allowed' : 'pointer' }}>
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

                const rowBg = (isActiveRow || isSelected)
                  ? (isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.07)')
                  : hasConflicts
                    ? (isDark ? 'rgba(251,191,36,0.06)' : 'rgba(251,191,36,0.04)')
                    : 'transparent';

                return (
                  <tr key={user.id}
                    className={`group jira-row ${isActiveRow || isSelected ? 'jira-row-selected' : ''} ${hasConflicts ? 'jira-row-conflict' : ''}`}
                    onClick={() => setActiveUserId(user.id === activeUserId ? null : user.id)}
                    style={{
                      height: '50px', maxHeight: '50px',
                      borderBottom: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}`,
                      borderLeft: isCatalystOnly ? '2px solid #7C3AED' : 'none',
                      cursor: 'pointer', opacity: isInactive ? 0.5 : 1,
                      transition: 'background 120ms ease',
                      background: rowBg,
                    }}>

                    <td style={{ padding: '8px 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(user.id)} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
                    </td>

                    {/* User / Jira Identity */}
                    <td style={{ padding: '8px 12px' }}>
                      <div className="flex items-center gap-2">
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: user.avatar_url ? 'transparent' : avatarColor.bg, color: avatarColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, overflow: 'hidden' }}>
                          {user.avatar_url ? <img src={user.avatar_url} alt="" loading="lazy" style={{ width: '28px', height: '28px', borderRadius: '50%' }} /> : getInitials(user.display_name || '?')}
                        </div>
                        <div style={{ minWidth: 0, maxWidth: '220px' }}>
                          <div className="flex items-center gap-[5px]">
                            <span className="jira-text-primary" style={{ fontSize: '12px', fontWeight: 500, textDecoration: isInactive ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isDark ? '#EDEDED' : '#0F172A' }}>{user.display_name}</span>
                            {isCatalystOnly && <span className="jira-local-marker" style={{ fontSize: '9px', fontWeight: 600, whiteSpace: 'nowrap', color: isDark ? '#C4B5FD' : '#7C3AED' }}>◆ Local</span>}
                          </div>
                          <div className="jira-text-label" style={{ fontSize: '11px', fontFamily: 'var(--cp-font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isDark ? '#878787' : '#6B7280' }}>
                            {displayEmail(user.email)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Auth Mode */}
                    <td style={{ padding: '8px 12px' }}>
                      {user.auth_mode === 'jira_proxy' ? (
                        <span className="jira-badge-jira" style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          padding: '1px 6px', borderRadius: '4px',
                          fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
                          background: isDark ? 'rgba(37,99,235,0.18)' : '#EFF6FF',
                          color: isDark ? '#93C5FD' : '#1D4ED8',
                          border: `0.75px solid ${isDark ? 'rgba(37,99,235,0.30)' : 'rgba(37,99,235,0.25)'}`,
                        }}><Share2 size={9} /> JIRA</span>
                      ) : (
                        <span className="jira-badge-catalyst" style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          padding: '1px 6px', borderRadius: '4px',
                          fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
                          background: isDark ? 'rgba(91,33,182,0.18)' : '#EDE9FE',
                          color: isDark ? '#C4B5FD' : '#5B21B6',
                        }}>CATALYST</span>
                      )}
                    </td>

                    {/* Projects & Permissions */}
                    <td style={{ padding: '8px 12px', maxWidth: '200px' }}>
                      <div className="flex gap-1 flex-nowrap overflow-hidden items-center">
                        {perms.slice(0, 2).map((p: any) => {
                          const dotColor = PERM_DOT[p.permission_level];
                          return (
                            <span key={p.id} className="jira-chip"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '4px',
                                fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
                                background: isDark ? '#2E2E2E' : '#F1F5F9',
                                color: isDark ? '#A1A1A1' : '#374151',
                              }}>
                              {dotColor && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
                              {p.project_key}
                            </span>
                          );
                        })}
                        {perms.length > 2 && <span style={{ fontSize: '10px', fontWeight: 500, whiteSpace: 'nowrap', color: isDark ? '#A1A1A1' : '#64748B' }}>+{perms.length - 2} more</span>}
                        {perms.length === 0 && <span style={{ fontSize: '10px', color: isDark ? '#878787' : '#94A3B8' }}>—</span>}
                      </div>
                    </td>

                    {/* Synced At */}
                    <td style={{ padding: '8px 12px' }}>
                      {isCatalystOnly ? (
                        <span style={{ fontSize: '11px', fontStyle: 'italic', color: isDark ? '#878787' : '#94A3B8' }}>Not synced</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', fontFamily: 'var(--cp-font-mono)', whiteSpace: 'nowrap', color: isDark ? '#A1A1A1' : '#64748B' }}>{formatSyncDate(user.last_synced_at)}</span>
                        </div>
                      )}
                    </td>

                    {/* Last Jira Login */}
                    <td style={{ padding: '8px 12px', fontSize: '11px', fontFamily: 'var(--cp-font-mono)', color: isDark ? '#A1A1A1' : '#64748B' }}>{relativeTime(user.last_jira_login_at)}</td>

                    {/* Last in Catalyst */}
                    <td style={{ padding: '8px 12px', fontSize: '11px', fontFamily: 'var(--cp-font-mono)', color: isDark ? '#A1A1A1' : '#64748B' }}>{relativeTime(user.last_catalyst_login_at)}</td>

                    {/* Status lozenge */}
                    <td style={{ padding: '8px 12px' }}>
                      {hasConflicts ? (
                        <span className="jira-lozenge-conflict"
                          style={{ display: 'inline-block', padding: '0 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', height: '20px', lineHeight: '20px', letterSpacing: '0.03em', background: isDark ? '#451A03' : '#FEF3C7', color: isDark ? '#FCD34D' : '#92400E' }}>CONFLICT</span>
                      ) : isInactive ? (
                        <span className="jira-lozenge-inactive"
                          style={{ display: 'inline-block', padding: '0 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', height: '20px', lineHeight: '20px', letterSpacing: '0.03em', background: isDark ? '#450A0A' : '#FEE2E2', color: isDark ? '#FCA5A5' : '#991B1B' }}>INACTIVE</span>
                      ) : (
                        <span className="jira-lozenge-active"
                          style={{ display: 'inline-block', padding: '0 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', height: '20px', lineHeight: '20px', letterSpacing: '0.03em', background: isDark ? '#064E3B' : '#E3FCEF', color: isDark ? '#6EE7B7' : '#006644' }}>ACTIVE</span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '8px 12px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button className="jira-action-btn opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleToggleStatus(e, user)} disabled={togglingId === user.id}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                          background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF',
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
        <div className="jira-pagination-bg shrink-0 flex items-center justify-between"
          style={{ padding: '9px 16px', borderTop: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.06)'}`, background: isDark ? 'var(--cp-bg-page, #1F1F21)' : '#F8FAFC' }}>
          <span style={{ fontSize: '11px', color: isDark ? '#A1A1A1' : '#64748B' }}>
            {totalCount > 0 ? `Showing ${showStart}–${showEnd} of ${totalCount} users` : 'No results'}
          </span>
          <div className="flex gap-1 items-center">
            <button
              className="jira-pagination-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.4 : 1,
                background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF',
                border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
                color: isDark ? '#A1A1A1' : '#334155',
              }}
            >
              <ChevronLeft size={13} />
            </button>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ell-${i}`} style={{ width: '28px', textAlign: 'center', fontSize: '11px', color: isDark ? '#878787' : '#94A3B8' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  style={{
                    width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '4px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                    background: page === p ? '#2563EB' : (isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF'),
                    color: page === p ? '#FFFFFF' : (isDark ? '#A1A1A1' : '#64748B'),
                    border: page === p ? 'none' : `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
                  }}
                >
                  {p}
                </button>
              )
            )}
            <button
              className="jira-pagination-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.4 : 1,
                background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF',
                border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
                color: isDark ? '#A1A1A1' : '#334155',
              }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        </div>{/* end table column */}

        {activeUserId && (
          <UserDetailPanel
            userId={activeUserId}
            onClose={() => setActiveUserId(null)}
            isDark={isDark}
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
