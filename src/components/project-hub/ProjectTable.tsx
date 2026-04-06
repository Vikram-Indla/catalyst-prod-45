import { ProjectTableRow, PHProject } from './ProjectTableRow';
import { DK, LK } from '@/utils/dark-mode-styles';

const COLUMNS = [
  { key: 'star', label: '', width: 40 },
  { key: 'key', label: 'KEY', width: 80 },
  { key: 'name', label: 'PROJECT NAME', width: undefined },
  { key: 'status', label: 'STATUS', width: 100 },
  { key: 'members', label: 'MEMBERS', width: 100 },
  { key: 'items', label: 'ITEMS', width: 70 },
  { key: 'health', label: 'HEALTH', width: 110 },
  { key: 'updated', label: 'UPDATED', width: 100 },
];

interface ProjectTableProps {
  projects: PHProject[];
  starredIds: Set<string>;
  onToggleStar: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, project: PHProject) => void;
  isDark?: boolean;
}

export function ProjectTable({ projects, starredIds, onToggleStar, onContextMenu, isDark = false }: ProjectTableProps) {
  const T = isDark ? DK : LK;

  return (
    <div
      className={`overflow-x-auto rounded-lg border ${isDark ? 'bg-transparent border-[#454545]' : 'bg-white border-[#E2E8F0]'}`}
    >
      <table className="w-full" style={{ borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
        <thead>
          <tr
            className={isDark ? 'bg-[#1F1F1F]' : 'bg-[#F8FAFC]'}
            style={{ height: 50, position: 'sticky', top: 0, zIndex: 1 }}
          >
            {COLUMNS.map(col => (
              <th
                key={col.key}
                className={`border-b ${isDark ? 'border-[#2E2E2E]' : 'border-[#E2E8F0]'}`}
                style={{
                  width: col.width,
                  padding: '0 8px',
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: T.t3,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textAlign: col.key === 'items' ? 'right' : 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <ProjectTableRow
              key={project.id}
              project={project}
              isStarred={starredIds.has(project.id)}
              onToggleStar={onToggleStar}
              onContextMenu={onContextMenu}
              isDark={isDark}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}