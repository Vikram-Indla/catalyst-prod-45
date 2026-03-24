import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import type { ProjectListItem } from '@/types/projecthub';
import { MemberStack } from './MemberStack';

function getGradient(key: string): string {
  const c = (key[0] || 'A').toUpperCase();
  const map: Record<string, [string, string]> = {
    A: ['#2563EB', '#1D4ED8'], B: ['#2563EB', '#1D4ED8'],
    C: ['#7C3AED', '#6D28D9'], D: ['#7C3AED', '#6D28D9'],
    E: ['#0D9488', '#0F766E'], F: ['#0D9488', '#0F766E'],
    G: ['#D97706', '#B45309'], H: ['#D97706', '#B45309'],
    I: ['#2563EB', '#1D4ED8'], J: ['#2563EB', '#1D4ED8'],
    K: ['#1D4ED8', '#1E3A8A'], L: ['#1D4ED8', '#1E3A8A'],
    M: ['#F59E0B', '#D97706'], N: ['#F59E0B', '#D97706'],
    O: ['#DC2626', '#B91C1C'], P: ['#DC2626', '#B91C1C'],
    Q: ['#16A34A', '#15803D'], R: ['#16A34A', '#15803D'],
    S: ['#0284C7', '#0369A1'], T: ['#0284C7', '#0369A1'],
    U: ['#0D9488', '#115E59'], V: ['#0D9488', '#115E59'],
    W: ['#0284C7', '#075985'], X: ['#0284C7', '#075985'],
    Y: ['#7C3AED', '#5B21B6'], Z: ['#7C3AED', '#5B21B6'],
  };
  const [f, t] = map[c] || ['#2563EB', '#1D4ED8'];
  return `linear-gradient(135deg, ${f}, ${t})`;
}

function getAccentColor(grad: string): string {
  if (grad.includes('#2563EB')) return '#2563EB';
  if (grad.includes('#7C3AED')) return '#7C3AED';
  if (grad.includes('#0D9488')) return '#0D9488';
  if (grad.includes('#D97706')) return '#D97706';
  if (grad.includes('#DC2626')) return '#DC2626';
  if (grad.includes('#16A34A')) return '#16A34A';
  if (grad.includes('#0284C7')) return '#0284C7';
  if (grad.includes('#1D4ED8')) return '#1D4ED8';
  return '#2563EB';
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
    <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {projects.map(p => {
        const isFav = favoriteIds.has(p.id);
        const grad = getGradient(p.project_key);
        const accent = getAccentColor(grad);
        return (
          <div
            key={p.id}
            onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
            className="rounded-lg overflow-hidden cursor-pointer transition-all duration-[120ms] bg-[#FFFFFF] dark:!bg-[#1A1714] border border-[#E2E8F0] dark:border-gray-700 hover:-translate-y-px hover:shadow-md dark:hover:shadow-none dark:shadow-none"
            style={{ borderLeft: `3px solid ${accent}` }}
          >
            <div className="p-[10px_12px]">
              {/* Header row */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-[26px] h-[26px] rounded-[6px] text-white text-[9px] font-bold flex items-center justify-center shrink-0"
                    style={{ background: grad }}
                  >
                    {p.project_key.substring(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold leading-tight whitespace-nowrap overflow-hidden text-ellipsis text-gray-900 dark:text-white">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">
                      {p.department || '—'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }}
                  className="bg-transparent border-none cursor-pointer p-0.5 shrink-0"
                >
                  <Star size={14} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : undefined} className={isFav ? '' : 'text-gray-300 dark:text-gray-600'} />
                </button>
              </div>

              {/* Compact stats row — Epics and Stories only */}
              <div className="flex gap-1 mb-2">
                {[
                  { label: 'E', val: p.total_epics, tip: 'Epics' },
                  { label: 'S', val: p.total_stories, tip: 'Stories' },
                ].map(i => (
                  <div
                    key={i.label}
                    title={i.tip}
                    className="flex-1 text-center py-1 rounded bg-[#F8FAFC] dark:bg-gray-800"
                  >
                    <div className="text-sm font-bold font-['JetBrains_Mono',monospace] leading-tight text-gray-900 dark:text-white">
                      {i.val}
                    </div>
                    <div className="text-[9px] font-semibold tracking-wider text-gray-400 dark:text-gray-500">
                      {i.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer — Last Sync + Members */}
              <div className="flex justify-between items-center">
                <div className="text-[10px] text-gray-400 dark:text-gray-500">
                  {p.last_synced_at
                    ? `Synced ${formatDistanceToNowStrict(new Date(p.last_synced_at), { addSuffix: true })}`
                    : 'Not synced'}
                </div>
                <MemberStack memberIds={p.member_ids} memberCount={p.member_count} max={3} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
