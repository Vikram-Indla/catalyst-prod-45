/**
 * WorkflowsAdminPage — /admin/workflows
 *
 * Lists every workflow defined in the system (SDLC, Simple, Bug),
 * shows which issue types are bound to each, previews the full diagram,
 * and lets you inspect transitions and colors. Overrides are persisted
 * to localStorage via WorkflowProvider.
 *
 * Single source of truth — when a developer asks "what statuses does a
 * Defect go through?", this page is the answer.
 */
import React, { useState } from 'react';
import Button from '@atlaskit/button';
import Lozenge from '@atlaskit/lozenge';
import { useWorkflows } from '../../lib/workflows/WorkflowProvider';
import { JiraStatusLozengeForState } from '../../components/workflow/JiraStatusLozenge';
import { WorkflowDiagramModal } from '../../components/workflow/WorkflowDiagramModal';
import type { Workflow, StatusCategory } from '../../lib/workflows/types';

const CATEGORY_APPEARANCE: Record<StatusCategory, 'default' | 'inprogress' | 'success' | 'removed' | 'new' | 'moved'> = {
  default: 'default',
  inprogress: 'inprogress',
  success: 'success',
  removed: 'removed',
  new: 'new',
  moved: 'moved',
};

export default function WorkflowsAdminPage() {
  const { workflows, clearOverride } = useWorkflows();
  const [preview, setPreview] = useState<Workflow | null>(null);

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto', fontFamily: '"Atlassian Sans", -apple-system, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, color: 'var(--ds-text, #172B4D)' }}>
          Workflows
        </h1>
        <p style={{ color: '#44546F', margin: '4px 0 0 0', fontSize: 14 }}>
          Each issue type is bound to exactly one workflow. The status dropdown on any issue shows
          the transitions allowed from its current state, plus a &ldquo;View workflow&rdquo; link
          that opens the full diagram.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {workflows.map(wf => (
          <WorkflowCard
            key={wf.id}
            workflow={wf}
            onPreview={() => setPreview(wf)}
            onReset={() => clearOverride(wf.id)}
          />
        ))}
      </div>

      {preview && (
        <WorkflowDiagramModal
          workflow={preview}
          currentStateId={preview.initialStateId}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function WorkflowCard({
  workflow,
  onPreview,
  onReset,
}: {
  workflow: Workflow;
  onPreview: () => void;
  onReset: () => void;
}) {
  return (
    <section
      style={{
        border: '1px solid #DFE1E6',
        borderRadius: 8,
        padding: 20,
        background: 'var(--ds-surface, #fff)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--ds-text, #172B4D)' }}>
            {workflow.name} workflow
          </h2>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {workflow.issueTypes.map(it => (
              <Lozenge key={it} appearance="default">{it}</Lozenge>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button appearance="default" onClick={onPreview}>View workflow</Button>
          <Button appearance="subtle" onClick={onReset}>Reset to default</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, margin: '12px 0' }}>
        {workflow.states.map(state => (
          <div
            key={state.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              background: state.id === workflow.initialStateId ? '#EAF3FF' : '#F7F8F9',
              borderRadius: 6,
              border: state.id === workflow.initialStateId ? '1px solid #579DFF' : '1px solid #EBECF0',
            }}
          >
            <JiraStatusLozengeForState state={state} />
            {state.id === workflow.initialStateId && (
              <span style={{ fontSize: 10, color: '#0C66E4', fontWeight: 700, letterSpacing: '0.04em' }}>START</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, color: '#44546F' }}>
        <strong>{workflow.states.length}</strong> states, <strong>{workflow.transitions.length}</strong> explicit transitions
        {workflow.states.every(s => s.anyToThis) && (
          <span style={{ marginLeft: 8, padding: '2px 8px', background: '#F4E6FF', color: '#5E4DB2', borderRadius: 3, fontSize: 11, fontWeight: 700 }}>
            ANY-TO-ANY
          </span>
        )}
      </div>
    </section>
  );
}
