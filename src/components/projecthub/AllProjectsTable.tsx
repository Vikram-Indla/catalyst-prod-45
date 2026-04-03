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

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

function StatusChangePopover({ project }: { project: ProjectListItem }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const handleChange = async (newStatus: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus } as any)
      .eq('id', project.id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Status changed to ${newStatus.replace(/_/g, ' ')}`);
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
            onClick={() => handleChange(opt.value)}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-gray-50"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <ProjectStatusBadge status={opt.value as any} />
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

// Grid template for all columns
const GRID_TEMPLATE = '48px 1fr 120px 140px 120px 120px 48px';

interface HeaderProps {
  sortCol: SortColumn;
  sortDir: SortDirection;
  onSort: (col: SortColumn) => void;
}

function SortIcon({ col, sortCol, sortDir }: { col: SortColumn; sortCol: SortColumn; sortDir: SortDirection }) {
  if (col !== sortCol) return <ChevronUp size={12} style={{ opacity: 0.25 }} />;
  return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}

function TableHeader({ sortCol, sortDir, onSort }: HeaderProps) {
  const headerStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--text-3)', padding: '10px 12px', whiteSpace: 'nowrap',
  };

  const sortableStyle: React.CSSProperties = { ...headerStyle, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: GRID_TEMPLATE,
        alignItems: 'center',
        borderBottom: '1px solid var(--bd-default)',
        background: 'var(--bg-sunken)',
      }}
    >
      <div style={{ ...headerStyle, textAlign: 'center' }}>#</div>
      <div style={sortableStyle} onClick={() => onSort('name')}>
        Project <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
      </div>
      <div style={{ ...sortableStyle, justifyContent: 'center' }} onClick={() => onSort('status')}>
        Status <SortIcon col="status" sortCol={sortCol} sortDir={sortDir} />
      </div>
      <div style={headerStyle}>Lead</div>
      <div style={headerStyle}>Members</div>
      <div style={headerStyle}>Updated</div>
      <div style={headerStyle} />
    </div>
  );
}

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

export function AllProjectsTable({
  projects, favoriteIds, onToggleFav, sortCol, sortDir, onSort,
  selectedRows, onToggleRow, pageOffset = 0,
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="font-['Inter',sans-serif]" style={{ color: 'var(--text-1)' }}>
      <TableHeader sortCol={sortCol} sortDir={sortDir} onSort={onSort} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
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
                display: 'grid',
                gridTemplateColumns: GRID_TEMPLATE,
                alignItems: 'center',
                minHeight: 64,
                padding: '14px 12px',
                background: checked ? 'var(--sel, rgba(37,99,235,0.06))' : 'var(--bg-elevated, var(--bg-1))',
                borderBottom: '0.75px solid var(--bd-default)',
                margin: '0 4px',
                borderRadius: 6,
                border: '0.75px solid var(--bd-default)',
                transition: 'box-shadow 0.15s, border-color 0.15s',
                opacity: active ? 1 : 0.45,
                pointerEvents: active ? 'auto' : 'none',
                cursor: active ? 'default' : 'not-allowed',
              }}
              onMouseEnter={e => {
                if (active) {
                  e.currentTarget.style.borderColor = 'var(--bd-strong, var(--border-2))';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                }
              }}
              onMouseLeave={e => {
                if (active) {
                  e.currentTarget.style.borderColor = 'var(--bd-default)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {/* # / Checkbox column */}
              <div style={{ textAlign: 'center', position: 'relative' }}>
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

              {/* PROJECT column — two lines */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden', padding: '0 4px' }}>
                {/* Line 1 */}
                <div className="flex items-center" style={{ gap: 8 }}>
                  <div style={{ pointerEvents: 'auto', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => onToggleFav(p.id, isFav)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      <Star size={14} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : 'var(--text-4)'} />
                    </button>
                  </div>
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-full"
                    style={{ width: 28, height: 28, background: badgeColor, color: '#FFF', fontSize: 11, fontWeight: 700 }}
                  >
                    {badgeText}
                  </div>
                  <span
                    onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
                    className="truncate hover:underline"
                    style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                    {p.name}
                  </span>
                  <span className="flex-shrink-0" style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {p.project_key}
                  </span>
                </div>
                {/* Line 2 */}
                <div className="flex items-center" style={{ gap: 8, paddingLeft: 50 }}>
                  {p.member_ids && p.member_ids.length > 0 && (
                    <MemberStack memberIds={p.member_ids} memberCount={p.member_count} max={3} />
                  )}
                  {p.member_ids && p.member_ids.length > 0 && p.updated_at && (
                    <span style={{ color: 'var(--text-4)', fontSize: 12 }}>·</span>
                  )}
                  {p.updated_at && (
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {formatDistanceToNowStrict(new Date(p.updated_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>

              {/* STATUS column */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {active ? (
                  <StatusChangePopover project={p} />
                ) : (
                  <ProjectStatusBadge status={p.status} />
                )}
              </div>

              {/* LEAD column */}
              <div style={{ padding: '0 4px' }}>
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

              {/* MEMBERS column */}
              <div style={{ padding: '0 4px' }}>
                {p.member_ids && p.member_ids.length > 0 ? (
                  <MemberStack memberIds={p.member_ids} memberCount={p.member_count} max={3} />
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-4)' }}>—</span>
                )}
              </div>

              {/* UPDATED column */}
              <div style={{ padding: '0 4px' }}>
                {p.updated_at ? (
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {formatDistanceToNowStrict(new Date(p.updated_at), { addSuffix: true })}
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-4)' }}>—</span>
                )}
              </div>

              {/* ACTIONS column */}
              <div style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
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
    </div>
  );
}
