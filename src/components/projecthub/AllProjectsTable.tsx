import { Star, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { ProjectListItem, SortColumn, SortDirection } from '@/types/projecthub';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { DistributionBar } from './DistributionBar';
import { MemberStack } from './MemberStack';
import { STATUS_CATEGORY_DISPLAY } from '@/types/projecthub';
import { formatDistanceToNowStrict } from 'date-fns';

function getAvatarGradient(key: string) {
  const letter = (key[0] || '').toUpperCase();
  const map: Record<string, string> = {
    A: '#2563EB', B: '#2563EB', C: '#2563EB',
    D: '#7C3AED', E: '#7C3AED', F: '#7C3AED',
    G: '#0D9488', H: '#0D9488', I: '#0D9488',
    J: '#1D4ED8', K: '#1D4ED8', L: '#1D4ED8',
    M: '#F59E0B', N: '#F59E0B', O: '#F59E0B',
    P: '#DC2626', Q: '#DC2626', R: '#DC2626',
    S: '#2563EB', T: '#2563EB', U: '#2563EB',
    V: '#16A34A', W: '#16A34A', X: '#16A34A', Y: '#16A34A', Z: '#16A34A',
  };
  return map[letter] || '#0284C7';
}

const CAT_DOT: Record<string, string> = { todo: '#94A3B8', in_progress: '#2563EB', done: '#16A34A' };

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

function SortHeader({ label, col, currentCol, dir, onSort, align }: { label: string; col: SortColumn; currentCol: SortColumn; dir: SortDirection; onSort: (c: SortColumn) => void; align?: string }) {
  const active = currentCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className="cursor-pointer select-none transition-colors group"
      style={{
        padding: '0 12px',
        height: 36,
        fontSize: 11,
        fontWeight: 600,
        color: active ? '#2563EB' : '#64748B',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        textAlign: (align as any) || 'left',
        background: active ? '#F0F9FF' : 'transparent',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid #E2E8F0',
      }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-40" />}
      </span>
    </th>
  );
}

export function AllProjectsTable({ projects, favoriteIds, onToggleFav, onSelectProject, sortCol, sortDir, onSort, selectedRows, onToggleRow, onToggleAll }: Props) {
  const allChecked = projects.length > 0 && projects.every(p => selectedRows.has(p.id));

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr>
              <th style={{ width: 36, padding: '0 8px', height: 36, borderBottom: '1px solid #E2E8F0' }}>
                <input type="checkbox" checked={allChecked} onChange={onToggleAll} className="cursor-pointer" style={{ width: 14, height: 14 }} />
              </th>
              <th style={{ width: 36, padding: '0 4px', height: 36, borderBottom: '1px solid #E2E8F0' }} />
              <SortHeader label="Key" col="name" currentCol={sortCol} dir={sortDir} onSort={onSort} />
              <SortHeader label="Project Name" col="name" currentCol={sortCol} dir={sortDir} onSort={onSort} />
              <SortHeader label="Department" col="department" currentCol={sortCol} dir={sortDir} onSort={onSort} />
              <SortHeader label="Status" col="status" currentCol={sortCol} dir={sortDir} onSort={onSort} />
              <th style={{ padding: '0 12px', height: 36, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>Category</th>
              <SortHeader label="Epics" col="total_epics" currentCol={sortCol} dir={sortDir} onSort={onSort} align="center" />
              <SortHeader label="Stories" col="total_stories" currentCol={sortCol} dir={sortDir} onSort={onSort} align="center" />
              <SortHeader label="Tasks" col="total_tasks" currentCol={sortCol} dir={sortDir} onSort={onSort} align="center" />
              <th style={{ padding: '0 12px', height: 36, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', minWidth: 140 }}>Distribution</th>
              <SortHeader label="Health" col="health_status" currentCol={sortCol} dir={sortDir} onSort={onSort} />
              <th style={{ padding: '0 12px', height: 36, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>Members</th>
              <th style={{ padding: '0 12px', height: 36, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => {
              const isFav = favoriteIds.has(p.id);
              const checked = selectedRows.has(p.id);
              const bg = getAvatarGradient(p.project_key);
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className="group cursor-pointer transition-colors hover:bg-[#F8FAFC]"
                  style={{ height: 36, borderBottom: '1px solid #F1F5F9' }}
                >
                  <td style={{ padding: '0 8px' }} onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleRow(p.id)}
                      className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ width: 14, height: 14, ...(checked ? { opacity: 1 } : {}) }}
                    />
                  </td>
                  <td style={{ padding: '0 4px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => onToggleFav(p.id, isFav)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Star size={14} fill={isFav ? '#EAB308' : 'none'} color={isFav ? '#EAB308' : '#CBD5E1'} />
                    </button>
                  </td>
                  <td style={{ padding: '0 12px', fontSize: 12, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                    {p.project_key}
                  </td>
                  <td style={{ padding: '0 12px' }}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex items-center justify-center rounded-md flex-shrink-0"
                        style={{ width: 28, height: 28, background: bg, color: '#FFF', fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", borderRadius: 6 }}
                      >
                        {p.project_key.substring(0, 2)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0 12px', fontSize: 12, color: '#475569' }}>{p.department || '—'}</td>
                  <td style={{ padding: '0 12px' }}><ProjectStatusBadge status={p.status} /></td>
                  <td style={{ padding: '0 12px' }}>
                    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, color: '#475569' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: CAT_DOT[p.status_category] || '#94A3B8' }} />
                      {STATUS_CATEGORY_DISPLAY[p.status_category] || p.status_category}
                    </span>
                  </td>
                  <td style={{ padding: '0 12px', textAlign: 'center', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#334155' }}>{p.total_epics}</td>
                  <td style={{ padding: '0 12px', textAlign: 'center', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#334155' }}>{p.total_stories}</td>
                  <td style={{ padding: '0 12px', textAlign: 'center', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#334155' }}>{p.total_tasks}</td>
                  <td style={{ padding: '0 12px', minWidth: 140 }}>
                    <DistributionBar todo={p.work_items_todo} inProgress={p.work_items_in_progress} done={p.work_items_done} />
                  </td>
                  <td style={{ padding: '0 12px' }}><ProjectHealthBadge health={p.health_status} /></td>
                  <td style={{ padding: '0 12px' }}><MemberStack memberIds={p.member_ids} memberCount={p.member_count} /></td>
                  <td style={{ padding: '0 12px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                    {p.updated_at ? formatDistanceToNowStrict(new Date(p.updated_at), { addSuffix: true }) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
