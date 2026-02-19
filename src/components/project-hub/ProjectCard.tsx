import { useNavigate } from 'react-router-dom';
import { StarButton } from './StarButton';
import { StatusBadge, HealthBadge, AvatarStack, formatRelativeTime } from './project-list-utils';
import { PHProject } from './ProjectTableRow';

interface ProjectCardProps {
  project: PHProject;
  isStarred: boolean;
  onToggleStar: (id: string) => void;
}

export function ProjectCard({ project, isStarred, onToggleStar }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/project-hub/${project.key}/dashboard`)}
      className="relative flex flex-col text-left rounded-xl transition-all"
      style={{
        padding: 16,
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Star top-right */}
      <div className="absolute top-3 right-3">
        <StarButton
          isStarred={isStarred}
          onClick={e => { e.stopPropagation(); onToggleStar(project.id); }}
          size={14}
        />
      </div>

      {/* Icon + Name + Key */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex items-center justify-center rounded flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            background: project.color || '#2563EB',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 6,
            fontFamily: "'Sora', sans-serif",
          }}
        >
          {project.key.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
            {project.name}
          </div>
          <span
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 500,
              color: '#94A3B8',
            }}
          >
            {project.key}
          </span>
        </div>
      </div>

      {/* Status + Health */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <StatusBadge status={project.status} />
        <HealthBadge health={project.health} />
      </div>

      {/* Department */}
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>{project.department}</div>

      {/* Progress bar placeholder */}
      <div className="w-full rounded-full mb-3" style={{ height: 6, background: '#F1F5F9' }}>
        <div className="rounded-full" style={{ height: 6, width: '0%', background: '#0D9488' }} />
      </div>

      {/* Footer: avatars + updated */}
      <div className="flex items-center justify-between mt-auto">
        <AvatarStack count={project.member_count || 0} />
        <span style={{ fontSize: 11, color: '#94A3B8' }}>
          {formatRelativeTime(project.updated_at)}
        </span>
      </div>
    </button>
  );
}
