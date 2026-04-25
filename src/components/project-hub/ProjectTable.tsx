import { ProjectTableRow, PHProject } from './ProjectTableRow';

const COLUMNS = [
  { key: 'star', label: '', width: 36 },
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
  return (
    <div
      className={`overflow-x-auto rounded-[6px] border ${isDark ? 'bg-transparent border-[#2E2E2E]' : 'bg-white border-[#E2E8F0]'}`}
    >
      <table className="w-full" style={{ borderCollapse: 'collapse', fontFamily: 'var(--ds-font-family-body)' }}>
        <thead>
          <tr
            className={isDark ? 'bg-[#111111]' : 'bg-[#F8FAFC]'}
            style={{ height: 36, maxHeight: 36, position: 'sticky', top: 0, zIndex: 1 }}
          >
            {COLUMNS.map(col => (
              <th
                key={col.key}
                className={`border-b ${isDark ? 'border-[#2E2E2E]' : 'border-[#E2E8F0]'}`}
                style={{
                  width: col.width,
                  padding: '0 12px',
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: isDark ? '#7D7D7D' : '#6B778C',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textAlign: col.key === 'items' ? 'right' : 'left',
                  whiteSpace: 'nowrap',
                  height: 36,
                  maxHeight: 36,
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
