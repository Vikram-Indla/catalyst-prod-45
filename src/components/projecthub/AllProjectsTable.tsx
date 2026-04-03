import { useState } from 'react';
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

// ── 9-column grid ──────────────────────────────────────
const GRID_COLS = '48px 16px 36px minmax(200px,1fr) 120px 140px 120px 120px 48px';
const CELL_BORDER = '0.75px solid var(--bd-default)';

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
        className="w-44 p-1"
        style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6 }}
        onClick={e => e.stopPropagation()}
      >
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value, opt.label)}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-gray-50"
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
          className="flex h-7 w-7 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <MoreHorizontal size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-48 p-1"
        style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => navigate(`/project-hub/${project.project_key}/dashboard`)}
          className="flex w-full items-center rounded px-3 py-2 text-sm hover:bg-gray-50"
          style={{ color: '#0F172A', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
        >
          Open Project
        </button>
        <button
          onClick={handleArchive}
          className="flex w-full items-center rounded px-3 py-2 text-sm hover:bg-red-50"
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

  const headerLabels = ['#', '', '', 'PROJECT', 'STATUS', 'LEAD', 'MEMBERS', 'UPDATED', ''];
  const sortableMap: Record<number, SortColumn> = { 3: 'name', 4: 'status' };

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
              justifyContent: i === 0 || i === 4 ? 'center' : undefined,
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
            <div style={{ padding: '8px 8px', textAlign: 'center', borderBottom: CELL_BORDER, opacity: active ? 1 : 0.45 }}>
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

            {/* Cell 2: Star */}
            <div style={{ borderBottom: CELL_BORDER, padding: '14px 0', display: 'flex', justifyContent: 'center', opacity: active ? 1 : 0.45 }}>
              <button
                onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', pointerEvents: 'auto' }}
              >
                <Star size={14} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : 'var(--text-4)'} />
              </button>
            </div>

            {/* Cell 3: Badge */}
            <div style={{ borderBottom: CELL_BORDER, padding: '14px 0', display: 'flex', justifyContent: 'center', opacity: active ? 1 : 0.45 }}>
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 28, height: 28, background: badgeColor, color: '#FFF', fontSize: 11, fontWeight: 700, flexShrink: 0 }}
              >
                {badgeText}
              </div>
            </div>

            {/* Cell 4: Project name + key (single line) */}
            <div style={{ borderBottom: CELL_BORDER, padding: '8px 8px', opacity: active ? 1 : 0.45, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
                className="truncate hover:underline"
                style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-1)', pointerEvents: 'auto' }}
              >
                {p.name}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text-4)', flexShrink: 0 }}>
                {p.project_key}
              </span>
            </div>

            {/* Cell 5: Status */}
            <div style={{ borderBottom: CELL_BORDER, padding: '14px 8px', textAlign: 'center', display: 'flex', justifyContent: 'center', opacity: active ? 1 : 0.45 }}>
              {active ? (
                <StatusChangePopover project={p} />
              ) : (
                <ProjectStatusBadge status={p.status} />
              )}
            </div>

            {/* Cell 6: Lead */}
            <div style={{ borderBottom: CELL_BORDER, padding: '14px 8px', opacity: active ? 1 : 0.45 }}>
              {p.lead_name ? (
                <div className="flex items-center gap-2">
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-full"
                    style={{
                      width: 24, height: 24,
                      background: p.lead_avatar_url ? `url(${p.lead_avatar_url}) center/cover` : getBadgeColor(p.lead_id || ''),
                      color: '#FFF', fontSize: 9, fontWeight: 700,
                    }}
                  >
                    {!p.lead_avatar_url && getInitials(p.lead_name)}
                  </div>
                  <span className="truncate" style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {p.lead_name.split(' ')[0]}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-4)' }}>—</span>
              )}
            </div>

            {/* Cell 7: Members */}
            <div style={{ borderBottom: CELL_BORDER, padding: '14px 8px', opacity: active ? 1 : 0.45 }}>
              {p.member_ids && p.member_ids.length > 0 ? (
                <MemberStack memberIds={p.member_ids} memberCount={p.member_count} max={3} />
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-4)' }}>—</span>
              )}
            </div>

            {/* Cell 8: Updated */}
            <div style={{ borderBottom: CELL_BORDER, padding: '14px 8px', fontSize: 12, color: 'var(--text-3)', opacity: active ? 1 : 0.45 }}>
              {p.updated_at
                ? formatDistanceToNowStrict(new Date(p.updated_at), { addSuffix: true })
                : '—'}
            </div>

            {/* Cell 9: Actions */}
            <div style={{ borderBottom: CELL_BORDER, padding: '14px 8px', display: 'flex', justifyContent: 'center', pointerEvents: 'auto', opacity: active ? 1 : 0.45 }}>
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
