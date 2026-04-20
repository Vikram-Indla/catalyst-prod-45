import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict, format } from 'date-fns';
import type { ProjectListItem } from '@/types/projecthub';
import { MemberStack } from './MemberStack';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { Avatar, Tooltip } from '@/components/ads';
import { cn } from '@/lib/utils';

const BADGE_COLORS = ['#3B82F6', '#6366F1', '#0891B2', '#475569', '#0D9488', '#78716C'];

function getBadgeColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

function getSyncStatus(lastSyncAt: string | null): { color: string; label: string; tooltip: string } {
  if (!lastSyncAt) return {
    color: 'bg-slate-300 dark:bg-[#878787]',
    label: 'Not synced',
    tooltip: 'No Jira sync configured',
  };
  const mins = (Date.now() - new Date(lastSyncAt).getTime()) / 60000;
  const formatted = format(new Date(lastSyncAt), 'dd MMM yyyy HH:mm');
  if (mins > 120) return {
    color: 'bg-red-500',
    label: `Stale · ${Math.round(mins / 60)}h ago`,
    tooltip: `Stale — last sync ${formatted}`,
  };
  if (mins > 15) return {
    color: 'bg-amber-400',
    label: `${Math.round(mins)} min ago`,
    tooltip: `Last synced: ${formatted}`,
  };
  return {
    color: 'bg-green-500',
    label: `${Math.round(mins)} min ago`,
    tooltip: `Last synced: ${formatted}\nStatus: OK`,
  };
}

interface Props {
  projects: ProjectListItem[];
  favoriteIds: Set<string>;
  onToggleFav: (id: string, fav: boolean) => void;
  onSelectProject: (id: string) => void;
}

export function AllProjectsCardGrid({ projects, favoriteIds, onToggleFav, onSelectProject }: Props) {
  const navigate = useNavigate();
  return (
    <div className="w-full max-w-full" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '16px' }}>
      {projects.map(p => {
        const isFav = favoriteIds.has(p.id);
        const badgeColor = getBadgeColor(p.id);
        const sync = getSyncStatus(p.last_synced_at);

        return (
          <div
            key={p.id}
            onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
            className={cn(
              "rounded-xl p-5 flex flex-col h-full cursor-pointer transition-all duration-150",
              "bg-white border border-slate-200 shadow-sm hover:shadow-md",
              "dark:bg-[#0A0A0A] dark:border-[#2E2E2E] dark:hover:border-[#454545]"
            )}
          >
            {/* Header: badge + name + key + star */}
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                style={{ background: badgeColor }}
              >
                {p.project_key}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[15px] leading-tight text-slate-900 dark:text-[#EDEDED] truncate">
                    {p.name}
                  </span>
                  <span className="font-mono text-[11px] bg-slate-100 dark:bg-[#2E2E2E] text-slate-500 dark:text-[#A1A1A1] px-1.5 py-0.5 rounded tracking-wide flex-shrink-0">
                    {p.project_key}
                  </span>
                </div>
                <div className="text-[12px] text-slate-500 dark:text-[#878787] mt-0.5">
                  {p.department || '—'}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }}
                className="bg-transparent border-none cursor-pointer p-0.5 shrink-0"
              >
                <Star
                  size={14}
                  fill={isFav ? '#F59E0B' : 'none'}
                  color={isFav ? '#F59E0B' : undefined}
                  className={isFav ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300 dark:text-[#878787]'}
                />
              </button>
            </div>

            {/* Status + Lead row */}
            <div className="flex items-center justify-between mt-3">
              <ProjectStatusBadge status={p.status} />
              {p.lead_name ? (
                <div className="flex items-center gap-1.5">
                  <Avatar src={p.lead_avatar_url || undefined} name={p.lead_name || '??'} size="xxsmall" />
                  <span className="text-xs text-slate-600 dark:text-[#878787]">
                    {p.lead_name.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 dark:text-[#A1A1A1]">—</span>
              )}
            </div>

            {/* E/S/T stats — flex-1 fills space */}
            <div className="grid grid-cols-3 gap-2 mt-4 flex-1">
              {[
                { v: p.total_epics, l: 'EPICS' },
                { v: p.total_stories, l: 'STORIES' },
                { v: p.total_tasks, l: 'TASKS' },
              ].map(s => (
                <div
                  key={s.l}
                  className={cn(
                    "text-center p-3 rounded-lg",
                    "bg-slate-50",
                    "dark:bg-[#1A1A1A] dark:border dark:border-[#2E2E2E]"
                  )}
                >
                  <div className="text-[22px] font-semibold text-slate-900 dark:text-[#EDEDED]">{s.v || 0}</div>
                  <div className="text-[10px] font-medium tracking-widest uppercase text-slate-400 dark:text-[#A1A1A1] mt-1">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Footer: sync + members + updated — pinned bottom */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-[#2E2E2E] text-xs text-slate-500 dark:text-[#878787]">
              <Tooltip content={sync.tooltip} position="bottom">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#2E2E2E] text-[11px] font-medium cursor-default">
                  <span className={cn("w-1.5 h-1.5 rounded-full", sync.color)} />
                  {sync.label}
                </div>
              </Tooltip>
              <div className="flex items-center gap-2">
                <MemberStack memberIds={p.member_ids} memberCount={p.member_count} max={3} />
                <span className="text-[11px] text-slate-400 dark:text-[#A1A1A1]">
                  {p.updated_at ? formatDistanceToNowStrict(new Date(p.updated_at), { addSuffix: true }) : '—'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
