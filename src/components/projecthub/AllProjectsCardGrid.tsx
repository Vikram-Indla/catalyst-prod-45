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

interface Props {
  projects: ProjectListItem[];
  favoriteIds: Set<string>;
  onToggleFav: (id: string, fav: boolean) => void;
  onSelectProject: (id: string) => void;
}

export function AllProjectsCardGrid({ projects, favoriteIds, onToggleFav, onSelectProject }: Props) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
      {projects.map(p => {
        const isFav = favoriteIds.has(p.id);
        const grad = getGradient(p.project_key);
        return (
          <div
            key={p.id}
            onClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
            style={{
              background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 8,
              overflow: 'hidden', cursor: 'pointer', transition: 'all 120ms',
              borderLeft: `3px solid ${grad.includes('#2563EB') ? '#2563EB' : grad.includes('#7C3AED') ? '#7C3AED' : grad.includes('#0D9488') ? '#0D9488' : '#2563EB'}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = ''; }}
          >
            <div style={{ padding: '10px 12px' }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 6, background: grad,
                    color: '#FFF', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {p.project_key.substring(0, 3)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{p.department || '—'}</div>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); onToggleFav(p.id, isFav); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                  <Star size={14} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : '#CBD5E1'} />
                </button>
              </div>

              {/* Compact stats row — Epics, Features, Stories only */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {[
                  { label: 'E', val: p.total_epics, tip: 'Epics' },
                  { label: 'F', val: p.total_features ?? 0, tip: 'Features' },
                  { label: 'S', val: p.total_stories, tip: 'Stories' },
                ].map(i => (
                  <div key={i.label} title={i.tip} style={{
                    flex: 1, textAlign: 'center', padding: '4px 0', background: '#F8FAFC', borderRadius: 4,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{i.val}</div>
                    <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600, letterSpacing: '0.05em' }}>{i.label}</div>
                  </div>
                ))}
              </div>

              {/* Footer — Last Sync + Members */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>
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
