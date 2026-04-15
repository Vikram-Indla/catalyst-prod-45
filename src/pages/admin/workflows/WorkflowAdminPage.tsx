/**
 * WorkflowAdminPage — Admin module for managing issue type workflows.
 * Tabs for each issue type, showing statuses + transition matrix.
 */
import React, { useState } from 'react';
import { useAllWorkflowSchemes, useCatalystWorkflow } from '@/hooks/useCatalystWorkflow';
import { WorkflowEditor } from './WorkflowEditor';
import { WorkflowDiagram } from './WorkflowDiagram';
import { cn } from '@/lib/utils';
import { GitBranch, LayoutGrid, Workflow } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const ISSUE_TYPES = [
  { key: 'Story', label: 'Story' },
  { key: 'Epic', label: 'Epic' },
  { key: 'Sub-task', label: 'Sub-task' },
  { key: 'Defect', label: 'Defect' },
  { key: 'Business Request', label: 'Business Request' },
  { key: 'Task', label: 'Task' },
];

type ViewMode = 'editor' | 'diagram';

export default function WorkflowAdminPage() {
  const [activeType, setActiveType] = useState('Story');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const { data: schemes = [] } = useAllWorkflowSchemes();

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2E2E2E] dark:border-[#2E2E2E]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] dark:bg-[#1A1A1A] flex items-center justify-center border border-[#2E2E2E]">
            <GitBranch size={18} className="text-[#EDEDED]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#EDEDED] dark:text-[#EDEDED] font-['Sora']">
              Workflows
            </h1>
            <p className="text-xs text-[#878787] dark:text-[#878787]">
              Manage statuses, transitions, and categories per issue type
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-[#111111] border border-[#2E2E2E] rounded-md p-0.5">
          <button
            onClick={() => setViewMode('editor')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              viewMode === 'editor'
                ? 'bg-[#292929] text-[#EDEDED]'
                : 'text-[#878787] hover:text-[#A1A1A1]'
            )}
          >
            <LayoutGrid size={13} />
            Editor
          </button>
          <button
            onClick={() => setViewMode('diagram')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              viewMode === 'diagram'
                ? 'bg-[#292929] text-[#EDEDED]'
                : 'text-[#878787] hover:text-[#A1A1A1]'
            )}
          >
            <Workflow size={13} />
            Diagram
          </button>
        </div>
      </div>

      {/* Issue type tabs */}
      <Tabs value={activeType} onValueChange={setActiveType} className="w-full">
        <div className="border-b border-[#2E2E2E] px-6">
          <TabsList className="bg-transparent h-10 gap-0 p-0">
            {ISSUE_TYPES.map(t => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className={cn(
                  'relative px-4 py-2 text-xs font-medium rounded-none border-b-2 transition-colors data-[state=active]:shadow-none',
                  'data-[state=active]:border-[#EDEDED] data-[state=active]:text-[#EDEDED]',
                  'data-[state=inactive]:border-transparent data-[state=inactive]:text-[#878787] data-[state=inactive]:hover:text-[#A1A1A1]',
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
            <WorkflowTabContent issueType={t.key} viewMode={viewMode} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function WorkflowTabContent({ issueType, viewMode }: { issueType: string; viewMode: ViewMode }) {
  const workflow = useCatalystWorkflow(issueType);

  if (workflow.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-5 h-5 border-2 border-[#878787] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!workflow.scheme) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#878787]">
        <GitBranch size={32} className="mb-3 opacity-40" />
        <p className="text-sm">No workflow configured for {issueType}</p>
      </div>
    );
  }

  if (viewMode === 'diagram') {
    return (
      <WorkflowDiagram
        statuses={workflow.statuses}
        transitions={workflow.transitions}
        schemeName={workflow.scheme.name}
      />
    );
  }

  return (
    <WorkflowEditor
      scheme={workflow.scheme}
      statuses={workflow.statuses}
      transitions={workflow.transitions}
      onInvalidate={workflow.invalidate}
    />
  );
}
