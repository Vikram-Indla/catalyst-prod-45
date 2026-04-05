import React, { useState, useEffect, useRef } from 'react';
import { Plus, RefreshCw, Search, ChevronLeft, ChevronRight, UserX, Copy, Loader2, Share2, Download, Users2, FolderSearch, FolderPlus, Check, Moon, Sun } from 'lucide-react';
import { useThemeMode } from '@/providers/ThemeProvider';
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

/* ── Stats Config ── */
const STAT_CARDS = [
  { key: 'jiraSynced',   dotColor: '#22C55E', label: 'JIRA SYNCED',    subLabel: 'from last sync' },
  { key: 'catalystOnly', dotColor: '#8B5CF6', label: 'CATALYST ONLY',  subLabel: 'not in Jira' },
  { key: 'proxyAuth',    dotColor: '#3B82F6', label: 'PROXY AUTH',     subLabel: 'Jira password active' },
  { key: 'conflicts',    dotColor: '#F59E0B', label: 'CONFLICTS',      subLabel: 'needs resolution' },
  { key: 'inactive',     dotColor: '#EF4444', label: 'INACTIVE',       subLabel: 'access revoked' },
  { key: 'webhooks24h',  dotColor: '#A78BFA', label: 'WEBHOOKS / 24H', subLabel: 'real-time events' },
] as const;

type StatsKey = typeof STAT_CARDS[number]['key'];

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
  const { resolvedTheme, setTheme } = useThemeMode();
  const isDark = resolvedTheme === 'dark';

  /* ── T object: single source of truth for all themed colors ── */
  const T = isDark ? {
    page:       '#0F1114',
    surface:    '#181A1E',
    sunken:     '#12141A',
    elevated:   '#1E2027',
    border:     'rgba(200,210,225,0.08)',
    text1:      'rgba(225,230,240,0.92)',
    text2:      'rgba(200,210,225,0.55)',
    text3:      'rgba(200,210,225,0.35)',
    rowHover:   'rgba(200,210,225,0.04)',
    inputBg:    '#1E2027',
    chipRest:   'transparent',
    chipActive: 'rgba(37,99,235,0.20)',
    chipBorder: 'rgba(200,210,225,0.08)',
  } : {
    page:       '#F8FAFC',
    surface:    '#FFFFFF',
    sunken:     '#F1F5F9',
    elevated:   '#FFFFFF',
    border:     'rgba(15,23,42,0.08)',
    text1:      '#0F172A',
    text2:      '#475569',
    text3:      '#94A3B8',
    rowHover:   'rgba(15,23,42,0.03)',
    inputBg:    '#FFFFFF',
    chipRest:   'transparent',
    chipActive: 'rgba(37,99,235,0.08)',
    chipBorder: 'rgba(15,23,42,0.10)',
  };

  /* ── Lozenge (D03) ── */
  const Lozenge = ({ status }: { status: string }) => {
    const upper = status?.toUpperCase();
    const isActive = upper === 'ACTIVE';
    const isConflict = upper === 'CONFLICT';
    const cls = isConflict ? '' : isActive ? 'jsu-lozenge-active' : 'jsu-lozenge-inactive';
    return (
      <span
        className={cls}
        style={{
          display: 'inline-flex', alignItems: 'center',
          height: 20, padding: '0 8px', borderRadius: 3,
          fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase' as const, letterSpacing: '0.04em', whiteSpace: 'nowrap' as const,
          ...(isConflict ? {
            background: isDark ? '#451A03' : '#FEF3C7',
            color: isDark ? '#FCD34D' : '#92400E',
          } : {}),
        }}
      >
        {status}
      </span>
    );
  };

  /* ── Project Badge (D09) ── */
  const ProjectBadge = ({ label }: { label: string }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 6px', borderRadius: 3,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      background: isDark ? 'rgba(200,210,225,0.08)' : '#F1F5F9',
      color: isDark ? 'rgba(200,210,225,0.70)' : '#374151',
    }}>
      {label}
    </span>
  );

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

  /* ── Hover state for rows ── */
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  return (
    <>
    <style>{`
      .jsu-page { background: ${T.page} !important; min-height: 100vh; }
      .jsu-surface { background: ${T.surface} !important; border-color: ${T.border} !important; }
      .jsu-sunken { background: ${T.sunken} !important; }
      .jsu-elevated { background: ${T.elevated} !important; border-color: ${T.border} !important; }
      .jsu-text-1 { color: ${T.text1} !important; }
      .jsu-text-2 { color: ${T.text2} !important; }
      .jsu-text-3 { color: ${T.text3} !important; }
      .jsu-border { border-color: ${T.border} !important; }
      .jsu-row { background: ${T.surface} !important; border-bottom: 0.75px solid ${T.border} !important; height: 40px !important; max-height: 40px !important; }
      .jsu-row:hover { background: ${isDark ? 'rgba(200,210,225,0.05)' : 'rgba(15,23,42,0.03)'} !important; }
      .jsu-th { background: ${T.sunken} !important; color: ${T.text2} !important; font-family: Inter,sans-serif !important; font-size: 11px !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; padding: 10px 12px !important; border-bottom: 0.75px solid ${T.border} !important; }
      .jsu-td { color: ${T.text1} !important; font-family: Inter,sans-serif !important; font-size: 13px !important; padding: 0 12px !important; }
      .jsu-chip-active { background: ${isDark ? 'rgba(37,99,235,0.20)' : '#DBEAFE'} !important; border: 0.75px solid #2563EB !important; color: #2563EB !important; }
      .jsu-chip-rest { background: transparent !important; border: 0.75px solid ${isDark ? 'rgba(200,210,225,0.12)' : 'rgba(15,23,42,0.10)'} !important; color: ${T.text2} !important; }
      .jsu-search { background: ${T.inputBg} !important; border: 0.75px solid ${isDark ? 'rgba(200,210,225,0.12)' : 'rgba(15,23,42,0.12)'} !important; color: ${T.text1} !important; }
      .jsu-search::placeholder { color: ${T.text3} !important; }
      .jsu-stat-card { background: ${T.surface} !important; border: 0.75px solid ${T.border} !important; border-radius: 10px !important; }
      .jsu-lozenge-active { background: ${isDark ? '#064E3B' : '#E3FCEF'} !important; color: ${isDark ? '#6EE7B7' : '#006644'} !important; }
      .jsu-lozenge-inactive { background: ${isDark ? '#450A0A' : '#FEE2E2'} !important; color: ${isDark ? '#FCA5A5' : '#991B1B'} !important; }
      .jsu-badge-project { background: ${isDark ? 'rgba(200,210,225,0.08)' : '#F1F5F9'} !important; color: ${isDark ? 'rgba(200,210,225,0.65)' : '#475569'} !important; }
      .jsu-badge-jira { background: ${isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF'} !important; color: ${isDark ? '#93C5FD' : '#1D4ED8'} !important; border: 0.75px solid ${isDark ? 'rgba(37,99,235,0.25)' : '#BFDBFE'} !important; }
      .jsu-toggle-btn { background: ${T.surface} !important; border: 0.75px solid ${isDark ? 'rgba(200,210,225,0.12)' : 'rgba(15,23,42,0.12)'} !important; color: ${T.text2} !important; }
    `}</style>
    <div className="jsu-page flex flex-col h-full" style={{ background: T.page, minHeight: '100vh' }}>

      {/* ══ Page Header ══ */}
      <div className="shrink-0" style={{ padding: '14px 24px 0', borderBottom: `0.75px solid ${T.border}`, background: T.page }}>
        <div className="flex items-start justify-between pb-3">
          <div>
            <h1 className="jsu-text-1" style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', margin: 0, lineHeight: 1.3 }}>
              Jira User Sync
            </h1>
            <p className="jsu-text-2" style={{ fontSize: 12, margin: '4px 0 0' }}>
              Bidirectional identity bridge · Jira Cloud ↔ Catalyst · Live proxy auth · Webhooks active
            </p>
          </div>
          <div className="flex gap-2 shrink-0 items-center">
            {/* D16 — Dark toggle */}
            <button
              className="jsu-toggle-btn"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              title={isDark ? 'Switch to light' : 'Switch to dark'}
              style={{
                borderRadius: 6, padding: '7px 12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'Inter,sans-serif', fontSize: 12, fontWeight: 500,
              }}
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
              {isDark ? 'Light' : 'Dark'}
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 11px', borderRadius: 5, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', lineHeight: 1,
                background: T.surface, color: T.text1, border: `0.75px solid ${T.border}`,
              }}
            >
              <Plus size={11} /> Create User
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#2563EB', color: '#FFFFFF', border: 'none',
                padding: '6px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600,
                cursor: isSyncing ? 'not-allowed' : 'pointer', opacity: isSyncing ? 0.7 : 1, lineHeight: 1,
              }}
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>
        </div>
      </div>

      {/* ══ D04 — Stat Cards (50px gap not specified, using grid gap 12px from existing) ══ */}
      <div className="shrink-0 flex flex-nowrap" style={{ gap: 12, padding: '14px 24px 12px', background: T.page }}>
        {STAT_CARDS.map(card => (
          <div key={card.key} className="jsu-stat-card" style={{
            flex: 1, minWidth: 0, height: 55, padding: '8px 14px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0,
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center" style={{ gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: card.dotColor, flexShrink: 0 }} />
                <span className="jsu-text-2" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Inter,sans-serif' }}>
                  {card.label}
                </span>
              </div>
              <span className="jsu-text-1" style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {getStatValue(card.key)}
              </span>
            </div>
            <div className="jsu-text-3" style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 400, marginTop: 2 }}>
              {card.subLabel}
            </div>
          </div>
        ))}
      </div>

      {/* ══ D17 — Filter Chips ══ */}
      <div className="shrink-0 flex items-center gap-2 flex-wrap" style={{
        display: 'flex', gap: 6, padding: '12px 24px',
        background: T.page, borderBottom: `0.75px solid ${T.border}`,
      }}>
        <div className="relative" style={{ width: 220 }}>
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: T.text3 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name, email, Jira ID, project…"
            style={{
              width: '100%', padding: '5px 10px 5px 26px', borderRadius: 4, fontSize: 12, outline: 'none',
              background: T.inputBg, color: T.text1, border: `0.75px solid ${T.chipBorder}`,
              fontFamily: 'Inter,sans-serif',
            }}
          />
        </div>
        <div className="flex" style={{ gap: 6 }}>
          {FILTERS.map(f => {
            const isActive = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  height: 28, padding: '0 12px', borderRadius: 6,
                  fontFamily: 'Inter,sans-serif', fontSize: 12, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: isActive ? (isDark ? 'rgba(37,99,235,0.20)' : '#DBEAFE') : T.chipRest,
                  border: `0.75px solid ${isActive ? '#2563EB' : T.chipBorder}`,
                  color: isActive ? '#2563EB' : T.text2,
                  fontWeight: isActive ? 500 : 400,
                  transition: 'all 120ms ease',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex" style={{ gap: 6 }}>
          {selected.size > 0 && (
            <button onClick={handleCopyPermissions} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer',
              background: T.surface, color: T.text1, border: `0.75px solid ${T.border}`,
            }}>
              <Copy size={11} /> Copy Permissions
            </button>
          )}
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer',
            background: T.surface, color: T.text1, border: `0.75px solid ${T.border}`,
          }}>
            <Download size={11} /> Export
          </button>
        </div>
      </div>

      {/* ══ Selection Bar ══ */}
      {selected.size > 0 && (
        <div className="shrink-0 flex items-center" style={{
          gap: 9, padding: '7px 24px',
          background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF',
          borderBottom: `1px solid ${isDark ? 'rgba(37,99,235,0.25)' : '#BFDBFE'}`,
        }}>
          <input type="checkbox" checked onChange={clearAll} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#2563EB' }}>{selected.size} users selected</span>
          <span style={{ fontSize: 11, color: T.text3 }}>|</span>

          <Popover open={assignPopoverOpen} onOpenChange={setAssignPopoverOpen}>
            <PopoverTrigger asChild>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', border: 'none', background: '#2563EB', color: '#FFFFFF',
              }}>
                <FolderPlus size={11} /> Assign to Project ▾
              </button>
            </PopoverTrigger>
            <PopoverContent
              style={{ width: 360, padding: 0, background: T.elevated, border: `1px solid ${T.border}` }}
              align="start"
            >
              <div style={{ padding: '12px 14px 8px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: T.text1 }}>Assign to Jira Space</div>
                <div style={{ fontSize: 11, marginBottom: 8, color: T.text2 }}>
                  Select a project. Permission level applies to all {selected.size} selected users.
                </div>
                <input
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  placeholder="Search projects..."
                  style={{
                    width: '100%', padding: '5px 8px', borderRadius: 4, fontSize: 11, outline: 'none', marginBottom: 6,
                    background: T.inputBg, color: T.text1, border: `0.75px solid ${T.chipBorder}`,
                  }}
                />
                <div className="flex items-center" style={{ gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginRight: 4, color: T.text3 }}>Level:</span>
                  {(['view', 'edit', 'full'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setAssignPermLevel(lvl)}
                      style={{
                        padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', cursor: 'pointer',
                        background: assignPermLevel === lvl ? (isDark ? 'rgba(37,99,235,0.20)' : '#DBEAFE') : 'transparent',
                        color: assignPermLevel === lvl ? '#2563EB' : T.text2,
                        border: `0.75px solid ${assignPermLevel === lvl ? '#2563EB' : T.chipBorder}`,
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto', borderTop: `0.75px solid ${T.border}` }}>
                {(jiraProjects || [])
                  .filter(p => !assignSearch || p.project_key.toLowerCase().includes(assignSearch.toLowerCase()))
                  .map((proj: any) => {
                    const ids = Array.from(selected);
                    return (
                      <button
                        key={proj.id}
                        className="w-full flex items-center"
                        style={{
                          gap: 8, padding: '8px 14px', cursor: 'pointer',
                          background: 'transparent', border: 'none', textAlign: 'left',
                          color: T.text1, fontSize: 12,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onClick={() => {
                          assignToProject({
                            userIds: ids,
                            projectId: proj.id,
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
                        <span style={{
                          fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", padding: '1px 5px', borderRadius: 2,
                          background: isDark ? 'rgba(200,210,225,0.08)' : '#F1F5F9', color: T.text2,
                        }}>
                          {proj.project_key}
                        </span>
                        <span style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: T.text2 }}>
                          {proj.project_name || proj.project_key}
                        </span>
                        <Check size={10} style={{ color: T.text3, opacity: 0 }} />
                      </button>
                    );
                  })}
                {(jiraProjects || []).filter(p => !assignSearch || p.project_key.toLowerCase().includes(assignSearch.toLowerCase())).length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: T.text3 }}>No projects found</div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <button onClick={handleBulkDeactivate} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer',
            background: T.surface, color: '#DC2626', border: `0.75px solid ${T.border}`,
          }}>
            <UserX size={11} /> Deactivate
          </button>
          <button onClick={handleCopyPermissions} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer',
            background: T.surface, color: T.text1, border: `0.75px solid ${T.border}`,
          }}>
            <Copy size={11} /> Copy Permissions
          </button>
          <button onClick={clearAll} className="ml-auto" style={{
            padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 500,
            background: 'transparent', border: 'none', cursor: 'pointer', color: T.text3,
          }}>
            Clear selection
          </button>
        </div>
      )}

      {/* ══ Table + Detail Panel ══ */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ══ D10 — Table ══ */}
          <div className="flex-1 overflow-y-auto overflow-x-auto" style={{ margin: '0 24px 24px' }}>
            <div style={{ background: T.surface, border: `0.75px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                <thead>
                  <tr style={{ background: T.sunken, borderBottom: `0.75px solid ${T.border}` }} className="jsu-sunken">
                    <th style={{ width: 36, padding: '10px 12px', textAlign: 'center' }}>
                      <input
                        ref={headerCheckRef}
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => allSelected ? clearAll() : selectAll()}
                        style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                      />
                    </th>
                    {HEADERS.map(h => (
                      <th key={h || 'action'} className="jsu-th" style={{
                        padding: '10px 12px', textAlign: 'left',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={`skel-${i}`} style={{
                        height: 36, maxHeight: 36, borderBottom: `0.75px solid ${T.border}`,
                      }}>
                        <td style={{ padding: '0 12px' }}><div className="animate-pulse" style={{ width: 14, height: 14, borderRadius: 2, background: isDark ? 'rgba(200,210,225,0.08)' : '#E2E8F0' }} /></td>
                        <td style={{ padding: '0 12px' }}>
                          <div className="flex items-center gap-2">
                            <div className="animate-pulse" style={{ width: 28, height: 28, borderRadius: '50%', background: isDark ? 'rgba(200,210,225,0.08)' : '#E2E8F0' }} />
                            <div>
                              <div className="animate-pulse" style={{ width: 120, height: 10, borderRadius: 2, marginBottom: 4, background: isDark ? 'rgba(200,210,225,0.08)' : '#E2E8F0' }} />
                              <div className="animate-pulse" style={{ width: 160, height: 8, borderRadius: 2, background: isDark ? 'rgba(200,210,225,0.06)' : '#F1F5F9' }} />
                            </div>
                          </div>
                        </td>
                        {[70, 100, 80, 60, 60, 50].map((w, ci) => (
                          <td key={ci} style={{ padding: '0 12px' }}><div className="animate-pulse" style={{ width: w, height: ci === 5 ? 18 : 10, borderRadius: ci === 5 ? 3 : 2, background: isDark ? 'rgba(200,210,225,0.08)' : '#E2E8F0' }} /></td>
                        ))}
                        <td />
                      </tr>
                    ))
                  ) : users.length === 0 && !usersFetching ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '60px 20px' }}>
                        {debouncedSearch ? (
                          <>
                            <Search size={24} style={{ color: T.text3, margin: '0 auto 10px', display: 'block' }} />
                            <div style={{ fontSize: 14, fontWeight: 500, color: T.text1 }}>No users match '{debouncedSearch}'</div>
                            <button onClick={() => setSearch('')} style={{ marginTop: 8, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB' }}>Clear search</button>
                          </>
                        ) : filter !== 'all' ? (
                          <>
                            <FolderSearch size={24} style={{ color: T.text3, margin: '0 auto 10px', display: 'block' }} />
                            <div style={{ fontSize: 14, fontWeight: 500, color: T.text1 }}>
                              {filter === 'conflict' ? 'No conflicts found' : filter === 'inactive' ? 'No inactive users' : `No ${filter} users found`}
                            </div>
                            <button onClick={() => setFilter('all')} style={{ marginTop: 8, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB' }}>View all users</button>
                          </>
                        ) : (
                          <>
                            <Users2 size={32} style={{ color: T.text3, margin: '0 auto 10px', display: 'block' }} />
                            <div style={{ fontSize: 14, fontWeight: 500, color: T.text1 }}>No synced users yet</div>
                            <button onClick={handleSync} disabled={isSyncing} style={{
                              marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600,
                              cursor: isSyncing ? 'not-allowed' : 'pointer',
                            }}>
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
                    const isHovered = hoveredRow === user.id;

                    const rowBg = (isActiveRow || isSelected)
                      ? (isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.07)')
                      : hasConflicts
                        ? (isDark ? 'rgba(251,191,36,0.06)' : 'rgba(251,191,36,0.04)')
                        : isHovered ? T.rowHover : T.surface;

                    const emailDisplay = user.email?.includes('@jira.placeholder') || !user.email ? null : user.email;

                    return (
                      <tr key={user.id}
                        className="group"
                        onClick={() => setActiveUserId(user.id === activeUserId ? null : user.id)}
                        onMouseEnter={() => setHoveredRow(user.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          height: 36, maxHeight: 36, overflow: 'hidden',
                          borderBottom: `0.75px solid ${T.border}`,
                          borderLeft: isCatalystOnly ? '2px solid #7C3AED' : 'none',
                          cursor: 'pointer', opacity: isInactive ? 0.5 : 1,
                          transition: 'background 120ms ease',
                          background: rowBg,
                        }}
                      >
                        <td style={{ padding: '0 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(user.id)} style={{ cursor: 'pointer', accentColor: '#2563EB' }} />
                        </td>

                        {/* User / Jira Identity */}
                        <td style={{ padding: '0 12px' }}>
                          <div className="flex items-center gap-2">
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: user.avatar_url ? 'transparent' : avatarColor.bg,
                              color: avatarColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, overflow: 'hidden',
                            }}>
                              {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} /> : getInitials(user.display_name || '?')}
                            </div>
                            <div style={{ minWidth: 0, maxWidth: 220 }}>
                              <div className="flex items-center" style={{ gap: 5 }}>
                                <span style={{ fontSize: 12, fontWeight: 500, textDecoration: isInactive ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: T.text1 }}>
                                  {user.display_name || user.full_name}
                                </span>
                                {isCatalystOnly && <span style={{ fontSize: 9, fontWeight: 600, whiteSpace: 'nowrap', color: isDark ? '#C4B5FD' : '#7C3AED' }}>◆ Local</span>}
                              </div>
                              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: T.text3 }}>
                                {emailDisplay ?? '—'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Auth Mode */}
                        <td style={{ padding: '0 12px' }}>
                          {user.auth_mode === 'jira_proxy' ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                              letterSpacing: '0.03em', textTransform: 'uppercase',
                              background: isDark ? 'rgba(37,99,235,0.18)' : '#EFF6FF',
                              color: isDark ? '#93C5FD' : '#1D4ED8',
                              border: `0.75px solid ${isDark ? 'rgba(37,99,235,0.30)' : 'rgba(37,99,235,0.25)'}`,
                            }}><Share2 size={9} /> JIRA</span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                              letterSpacing: '0.03em', textTransform: 'uppercase',
                              background: isDark ? 'rgba(91,33,182,0.18)' : '#EDE9FE',
                              color: isDark ? '#C4B5FD' : '#5B21B6',
                            }}>CATALYST</span>
                          )}
                        </td>

                        {/* Projects & Permissions — D09 neutral badges */}
                        <td style={{ padding: '0 12px', maxWidth: 200 }}>
                          <div className="flex flex-nowrap overflow-hidden items-center" style={{ gap: 4 }}>
                            {perms.slice(0, 2).map((p: any) => {
                              const dotColor = PERM_DOT[p.permission_level];
                              return (
                                <span key={p.id} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 3,
                                  fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                                  background: isDark ? 'rgba(200,210,225,0.08)' : '#F1F5F9',
                                  color: isDark ? 'rgba(200,210,225,0.70)' : '#374151',
                                }}>
                                  {dotColor && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
                                  {p.project_key}
                                </span>
                              );
                            })}
                            {perms.length > 2 && <span style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', color: T.text2 }}>+{perms.length - 2} more</span>}
                            {perms.length === 0 && <span style={{ fontSize: 10, color: T.text3 }}>—</span>}
                          </div>
                        </td>

                        {/* Synced At */}
                        <td style={{ padding: '0 12px' }}>
                          {isCatalystOnly ? (
                            <span style={{ fontSize: 11, fontStyle: 'italic', color: T.text3 }}>Not synced</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap', color: T.text2 }}>{formatSyncDate(user.last_synced_at)}</span>
                            </div>
                          )}
                        </td>

                        {/* Last Jira Login */}
                        <td style={{ padding: '0 12px', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: T.text2 }}>{relativeTime(user.last_jira_login_at)}</td>

                        {/* Last in Catalyst */}
                        <td style={{ padding: '0 12px', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: T.text2 }}>{relativeTime(user.last_catalyst_login_at)}</td>

                        {/* Status — D03 Lozenge */}
                        <td style={{ padding: '0 12px' }}>
                          <Lozenge status={hasConflicts ? 'Conflict' : isInactive ? 'Inactive' : 'Active'} />
                        </td>

                        {/* Action */}
                        <td style={{ padding: '0 12px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleToggleStatus(e, user)} disabled={togglingId === user.id}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                              background: T.surface,
                              border: `1px solid ${user.is_active_in_catalyst ? '#DC2626' : '#16A34A'}`,
                              color: user.is_active_in_catalyst ? '#DC2626' : '#16A34A',
                              cursor: togglingId === user.id ? 'not-allowed' : 'pointer',
                              opacity: togglingId === user.id ? 0.6 : undefined, whiteSpace: 'nowrap',
                            }}
                          >
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
          </div>

          {/* ══ Pagination ══ */}
          <div className="shrink-0 flex items-center justify-between" style={{
            padding: '9px 24px', borderTop: `0.75px solid ${T.border}`, background: T.sunken,
          }}>
            <span style={{ fontSize: 11, color: T.text2 }}>
              {totalCount > 0 ? `Showing ${showStart}–${showEnd} of ${totalCount} users` : 'No results'}
            </span>
            <div className="flex items-center" style={{ gap: 4 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
                  background: T.surface, border: `0.75px solid ${T.border}`, color: T.text1,
                }}
              >
                <ChevronLeft size={13} />
              </button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`ell-${i}`} style={{ width: 28, textAlign: 'center', fontSize: 11, color: T.text3 }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    style={{
                      width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      background: page === p ? '#2563EB' : T.surface,
                      color: page === p ? '#FFFFFF' : T.text2,
                      border: page === p ? 'none' : `0.75px solid ${T.border}`,
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
                  width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1,
                  background: T.surface, border: `0.75px solid ${T.border}`, color: T.text1,
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

      <CreateCatalystUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
    </>
  );
};

export default JiraUserSync;
