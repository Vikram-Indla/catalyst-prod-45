/**
 * React Flow diagram showing work item dependencies
 *
 * Nodes: issue keys with status color
 * Edges: labeled with "blocks" or "is blocked by"
 * Controls: pan, zoom, minimap
 *
 * Based on CatalystWorkflowBuilder.tsx pattern (React Flow v12)
 */

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
// ads-scanner:ignore-next-line — React Flow's stylesheet is required for the canvas to render (same as CatalystWorkflowBuilder)
import '@xyflow/react/dist/style.css';
import { Plus } from '@/lib/atlaskit-icons';
import Button from '@atlaskit/button/new';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusPill } from '@/components/shared/JiraTable/cells';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import type { IssueMeta } from './DependencyList';

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

type Dependency = {
  id: number;
  project_key: string;
  source_issue_key: string;
  target_issue_key: string;
  dependency_type: 'blocks' | 'is_blocked_by';
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

interface DependenciesDiagramProps {
  projectKey: string;
  dependencies: Dependency[];
  issueMeta?: IssueMeta;
  onAddClick: () => void;
  onDelete: () => void;
}

function WorkItemNode({ data }: { data: any }) {
  const m = data.meta || {};
  const label = data.label as string;
  const meta = { fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' };
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 220,
        padding: 12,
        borderRadius: 3,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: `1px solid var(--ds-border, #DFE1E6)`,
        boxShadow: 'var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,0.13))',
        textAlign: 'left',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      {/* Row 1 — type icon + key */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {m.issue_type ? <JiraIssueTypeIcon type={m.issue_type} size={16} /> : null}
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-link, #0C66E4)' }}>{label}</span>
      </span>

      {/* Row 2 — summary (2-line clamp) */}
      {m.summary ? (
        <span
          style={{
            fontSize: 14,
            color: 'var(--ds-text, #292A2E)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {m.summary}
        </span>
      ) : null}

      {/* Row 3 — dates + status */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'flex', gap: 12 }}>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={meta}>Start date</span>
            <span style={{ fontSize: 12, color: 'var(--ds-text, #292A2E)' }}>—</span>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={meta}>End date</span>
            <span style={{ fontSize: 12, color: 'var(--ds-text, #292A2E)' }}>{fmtDate(m.due_date)}</span>
          </span>
        </span>
        {m.status ? <StatusPill appearance={statusToLozenge(m.status)}>{m.status}</StatusPill> : null}
      </div>

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

export default function DependenciesDiagram({
  projectKey,
  dependencies,
  issueMeta = {},
  onAddClick,
  onDelete,
}: DependenciesDiagramProps) {
  // Build nodes from unique issue keys
  const uniqueIssues = useMemo(() => {
    const keys = new Set<string>();
    dependencies.forEach((dep) => {
      keys.add(dep.source_issue_key);
      keys.add(dep.target_issue_key);
    });
    return Array.from(keys).sort();
  }, [dependencies]);

  // Create node layout (simple horizontal arrangement)
  const nodes: Node[] = useMemo(
    () =>
      uniqueIssues.map((key, idx) => ({
        id: key,
        type: 'workItem',
        data: { label: key, meta: issueMeta[key] ?? null },
        position: { x: idx * 320, y: 80 },
      })),
    [uniqueIssues, issueMeta]
  );

  // Create edges from dependencies
  const edges: Edge[] = useMemo(
    () =>
      dependencies.map((dep, idx) => ({
        id: `${dep.source_issue_key}-${dep.target_issue_key}-${idx}`,
        source: dep.source_issue_key,
        target: dep.target_issue_key,
        label: dep.dependency_type === 'blocks' ? 'blocks' : 'is blocked by',
        markerEnd: { type: MarkerType.ArrowClosed },
        labelBgStyle: {
          fill: 'var(--ds-surface-overlay, #FFFFFF)',
          fontSize: 11,
          padding: '4px 4px',
        },
      })),
    [dependencies]
  );

  const nodeTypes = useMemo(
    () => ({
      workItem: WorkItemNode,
    }),
    []
  );

  const [flowNodes, setNodes] = useNodesState(nodes);
  const [flowEdges, setEdges] = useEdgesState(edges);

  // Sync external state changes
  React.useEffect(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
      {/* Toolbar */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid var(--ds-border, #DFE1E6)`,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          background: 'var(--ds-surface-sunken, #F7F8F9)',
        }}
      >
        <Button appearance="primary" iconBefore={Plus} onClick={onAddClick}>
          Add dependency
        </Button>
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #505258)' }}>
          {dependencies.length} {dependencies.length === 1 ? 'dependency' : 'dependencies'}
        </span>
      </div>

      {/* React Flow canvas */}
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {/* Legend */}
      <div
        style={{
          padding: '8px 16px',
          fontSize: 11,
          color: 'var(--ds-text-subtle, #505258)',
          borderTop: `1px solid var(--ds-border, #DFE1E6)`,
          background: 'var(--ds-surface-sunken, #F7F8F9)',
        }}
      >
        Arrow direction: source → target (left to right)
      </div>
    </div>
  );
}
