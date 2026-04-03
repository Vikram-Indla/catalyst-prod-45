import { useState, useMemo } from 'react';
import { Star, MoreHorizontal, Lock, ChevronUp, ChevronDown, ExternalLink, Settings, Archive, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectListItem, SortColumn, SortDirection, ProjectStatus } from '@/types/projecthub';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { MemberStack } from './MemberStack';
import { formatDistanceToNowStrict } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

// ── 7-column grid ──────────────────────────────────────
const GRID_COLS = '48px minmax(280px,1fr) 110px 150px 130px 100px 40px';

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
        className="w-44 p-1 bg-white dark:!bg-[#232019] border-slate-200 dark:border-slate-700"
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

function LeadReassignPopover({ project }: { project: ProjectListItem }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: profiles = [] } = useAllProfiles();

  const filtered = profiles.filter(p =>
    p.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleLeadChange = async (newLeadId: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ lead_id: newLeadId, updated_at: new Date().toISOString() } as any)
      .eq('id', project.id);
    if (error) { toast.error('Failed to update lead'); return; }
    toast.success('Lead updated');
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <button onClick={e => e.stopPropagation()} className="flex items-center gap-2 cursor-pointer hover:text-blue-600 w-full bg-transparent border-none p-0 text-left focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none rounded">
          {project.lead_name ? (
            <>
              <Avatar className="w-6 h-6">
                {project.lead_avatar_url && <AvatarImage src={project.lead_avatar_url} alt={project.lead_name || ''} />}
                <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: getBadgeColor(project.lead_id || '') }}>
                  {getInitials(project.lead_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[13px] font-medium truncate text-slate-600 dark:text-slate-300">
                {project.lead_name.split(' ').slice(0, 2).join(' ')}
              </span>
            </>
          ) : (
            <span className="text-[13px] text-slate-400 dark:text-slate-500">—</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60 p-3 bg-white dark:!bg-[#232019] border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Reassign lead</p>
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search people..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 w-full pl-8 pr-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2C2823] text-[13px] text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <div className="text-[11px] truncate text-slate-500 dark:text-slate-400">{p.role || 'Team Member'}</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No results</p>}
        </div>
      </PopoverContent>
    </Popover>
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
            <span className="text-[13px] text-slate-400 dark:text-slate-500">—</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[260px] p-3 bg-white dark:!bg-[#232019] border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Manage members</p>

        {addMode ? (
          <>
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search people..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                className="h-8 w-full pl-8 pr-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2C2823] text-[13px] text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="mt-2 text-[12px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent border-none cursor-pointer"
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
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">Lead</span>
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
            <div className="border-t border-slate-100 dark:border-slate-700 pt-2">
              <button
                onClick={() => setAddMode(true)}
                className="flex items-center gap-1.5 px-2 py-1.5 text-blue-600 text-[13px] font-medium rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 w-full bg-transparent border-none cursor-pointer text-left"
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
          className="flex h-7 w-7 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200 bg-transparent border-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
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

  // Sync entity map for per-row direction info
  const { data: syncMap } = useQuery({
    queryKey: ['sync-entity-map'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sync_entity_map')
        .select('catalyst_entity_id, last_synced_at, sync_direction, last_sync_status')
        .eq('catalyst_entity_type', 'project');
      return new Map(data?.map(s => [s.catalyst_entity_id, s]) || []);
    },
    refetchInterval: 30000,
    staleTime: 15_000,
  });

  const headerLabels = ['#', 'PROJECT', 'STATUS', 'LEAD', 'MEMBERS', 'UPDATED', ''];
  const sortableMap: Record<number, SortColumn> = { 1: 'name', 2: 'status' };

  return (
    <div className="overflow-hidden">
      <div
        className="font-['Inter',sans-serif]"
        style={{
          display: 'grid',
          gridTemplateColumns: GRID_COLS,
          alignItems: 'center',
        }}
      >
        {/* ── Header row ── */}
        {headerLabels.map((label, i) => {
          const sortCol_ = sortableMap[i];
          const isSortable = !!sortCol_;
          return (
            <div
              key={i}
              onClick={isSortable ? () => onSort(sortCol_) : undefined}
              className={cn(
                "px-2 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] flex items-center gap-1 whitespace-nowrap",
                "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b-2 border-slate-200 dark:border-slate-700",
                isSortable ? "cursor-pointer select-none" : "",
                i === 0 ? "justify-center" : ""
              )}
            >
              {label}
              {isSortable && <SortIcon col={sortCol_} sortCol={sortCol} sortDir={sortDir} />}
            </div>
          );
        })}

        {/* ── Data rows ── */}
        {projects.map((p, idx) => {
          const isFav = favoriteIds.has(p.id);
          const checked = selectedRows.has(p.id);
          const active = isActiveStatus(p.status);
          const badgeColor = getBadgeColor(p.id);
          const badgeText = p.project_key.substring(0, 2);
          const rowNum = pageOffset + idx + 1;

          const syncInfo = syncMap?.get(p.id);
          const syncHealthy = !!(syncInfo?.last_synced_at || p.last_synced_at);
          const syncTs = syncInfo?.last_synced_at || p.last_synced_at;
          const syncAge = syncTs
            ? formatDistanceToNowStrict(new Date(syncTs), { addSuffix: false })
            : null;
          const dirIcon = syncInfo?.sync_direction === 'inbound' ? '←'
            : syncInfo?.sync_direction === 'outbound' ? '→' : '↔';

          return (
            <div
              key={p.id}
              className="group contents"
              style={{
                opacity: active ? 1 : 0.45,
                pointerEvents: active ? 'auto' : 'none',
              }}
            >
              {/* Cell 1: # / Checkbox */}
              <div className="px-2 py-3 text-center border-b border-slate-100 dark:border-slate-700/50" style={{ opacity: active ? 1 : 0.45 }}>
                <span
                  className="group-hover:hidden text-xs text-slate-400 dark:text-slate-500 tabular-nums"
                  style={checked ? { display: 'none' } : {}}
                >
                  {rowNum}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleRow(p.id)}
                  className={checked ? '' : 'hidden group-hover:inline'}
                  style={{ width: 16, height: 16, cursor: 'pointer', pointerEvents: 'auto' }}
                  onClick={e => e.stopPropagation()}
                />
              </div>

              {/* Cell 2: Project — 2 lines */}
              <div className="flex flex-col items-start gap-1 py-3 px-3 border-b border-slate-100 dark:border-slate-700/50" style={{ opacity: active ? 1 : 0.45 }}>
                <div className="flex items-center gap-2.5 w-full">
                  <button
                    onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }}
                    className="bg-transparent border-none cursor-pointer p-0 focus-visible:ring-2 focus-visible:ring-blue-600 outline-none rounded"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <Star size={14} fill={isFav ? '#F59E0B' : 'none'} className={isFav ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'} />
                  </button>
                  <div
                    className="flex items-center justify-center rounded-lg flex-shrink-0 text-[11px] font-bold text-white"
                    style={{ width: 32, height: 32, background: badgeColor }}
                  >
                    {badgeText}
                  </div>
                  <span
                    onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
                    className="font-semibold text-sm truncate max-w-[240px] block hover:text-blue-600 hover:underline cursor-pointer text-slate-900 dark:text-white"
                    title={p.name}
                    style={{ pointerEvents: 'auto' }}
                  >
                    {p.name}
                  </span>
                  <span className="font-mono text-xs flex-shrink-0 text-slate-400 dark:text-slate-500">
                    {p.project_key}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-[42px]">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className={cn("w-1.5 h-1.5 rounded-full", syncHealthy ? "bg-green-500" : "bg-amber-500")} />
                    {syncAge ? `${dirIcon} ${syncAge}` : 'Not synced'} · {p.total_issues ?? 0} issues
                  </div>
                </div>
              </div>

              {/* Cell 3: Status */}
              <div className="px-2 py-2 flex justify-center border-b border-slate-100 dark:border-slate-700/50" style={{ opacity: active ? 1 : 0.45 }}>
                {active ? (
                  <StatusChangePopover project={p} />
                ) : (
                  <ProjectStatusBadge status={p.status} />
                )}
              </div>

              {/* Cell 4: Lead */}
              <div className="px-2 py-2 border-b border-slate-100 dark:border-slate-700/50" style={{ opacity: active ? 1 : 0.45 }}>
                <LeadReassignPopover project={p} />
              </div>

              {/* Cell 5: Members */}
              <div className="px-2 py-2 border-b border-slate-100 dark:border-slate-700/50" style={{ opacity: active ? 1 : 0.45 }}>
                <MemberManagePopover project={p} />
              </div>

              {/* Cell 6: Updated */}
              <div className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50" style={{ opacity: active ? 1 : 0.45 }}>
                {p.updated_at
                  ? formatDistanceToNowStrict(new Date(p.updated_at), { addSuffix: true })
                  : '—'}
              </div>

              {/* Cell 7: Actions */}
              <div className="px-1 py-2 flex justify-center border-b border-slate-100 dark:border-slate-700/50" style={{ pointerEvents: 'auto', opacity: active ? 1 : 0.45 }}>
                {active ? (
                  <RowActionMenu project={p} />
                ) : (
                  <Lock size={14} className="text-slate-300 dark:text-slate-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
