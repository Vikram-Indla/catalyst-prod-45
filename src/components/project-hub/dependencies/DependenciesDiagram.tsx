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
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
// ads-scanner:ignore-next-line — React Flow's stylesheet is required for the canvas to render (same as CatalystWorkflowBuilder)
import '@xyflow/react/dist/style.css';
import { Plus } from '@/lib/atlaskit-icons';
import Button from '@atlaskit/button/new';

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

const COLORS = {
  todo: 'var(--ds-background-neutral, #DFE1E6)',
  inprogress: 'var(--ds-background-information-bold, #669DF1)',
  done: 'var(--ds-background-success-bold, #94C748)',
  default: 'var(--ds-background-neutral, #F1F2F4)',
};

interface DependenciesDiagramProps {
  projectKey: string;
  dependencies: Dependency[];
  onAddClick: () => void;
  onDelete: () => void;
}

function WorkItemNode({ data }: { data: any }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        borderRadius: 3,
        background: data.bgColor || COLORS.default,
        border: `1px solid var(--ds-border, #DFE1E6)`,
        minWidth: 120,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        boxShadow: 'var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,0.13))',
      }}
    >
      {data.label}
    </div>
  );
}

export default function DependenciesDiagram({
  projectKey,
  dependencies,
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
        data: { label: key, bgColor: COLORS.default },
        position: { x: idx * 200, y: 100 },
      })),
    [uniqueIssues]
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
