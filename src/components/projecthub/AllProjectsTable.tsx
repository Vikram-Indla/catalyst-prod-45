import { useState, useMemo, useRef, useCallback } from 'react';
import { Star, MoreHorizontal, Lock, ChevronUp, ChevronDown, ExternalLink, Settings, Archive, Search, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '@/styles/product-backlog.css';
import { useTableColumns, type ColumnDef as TColDef } from '@/hooks/useTableColumns';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectListItem, SortColumn, SortDirection, ProjectStatus } from '@/types/projecthub';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { MemberStack } from './MemberStack';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { IssueBreakdownPopover } from './IssueBreakdownPopover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ── Utilities ──────────────────────────────────────────
const BADGE_COLORS = ['#3B82F6', '#6366F1', '#0891B2', '#475569', '#0D9488', '#78716C'];

function getBadgeColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function isActiveStatus(status: string): boolean {
  return status === 'active';
}

// FIX 3: Format role labels from snake_case to Title Case
function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// FIX 8: Three-state sync dot color
function getSyncDotColor(lastSyncAt: string | null, syncStatus: string | null): string {
  if (!lastSyncAt || syncStatus === 'error') return 'bg-red-500';
  const minutesAgo = (Date.now() - new Date(lastSyncAt).getTime()) / 60000;
  if (minutesAgo > 120) return 'bg-red-500';
  if (minutesAgo > 15) return 'bg-amber-400';
  return 'bg-green-500';
}

function getSyncTooltip(lastSyncAt: string | null, syncStatus: string | null): string {
  if (!lastSyncAt || syncStatus === 'error') return 'Sync error — check connection';
  const minutesAgo = (Date.now() - new Date(lastSyncAt).getTime()) / 60000;
  const formatted = format(new Date(lastSyncAt), 'dd MMM yyyy HH:mm');
  if (minutesAgo > 120) return `Sync error — last sync ${formatted}`;
  if (minutesAgo > 15) return `Stale — last sync over 15 min ago\n${formatted}`;
  return `Last synced: ${formatted}\nStatus: OK`;
}

// ── Shared hooks ───────────────────────────────────────
function useAllProfiles() {
  return useQuery({
    queryKey: ['profiles-all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, role').order('full_name');
      return (data || []).map(p => ({ ...p, display_name: p.full_name || '' }));
    },
    staleTime: 60_000,
  });
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'ACTIVE' },
  { value: 'planning', label: 'PLANNING' },
  { value: 'on_hold', label: 'ON HOLD' },
  { value: 'completed', label: 'COMPLETED' },
];

// ── Sub-components ─────────────────────────────────────

function StatusChangePopover({ project }: { project: ProjectListItem }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const handleChange = async (newStatus: string, label: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ display_status: newStatus } as any)
      .eq('id', project.id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Status changed to ${label}`);
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button onClick={e => e.stopPropagation()} className="bg-transparent border-none cursor-pointer p-0 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none rounded">
          <ProjectStatusBadge status={project.status} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-44 p-1 bg-white dark:!bg-[#1A1A1A] border-slate-200 dark:border-[#2E2E2E]"
        onClick={e => e.stopPropagation()}
      >
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value, opt.label)}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5 bg-transparent border-none cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
          >
            <ProjectStatusBadge status={opt.value} />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// FIX 2 + FIX 4: Lead cell with pencil icon trigger + undo toast
function LeadReassignPopover({ project }: { project: ProjectListItem }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: profiles = [] } = useAllProfiles();
  const [optimisticLead, setOptimisticLead] = useState<{ id: string; name: string; avatar_url: string | null } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const filtered = profiles.filter(p =>
    p.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const displayLead = optimisticLead
    ? { name: optimisticLead.name, avatar_url: optimisticLead.avatar_url, id: optimisticLead.id }
    : { name: project.lead_name, avatar_url: project.lead_avatar_url, id: project.lead_id };

  const handleLeadChange = useCallback((newLeadId: string) => {
    const selectedProfile = profiles.find(p => p.id === newLeadId);
    if (!selectedProfile) return;

    const previousLead = { id: project.lead_id, name: project.lead_name, avatar_url: project.lead_avatar_url };

    // Optimistic update
    setOptimisticLead({ id: newLeadId, name: selectedProfile.display_name, avatar_url: selectedProfile.avatar_url });
    setOpen(false);
    setSearch('');

    // Delayed mutation with undo
    timeoutRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from('projects')
        .update({ lead_id: newLeadId, updated_at: new Date().toISOString() } as any)
        .eq('id', project.id);
      if (error) {
        toast.error('Failed to update lead');
        setOptimisticLead(null);
        return;
      }
      setOptimisticLead(null);
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
    }, 2000);

    toast(`Lead changed to ${selectedProfile.display_name}`, {
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timeoutRef.current);
          setOptimisticLead(null);
        },
      },
    });
  }, [profiles, project, queryClient]);

  return (
    <div className="flex items-center gap-2 group/lead overflow-hidden">
      {displayLead.name ? (
        <>
          <Avatar className="w-6 h-6 flex-shrink-0">
            {displayLead.avatar_url && <AvatarImage src={displayLead.avatar_url} alt={displayLead.name || ''} />}
            <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: getBadgeColor(displayLead.id || '') }}>
              {getInitials(displayLead.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[13px] font-medium truncate text-slate-600 dark:text-[#A1A1A1]" title={displayLead.name || ''}>
            {(displayLead.name || '').split(' ').slice(0, 2).join(' ')}
          </span>
        </>
      ) : (
        <span className="text-[13px] text-slate-400 dark:text-[#878787]">—</span>
      )}
      <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setSearch(''); }}>
        <PopoverTrigger asChild>
          <button
            onClick={e => e.stopPropagation()}
            className="opacity-0 group-hover/lead:opacity-100 transition-opacity ml-auto flex-shrink-0 text-slate-400 cursor-pointer bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-blue-600 outline-none rounded"
          >
            <Pencil size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-60 p-3 bg-white dark:!bg-[#1A1A1A] border-slate-200 dark:border-[#2E2E2E]"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-slate-500 dark:text-[#A1A1A1] mb-2">Reassign lead</p>
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search people..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-full pl-8 pr-2 rounded border border-slate-200 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] text-[13px] text-slate-900 dark:text-[#EDEDED] placeholder:text-slate-400 dark:placeholder:text-[#878787] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => handleLeadChange(p.id)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-white/5 w-full text-left bg-transparent border-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
              >
                <Avatar className="w-6 h-6">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.display_name} />}
                  <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: getBadgeColor(p.id) }}>
                    {getInitials(p.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate text-slate-900 dark:text-white">{p.display_name}</div>
                  <div className="text-[11px] truncate text-slate-500 dark:text-[#A1A1A1]">{formatRole(p.role || 'Team Member')}</div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No results</p>}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function MemberManagePopover({ project }: { project: ProjectListItem }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [addMode, setAddMode] = useState(false);
  const { data: profiles = [] } = useAllProfiles();

  const memberIds = project.member_ids || [];

  const members = useMemo(() => {
    return memberIds.map(id => {
      const p = profiles.find(pr => pr.id === id);
      return { id, display_name: p?.display_name || 'Unknown', role: p?.role || '', avatar_url: p?.avatar_url || null };
    });
  }, [memberIds, profiles]);

  const nonMembers = profiles.filter(p =>
    !memberIds.includes(p.id) && p.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRemove = async (userId: string) => {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', project.id)
      .eq('user_id', userId);
    if (error) { toast.error('Failed to remove member'); return; }
    toast.success('Member removed');
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
  };

  const handleAdd = async (userId: string) => {
    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: project.id, user_id: userId, role: 'member' } as any);
    if (error) { toast.error('Failed to add member'); return; }
    toast.success('Member added');
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
  };

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) { setAddMode(false); setSearch(''); } }}>
      <PopoverTrigger asChild>
        <button onClick={e => e.stopPropagation()} className="flex items-center cursor-pointer bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none rounded">
          {memberIds.length > 0 ? (
            <MemberStack memberIds={memberIds} memberCount={project.member_count} max={10} />
          ) : (
            <span className="text-[13px] text-slate-400 dark:text-[#878787]">—</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[260px] p-3 bg-white dark:!bg-[#1A1A1A] border-slate-200 dark:border-[#2E2E2E]"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-slate-500 dark:text-[#A1A1A1] mb-2">Manage members</p>

        {addMode ? (
          <>
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search people..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                className="h-8 w-full pl-8 pr-2 rounded border border-slate-200 dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] text-[13px] text-slate-900 dark:text-[#EDEDED] placeholder:text-slate-400 dark:placeholder:text-[#878787] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {nonMembers.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleAdd(p.id)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-white/5 w-full text-left bg-transparent border-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
                >
                  <Avatar className="w-5 h-5">
                    {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.display_name} />}
                    <AvatarFallback className="text-[9px] font-bold text-white" style={{ background: getBadgeColor(p.id) }}>
                      {getInitials(p.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[13px] truncate text-slate-900 dark:text-white">{p.display_name}</span>
                  <span className="ml-auto text-blue-600 text-xs font-bold">+</span>
                </button>
              ))}
              {nonMembers.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No results</p>}
            </div>
            <button
              onClick={() => { setAddMode(false); setSearch(''); }}
              className="mt-2 text-[12px] text-slate-500 hover:text-slate-700 dark:hover:text-[#A1A1A1] bg-transparent border-none cursor-pointer"
            >← Back</button>
          </>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Current · {members.length}</p>
            <div className="max-h-40 overflow-y-auto space-y-0.5 mb-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-white/5">
                  <Avatar className="w-5 h-5">
                    {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.display_name} />}
                    <AvatarFallback className="text-[9px] font-bold text-white" style={{ background: getBadgeColor(m.id) }}>
                      {getInitials(m.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[13px] truncate flex-1 text-slate-900 dark:text-white">{m.display_name}</span>
                  {m.id === project.lead_id && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-[rgba(37,99,235,0.12)] px-1.5 py-0.5 rounded">Lead</span>
                  )}
                  {m.id !== project.lead_id && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="text-slate-400 hover:text-red-600 text-xs transition-colors bg-transparent border-none cursor-pointer px-0.5"
                    >×</button>
                  )}
                </div>
              ))}
              {members.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No members</p>}
            </div>
            <div className="border-t border-slate-100 dark:border-[#2E2E2E] pt-2">
              <button
                onClick={() => setAddMode(true)}
                className="flex items-center gap-1.5 px-2 py-1.5 text-blue-600 text-[13px] font-medium rounded-md hover:bg-blue-50 dark:hover:bg-[rgba(37,99,235,0.12)] w-full bg-transparent border-none cursor-pointer text-left"
              >
                + Add member
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function RowActionMenu({ project }: { project: ProjectListItem }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleArchive = async () => {
    const { error } = await supabase
      .from('projects')
      .update({ status: 'archived', updated_at: new Date().toISOString() } as any)
      .eq('id', project.id);
    if (error) { toast.error('Failed to archive'); return; }
    toast.success(`${project.name} archived`);
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="flex h-7 w-7 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 dark:text-[#878787] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-[#EDEDED] bg-transparent border-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
        >
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]" onClick={e => e.stopPropagation()}>
        <DropdownMenuLabel className="text-xs text-slate-500">Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigate(`/project-hub/${project.project_key}/dashboard`)}>
          <ExternalLink size={14} className="mr-2" /> Open Project
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/project-hub/${project.project_key}/sync`)} disabled>
          <Settings size={14} className="mr-2" /> Sync Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleArchive}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <Archive size={14} className="mr-2" /> Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Sort icon ──────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }: { col: SortColumn; sortCol: SortColumn; sortDir: SortDirection }) {
  if (col !== sortCol) return <ChevronUp size={12} className="opacity-25" />;
  return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}

// ── Resizable column config ──
const PROJECT_COLUMNS: TColDef[] = [
  { key: 'num', label: '#', defaultWidth: 40, minWidth: 40, locked: true },
  { key: 'star', label: '', defaultWidth: 36, minWidth: 36, locked: true },
  { key: 'project_key', label: 'KEY', defaultWidth: 100, minWidth: 70 },
  { key: 'project_name', label: 'PROJECT NAME', defaultWidth: 280, minWidth: 150 },
  { key: 'status', label: 'STATUS', defaultWidth: 110, minWidth: 80 },
  { key: 'lead', label: 'LEAD', defaultWidth: 200, minWidth: 120 },
  { key: 'members', label: 'MEMBERS', defaultWidth: 150, minWidth: 80 },
  { key: 'sync', label: 'SYNC', defaultWidth: 200, minWidth: 100 },
  { key: 'actions', label: '', defaultWidth: 48, minWidth: 48, locked: true },
];

// ── Props ──────────────────────────────────────────────
interface Props {
  projects: ProjectListItem[];
  favoriteIds: Set<string>;
  onToggleFav: (id: string, fav: boolean) => void;
  onSelectProject: (id: string) => void;
  sortCol: SortColumn;
  sortDir: SortDirection;
  onSort: (col: SortColumn) => void;
  selectedRows: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  pageOffset?: number;
}

// ── Main component ─────────────────────────────────────
export function AllProjectsTable({
  projects, favoriteIds, onToggleFav, sortCol, sortDir, onSort,
  selectedRows, onToggleRow, pageOffset = 0,
}: Props) {
  const navigate = useNavigate();
  const {
    orderedColumns, columnWidths, dragKey, dragOverKey,
    onResizeStart, onDragStart, onDragOver, onDragEnd,
  } = useTableColumns('projects', PROJECT_COLUMNS);

  // Per-project sync data
  const { data: syncData } = useQuery({
    queryKey: ['project-sync-data'],
    queryFn: async () => {
      const countMap: Record<string, number> = {};
      const { data: viewRows, error: viewError } = await typedQuery('v_issue_counts')
        .select('project_key, cnt');

      if (!viewError && viewRows) {
        viewRows.forEach((r: any) => {
          if (r.project_key) {
            countMap[r.project_key] = (countMap[r.project_key] || 0) + Number(r.cnt || 0);
          }
        });
      }

      const { data: lastSync } = await typedQuery('ph_sync_log')
        .select('completed_at, projects_synced')
        .in('status', ['success', 'warning', 'running'])
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let fallbackSyncAt: string | null = null;
      if (!lastSync?.completed_at) {
        const { data: recentIssue } = await typedQuery('ph_issues')
          .select('last_synced_at')
          .not('last_synced_at', 'is', null)
          .order('last_synced_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        fallbackSyncAt = recentIssue?.last_synced_at || null;
      }

      const syncedFromLog = new Set<string>(lastSync?.projects_synced || []);
      const syncedFromIssues = new Set<string>(Object.keys(countMap).filter(k => countMap[k] > 0));
      const syncedProjectKeys = new Set<string>([...syncedFromLog, ...syncedFromIssues]);
      const effectiveSyncAt = lastSync?.completed_at || fallbackSyncAt || null;

      return { countMap, lastSyncAt: effectiveSyncAt, syncedProjectKeys };
    },
    refetchInterval: 30000,
    staleTime: 15_000,
  });

  const renderProjectCell = (colKey: string, p: ProjectListItem, idx: number) => {
    const isFav = favoriteIds.has(p.id);
    const active = isActiveStatus(p.status);
    const badgeColor = getBadgeColor(p.id);
    const rowNum = pageOffset + idx + 1;
    const issueCount = syncData?.countMap?.[p.project_key] ?? p.total_issues ?? 0;
    const wasSynced = syncData?.syncedProjectKeys?.has(p.project_key) || !!p.last_synced_at || issueCount > 0;
    const syncTs = wasSynced ? (syncData?.lastSyncAt || p.last_synced_at) : null;
    const syncAge = syncTs ? formatDistanceToNowStrict(new Date(syncTs), { addSuffix: false }) : null;
    const syncDotColor = getSyncDotColor(syncTs, null);
    const syncTooltipText = getSyncTooltip(syncTs, null);

    switch (colKey) {
      case 'num': return <td key={colKey} className="text-center"><span className="text-xs text-slate-400 dark:text-[#878787] tabular-nums">{rowNum}</span></td>;
      case 'star': return <td key={colKey} style={{ overflow: 'visible', textOverflow: 'clip' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><button onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }} className="bg-transparent border-none cursor-pointer p-0 outline-none rounded flex-shrink-0" style={{ pointerEvents: 'auto' }}><Star size={14} fill={isFav ? '#F59E0B' : 'none'} className={isFav ? 'text-amber-500' : 'text-slate-300 dark:text-[#878787]'} /></button></div></td>;
      case 'project_key': return <td key={colKey}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="font-mono text-[11px] font-bold tracking-wide text-white px-1.5 py-0.5 rounded" style={{ background: badgeColor }}>{p.project_key}</span></div></td>;
      case 'project_name': return <td key={colKey}><span onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)} className="font-semibold text-[13px] truncate hover:text-blue-600 hover:underline cursor-pointer text-slate-900 dark:text-white" title={p.name} style={{ pointerEvents: 'auto' }}>{p.name}</span></td>;
      case 'status': return <td key={colKey} className="text-center">{active ? <StatusChangePopover project={p} /> : <ProjectStatusBadge status={p.status} />}</td>;
      case 'lead': return <td key={colKey}><LeadReassignPopover project={p} /></td>;
      case 'members': return <td key={colKey}><MemberManagePopover project={p} /></td>;
      case 'sync': return (
        <td key={colKey}>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-[#A1A1A1]">
            <Tooltip><TooltipTrigger asChild><span className={cn("w-2 h-2 rounded-full flex-shrink-0 cursor-help", syncDotColor)} /></TooltipTrigger><TooltipContent side="top" className="text-xs whitespace-pre-line max-w-[220px]">{syncTooltipText}</TooltipContent></Tooltip>
            <span className="font-medium">{syncAge ? `${issueCount} issues, ${syncAge} ago` : 'Not synced'}</span>
          </div>
        </td>
      );
      case 'actions': return <td key={colKey} className="text-center" style={{ pointerEvents: 'auto' }}>{active ? <RowActionMenu project={p} /> : <Lock size={14} className="text-slate-300 dark:text-[#878787]" />}</td>;
      default: return <td key={colKey} />;
    }
  };

  return (
    <div className="overflow-x-auto" style={{ borderRadius: 0 }}>
      <table className="pb-table" style={{ minWidth: 900, tableLayout: 'fixed' }}>
        <colgroup>
          {orderedColumns.map(c => (
            <col key={c.key} style={{ width: columnWidths[c.key] || c.defaultWidth }} />
          ))}
        </colgroup>
        <thead>
          <tr className="group/thead">
            {orderedColumns.map(c => {
              if (c.key === 'num') return <th key={c.key} className="text-center" style={{ width: columnWidths.num }}>#</th>;
              return (
                <ResizableTableHeader
                  key={c.key}
                  colKey={c.key}
                  label={c.label}
                  width={columnWidths[c.key] || c.defaultWidth}
                  locked={c.locked}
                  isDragging={dragKey === c.key}
                  isDragOver={dragOverKey === c.key}
                  onResizeStart={onResizeStart}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragEnd={onDragEnd}
                />
              );
            })}
          </tr>
        </thead>
        <tbody>
          {projects.map((p, idx) => {
            const checked = selectedRows.has(p.id);
            const active = isActiveStatus(p.status);
            return (
              <tr key={p.id} className={cn('group', checked && 'pb-row-selected')} style={{ opacity: active ? 1 : 0.45, pointerEvents: active ? 'auto' : 'none' }}>
                {orderedColumns.map(c => renderProjectCell(c.key, p, idx))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
