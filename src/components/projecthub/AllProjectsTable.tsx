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

const SORTABLE_COLS: { key: SortColumn; label: string }[] = [
  { key: 'name', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'total_issues', label: 'Updated' },
];

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
}

function SortIcon({ col, currentCol, dir }: { col: SortColumn; currentCol: SortColumn; dir: SortDirection }) {
  if (col !== currentCol) return <span style={{ opacity: 0.3, fontSize: 10, marginLeft: 2 }}>↕</span>;
  return dir === 'asc'
    ? <ChevronUp size={12} style={{ marginLeft: 2 }} />
    : <ChevronDown size={12} style={{ marginLeft: 2 }} />;
}

function RowActionMenu({ project }: { project: ProjectListItem }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleArchive = async () => {
    const { error } = await (supabase as any)
      .from('projects')
      .update({ display_status: 'archived' })
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

export function AllProjectsTable({ projects, favoriteIds, onToggleFav, onSelectProject, sortCol, sortDir, onSort, selectedRows, onToggleRow, onToggleAll }: Props) {
  const navigate = useNavigate();
  const allChecked = projects.length > 0 && projects.every(p => selectedRows.has(p.id));

  return (
    <table className="w-full border-collapse font-['Inter',sans-serif]" style={{ color: 'var(--text-1)' }}>
      <thead>
        <tr>
          <th className="w-10 px-2 text-center" style={{ height: 36, borderBottom: '2px solid var(--bd-default)', background: 'var(--bg-sunken)', fontSize: 11, fontWeight: 600 }}>
            <input type="checkbox" checked={allChecked} onChange={onToggleAll} style={{ width: 14, height: 14, cursor: 'pointer' }} />
          </th>
          <th className="w-9 px-1" style={{ height: 36, borderBottom: '2px solid var(--bd-default)', background: 'var(--bg-sunken)' }} />
          {/* Project column (Key + Name + Badge) */}
          <th
            onClick={() => onSort('name')}
            className="cursor-pointer select-none text-left"
            style={{ height: 36, borderBottom: '2px solid var(--bd-default)', background: 'var(--bg-sunken)', padding: '0 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}
          >
            <span className="inline-flex items-center">
              Project <SortIcon col="name" currentCol={sortCol} dir={sortDir} />
            </span>
          </th>
          <th
            onClick={() => onSort('status')}
            className="cursor-pointer select-none text-left"
            style={{ height: 36, borderBottom: '2px solid var(--bd-default)', background: 'var(--bg-sunken)', padding: '0 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', width: 110 }}
          >
            <span className="inline-flex items-center">
              Status <SortIcon col="status" currentCol={sortCol} dir={sortDir} />
            </span>
          </th>
          <th
            style={{ height: 36, borderBottom: '2px solid var(--bd-default)', background: 'var(--bg-sunken)', padding: '0 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', width: 160 }}
          >
            Lead
          </th>
          <th
            style={{ height: 36, borderBottom: '2px solid var(--bd-default)', background: 'var(--bg-sunken)', padding: '0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', width: 100 }}
          >
            Members
          </th>
          <th
            onClick={() => onSort('total_issues')}
            className="cursor-pointer select-none text-right"
            style={{ height: 36, borderBottom: '2px solid var(--bd-default)', background: 'var(--bg-sunken)', padding: '0 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', width: 120 }}
          >
            <span className="inline-flex items-center justify-end w-full">
              Updated <SortIcon col="total_issues" currentCol={sortCol} dir={sortDir} />
            </span>
          </th>
          <th style={{ height: 36, borderBottom: '2px solid var(--bd-default)', background: 'var(--bg-sunken)', width: 44 }} />
        </tr>
      </thead>
      <tbody>
        {projects.map(p => {
          const isFav = favoriteIds.has(p.id);
          const checked = selectedRows.has(p.id);
          const active = isActiveStatus(p.status);
          const badgeColor = getBadgeColor(p.id);
          const badgeText = p.project_key.substring(0, 2);

          return (
            <tr
              key={p.id}
              onClick={() => active && onSelectProject(p.id)}
              onDoubleClick={() => active && navigate(`/project-hub/${p.project_key}/dashboard`)}
              className="group transition-colors"
              style={{
                minHeight: 64,
                borderBottom: '1px solid var(--bd-subtle)',
                opacity: active ? 1 : 0.45,
                pointerEvents: active ? 'auto' : 'none',
                cursor: active ? 'pointer' : 'not-allowed',
                background: checked ? 'var(--sel)' : 'transparent',
              }}
              onMouseEnter={e => { if (active && !checked) (e.currentTarget.style.background = 'var(--hover)'); }}
              onMouseLeave={e => { if (active) (e.currentTarget.style.background = checked ? 'var(--sel)' : 'transparent'); }}
            >
              {/* Checkbox */}
              <td className="px-2 text-center align-middle" style={{ pointerEvents: 'auto' }} onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox" checked={checked} onChange={() => onToggleRow(p.id)}
                  className="opacity-0 group-hover:opacity-100"
                  style={{ width: 14, height: 14, cursor: 'pointer', ...(checked ? { opacity: 1 } : {}) }}
                />
              </td>
              {/* Star */}
              <td className="px-1 text-center align-middle" style={{ pointerEvents: 'auto' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => onToggleFav(p.id, isFav)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Star size={14} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : 'var(--text-4)'} />
                </button>
              </td>
              {/* Project: Badge + Name + Key (two lines) */}
              <td className="align-middle" style={{ padding: '10px 16px' }}>
                <div className="flex items-start gap-3">
                  {/* Badge circle */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-full"
                    style={{ width: 28, height: 28, background: badgeColor, color: '#FFF', fontSize: 11, fontWeight: 700 }}
                  >
                    {badgeText}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {/* Line 1: Name + Key */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{p.name}</span>
                      <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>{p.project_key}</span>
                    </div>
                    {/* Line 2: Issues + Updated */}
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-3)' }}>
                      {p.total_issues > 0 && (
                        <span>{p.total_issues} issues</span>
                      )}
                      {p.last_synced_at && (
                        <span>Synced {formatDistanceToNowStrict(new Date(p.last_synced_at), { addSuffix: false })} ago</span>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              {/* Status */}
              <td className="align-middle" style={{ padding: '0 16px' }}>
                <ProjectStatusBadge status={p.status} />
              </td>
              {/* Lead */}
              <td className="align-middle" style={{ padding: '0 16px' }}>
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
                    <span className="text-xs truncate" style={{ color: 'var(--text-2)' }}>
                      {p.lead_name.split(' ')[0]}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--text-4)' }}>—</span>
                )}
              </td>
              {/* Members */}
              <td className="align-middle" style={{ padding: '0 12px' }}>
                <MemberStack memberIds={p.member_ids} memberCount={p.member_count} max={3} />
              </td>
              {/* Updated */}
              <td className="align-middle text-right" style={{ padding: '0 16px' }}>
                <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {p.updated_at ? formatDistanceToNowStrict(new Date(p.updated_at), { addSuffix: true }) : '—'}
                </span>
              </td>
              {/* Action */}
              <td className="align-middle text-center" style={{ pointerEvents: 'auto', width: 44 }}>
                {active ? (
                  <RowActionMenu project={p} />
                ) : (
                  <Lock size={14} style={{ color: 'var(--text-4)', margin: '0 auto' }} />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}