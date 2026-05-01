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
      className="relative flex flex-col text-left rounded-[6px] transition-shadow duration-150 p-4 cursor-pointer bg-white dark:bg-[var(--ds-surface,var(--ds-surface, #0A0A0A))] border border-[var(--ds-border,var(--ds-border, #E2E8F0))] dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]"
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
          className="flex items-center justify-center rounded flex-shrink-0 h-8 text-white font-bold font-['Sora',sans-serif]"
          style={{
            width: 36,
            backgroundColor: project.color || 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',
            borderRadius: 6,
            fontSize: project.key.length > 2 ? 10 : 11,
            letterSpacing: project.key.length > 2 ? '-0.02em' : undefined,
          }}
        >
          {project.key}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold font-['Sora',sans-serif] text-[var(--ds-text,var(--ds-text, #0F172A))] dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]">
            {project.name}
          </div>
          <span className="text-[11px] font-medium font-['JetBrains_Mono',monospace] text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #6B778C))] dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">
            {project.key}
          </span>
        </div>
      </div>

      {/* Status + Health */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <StatusBadge status={project.status} />
        <HealthBadge health={project.health} />
      </div>

      {/* Footer: avatars + updated */}
      <div className="flex items-center justify-between mt-auto">
        <AvatarStack names={project.member_names || []} />
        <span className="text-[11px] text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #6B778C))] dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">
          {formatRelativeTime(project.updated_at)}
        </span>
      </div>
    </button>
  );
}
