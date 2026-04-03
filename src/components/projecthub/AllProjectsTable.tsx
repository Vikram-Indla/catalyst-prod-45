import { useState, useMemo } from 'react';
import { Star, MoreHorizontal, Lock, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ProjectListItem, SortColumn, SortDirection } from '@/types/projecthub';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { MemberStack } from './MemberStack';
import { formatDistanceToNowStrict } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ── Utilities ──────────────────────────────────────────
const BADGE_COLORS = ['#3B82F6', '#6366F1', '#0891B2', '#475569', '#0D9488', '#78716C'];

function getBadgeColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function isActiveStatus(status: string): boolean {
  return status === 'active';
}

// ── 7-column grid ──────────────────────────────────────
const GRID_COLS = '48px minmax(280px,1fr) 110px 150px 130px 100px 40px';

const STATUS_OPTIONS = [
  { value: 'active', label: 'ACTIVE', bg: '#DEEBFF', color: '#0747A6' },
  { value: 'planning', label: 'PLANNING', bg: '#DFE1E6', color: '#253858' },
  { value: 'on_hold', label: 'ON HOLD', bg: '#DFE1E6', color: '#253858' },
  { value: 'completed', label: 'COMPLETED', bg: '#E3FCEF', color: '#006644' },
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
        <button onClick={e => e.stopPropagation()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ProjectStatusBadge status={project.status} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-44 p-1 bg-white dark:bg-[#232019]"
        style={{ border: '1px solid #E2E8F0', borderRadius: 6 }}
        onClick={e => e.stopPropagation()}
      >
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value, opt.label)}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{
              display: 'inline-block', padding: '0 6px', borderRadius: 3, height: 20, lineHeight: '20px',
              background: opt.bg, color: opt.color, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap',
            }}>
              {opt.label}
            </span>
          </button>
        ))}
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
      .update({ status: 'archived' } as any)
      .eq('id', project.id);
    if (error) { toast.error('Failed to archive'); return; }
    toast.success(`${project.name} archived`);
    queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="flex h-7 w-7 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <MoreHorizontal size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-48 p-1 bg-white dark:bg-[#232019]"
        style={{ border: '1px solid #E2E8F0', borderRadius: 6 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => navigate(`/project-hub/${project.project_key}/dashboard`)}
          className="flex w-full items-center rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-200"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
        >
          Open Project
        </button>
        <button
          onClick={handleArchive}
          className="flex w-full items-center rounded px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-950"
          style={{ color: '#DC2626', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
        >
          Archive
        </button>
      </PopoverContent>
    </Popover>
  );
}

// ── Sort icon ──────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }: { col: SortColumn; sortCol: SortColumn; sortDir: SortDirection }) {
  if (col !== sortCol) return <ChevronUp size={12} style={{ opacity: 0.25 }} />;
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

  const headerLabels = ['#', 'PROJECT', 'STATUS', 'LEAD', 'MEMBERS', 'UPDATED', ''];
  const sortableMap: Record<number, SortColumn> = { 1: 'name', 2: 'status' };

  return (
    <div
      className="font-['Inter',sans-serif]"
      style={{
        display: 'grid',
        gridTemplateColumns: GRID_COLS,
        alignItems: 'center',
        border: '0.75px solid var(--bd-default)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--bg-elevated, var(--bg-1))',
        color: 'var(--text-1)',
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
            style={{
              padding: '12px 8px',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-2)',
              background: 'var(--bg-sunken)',
              borderBottom: '2px solid var(--bd-default)',
              cursor: isSortable ? 'pointer' : 'default',
              userSelect: isSortable ? 'none' : undefined,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              justifyContent: i === 0 ? 'center' : undefined,
              whiteSpace: 'nowrap',
            }}
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

        const syncHealthy = !!p.last_synced_at;
        const syncAge = p.last_synced_at
          ? formatDistanceToNowStrict(new Date(p.last_synced_at), { addSuffix: false })
          : null;

        return (
          <div
            key={p.id}
            className="group"
            style={{
              display: 'contents',
              opacity: active ? 1 : 0.45,
              pointerEvents: active ? 'auto' : 'none',
            }}
          >
            {/* Cell 1: # / Checkbox */}
            <div style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '0.75px solid var(--bd-default)', opacity: active ? 1 : 0.45 }}>
              <span
                className="group-hover:hidden"
                style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', ...(checked ? { display: 'none' } : {}) }}
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
            <div className="flex flex-col items-start gap-1 py-3 px-3" style={{ borderBottom: '0.75px solid var(--bd-default)', opacity: active ? 1 : 0.45 }}>
              {/* Line 1: star + badge + name + key */}
              <div className="flex items-center gap-2.5 w-full">
                <button
                  onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }}
                  className="text-sm"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, pointerEvents: 'auto', color: isFav ? '#F59E0B' : undefined }}
                >
                  <Star size={14} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : 'var(--text-4)'} />
                </button>
                <div
                  className="flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ width: 32, height: 32, background: badgeColor, color: '#FFF', fontSize: 11, fontWeight: 700 }}
                >
                  {badgeText}
                </div>
                <span
                  onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
                  className="font-semibold text-sm truncate hover:text-blue-600 hover:underline cursor-pointer"
                  style={{ color: 'var(--text-1)', pointerEvents: 'auto' }}
                >
                  {p.name}
                </span>
                <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--text-4)' }}>
                  {p.project_key}
                </span>
              </div>
              {/* Line 2: sync chip */}
              <div className="flex items-center gap-2 pl-[42px]">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <span className={cn("w-1.5 h-1.5 rounded-full", syncHealthy ? "bg-green-500" : "bg-amber-500")} />
                  {syncAge ? `↔ ${syncAge}` : 'Not synced'} · {p.total_issues ?? 0} issues
                </div>
              </div>
            </div>

            {/* Cell 3: Status */}
            <div style={{ borderBottom: '0.75px solid var(--bd-default)', padding: '8px 8px', display: 'flex', justifyContent: 'center', opacity: active ? 1 : 0.45 }}>
              {active ? (
                <StatusChangePopover project={p} />
              ) : (
                <ProjectStatusBadge status={p.status} />
              )}
            </div>

            {/* Cell 4: Lead */}
            <div style={{ borderBottom: '0.75px solid var(--bd-default)', padding: '8px 8px', opacity: active ? 1 : 0.45 }}>
              {p.lead_name ? (
                <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback
                      className="text-[10px] font-bold text-white"
                      style={{ background: getBadgeColor(p.lead_id || '') }}
                    >
                      {getInitials(p.lead_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[13px] font-medium truncate" style={{ color: 'var(--text-2)' }}>
                    {p.lead_name.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-4)' }}>—</span>
              )}
            </div>

            {/* Cell 5: Members */}
            <div style={{ borderBottom: '0.75px solid var(--bd-default)', padding: '8px 8px', opacity: active ? 1 : 0.45 }}>
              {p.member_ids && p.member_ids.length > 0 ? (
                <div className="flex items-center cursor-pointer">
                  <MemberStack memberIds={p.member_ids} memberCount={p.member_count} max={3} />
                </div>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-4)' }}>—</span>
              )}
            </div>

            {/* Cell 6: Updated */}
            <div style={{ borderBottom: '0.75px solid var(--bd-default)', padding: '8px 8px', fontSize: 12, color: 'var(--text-3)', opacity: active ? 1 : 0.45 }}>
              {p.updated_at
                ? formatDistanceToNowStrict(new Date(p.updated_at), { addSuffix: true })
                : '—'}
            </div>

            {/* Cell 7: Actions */}
            <div style={{ borderBottom: '0.75px solid var(--bd-default)', padding: '8px 4px', display: 'flex', justifyContent: 'center', pointerEvents: 'auto', opacity: active ? 1 : 0.45 }}>
              {active ? (
                <RowActionMenu project={p} />
              ) : (
                <Lock size={14} style={{ color: 'var(--text-4)' }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
