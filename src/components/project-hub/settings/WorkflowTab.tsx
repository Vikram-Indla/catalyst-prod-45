import { useState } from 'react';
import { useAllWorkflowSchemes, useCatalystWorkflow } from '@/hooks/useCatalystWorkflow';
import { WorkflowEditor } from '@/pages/admin/workflows/WorkflowEditor';
import { WorkflowDiagram } from '@/pages/admin/workflows/WorkflowDiagram';
import { CatyWorkflowPanel } from '@/components/admin/CatyWorkflowPanel';
import { cn } from '@/lib/utils';
import Button from '@atlaskit/button/new';
import BoardsIcon from '@atlaskit/icon/core/boards';
import GridIcon from '@atlaskit/icon/core/grid';
import BoardIcon from '@atlaskit/icon/core/board';
import Spinner from '@atlaskit/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface WorkflowTabProps {
  projectId: string;
}

const ISSUE_TYPES = [
  { key: 'Story',    label: 'Story' },
  { key: 'Epic',     label: 'Epic' },
  { key: 'Feature',  label: 'Feature' },
  { key: 'Sub-task', label: 'Sub-task' },
  { key: 'QA Bug',   label: 'QA Bug' },
];

type ViewMode = 'editor' | 'diagram';

export function WorkflowTab({ projectId: _ }: WorkflowTabProps) {
  const [activeType, setActiveType] = useState('Story');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [catyOpen, setCatyOpen] = useState(false);

  useAllWorkflowSchemes(); // warm cache

  const activeWorkflow = useCatalystWorkflow(activeType);

  return (
    <div
      style={{
        marginRight: catyOpen ? 380 : 0,
        transition: 'margin-right 0.2s ease',
      }}
    >
      {/* Sub-header: view toggle + Ask CATY */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0 12px',
          marginBottom: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BoardsIcon label="" size="small" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text, var(--cp-ink-1, #0F172A))' }}>
            Workflow Scheme
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            appearance={catyOpen ? 'primary' : 'default'}
            isSelected={catyOpen}
            onClick={() => setCatyOpen(o => !o)}
          >
            ✦ Ask CATY
          </Button>

          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: 'var(--ds-surface-sunken, #F8FAFC)',
              border: '1px solid var(--ds-border, var(--cp-border, #E2E8F0))',
              borderRadius: 6, padding: 2,
            }}
          >
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

      {/* Issue type tabs + content */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--ds-border, var(--cp-border, #E2E8F0))',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <Tabs value={activeType} onValueChange={setActiveType} className="w-full">
          <div style={{ borderBottom: '1px solid var(--ds-border, var(--cp-border, #E2E8F0))', paddingLeft: 16 }}>
            <TabsList className="bg-transparent h-10 gap-0 p-0">
              {ISSUE_TYPES.map(t => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className={cn(
                    'relative px-4 py-2 text-xs font-medium rounded-none border-b-2 transition-colors data-[state=active]:shadow-none',
                    'data-[state=active]:border-[var(--ds-text-brand,#2563EB)] data-[state=active]:text-[var(--ds-text,var(--cp-ink-1, #0F172A))]',
                    'data-[state=inactive]:border-transparent data-[state=inactive]:text-[var(--ds-text-subtlest,var(--cp-ink-3, #64748B))] data-[state=inactive]:hover:text-[var(--ds-text,var(--cp-ink-1, #0F172A))]',
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
              <WorkflowTypeContent issueType={t.key} viewMode={viewMode} />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* CATY panel — fixed right, outside the scrolling content */}
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
    </div>
  );
}

function WorkflowTypeContent({ issueType, viewMode }: { issueType: string; viewMode: ViewMode }) {
  const workflow = useCatalystWorkflow(issueType);

  if (workflow.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (!workflow.scheme) {
    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '40px 0',
          color: 'var(--ds-text-subtlest, var(--cp-ink-3, #64748B))', fontSize: 13,
        }}
      >
        <BoardsIcon label="" size="large" />
        <p style={{ marginTop: 8 }}>No workflow configured for {issueType}</p>
      </div>
    );
  }

  if (viewMode === 'diagram') {
    return (
      <div style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}>
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
