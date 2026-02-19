import { useNavigate } from 'react-router-dom';
import { StarButton } from './StarButton';
import { formatRelativeTime, StatusBadge, HealthBadge, AvatarStack } from './project-list-utils';

export interface PHProject {
  id: string;
  key: string;
  name: string;
  description: string | null;
  department: string;
  status: string;
  health: string | null;
  color: string | null;
  icon: string | null;
  updated_at: string | null;
  member_count?: number;
  item_count?: number;
}

interface ProjectTableRowProps {
  project: PHProject;
  isStarred: boolean;
  onToggleStar: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, project: PHProject) => void;
}

export function ProjectTableRow({ project, isStarred, onToggleStar, onContextMenu }: ProjectTableRowProps) {
  const navigate = useNavigate();

  return (
    <tr
      className="group cursor-pointer transition-colors"
      style={{ height: 36 }}
      onClick={() => navigate(`/project-hub/${project.key}/dashboard`)}
      onContextMenu={e => onContextMenu(e, project)}
      onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Star */}
      <td style={{ width: 40, padding: '0 4px' }}>
        <StarButton
          isStarred={isStarred}
          onClick={e => { e.stopPropagation(); onToggleStar(project.id); }}
          size={14}
        />
      </td>

      {/* Key */}
      <td style={{ padding: '0 8px' }}>
        <span
          style={{
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
            color: '#2563EB',
          }}
        >
          {project.key}
        </span>
      </td>

      {/* Name */}
      <td style={{ padding: '0 8px' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex items-center justify-center rounded flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              background: project.color || '#2563EB',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 6,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            {project.key.slice(0, 2)}
          </div>
          <span className="truncate" style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>
            {project.name}
          </span>
        </div>
      </td>

      {/* Department */}
      <td style={{ padding: '0 8px', fontSize: 12, color: '#334155' }}>
        {project.department}
      </td>

      {/* Status */}
      <td style={{ padding: '0 8px' }}>
        <StatusBadge status={project.status} />
      </td>

      {/* Members */}
      <td style={{ padding: '0 8px' }}>
        <AvatarStack count={project.member_count || 0} />
      </td>

      {/* Items */}
      <td style={{ padding: '0 8px', textAlign: 'right' }}>
        <span
          style={{
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
            color: '#334155',
          }}
        >
          {project.item_count ?? 0}
        </span>
      </td>

      {/* Health */}
      <td style={{ padding: '0 8px' }}>
        <HealthBadge health={project.health} />
      </td>

      {/* Updated */}
      <td style={{ padding: '0 8px' }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>
          {formatRelativeTime(project.updated_at)}
        </span>
      </td>
    </tr>
  );
}
