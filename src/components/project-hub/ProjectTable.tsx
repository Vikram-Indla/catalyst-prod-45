import { ProjectTableRow, PHProject } from './ProjectTableRow';

const COLUMNS = [
  { key: 'star', label: '', width: 40 },
  { key: 'key', label: 'KEY', width: 80 },
  { key: 'name', label: 'PROJECT NAME', width: undefined },
  { key: 'department', label: 'DEPARTMENT', width: 140 },
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
}

export function ProjectTable({ projects, starredIds, onToggleStar, onContextMenu }: ProjectTableProps) {
  return (
    <div className="overflow-x-auto" style={{ background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
      <table className="w-full" style={{ borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
        <thead>
          <tr style={{ height: 36, background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 1 }}>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                style={{
                  width: col.width,
                  padding: '0 8px',
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: '#94A3B8',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textAlign: col.key === 'items' ? 'right' : 'left',
                  borderBottom: '1px solid #E2E8F0',
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
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
