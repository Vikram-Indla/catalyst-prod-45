/**
 * Project Empty State - Shown when a project has no content
 * Delegates to WorkspaceEmptyState with project context
 */
import { WorkspaceEmptyState } from './WorkspaceEmptyState';

interface ProjectEmptyStateProps {
  projectId: string;
  projectName?: string;
}

export function ProjectEmptyState({ projectId, projectName }: ProjectEmptyStateProps) {
  return (
    <WorkspaceEmptyState
      contextType="project"
      contextId={projectId}
      contextName={projectName}
    />
  );
}