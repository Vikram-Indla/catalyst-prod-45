import { useState } from 'react';
import { useDefaultProject } from '@/hooks/useProjects';
import { WorkflowTypePanel } from '@/components/admin/WorkflowTypePanel';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { WorkItemType } from '@/hooks/useTypeWorkflow';

interface WorkflowTabProps {
  projectId: string;
}

const ISSUE_TYPES: { key: WorkItemType; label: string }[] = [
  { key: 'Story',    label: 'Story' },
  { key: 'Epic',     label: 'Epic' },
  { key: 'Feature',  label: 'Feature' },
  { key: 'Sub-task', label: 'Sub-task' },
  { key: 'QA Bug',   label: 'QA Bug' },
];

export function WorkflowTab({ projectId: _ }: WorkflowTabProps) {
  const [activeType, setActiveType] = useState<WorkItemType>('Story');
  const { data: defaultProject } = useDefaultProject();
  const projectKey = defaultProject?.key ?? '';

  return (
    <div
      style={{
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as WorkItemType)} className="w-full">
        <div style={{ borderBottom: '1px solid var(--ds-border)', paddingLeft: 16 }}>
          <TabsList className="bg-transparent h-10 gap-0 p-0">
            {ISSUE_TYPES.map(t => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className={cn(
                  'relative px-4 py-2 text-xs font-medium rounded-none border-b-2 transition-colors data-[state=active]:shadow-none',
                  'data-[state=active]:border-[var(--ds-text-brand)] data-[state=active]:text-[var(--ds-text)]',
                  'data-[state=inactive]:border-transparent data-[state=inactive]:text-[var(--ds-text-subtlest)] data-[state=inactive]:hover:text-[var(--ds-text)]',
                  'bg-transparent'
                )}
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {ISSUE_TYPES.map(t => (
          <TabsContent key={t.key} value={t.key} className="mt-0 p-0">
            {projectKey ? (
              <WorkflowTypePanel projectKey={projectKey} workItemType={t.key} />
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
