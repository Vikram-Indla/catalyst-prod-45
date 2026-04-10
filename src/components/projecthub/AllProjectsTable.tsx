import { useState, useMemo, useRef, useCallback } from 'react';
import { Star, MoreHorizontal, Lock, ChevronUp, ChevronDown, ExternalLink, Settings, Archive, Search, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectListItem, SortColumn, SortDirection, ProjectStatus } from '@/types/projecthub';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { MemberStack } from './MemberStack';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
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
            <MemberStack memberIds={memberIds} memberCount={project.member_count} max={3} />
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

  // Per-project sync data
  const { data: syncData } = useQuery({
    queryKey: ['project-sync-data'],
    queryFn: async () => {
      const countMap: Record<string, number> = {};
      const { data: viewRows, error: viewError } = await (supabase as any)
        .from('v_issue_counts')
        .select('project_key, cnt');

      if (!viewError && viewRows) {
        viewRows.forEach((r: any) => {
          if (r.project_key) {
            countMap[r.project_key] = (countMap[r.project_key] || 0) + Number(r.cnt || 0);
          }
        });
      }

      const { data: lastSync } = await (supabase as any)
        .from('ph_sync_log')
        .select('completed_at, projects_synced')
        .in('status', ['success', 'warning', 'running'])
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let fallbackSyncAt: string | null = null;
      if (!lastSync?.completed_at) {
        const { data: recentIssue } = await (supabase as any)
          .from('ph_issues')
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

  const headerLabels = ['#', 'PROJECT', 'STATUS', 'LEAD', 'MEMBERS', ''];
  const sortableMap: Record<number, SortColumn> = { 1: 'name', 2: 'status' };

  return (
    <div className="overflow-x-auto">
      {/* FIX 1: table-fixed layout with exact column widths */}
      <table className="table-fixed w-full border-collapse font-['Inter',sans-serif]">
        <colgroup>
          <col className="w-[48px] min-w-[48px] max-w-[48px]" />
          <col style={{ width: 'auto', minWidth: 280 }} />
          <col className="w-[110px] min-w-[110px] max-w-[110px]" />
          <col className="w-[200px] min-w-[200px] max-w-[200px]" />
          <col className="w-[150px] min-w-[150px] max-w-[150px]" />
          <col className="w-[48px] min-w-[48px] max-w-[48px]" />
        </colgroup>
        <thead>
          <tr>
            {headerLabels.map((label, i) => {
              const sortCol_ = sortableMap[i];
              const isSortable = !!sortCol_;
              return (
                <th
                  key={i}
                  onClick={isSortable ? () => onSort(sortCol_) : undefined}
                  className={cn(
                    "px-2 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] whitespace-nowrap overflow-hidden text-ellipsis",
                    "bg-slate-50 dark:bg-[#1A1A1A] text-slate-500 dark:text-[#A1A1A1] border-b-2 border-slate-200 dark:border-[#2E2E2E]",
                    isSortable ? "cursor-pointer select-none" : "",
                    i === 0 ? "text-center" : "text-left"
                  )}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {isSortable && <SortIcon col={sortCol_} sortCol={sortCol} sortDir={sortDir} />}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {projects.map((p, idx) => {
            const isFav = favoriteIds.has(p.id);
            const checked = selectedRows.has(p.id);
            const active = isActiveStatus(p.status);
            const badgeColor = getBadgeColor(p.id);
            const badgeText = p.project_key;
            const badgeWidth = badgeText.length > 3 ? 40 : 36;
            const badgeFontSize = badgeText.length > 3 ? 8 : badgeText.length > 2 ? 9 : 10;
            const rowNum = pageOffset + idx + 1;

            const issueCount = syncData?.countMap?.[p.project_key] ?? p.total_issues ?? 0;
            const wasSynced = syncData?.syncedProjectKeys?.has(p.project_key) || !!p.last_synced_at || issueCount > 0;
            const syncTs = wasSynced ? (syncData?.lastSyncAt || p.last_synced_at) : null;
            const syncAge = syncTs
              ? formatDistanceToNowStrict(new Date(syncTs), { addSuffix: false })
              : null;

            // FIX 8: Dynamic sync dot color
            const syncDotColor = getSyncDotColor(syncTs, null);
            const syncTooltipText = getSyncTooltip(syncTs, null);

            return (
              <tr
                key={p.id}
                className="group"
                style={{
                  opacity: active ? 1 : 0.45,
                  pointerEvents: active ? 'auto' : 'none',
                }}
              >
                {/* Cell 1: # / Checkbox — FIX 5: CSS-only hover */}
                <td className="px-2 py-3 text-center border-b border-slate-100 dark:border-[#2E2E2E] overflow-hidden">
                  <span className="group-hover:hidden text-xs text-slate-400 dark:text-[#878787] tabular-nums">
                    {rowNum}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleRow(p.id)}
                    className="hidden group-hover:inline"
                    style={{ width: 16, height: 16, cursor: 'pointer', pointerEvents: 'auto' }}
                    onClick={e => e.stopPropagation()}
                  />
                </td>

                {/* Cell 2: Project — FIX 7: Mono key badge */}
                <td className="py-3 px-3 border-b border-slate-100 dark:border-[#2E2E2E] overflow-hidden">
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2.5 w-full min-w-0">
                      <button
                        onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }}
                        className="bg-transparent border-none cursor-pointer p-0 focus-visible:ring-2 focus-visible:ring-blue-600 outline-none rounded flex-shrink-0"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <Star size={14} fill={isFav ? '#F59E0B' : 'none'} className={isFav ? 'text-amber-500' : 'text-slate-300 dark:text-[#878787]'} />
                      </button>
                      <div
                        className="flex items-center justify-center rounded-lg flex-shrink-0 font-bold text-white uppercase"
                        style={{
                          width: badgeWidth,
                          minWidth: badgeWidth,
                          height: 32,
                          background: badgeColor,
                          fontSize: badgeFontSize,
                          fontFamily: "'Sora', sans-serif",
                          letterSpacing: badgeText.length > 2 ? '-0.02em' : undefined,
                        }}
                      >
                        {badgeText}
                      </div>
                      <span
                        onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
                        className="font-semibold text-sm truncate max-w-[240px] hover:text-blue-600 hover:underline cursor-pointer text-slate-900 dark:text-white"
                        title={p.name}
                        style={{ pointerEvents: 'auto' }}
                      >
                        {p.name}
                      </span>
                      <span className="ml-2 font-mono text-[11px] bg-slate-100 dark:bg-[#2E2E2E] text-slate-500 dark:text-[#A1A1A1] px-1.5 py-0.5 rounded tracking-wide flex-shrink-0">
                        {p.project_key}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pl-[42px]">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#2E2E2E] text-[11px] font-medium text-slate-500 dark:text-[#A1A1A1]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn("w-1.5 h-1.5 rounded-full cursor-help", syncDotColor)} />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs whitespace-pre-line max-w-[220px]">
                            {syncTooltipText}
                          </TooltipContent>
                        </Tooltip>
                        {syncAge ? `↔ ${syncAge}` : 'Not synced'} · {issueCount} issues
                      </div>
                    </div>
                  </div>
                </td>

                {/* Cell 3: Status */}
                <td className="px-2 py-2 text-center border-b border-slate-100 dark:border-[#2E2E2E] overflow-hidden">
                  {active ? (
                    <StatusChangePopover project={p} />
                  ) : (
                    <ProjectStatusBadge status={p.status} />
                  )}
                </td>

                {/* Cell 4: Lead — FIX 2: Pencil icon only trigger */}
                <td className="px-2 py-2 border-b border-slate-100 dark:border-[#2E2E2E] overflow-hidden">
                  <LeadReassignPopover project={p} />
                </td>

                {/* Cell 5: Members */}
                <td className="px-2 py-2 border-b border-slate-100 dark:border-[#2E2E2E] overflow-hidden">
                  <MemberManagePopover project={p} />
                </td>

                {/* Cell 8: Actions */}
                <td className="px-1 py-2 text-center border-b border-slate-100 dark:border-[#2E2E2E]" style={{ pointerEvents: 'auto' }}>
                  {active ? (
                    <RowActionMenu project={p} />
                  ) : (
                    <Lock size={14} className="text-slate-300 dark:text-[#878787]" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
