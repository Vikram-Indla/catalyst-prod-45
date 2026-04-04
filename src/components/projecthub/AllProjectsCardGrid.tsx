import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict, format } from 'date-fns';
import type { ProjectListItem } from '@/types/projecthub';
import { MemberStack } from './MemberStack';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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

function getSyncStatus(lastSyncAt: string | null): { color: string; label: string; tooltip: string } {
  if (!lastSyncAt) return {
    color: 'bg-slate-300',
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
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
      {projects.map(p => {
        const isFav = favoriteIds.has(p.id);
        const badgeColor = getBadgeColor(p.id);
        const sync = getSyncStatus(p.last_synced_at);

        return (
          <div
            key={p.id}
            onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
            className="min-h-[280px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E2027] p-5 flex flex-col gap-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Header: badge + name + key + star */}
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                style={{ background: badgeColor }}
              >
                {p.project_key?.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[15px] leading-tight text-slate-900 dark:text-white truncate">
                    {p.name}
                  </span>
                  <span className="ml-0 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded tracking-wide flex-shrink-0">
                    {p.project_key}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                  className={isFav ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300 dark:text-slate-600'}
                />
              </button>
            </div>

            {/* Status + Lead row */}
            <div className="flex items-center justify-between">
              <ProjectStatusBadge status={p.status} />
              {p.lead_name ? (
                <div className="flex items-center gap-1.5">
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-[8px] font-bold text-white"
                      style={{ background: getBadgeColor(p.lead_id || '') }}>
                      {getInitials(p.lead_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {p.lead_name.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>

            {/* E/S/T stats */}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
              {[
                { v: p.total_epics, l: 'EPICS' },
                { v: p.total_stories, l: 'STORIES' },
                { v: p.total_tasks, l: 'TASKS' },
              ].map(s => (
                <div key={s.l} className="text-center py-2.5 px-1 bg-slate-50 dark:bg-slate-800 rounded">
                  <div className="text-2xl font-semibold text-slate-900 dark:text-white">{s.v || 0}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wide">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Footer: sync + members + updated */}
            <div className="flex items-center justify-between mt-auto text-xs text-slate-500 dark:text-slate-400">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium cursor-default">
                    <span className={cn("w-1.5 h-1.5 rounded-full", sync.color)} />
                    {sync.label}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[200px] whitespace-pre-line">
                  {sync.tooltip}
                </TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-2">
                <MemberStack memberIds={p.member_ids} memberCount={p.member_count} max={3} />
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
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
