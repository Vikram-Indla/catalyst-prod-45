import { Star, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { ProjectListItem, SortColumn, SortDirection } from '@/types/projecthub';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectHealthBadge } from './ProjectHealthBadge';
import { DistributionBar } from './DistributionBar';
import { MemberStack } from './MemberStack';
import { STATUS_CATEGORY_DISPLAY } from '@/types/projecthub';
import { formatDistanceToNowStrict } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

function SortHeader({ label, col, currentCol, dir, onSort, align, width }: { label: string; col: SortColumn; currentCol: SortColumn; dir: SortDirection; onSort: (c: SortColumn) => void; align?: string; width?: number | string }) {
  const active = currentCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className="cursor-pointer select-none transition-colors group"
      style={{
        padding: '0 8px',
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
        width: width,
      }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-40" />}
      </span>
    </th>
  );
}

export function AllProjectsTable({ projects, favoriteIds, onToggleFav, onSelectProject, sortCol, sortDir, onSort, selectedRows, onToggleRow, onToggleAll }: Props) {
  const allChecked = projects.length > 0 && projects.every(p => selectedRows.has(p.id));

  return (
    <TooltipProvider delayDuration={300}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif", tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 36 }} />  {/* checkbox */}
            <col style={{ width: 36 }} />  {/* star */}
            <col style={{ width: 56 }} />  {/* key */}
            <col />                         {/* project name — flex */}
            <col style={{ width: 170 }} />  {/* department */}
            <col style={{ width: 90 }} />   {/* status */}
            <col style={{ width: 100 }} />  {/* category */}
            <col style={{ width: 56 }} />   {/* epics */}
            <col style={{ width: 64 }} />   {/* stories */}
            <col style={{ width: 56 }} />   {/* tasks */}
            <col style={{ width: 110 }} />  {/* distribution */}
            <col style={{ width: 90 }} />   {/* health */}
            <col style={{ width: 90 }} />   {/* members */}
            <col style={{ width: 80 }} />   {/* updated */}
          </colgroup>
          <thead>
            <tr>
              <th style={{ padding: '0 8px', height: 36, borderBottom: '1px solid #E2E8F0' }}>
                <input type="checkbox" checked={allChecked} onChange={onToggleAll} className="cursor-pointer" style={{ width: 14, height: 14 }} />
              </th>
              <th style={{ padding: '0 4px', height: 36, borderBottom: '1px solid #E2E8F0' }} />
              <SortHeader label="Key" col="name" currentCol={sortCol} dir={sortDir} onSort={onSort} width={56} />
              <SortHeader label="Project Name" col="name" currentCol={sortCol} dir={sortDir} onSort={onSort} />
              <SortHeader label="Department" col="department" currentCol={sortCol} dir={sortDir} onSort={onSort} width={170} />
              <SortHeader label="Status" col="status" currentCol={sortCol} dir={sortDir} onSort={onSort} width={90} />
              <th style={{ padding: '0 8px', height: 36, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', width: 100 }}>Category</th>
              <SortHeader label="Epics" col="total_epics" currentCol={sortCol} dir={sortDir} onSort={onSort} align="center" width={56} />
              <SortHeader label="Stories" col="total_stories" currentCol={sortCol} dir={sortDir} onSort={onSort} align="center" width={64} />
              <SortHeader label="Tasks" col="total_tasks" currentCol={sortCol} dir={sortDir} onSort={onSort} align="center" width={56} />
              <th style={{ padding: '0 8px', height: 36, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', textAlign: 'center', width: 110 }}>Distribution</th>
              <SortHeader label="Health" col="health_status" currentCol={sortCol} dir={sortDir} onSort={onSort} width={90} />
              <th style={{ padding: '0 8px', height: 36, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', width: 90 }}>Members</th>
              <th style={{ padding: '0 8px', height: 36, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', textAlign: 'right', width: 80 }}>Updated</th>
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
                  className="group cursor-pointer transition-colors"
                  style={{
                    height: 36,
                    borderBottom: '1px solid #F1F5F9',
                    background: checked ? '#F0F9FF' : undefined,
                  }}
                  onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.borderLeft = '2px solid #2563EB'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = checked ? '#F0F9FF' : ''; (e.currentTarget as HTMLElement).style.borderLeft = ''; }}
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
                  <td style={{ padding: '0 8px', fontSize: 11, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.project_key}
                  </td>
                  <td style={{ padding: '0 8px', overflow: 'hidden' }}>
                    <div className="flex items-center gap-2" style={{ overflow: 'hidden' }}>
                      <div
                        className="flex items-center justify-center rounded-md flex-shrink-0"
                        style={{ width: 26, height: 26, background: bg, color: '#FFF', fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", borderRadius: 5 }}
                      >
                        {p.project_key.substring(0, 2)}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0 8px', fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block truncate">{p.department || '—'}</span>
                      </TooltipTrigger>
                      {p.department && p.department.length > 18 && (
                        <TooltipContent side="top" className="text-xs max-w-[240px]">
                          {p.department}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </td>
                  <td style={{ padding: '0 8px' }}>
                    <ProjectStatusBadge status={p.status} />
                  </td>
                  <td style={{ padding: '0 8px' }}>
                    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 11, color: '#475569' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_DOT[p.status_category] || '#94A3B8', flexShrink: 0 }} />
                      {STATUS_CATEGORY_DISPLAY[p.status_category] || p.status_category}
                    </span>
                  </td>
                  <td style={{ padding: '0 8px', textAlign: 'center', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#334155' }}>{p.total_epics}</td>
                  <td style={{ padding: '0 8px', textAlign: 'center', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#334155' }}>{p.total_stories}</td>
                  <td style={{ padding: '0 8px', textAlign: 'center', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#334155' }}>{p.total_tasks}</td>
                  <td style={{ padding: '0 8px' }}>
                    <DistributionBar todo={p.work_items_todo} inProgress={p.work_items_in_progress} done={p.work_items_done} showNumbers />
                  </td>
                  <td style={{ padding: '0 8px' }}><ProjectHealthBadge health={p.health_status} /></td>
                  <td style={{ padding: '0 8px' }}><MemberStack memberIds={p.member_ids} memberCount={p.member_count} /></td>
                  <td style={{ padding: '0 8px', fontSize: 10, color: '#94A3B8', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {p.updated_at ? formatDistanceToNowStrict(new Date(p.updated_at), { addSuffix: true }) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
