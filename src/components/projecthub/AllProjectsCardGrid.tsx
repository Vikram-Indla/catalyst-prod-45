import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import type { ProjectListItem } from '@/types/projecthub';
import { MemberStack } from './MemberStack';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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

interface Props {
  projects: ProjectListItem[];
  favoriteIds: Set<string>;
  onToggleFav: (id: string, fav: boolean) => void;
  onSelectProject: (id: string) => void;
}

export function AllProjectsCardGrid({ projects, favoriteIds, onToggleFav, onSelectProject }: Props) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 w-full">
      {projects.map(p => {
        const isFav = favoriteIds.has(p.id);
        const badgeColor = getBadgeColor(p.id);
        const syncHealthy = !!p.last_synced_at;
        const syncAge = p.last_synced_at
          ? formatDistanceToNowStrict(new Date(p.last_synced_at), { addSuffix: false })
          : null;

        return (
          <div
            key={p.id}
            onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-5 bg-white dark:bg-[#1E2027] hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all cursor-pointer flex flex-col gap-3.5"
            style={{ height: '100%' }}
          >
            {/* Header: badge + name + dept + key + star */}
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: badgeColor }}
              >
                {p.project_key?.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] leading-tight text-slate-900 dark:text-white truncate">
                  {p.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {p.department || '—'}
                </div>
                <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {p.project_key}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }}
                className="bg-transparent border-none cursor-pointer p-0.5 shrink-0"
              >
                <Star size={14} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : undefined}
                  className={isFav ? '' : 'text-slate-300 dark:text-slate-600'} />
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
                    {p.lead_name.split(' ')[0]}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>

            {/* E/S/T stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: p.total_epics, l: 'Epics' },
                { v: p.total_stories, l: 'Stories' },
                { v: p.total_tasks, l: 'Tasks' },
              ].map(s => (
                <div key={s.l} className="text-center py-2.5 px-1 bg-slate-50 dark:bg-slate-800 rounded">
                  <div className="text-xl font-[650] text-slate-900 dark:text-white">{s.v || 0}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Footer: sync + members + updated */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className={cn("w-1.5 h-1.5 rounded-full", syncHealthy ? "bg-green-500" : "bg-amber-500")} />
                {syncAge ? `↔ ${syncAge}` : 'Not synced'}
              </div>
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
