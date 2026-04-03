import { Star, MoreHorizontal, Lock } from 'lucide-react';
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

function RowActionMenu({ project }: { project: ProjectListItem }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleArchive = async () => {
    const { error } = await supabase
      .from('projects')
      .update({ display_status: 'archived' } as any)
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

export function AllProjectsTable({ projects, favoriteIds, onToggleFav, selectedRows, onToggleRow }: Props) {
  const navigate = useNavigate();

  return (
    <div className="font-['Inter',sans-serif]" style={{ color: 'var(--text-1)' }}>
      {projects.map(p => {
        const isFav = favoriteIds.has(p.id);
        const checked = selectedRows.has(p.id);
        const active = isActiveStatus(p.status);
        const badgeColor = getBadgeColor(p.id);
        const badgeText = p.project_key.substring(0, 2);

        return (
          <div
            key={p.id}
            className="group transition-colors"
            style={{
              minHeight: 64,
              padding: '12px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              borderBottom: '0.75px solid var(--bd-default)',
              cursor: active ? 'pointer' : 'not-allowed',
              opacity: active ? 1 : 0.45,
              pointerEvents: active ? 'auto' : 'none',
              background: checked ? 'var(--sel)' : 'transparent',
            }}
            onMouseEnter={e => { if (active && !checked) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
            onMouseLeave={e => { if (active) e.currentTarget.style.background = checked ? 'var(--sel)' : 'transparent'; }}
          >
            {/* Line 1 */}
            <div className="flex items-center" style={{ gap: 12 }}>
              {/* Checkbox */}
              <div style={{ pointerEvents: 'auto' }} onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleRow(p.id)}
                  className="opacity-0 group-hover:opacity-100"
                  style={{ width: 16, height: 16, cursor: 'pointer', ...(checked ? { opacity: 1 } : {}) }}
                />
              </div>

              {/* Star */}
              <div style={{ pointerEvents: 'auto' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => onToggleFav(p.id, isFav)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <Star size={16} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : 'var(--text-4)'} />
                </button>
              </div>

              {/* Badge */}
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                style={{ width: 28, height: 28, background: badgeColor, color: '#FFF', fontSize: 11, fontWeight: 700 }}
              >
                {badgeText}
              </div>

              {/* Project Name — clickable */}
              <span
                onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
                className="truncate hover:underline"
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', cursor: 'pointer' }}
              >
                {p.name}
              </span>

              {/* Key */}
              <span className="flex-shrink-0" style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", marginLeft: -4 }}>
                {p.project_key}
              </span>

              {/* Status Lozenge */}
              <ProjectStatusBadge status={p.status} />

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Lead */}
              {p.lead_name && (
                <div className="flex items-center gap-2 flex-shrink-0">
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
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {p.lead_name.split(' ')[0]}
                  </span>
                </div>
              )}

              {/* Action */}
              <div style={{ pointerEvents: 'auto', flexShrink: 0, width: 32 }}>
                {active ? (
                  <RowActionMenu project={p} />
                ) : (
                  <Lock size={14} style={{ color: 'var(--text-4)', opacity: 1 }} />
                )}
              </div>
            </div>

            {/* Line 2 */}
            <div className="flex items-center" style={{ gap: 8, paddingLeft: 68 }}>
              {p.member_ids && p.member_ids.length > 0 && (
                <MemberStack memberIds={p.member_ids} memberCount={p.member_count} max={3} size={20} />
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
        );
      })}
    </div>
  );
}
