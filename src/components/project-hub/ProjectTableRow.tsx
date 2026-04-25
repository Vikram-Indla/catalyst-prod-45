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
  member_names?: string[];
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

  return (
    <tr
      className={`group cursor-pointer transition-colors duration-100 ${isDark ? 'hover:bg-[#1F1F1F]' : 'hover:bg-[#F4F5F7]'}`}
      style={{ height: 36, maxHeight: 36 }}
      onClick={() => navigate(`/project-hub/${project.key}/dashboard`)}
      onContextMenu={e => onContextMenu(e, project)}
    >
      {/* Star */}
      <td style={{ width: 36, padding: '0 8px' }}>
        <StarButton
          isStarred={isStarred}
          onClick={e => { e.stopPropagation(); onToggleStar(project.id); }}
          size={14}
        />
      </td>

      {/* Name (with badge) */}
      <td style={{ padding: '0 12px' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex items-center justify-center rounded flex-shrink-0"
            style={{
              width: 28,
              height: 24,
              backgroundColor: project.color || '#2563EB',
              color: '#FFFFFF',
              fontSize: project.key.length > 2 ? 9 : 10,
              fontWeight: 700,
              borderRadius: 4,
              fontFamily: 'var(--ds-font-family-heading)',
              letterSpacing: project.key.length > 2 ? '-0.02em' : undefined,
            }}
          >
            {project.key}
          </div>
          <span className="truncate" style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A' }}>
            {project.name}
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--ds-font-family-monospaced)',
              fontWeight: 500,
              color: isDark ? '#878787' : '#6B778C',
            }}
          >
            {project.key}
          </span>
        </div>
      </td>

      {/* Status */}
      <td style={{ padding: '0 12px' }}>
        <StatusBadge status={project.status} />
      </td>

      {/* Members */}
      <td style={{ padding: '0 12px' }}>
        <AvatarStack names={project.member_names || []} />
      </td>

      {/* Items */}
      <td style={{ padding: '0 12px', textAlign: 'right' }}>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--ds-font-family-monospaced)',
            fontWeight: 500,
            color: isDark ? '#A1A1A1' : '#42526E',
          }}
        >
          {project.item_count ?? 0}
        </span>
      </td>

      {/* Health */}
      <td style={{ padding: '0 12px' }}>
        <HealthBadge health={project.health} />
      </td>

      {/* Updated */}
      <td style={{ padding: '0 12px' }}>
        <span style={{ fontSize: 12, color: isDark ? '#878787' : '#6B778C' }}>
          {formatRelativeTime(project.updated_at)}
        </span>
      </td>
    </tr>
  );
}
