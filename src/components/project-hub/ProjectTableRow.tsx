import { useNavigate } from 'react-router-dom';
import { StarButton } from './StarButton';
import { formatRelativeTime, StatusBadge, HealthBadge, AvatarStack } from './project-list-utils';
import { DK, LK } from '@/utils/dark-mode-styles';

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
  isDark?: boolean;
}

export function ProjectTableRow({ project, isStarred, onToggleStar, onContextMenu, isDark = false }: ProjectTableRowProps) {
  const navigate = useNavigate();
  const T = isDark ? DK : LK;

  return (
    <tr
      className="group cursor-pointer transition-colors"
      style={{ height: 50 }}
      onClick={() => navigate(`/project-hub/${project.key}/dashboard`)}
      onContextMenu={e => onContextMenu(e, project)}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.hoverBg)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
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
            color: T.blueKey,
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
              width: 32,
              height: 28,
              backgroundColor: project.color || 'var(--cp-blue)',
              color: '#FFFFFF',
              fontSize: project.key.length > 2 ? 9 : 10,
              fontWeight: 700,
              borderRadius: 6,
              fontFamily: "'Sora', sans-serif",
              letterSpacing: project.key.length > 2 ? '-0.02em' : undefined,
            }}
          >
            {project.key}
          </div>
          <span className="truncate" style={{ fontSize: 14, fontWeight: 500, color: T.t1 }}>
            {project.name}
          </span>
        </div>
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
            color: T.t2,
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
        <span style={{ fontSize: 12, color: T.t3 }}>
          {formatRelativeTime(project.updated_at)}
        </span>
      </td>
    </tr>
  );
}
