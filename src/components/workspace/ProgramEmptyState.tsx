/**
 * Program Empty State - Shown when a program has no content
 * Delegates to WorkspaceEmptyState with program context
 */
import { WorkspaceEmptyState } from './WorkspaceEmptyState';

interface ProgramEmptyStateProps {
  programId: string;
  programName?: string;
}

export function ProgramEmptyState({ programId, programName }: ProgramEmptyStateProps) {
  return (
    <WorkspaceEmptyState
      contextType="program"
      contextId={programId}
      contextName={programName}
    />
  );
}