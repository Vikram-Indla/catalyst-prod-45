import { Star } from 'lucide-react';
import type { ProjectListItem } from '@/types/projecthub';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { DistributionBar } from './DistributionBar';
import { MemberStack } from './MemberStack';
import { formatDistanceToNowStrict } from 'date-fns';

function getAvatarGradient(key: string) {
  const letter = (key[0] || '').toUpperCase();
  const map: Record<string, [string, string]> = {
    A: ['#2563EB', '#1D4ED8'], B: ['#2563EB', '#1D4ED8'], C: ['#2563EB', '#1D4ED8'],
    D: ['#7C3AED', '#6D28D9'], E: ['#7C3AED', '#6D28D9'], F: ['#7C3AED', '#6D28D9'],
    G: ['#0D9488', '#0F766E'], H: ['#0D9488', '#0F766E'], I: ['#0D9488', '#0F766E'],
    J: ['#1D4ED8', '#1E3A8A'], K: ['#1D4ED8', '#1E3A8A'], L: ['#1D4ED8', '#1E3A8A'],
    M: ['#F59E0B', '#D97706'], N: ['#F59E0B', '#D97706'], O: ['#F59E0B', '#D97706'],
    P: ['#DC2626', '#B91C1C'], Q: ['#DC2626', '#B91C1C'], R: ['#DC2626', '#B91C1C'],
    S: ['#2563EB', '#7C3AED'], T: ['#2563EB', '#7C3AED'], U: ['#2563EB', '#7C3AED'],
    V: ['#16A34A', '#15803D'], W: ['#16A34A', '#15803D'], X: ['#16A34A', '#15803D'], Y: ['#16A34A', '#15803D'], Z: ['#16A34A', '#15803D'],
  };
  const [from, to] = map[letter] || ['#0284C7', '#0369A1'];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

interface Props {
  projects: ProjectListItem[];
  favoriteIds: Set<string>;
  onToggleFav: (id: string, fav: boolean) => void;
  onSelectProject: (id: string) => void;
}

export function AllProjectsCardGrid({ projects, favoriteIds, onToggleFav, onSelectProject }: Props) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
      {projects.map(p => {
        const isFav = favoriteIds.has(p.id);
        const grad = getAvatarGradient(p.project_key);
        return (
          <div
            key={p.id}
            onClick={() => onSelectProject(p.id)}
            className="rounded-lg cursor-pointer transition-all hover:shadow-md"
            style={{ background: '#FFF', border: '1px solid #E2E8F0', overflow: 'hidden' }}
          >
            {/* Top gradient bar */}
            <div style={{ height: 4, background: grad }} />

            <div style={{ padding: '16px 20px' }}>
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="flex items-center justify-center rounded-md flex-shrink-0"
                  style={{ width: 36, height: 36, background: grad, color: '#FFF', fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", borderRadius: 8 }}
                >
                  {p.project_key.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{p.department || 'No department'}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Star size={16} fill={isFav ? '#EAB308' : 'none'} color={isFav ? '#EAB308' : '#CBD5E1'} />
                </button>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                <ProjectStatusBadge status={p.status} />
                <ProjectHealthBadge health={p.health_status} />
              </div>

              {/* Work items grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Epics', val: p.total_epics },
                  { label: 'Stories', val: p.total_stories },
                  { label: 'Tasks', val: p.total_tasks },
                ].map(i => (
                  <div key={i.label} className="text-center rounded" style={{ padding: '6px 0', background: '#F8FAFC' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{i.val}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>{i.label}</div>
                  </div>
                ))}
              </div>

              {/* Distribution bar */}
              <div className="mb-3">
                <DistributionBar todo={p.work_items_todo} inProgress={p.work_items_in_progress} done={p.work_items_done} />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between" style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
                <MemberStack memberIds={p.member_ids} memberCount={p.member_count} />
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
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
