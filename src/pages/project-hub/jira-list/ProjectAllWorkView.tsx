/**
 * ProjectAllWorkView — All work tab shell
 * Stage A: Placeholder — UI comes in Stage C
 */
import React, { useState } from 'react';
import { useProjectAllWorkItems } from '@/hooks/useProjectListItems';
import { Loader2 } from 'lucide-react';

type AllWorkSubView = 'table' | 'split';

interface Props {
  projectKey: string;
}

export default function ProjectAllWorkView({ projectKey }: Props) {
  const [subView, setSubView] = useState<AllWorkSubView>('table');
  const { data: items, isLoading } = useProjectAllWorkItems(projectKey);

  return (
    <div className="p-6" data-testid="project-allwork-view">
      <p className="text-sm" style={{ color: 'var(--cp-text-secondary, #334155)' }}>
        All Work View — {projectKey} — {subView}
      </p>
      {isLoading && <Loader2 className="animate-spin mt-4" size={20} />}
      {!isLoading && (
        <p className="text-xs mt-2" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>
          {items?.length ?? 0} work items loaded — UI coming in Stage C
        </p>
      )}
    </div>
  );
}
