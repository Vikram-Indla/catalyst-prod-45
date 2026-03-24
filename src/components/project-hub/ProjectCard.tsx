import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { StarButton } from './StarButton';
import { StatusBadge, HealthBadge, AvatarStack, formatRelativeTime } from './project-list-utils';
import { PHProject } from './ProjectTableRow';
import { DK, LK } from '@/utils/dark-mode-styles';

interface ProjectCardProps {
  project: PHProject;
  isStarred: boolean;
  onToggleStar: (id: string) => void;
}

export function ProjectCard({ project, isStarred, onToggleStar }: ProjectCardProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const T = dark ? DK : LK;

  return (
    <button
      onClick={() => navigate(`/project-hub/${project.key}/dashboard`)}
      className={`relative flex flex-col text-left rounded-xl transition-all ${dark ? 'shadow-none' : ''}`}
      style={{
        padding: 16,
        background: dark ? '#1A1714' : '#FFFFFF',
        border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
        borderRadius: 12,
        cursor: 'pointer',
        boxShadow: dark ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={e => {
        if (!dark) {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        if (!dark) {
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        }
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
          <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: T.t1, fontFamily: "'Sora', sans-serif" }}>
            {project.name}
          </div>
          <span
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 500,
              color: T.t3,
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

      {/* Progress bar */}
      <div className="w-full rounded-full mb-3" style={{ height: 6, background: dark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }}>
        <div className="rounded-full" style={{ height: 6, width: '0%', background: '#0D9488' }} />
      </div>

      {/* Footer: avatars + updated */}
      <div className="flex items-center justify-between mt-auto">
        <AvatarStack count={project.member_count || 0} />
        <span style={{ fontSize: 11, color: T.t3 }}>
          {formatRelativeTime(project.updated_at)}
        </span>
      </div>
    </button>
  );
}
