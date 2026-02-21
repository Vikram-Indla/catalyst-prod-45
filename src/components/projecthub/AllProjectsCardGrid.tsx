import { Star } from 'lucide-react';
import type { ProjectListItem } from '@/types/projecthub';
import { STATUS_CATEGORY_DISPLAY } from '@/types/projecthub';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { DistributionBar } from './DistributionBar';
import { MemberStack } from './MemberStack';
import { formatDistanceToNowStrict } from 'date-fns';

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

const CAT_DOT: Record<string, string> = { todo: '#94A3B8', in_progress: '#3B82F6', done: '#22C55E' };
const CAT_TEXT: Record<string, string> = { todo: '#94A3B8', in_progress: '#3B82F6', done: '#22C55E' };

interface Props {
  projects: ProjectListItem[];
  favoriteIds: Set<string>;
  onToggleFav: (id: string, fav: boolean) => void;
  onSelectProject: (id: string) => void;
}

export function AllProjectsCardGrid({ projects, favoriteIds, onToggleFav, onSelectProject }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
      {projects.map(p => {
        const isFav = favoriteIds.has(p.id);
        const grad = getGradient(p.project_key);
        const total = p.work_items_done + p.work_items_in_progress + p.work_items_todo;
        return (
          <div
            key={p.id}
            onClick={() => onSelectProject(p.id)}
            style={{
              background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 8,
              overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer', transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = ''; }}
          >
            {/* Top gradient bar */}
            <div style={{ height: 4, background: grad }} />

            <div style={{ padding: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, background: grad,
                    color: '#FFF', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {p.project_key.substring(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{p.department || 'No department'}</div>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Star size={16} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : '#CBD5E1'} />
                </button>
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 500, color: CAT_TEXT[p.status_category] || '#94A3B8',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: CAT_DOT[p.status_category] || '#94A3B8' }} />
                  {STATUS_CATEGORY_DISPLAY[p.status_category] || p.status_category}
                </span>
                <ProjectHealthBadge health={p.health_status} />
              </div>

              {/* Work items */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[
                  { label: 'EPICS', val: p.total_epics },
                  { label: 'STORIES', val: p.total_stories },
                  { label: 'TASKS', val: p.total_tasks },
                ].map(i => (
                  <div key={i.label} style={{ flex: 1, textAlign: 'center', padding: '6px 0', background: '#F8FAFC', borderRadius: 6 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{i.val}</div>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{i.label}</div>
                  </div>
                ))}
              </div>

              {/* Distribution */}
              <div style={{ marginBottom: 4 }}>
                <DistributionBar todo={p.work_items_todo} inProgress={p.work_items_in_progress} done={p.work_items_done} />
              </div>
              {total > 0 && (
                <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#64748B', marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: '#22C55E' }} />
                    {p.work_items_done} Done
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: '#3B82F6' }} />
                    {p.work_items_in_progress} In Prog
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: '#E2E8F0' }} />
                    {p.work_items_todo} To Do
                  </span>
                </div>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
                <MemberStack memberIds={p.member_ids} memberCount={p.member_count} max={4} />
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
