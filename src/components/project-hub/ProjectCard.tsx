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
      className="relative flex flex-col text-left rounded-xl transition-all p-4 cursor-pointer bg-[#FFFFFF] dark:!bg-[#181A1E] border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-none"
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
          className="flex items-center justify-center rounded flex-shrink-0 w-8 h-8 text-white text-[11px] font-bold font-['Sora',sans-serif]"
          style={{
            backgroundColor: project.color || 'var(--cp-blue)',
            borderRadius: 6,
          }}
        >
          {project.key.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold font-['Sora',sans-serif] text-gray-900 dark:text-white">
            {project.name}
          </div>
          <span className="text-[11px] font-medium font-['JetBrains_Mono',monospace] text-gray-400 dark:text-gray-500">
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
      <div className="w-full rounded-full mb-3 h-1.5 bg-gray-100 dark:bg-gray-700">
        <div className="rounded-full h-1.5 bg-teal-600" style={{ width: '0%' }} />
      </div>

      {/* Footer: avatars + updated */}
      <div className="flex items-center justify-between mt-auto">
        <AvatarStack count={project.member_count || 0} />
        <span className="text-[11px] text-gray-500 dark:text-gray-500">
          {formatRelativeTime(project.updated_at)}
        </span>
      </div>
    </button>
  );
}
