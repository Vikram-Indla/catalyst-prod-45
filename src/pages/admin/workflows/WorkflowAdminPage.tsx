/**
 * WorkflowAdminPage — Admin module for managing issue type workflows.
 * Tabs for each issue type, showing statuses + transition matrix.
 * Light theme (Catalyst V12 light tokens).
 *
 * "Ask CATY" button opens CatyWorkflowPanel — a fixed-right AI workflow editor.
 * The panel operates on the active issue type's scheme only.
 */
import React, { useState } from 'react';
import { useAllWorkflowSchemes, useCatalystWorkflow } from '@/hooks/useCatalystWorkflow';
import { WorkflowEditor } from './WorkflowEditor';
import { WorkflowDiagram } from './WorkflowDiagram';
import { CatyWorkflowPanel } from '@/components/admin/CatyWorkflowPanel';
import { cn } from '@/lib/utils';
import Button from '@atlaskit/button/new';
import BoardsIcon from '@atlaskit/icon/core/boards';
import GridIcon from '@atlaskit/icon/core/grid';
import BoardIcon from '@atlaskit/icon/core/board';
import Spinner from '@atlaskit/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AdminGuard } from '@/components/admin/AdminGuard';

const ISSUE_TYPES = [
  { key: 'Story', label: 'Story' },
  { key: 'Epic', label: 'Epic' },
  { key: 'Feature', label: 'Feature' },
  { key: 'Sub-task', label: 'Sub-task' },
  { key: 'QA Bug', label: 'QA Bug' },
];

type ViewMode = 'editor' | 'diagram';

export default function WorkflowAdminPage() {
  const [activeType, setActiveType] = useState('Story');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [catyOpen, setCatyOpen] = useState(false);
  const { data: schemes = [] } = useAllWorkflowSchemes();

  // The active workflow — passed down to the panel so it knows the live state
  const activeWorkflow = useCatalystWorkflow(activeType);

  return (
    <AdminGuard>
    <div
      className="space-y-0 bg-white min-h-screen text-[var(--ds-text,#0F172A)]"
      style={{
        // Shrink main content when CATY panel is open to prevent overlap
        marginRight: catyOpen ? 380 : 0,
        transition: 'margin-right 0.2s ease',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ds-border,var(--cp-border, #E2E8F0))]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--ds-surface-sunken,#F1F5F9)] flex items-center justify-center border border-[var(--ds-border,var(--cp-border, #E2E8F0))]">
            <BoardsIcon label="" size="small" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--ds-text,#0F172A)] font-['Sora']">
              Workflows
            </h1>
            <p className="text-xs text-[var(--ds-text-subtlest,var(--cp-ink-3, #64748B))]">
              Manage statuses, transitions, and categories per issue type
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Ask CATY button */}
          <Button
            appearance={catyOpen ? 'primary' : 'default'}
            isSelected={catyOpen}
            onClick={() => setCatyOpen(o => !o)}
          >
            ✦ Ask CATY
          </Button>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-[var(--ds-surface-sunken,#F8FAFC)] border border-[var(--ds-border,var(--cp-border, #E2E8F0))] rounded-md p-0.5">
            <Button
              appearance="subtle"
              isSelected={viewMode === 'editor'}
              iconBefore={() => <GridIcon label="" size="small" />}
              onClick={() => setViewMode('editor')}
            >
              Editor
            </Button>
            <Button
              appearance="subtle"
              isSelected={viewMode === 'diagram'}
              iconBefore={() => <BoardIcon label="" size="small" />}
              onClick={() => setViewMode('diagram')}
            >
              Diagram
            </Button>
          </div>
        </div>
      </div>

      {/* Issue type tabs */}
      <Tabs value={activeType} onValueChange={setActiveType} className="w-full">
        <div className="border-b border-[var(--ds-border,var(--cp-border, #E2E8F0))] px-6">
          <TabsList className="bg-transparent h-10 gap-0 p-0">
            {ISSUE_TYPES.map(t => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className={cn(
                  'relative px-4 py-2 text-xs font-medium rounded-none border-b-2 transition-colors data-[state=active]:shadow-none',
                  'data-[state=active]:border-[var(--ds-text-brand,#2563EB)] data-[state=active]:text-[var(--ds-text,#0F172A)]',
                  'data-[state=inactive]:border-transparent data-[state=inactive]:text-[var(--ds-text-subtlest,var(--cp-ink-3, #64748B))] data-[state=inactive]:hover:text-[var(--ds-text,#0F172A)]',
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

    {/* CatyWorkflowPanel — position:fixed, outside the shrinking main div */}
    {activeWorkflow.scheme && (
      <CatyWorkflowPanel
        isOpen={catyOpen}
        onClose={() => setCatyOpen(false)}
        schemeId={activeWorkflow.scheme.id}
        schemeName={activeWorkflow.scheme.name}
        issueType={activeType}
        statuses={activeWorkflow.statuses}
        transitions={activeWorkflow.transitions}
        onInvalidate={activeWorkflow.invalidate}
      />
    )}
    </AdminGuard>
  );
}

function WorkflowTabContent({ issueType, viewMode }: { issueType: string; viewMode: ViewMode }) {
  const workflow = useCatalystWorkflow(issueType);

  if (workflow.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="medium" />
      </div>
    );
  }

  if (!workflow.scheme) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--ds-text-subtlest,var(--cp-ink-3, #64748B))]">
        <BoardsIcon label="" size="large" />
        <p className="text-sm">No workflow configured for {issueType}</p>
      </div>
    );
  }

  if (viewMode === 'diagram') {
    return (
      <div style={{ height: 'calc(100vh - 160px)', minHeight: 560 }}>
        <WorkflowDiagram
          scheme={workflow.scheme}
          statuses={workflow.statuses}
          transitions={workflow.transitions}
          onInvalidate={workflow.invalidate}
          schemeName={workflow.scheme.name}
        />
      </div>
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
