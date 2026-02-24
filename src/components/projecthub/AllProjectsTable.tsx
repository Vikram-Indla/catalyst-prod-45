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
      style={{
        padding: '0 16px', height: 36, textAlign: center ? 'center' : 'left',
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
        color: '#64748B', whiteSpace: 'nowrap', borderBottom: '2px solid #E2E8F0',
        background: active ? '#EFF6FF' : '#F8FAFC', cursor: 'pointer', userSelect: 'none',
      }}
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
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
      <thead>
        <tr>
          <th style={{ width: 40, padding: '0 8px', height: 36, textAlign: 'center', borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }}>
            <input type="checkbox" checked={allChecked} onChange={onToggleAll} style={{ width: 14, height: 14, accentColor: '#2563EB', cursor: 'pointer' }} />
          </th>
          <th style={{ width: 36, padding: '0 4px', height: 36, borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }} />
          <SortHeader label="Key" col="name" currentCol={sortCol} dir={sortDir} onSort={onSort} />
          <SortHeader label="Project Name" col="name" currentCol={sortCol} dir={sortDir} onSort={onSort} />
          <SortHeader label="Department" col="department" currentCol={sortCol} dir={sortDir} onSort={onSort} />
          <SortHeader label="Status" col="status" currentCol={sortCol} dir={sortDir} onSort={onSort} />
          <SortHeader label="Epics" col="total_epics" currentCol={sortCol} dir={sortDir} onSort={onSort} center />
          <SortHeader label="Stories" col="total_stories" currentCol={sortCol} dir={sortDir} onSort={onSort} center />
          <th style={{ padding: '0 12px', height: 36, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }}>Distribution</th>
          
          <th style={{ padding: '0 12px', height: 36, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }}>Members</th>
          <th style={{ padding: '0 16px', height: 36, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #E2E8F0', background: '#F8FAFC', textAlign: 'right' }}>Updated</th>
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
              className="group"
              style={{
                height: 36, cursor: 'pointer', transition: 'background 100ms',
                borderBottom: '1px solid #F1F5F9',
                background: checked ? '#EFF6FF' : undefined,
              }}
              onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#FAFBFC'; }}
              onMouseLeave={e => { if (!checked) e.currentTarget.style.background = ''; }}
            >
              <td style={{ padding: '0 8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox" checked={checked} onChange={() => onToggleRow(p.id)}
                  className="opacity-0 group-hover:opacity-100"
                  style={{ width: 14, height: 14, accentColor: '#2563EB', cursor: 'pointer', ...(checked ? { opacity: 1 } : {}) }}
                />
              </td>
              <td style={{ padding: '0 4px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => onToggleFav(p.id, isFav)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 14 }}>
                  <Star size={14} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : '#CBD5E1'} />
                </button>
              </td>
              <td
                style={{ padding: '0 16px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                onClick={e => { e.stopPropagation(); navigate(`/project-hub/${p.project_key}/dashboard`); }}
              >
                <span style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 600 }} className="hover:underline">
                  {p.project_key}
                </span>
              </td>
              <td style={{ padding: '0 16px' }} onClick={e => { e.stopPropagation(); navigate(`/project-hub/${p.project_key}/dashboard`); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 4, flexShrink: 0,
                    background: `linear-gradient(135deg, ${g1}, ${g2})`,
                    color: '#FFF', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {p.project_key.substring(0, 2)}
                  </div>
                  <span style={{ fontWeight: 500, fontSize: 14, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </span>
                </div>
              </td>
              <td style={{ padding: '0 16px', fontSize: 13, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.department || '—'}
              </td>
              <td style={{ padding: '0 16px' }}>
                <ProjectStatusBadge status={p.status} />
              </td>
              <td style={{ padding: '0 16px', textAlign: 'center', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{p.total_epics}</td>
              <td style={{ padding: '0 16px', textAlign: 'center', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{p.total_stories}</td>
              <td style={{ padding: '0 12px' }}>
                <DistributionBar todo={p.work_items_todo} inProgress={p.work_items_in_progress} done={p.work_items_done} showNumbers />
              </td>
              
              <td style={{ padding: '0 12px' }}>
                <MemberStack memberIds={p.member_ids} memberCount={p.member_count} />
              </td>
              <td style={{ padding: '0 16px', fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap', textAlign: 'right' }}>
                {p.updated_at ? formatDistanceToNowStrict(new Date(p.updated_at), { addSuffix: true }) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
