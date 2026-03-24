import { Star, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ProjectListItem, SortColumn, SortDirection } from '@/types/projecthub';
import { ProjectStatusBadge } from './ProjectStatusBadge';

import { DistributionBar } from './DistributionBar';
import { MemberStack } from './MemberStack';
import { STATUS_CATEGORY_DISPLAY } from '@/types/projecthub';
import { formatDistanceToNowStrict } from 'date-fns';

function getAvatarGradient(key: string): [string, string] {
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
  return map[c] || ['#2563EB', '#1D4ED8'];
}

const CAT_DOT: Record<string, string> = { todo: '#94A3B8', in_progress: '#3B82F6', done: '#22C55E' };
const CAT_TEXT: Record<string, string> = { todo: '#94A3B8', in_progress: '#3B82F6', done: '#22C55E' };

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

function SortHeader({ label, col, currentCol, dir, onSort, center }: {
  label: string; col: SortColumn; currentCol: SortColumn; dir: SortDirection;
  onSort: (c: SortColumn) => void; center?: boolean;
}) {
  const active = currentCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={[
        'h-9 select-none whitespace-nowrap border-b-2 border-border px-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground',
        center ? 'text-center' : 'text-left',
        active ? 'bg-primary/10 text-foreground' : 'bg-muted/50 dark:bg-muted/20',
        'cursor-pointer',
      ].join(' ')}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label}
        {active && (dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
        {!active && <span style={{ opacity: 0.3, fontSize: 10 }}>↕</span>}
      </span>
    </th>
  );
}

export function AllProjectsTable({ projects, favoriteIds, onToggleFav, onSelectProject, sortCol, sortDir, onSort, selectedRows, onToggleRow, onToggleAll }: Props) {
  const navigate = useNavigate();
  const allChecked = projects.length > 0 && projects.every(p => selectedRows.has(p.id));

  return (
    <table className="w-full border-collapse font-['Inter',sans-serif] bg-card text-foreground dark:bg-background">
      <thead>
        <tr>
          <th className="h-9 w-10 border-b-2 border-border bg-muted/50 px-2 text-center dark:bg-muted/20">
            <input type="checkbox" checked={allChecked} onChange={onToggleAll} style={{ width: 14, height: 14, accentColor: '#2563EB', cursor: 'pointer' }} />
          </th>
          <th className="h-9 w-9 border-b-2 border-border bg-muted/50 px-1 dark:bg-muted/20" />
          <SortHeader label="Key" col="name" currentCol={sortCol} dir={sortDir} onSort={onSort} />
          <SortHeader label="Project Name" col="name" currentCol={sortCol} dir={sortDir} onSort={onSort} />
          <SortHeader label="Status" col="status" currentCol={sortCol} dir={sortDir} onSort={onSort} />
          
          <th className="h-9 border-b-2 border-border bg-muted/50 px-3 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground dark:bg-muted/20">Members</th>
          <th className="h-9 border-b-2 border-border bg-muted/50 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground dark:bg-muted/20">Updated</th>
        </tr>
      </thead>
      <tbody>
        {projects.map(p => {
          const isFav = favoriteIds.has(p.id);
          const checked = selectedRows.has(p.id);
          const [g1, g2] = getAvatarGradient(p.project_key);
          return (
            <tr
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              onDoubleClick={() => navigate(`/project-hub/${p.project_key}/dashboard`)}
              className={[
                'group h-9 cursor-pointer border-b border-border transition-colors',
                checked ? 'bg-primary/10' : 'bg-transparent hover:bg-muted/40 dark:hover:bg-white/5',
              ].join(' ')}
            >
              <td className="px-2 text-center" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox" checked={checked} onChange={() => onToggleRow(p.id)}
                  className="opacity-0 group-hover:opacity-100"
                  style={{ width: 14, height: 14, accentColor: '#2563EB', cursor: 'pointer', ...(checked ? { opacity: 1 } : {}) }}
                />
              </td>
              <td className="px-1 text-center" onClick={e => e.stopPropagation()}>
                <button onClick={() => onToggleFav(p.id, isFav)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 14 }}>
                  <Star size={14} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : '#CBD5E1'} />
                </button>
              </td>
              <td
                className="px-4 text-xs font-['JetBrains_Mono',monospace]"
                onClick={e => { e.stopPropagation(); navigate(`/project-hub/${p.project_key}/dashboard`); }}
              >
                <span className="cursor-pointer font-semibold text-primary hover:underline">
                  {p.project_key}
                </span>
              </td>
              <td className="px-4" onClick={e => { e.stopPropagation(); navigate(`/project-hub/${p.project_key}/dashboard`); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 4, flexShrink: 0,
                    background: `linear-gradient(135deg, ${g1}, ${g2})`,
                    color: '#FFF', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {p.project_key.substring(0, 2)}
                  </div>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-foreground">
                    {p.name}
                  </span>
                </div>
              </td>
              <td className="px-4">
                <ProjectStatusBadge status={p.status} />
              </td>
              
              <td className="px-3">
                <MemberStack memberIds={p.member_ids} memberCount={p.member_count} />
              </td>
              <td className="whitespace-nowrap px-4 text-right text-xs text-muted-foreground">
                {p.updated_at ? formatDistanceToNowStrict(new Date(p.updated_at), { addSuffix: true }) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
