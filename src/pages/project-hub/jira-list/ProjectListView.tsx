/**
 * ProjectListView — List tab shell (epics only)
 * Stage A: Placeholder — UI comes in Stage C
 */
import React from 'react';
import { useProjectListItems } from '@/hooks/useProjectListItems';
import { Loader2 } from 'lucide-react';

interface Props {
  projectKey: string;
}

export default function ProjectListView({ projectKey }: Props) {
  const { data: items, isLoading } = useProjectListItems(projectKey);

  return (
    <div className="p-6" data-testid="project-list-view">
      <p className="text-sm" style={{ color: 'var(--cp-text-secondary, #334155)' }}>
        List View — {projectKey}
      </p>
      {isLoading && <Loader2 className="animate-spin mt-4" size={20} />}
      {!isLoading && (
        <p className="text-xs mt-2" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>
          {items?.length ?? 0} epics loaded — UI coming in Stage C
        </p>
      )}
    </div>
  );
}
