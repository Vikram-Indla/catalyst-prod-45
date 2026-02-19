import { ProjectCard } from './ProjectCard';
import { PHProject } from './ProjectTableRow';

interface ProjectCardGridProps {
  projects: PHProject[];
  starredIds: Set<string>;
  onToggleStar: (id: string) => void;
}

export function ProjectCardGrid({ projects, starredIds, onToggleStar }: ProjectCardGridProps) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      }}
    >
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          isStarred={starredIds.has(project.id)}
          onToggleStar={onToggleStar}
        />
      ))}
    </div>
  );
}
