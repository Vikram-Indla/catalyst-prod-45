// @ts-nocheck
/**
 * WorkflowDiagram — Interactive visual workflow diagram editor, modelled after
 * the Jira workflow editor (nodes = statuses, edges = transitions, toolbar to
 * add/publish). Powered by @xyflow/react (React Flow v12).
 *
 * Layout: START circle → status nodes arranged in category columns
 *   • To Do       (blue nodes, left column)
 *   • In Progress (blue nodes, centre column)
 *   • Done        (green nodes, right column)
 *
 * Toolbar mirrors Jira's: Add Status | Add Transition | Update Workflow | Actions
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  Position,
  useReactFlow,
  ReactFlowProvider,
  NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import { AdminAlertDialog } from '@/components/admin/admin-alert-dialog';
import { typedQuery } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { WorkflowScheme, WorkflowStatus, WorkflowTransition } from '@/hooks/useCatalystWorkflow';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  scheme: WorkflowScheme;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  onInvalidate: () => void;
  schemeName?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NODE_W = 168;
const NODE_H = 48;
// Wider column gaps for smooth bezier edge routing
const COL_X = { todo: 140, in_progress: 460, done: 780 };
const ROW_GAP = 92;
const START_X = -80;
const START_Y = 80;

// ADS token–backed category styles
const CAT_STYLE = {
  todo: {
    bg: 'var(--ds-background-information,#E9F2FF)',
    border: 'var(--ds-border-brand,#579DFF)',
    text: 'var(--ds-text-brand,#0C66E4)',
    dot: 'var(--ds-border-brand,#579DFF)',
  },
  in_progress: {
    bg: 'var(--ds-background-information,#E9F2FF)',
    border: 'var(--ds-border-brand,#579DFF)',
    text: 'var(--ds-text-brand,#0C66E4)',
    dot: 'var(--ds-border-brand,#579DFF)',
  },
  done: {
    bg: 'var(--ds-background-success,#DCFFF1)',
    border: 'var(--ds-border-success,#22A06B)',
    text: 'var(--ds-text-success,#216E4E)',
    dot: 'var(--ds-border-success,#22A06B)',
  },
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Custom Nodes ─────────────────────────────────────────────────────────────

function StartNode() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: 'var(--ds-text,#172B4D)',
        border: '3px solid var(--ds-text,#172B4D)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 0 4px rgba(23,43,77,0.18)',
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ds-surface,#ffffff)' }} />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'var(--ds-text,#172B4D)', border: 'none', width: 8, height: 8 }}
      />
    </div>
  );
}

function StatusNode({ data, selected }: { data: any; selected: boolean }) {
  const cat = data.category as keyof typeof CAT_STYLE;
  const style = CAT_STYLE[cat] || CAT_STYLE.todo;
  return (
    <div
      style={{
        width: NODE_W,
        minHeight: NODE_H,
        background: style.bg,
        border: `2px solid ${selected ? 'var(--ds-text-brand,#0C66E4)' : style.border}`,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '8px 12px',
        boxShadow: selected
          ? `0 0 0 3px color-mix(in srgb, ${style.border} 25%, transparent)`
          : '0 1px 3px rgba(9,30,66,0.08)',
        cursor: data.addingTransition ? 'crosshair' : 'grab',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: style.border, border: `2px solid ${style.border}`, width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: style.border, border: `2px solid ${style.border}`, width: 10, height: 10 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: style.dot, flexShrink: 0 }} />
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--ds-text,#172B4D)',
          lineHeight: 1.3,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {data.label}
        </span>
      </div>

      {/* START / END badges */}
      <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
        {data.is_initial && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            background: 'var(--ds-text-brand,#0C66E4)', color: 'var(--ds-surface,#ffffff)',
            borderRadius: 3, padding: '1px 5px',
          }}>START</span>
        )}
        {data.is_final && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            background: 'var(--ds-border-success,#22A06B)', color: 'var(--ds-surface,#ffffff)',
            borderRadius: 3, padding: '1px 5px',
          }}>END</span>
        )}
        <span style={{
          fontSize: 9, letterSpacing: '0.04em',
          color: style.text, opacity: 0.7,
        }}>{data.categoryLabel}</span>
      </div>
    </div>
  );
}

function AnyNode() {
  return (
    <div style={{
      padding: '4px 10px',
      background: 'var(--ds-background-warning,#FFF7D6)',
      border: '1.5px dashed var(--ds-border-warning,var(--cp-amber, #F59E0B))',
      borderRadius: 20,
      fontSize: 11, fontWeight: 700, color: 'var(--ds-text-warning,#CF8800)',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      <span style={{ fontSize: 13 }}>∀</span> ANY
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'var(--ds-background-warning-bold,var(--cp-amber, #F59E0B))', border: 'none', width: 8, height: 8 }}
      />
    </div>
  );
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function buildLayout(statuses: WorkflowStatus[]): Record<string, { x: number; y: number }> {
  const catGroups: Record<string, WorkflowStatus[]> = {
    todo: statuses.filter(s => s.category === 'todo'),
    in_progress: statuses.filter(s => s.category === 'in_progress'),
    done: statuses.filter(s => s.category === 'done'),
  };
  const positions: Record<string, { x: number; y: number }> = {};
  for (const [cat, items] of Object.entries(catGroups)) {
    const x = COL_X[cat as keyof typeof COL_X] || 140;
    items.forEach((s, i) => {
      positions[s.id] = { x, y: 40 + i * ROW_GAP };
    });
  }
  return positions;
}

// ─── Edge builder ─────────────────────────────────────────────────────────────

const CAT_LABEL: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

// Raw hex for edge stroke — React Flow reads SVG stroke directly, tokens don't resolve there
const CAT_STROKE = {
  todo: '#579DFF',
  in_progress: '#579DFF',
  done: '#22A06B',
};

function buildFlowEdges(
  transitions: WorkflowTransition[],
  statuses: WorkflowStatus[],
): Edge[] {
  const edges: Edge[] = [];

  // START → initial status (bezier for smooth curve)
  const initial = statuses.find(s => s.is_initial);
  if (initial) {
    edges.push({
      id: 'edge-start-initial',
      source: 'START',
      target: initial.id,
      type: 'bezier',
      animated: false,
      style: { stroke: '#172B4D', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#172B4D', width: 16, height: 16 },
    });
  }

  transitions.forEach(t => {
    if (t.is_global) {
      edges.push({
        id: `edge-global-${t.id}`,
        source: 'ANY',
        target: t.to_status_id,
        type: 'bezier',
        // Labels omitted on global edges — they fan out from a single ANY node and
        // overlap badly when there are many transitions (e.g. Story has 22).
        // The dashed amber stroke already identifies them as global.
        style: { stroke: 'var(--cp-amber, #F59E0B)', strokeWidth: 1.5, strokeDasharray: '5 3' },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--cp-amber, #F59E0B)', width: 14, height: 14 },
      });
    } else if (t.from_status_id) {
      const fromStatus = statuses.find(s => s.id === t.from_status_id);
      const toStatus = statuses.find(s => s.id === t.to_status_id);
      if (!fromStatus || !toStatus) return;
      const strokeColor = CAT_STROKE[fromStatus.category] || '#579DFF';
      edges.push({
        id: `edge-${t.id}`,
        source: t.from_status_id,
        target: t.to_status_id,
        type: 'bezier',
        label: t.name || `${fromStatus.name} → ${toStatus.name}`,
        labelStyle: { fontSize: 9, fill: '#44546F', fontWeight: 500 },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
        style: { stroke: strokeColor, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor, width: 14, height: 14 },
      });
    }
  });

  return edges;
}

// ─── Main component (inner — needs ReactFlowProvider wrapper) ─────────────────

function WorkflowDiagramInner({ scheme, statuses, transitions, onInvalidate }: Props) {
  const qc = useQueryClient();
  const { fitView } = useReactFlow();
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [addingTransition, setAddingTransition] = useState(false);
  const [transitionFrom, setTransitionFrom] = useState<string | null>(null);
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusCat, setNewStatusCat] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [publishing, setPublishing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build base layout once when statuses change
  useEffect(() => {
    const base = buildLayout(statuses);
    setPositions(prev => {
      const merged: Record<string, { x: number; y: number }> = { ...prev };
      Object.entries(base).forEach(([id, pos]) => {
        if (!merged[id]) merged[id] = pos;
      });
      return merged;
    });
  }, [statuses]);

  // Build React Flow nodes
  const nodes: Node[] = useMemo(() => {
    const ns: Node[] = [];

    ns.push({
      id: 'START',
      type: 'startNode',
      position: { x: START_X, y: START_Y },
      data: {},
      selectable: false,
      draggable: false,
    });

    const hasGlobal = transitions.some(t => t.is_global);
    if (hasGlobal) {
      const maxY = Math.max(...statuses.map((_, i) => 40 + i * ROW_GAP), 0);
      ns.push({
        id: 'ANY',
        type: 'anyNode',
        position: { x: -80, y: maxY + ROW_GAP },
        data: {},
        selectable: false,
        draggable: false,
      });
    }

    statuses.forEach(s => {
      const pos = positions[s.id] || buildLayout(statuses)[s.id] || { x: 140, y: 40 };
      ns.push({
        id: s.id,
        type: 'statusNode',
        position: pos,
        data: {
          label: s.name,
          category: s.category,
          categoryLabel: CAT_LABEL[s.category] || s.category,
          is_initial: s.is_initial,
          is_final: s.is_final,
          addingTransition,
        },
        selected: selectedNode === s.id,
      });
    });

    return ns;
  }, [statuses, transitions, positions, addingTransition, selectedNode]);

  const edges: Edge[] = useMemo(() => buildFlowEdges(transitions, statuses), [transitions, statuses]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach(c => {
      if (c.type === 'position' && c.position && c.id !== 'START' && c.id !== 'ANY') {
        setPositions(prev => ({ ...prev, [c.id]: c.position! }));
      }
    });
  }, []);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.id === 'START' || node.id === 'ANY') return;

    if (addingTransition) {
      if (!transitionFrom) {
        setTransitionFrom(node.id);
        toast.info('Now click the target status to complete the transition');
      } else {
        if (transitionFrom === node.id) {
          toast.error('Source and target must be different');
          return;
        }
        createTransition(transitionFrom, node.id);
        setTransitionFrom(null);
        setAddingTransition(false);
      }
      return;
    }

    setSelectedNode(prev => prev === node.id ? null : node.id);
  }, [addingTransition, transitionFrom]);

  // ─── DB Operations ────────────────────────────────────────────────────────

  async function createTransition(fromId: string, toId: string) {
    const fromStatus = statuses.find(s => s.id === fromId);
    const toStatus = statuses.find(s => s.id === toId);
    if (!fromStatus || !toStatus) return;

    const existing = transitions.find(t =>
      t.from_status_id === fromId && t.to_status_id === toId && !t.is_global
    );
    if (existing) {
      toast.info('Transition already exists');
      return;
    }

    try {
      const { error } = await typedQuery('catalyst_workflow_transitions').insert({
        scheme_id: scheme.id,
        name: `${fromStatus.name} → ${toStatus.name}`,
        from_status_id: fromId,
        to_status_id: toId,
        is_global: false,
        sort_order: transitions.length,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['catalyst', 'workflows'] });
      onInvalidate();
      toast.success(`Transition added: ${fromStatus.name} → ${toStatus.name}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add transition');
    }
  }

  async function handleDeleteSelectedNode() {
    if (!selectedNode) return;
    const status = statuses.find(s => s.id === selectedNode);
    if (!status) return;
    try {
      const { error } = await typedQuery('catalyst_workflow_statuses')
        .delete().eq('id', selectedNode);
      if (error) throw error;
      setSelectedNode(null);
      setPositions(prev => { const next = { ...prev }; delete next[selectedNode]; return next; });
      qc.invalidateQueries({ queryKey: ['catalyst', 'workflows'] });
      onInvalidate();
      toast.success(`Removed "${status.name}"`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete status');
    }
  }

  async function handleAddStatus() {
    if (!newStatusName.trim()) return;
    try {
      const catColor: Record<string, string> = {
        todo: '#579DFF',
        in_progress: '#579DFF',
        done: '#22A06B',
      };
      const { error } = await typedQuery('catalyst_workflow_statuses').insert({
        scheme_id: scheme.id,
        name: newStatusName.trim(),
        slug: slugify(newStatusName),
        category: newStatusCat,
        color: catColor[newStatusCat],
        position: statuses.length,
        is_initial: statuses.length === 0,
        is_final: false,
      });
      if (error) throw error;
      setNewStatusName('');
      setShowAddStatus(false);
      qc.invalidateQueries({ queryKey: ['catalyst', 'workflows'] });
      onInvalidate();
      toast.success(`Status "${newStatusName.trim()}" added`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add status');
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      // 1. Mark admin scheme as active
      const { error: schemeErr } = await typedQuery('catalyst_workflow_schemes')
        .update({ is_active: true })
        .eq('id', scheme.id);
      if (schemeErr) throw schemeErr;

      // 2. Propagate workflow_name to all matching ph_work_types across all projects
      const { error: wtErr } = await (typedQuery('ph_work_types') as any)
        .update({ workflow_name: scheme.name })
        .eq('name', scheme.issue_type);
      if (wtErr) throw wtErr;

      // 3. Invalidate both the admin workflow cache and project settings caches
      qc.invalidateQueries({ queryKey: ['catalyst', 'workflows'] });
      qc.invalidateQueries({ queryKey: ['ph-work-types-settings'] });
      onInvalidate();
      toast.success(`"${scheme.name}" published — applied to all ${scheme.issue_type} work types`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode &&
        (e.target as HTMLElement).tagName !== 'INPUT' &&
        (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        setConfirmDelete(true);
      }
      if (e.key === 'Escape') {
        setAddingTransition(false);
        setTransitionFrom(null);
        setSelectedNode(null);
        setShowAddStatus(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNode, addingTransition, transitionFrom]);

  useEffect(() => {
    if (showAddStatus) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showAddStatus]);

  const nodeTypes = useMemo(() => ({
    statusNode: StatusNode,
    startNode: StartNode,
    anyNode: AnyNode,
  }), []);

  return (
    <div style={{
      width: '100%', height: '100%', minHeight: 560,
      position: 'relative',
      background: 'var(--ds-surface-sunken,#F7F8F9)',
    }}>

      {/* ─── Toolbar ─── */}
      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--ds-surface,#ffffff)',
        border: '1px solid var(--ds-border,#DFE1E6)',
        borderRadius: 8, padding: '8px 12px',
        boxShadow: '0 1px 4px rgba(9,30,66,0.08)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-text,#172B4D)', marginRight: 4 }}>
          {scheme.name}
        </span>
        <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest,#6B778C)', marginRight: 8 }}>
          {statuses.length} statuses · {transitions.length} transitions
        </span>

        <div style={{ flex: 1 }} />

        {/* Add Status */}
        <Button
          appearance="subtle"
          isSelected={showAddStatus}
          onClick={() => { setShowAddStatus(s => !s); setAddingTransition(false); setTransitionFrom(null); }}
        >
          Add Status
        </Button>

        {/* Add Transition */}
        <Button
          appearance="subtle"
          isSelected={addingTransition}
          onClick={() => {
            setAddingTransition(a => !a);
            setTransitionFrom(null);
            setShowAddStatus(false);
            if (!addingTransition) toast.info('Click source status, then target status');
          }}
        >
          {addingTransition
            ? transitionFrom ? 'Click target…' : 'Click source…'
            : 'Add Transition'}
        </Button>

        {/* Delete selected */}
        {selectedNode && (
          <Button appearance="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}

        {/* Fit View */}
        <Button
          appearance="subtle"
          onClick={() => fitView({ padding: 0.15, duration: 300 })}
          aria-label="Fit diagram to screen"
        >
          Fit view
        </Button>

        {/* Update Workflow (publish) */}
        <Button
          appearance="primary"
          onClick={handlePublish}
          isDisabled={publishing}
        >
          {publishing ? 'Publishing…' : 'Update workflow'}
        </Button>
      </div>

      {/* ─── Add Status popover ─── */}
      {showAddStatus && (
        <div style={{
          position: 'absolute', top: 64, right: 12, zIndex: 20,
          background: 'var(--ds-surface,#ffffff)',
          border: '1px solid var(--ds-border,#DFE1E6)',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(9,30,66,0.12)',
          padding: 16, width: 280,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text,#172B4D)', marginBottom: 10 }}>
            Add Status
          </div>

          {/* ADS Textfield replaces hand-rolled input */}
          <div style={{ marginBottom: 8 }}>
            <Textfield
              ref={inputRef}
              value={newStatusName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStatusName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') handleAddStatus();
                if (e.key === 'Escape') setShowAddStatus(false);
              }}
              placeholder="Status name…"
              aria-label="Status name"
            />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(['todo', 'in_progress', 'done'] as const).map(cat => {
              const labels = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
              const strokeColor: Record<string, string> = {
                todo: '#579DFF',
                in_progress: '#579DFF',
                done: '#22A06B',
              };
              const isActive = newStatusCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setNewStatusCat(cat)}
                  style={{
                    flex: 1, padding: '5px 4px', borderRadius: 4,
                    border: `1.5px solid ${isActive ? strokeColor[cat] : 'var(--ds-border,#DFE1E6)'}`,
                    background: isActive
                      ? cat === 'done'
                        ? 'var(--ds-background-success,#DCFFF1)'
                        : 'var(--ds-background-information,#E9F2FF)'
                      : 'var(--ds-surface,#ffffff)',
                    color: isActive ? strokeColor[cat] : 'var(--ds-text-subtle,#42526E)',
                    fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'all 0.1s',
                  }}
                >
                  {labels[cat]}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowAddStatus(false)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 4,
                border: '1px solid var(--ds-border,#DFE1E6)',
                background: 'var(--ds-surface,#ffffff)',
                color: 'var(--ds-text-subtle,#42526E)',
                fontSize: 12, cursor: 'pointer',
              }}
            >Cancel</button>
            <button
              onClick={handleAddStatus}
              disabled={!newStatusName.trim()}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 4, border: 'none',
                background: newStatusName.trim()
                  ? 'var(--ds-background-brand-bold,#0C66E4)'
                  : 'var(--ds-background-brand-hovered,#579DFF)',
                color: 'var(--ds-text-inverse,#ffffff)',
                fontSize: 12, fontWeight: 600,
                cursor: newStatusName.trim() ? 'pointer' : 'not-allowed',
                opacity: newStatusName.trim() ? 1 : 0.6,
              }}
            >Add Status</button>
          </div>
        </div>
      )}

      {/* ─── Transition mode banner ─── */}
      {addingTransition && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20,
          background: transitionFrom
            ? 'var(--ds-background-warning,#FFF7D6)'
            : 'var(--ds-background-information,#E9F2FF)',
          border: `1px solid ${transitionFrom
            ? 'var(--ds-border-warning,var(--cp-amber, #F59E0B))'
            : 'var(--ds-border-brand,#579DFF)'}`,
          borderRadius: 20, padding: '8px 20px',
          fontSize: 12, fontWeight: 600,
          color: transitionFrom
            ? 'var(--ds-text-warning,#CF8800)'
            : 'var(--ds-text-brand,#0C66E4)',
          boxShadow: '0 2px 8px rgba(9,30,66,0.12)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {transitionFrom
            ? `From: ${statuses.find(s => s.id === transitionFrom)?.name} → now click the target status`
            : 'Click a source status to start the transition'}
        </div>
      )}

      {/* ─── React Flow Canvas ─── */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => { setSelectedNode(null); }}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'bezier',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
        style={{ background: 'var(--ds-surface-sunken,#F7F8F9)' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color="var(--ds-border,#DFE1E6)"
        />
        <Controls
          position="bottom-left"
          showFitView={false}
          style={{
            boxShadow: '0 1px 4px rgba(9,30,66,0.08)',
            border: '1px solid var(--ds-border,#DFE1E6)',
            borderRadius: 6,
            bottom: 16,
          }}
        />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => {
            if (n.id === 'START') return '#172B4D';
            if (n.id === 'ANY') return 'var(--cp-amber, #F59E0B)';
            const data = n.data as any;
            return data?.category === 'done' ? '#22A06B' : '#579DFF';
          }}
          nodeStrokeColor={() => 'rgba(9,30,66,0.12)'}
          nodeStrokeWidth={2}
          maskColor="rgba(200,215,230,0.25)"
          style={{
            background: 'var(--ds-surface-sunken,#F0F2F5)',
            border: '1px solid var(--ds-border,#DFE1E6)',
            borderRadius: 6,
            height: 100,
          }}
        />
      </ReactFlow>

      {/* ─── Legend ─── */}
      <div style={{
        position: 'absolute', top: 64, left: 12, zIndex: 10,
        background: 'var(--ds-surface,#ffffff)',
        border: '1px solid var(--ds-border,#DFE1E6)',
        borderRadius: 8,
        padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6,
        boxShadow: '0 1px 4px rgba(9,30,66,0.06)',
        fontSize: 11, color: 'var(--ds-text-subtle,#42526E)',
      }}>
        <div style={{
          fontWeight: 700, fontSize: 10, letterSpacing: '0.06em',
          textTransform: 'uppercase', marginBottom: 2,
          color: 'var(--ds-text-subtlest,#6B778C)',
        }}>Legend</div>
        <LegendRow color="#579DFF" label="To Do / In Progress" />
        <LegendRow color="#22A06B" label="Done" />
        <LegendRow color="var(--cp-amber, #F59E0B)" label="Global (any → status)" dashed />
        <LegendRow color="#172B4D" label="Start" />
      </div>

      {/* ─── Delete confirm modal ─── */}
      {(() => {
        const status = statuses.find(s => s.id === selectedNode);
        return (
          <AdminAlertDialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            onConfirm={() => { setConfirmDelete(false); handleDeleteSelectedNode(); }}
            title="Delete status"
            description={status ? `Remove "${status.name}" from this workflow? Existing transitions to or from this status will also be deleted.` : undefined}
            confirmLabel="Delete"
            cancelLabel="Cancel"
          />
        );
      })()}
    </div>
  );
}

function LegendRow({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="28" height="10" viewBox="0 0 28 10">
        <line x1="0" y1="5" x2="28" y2="5"
          stroke={color} strokeWidth="2"
          strokeDasharray={dashed ? '4 2' : undefined}
        />
        <polygon points="20,1 28,5 20,9" fill={color} />
      </svg>
      <span style={{ fontSize: 10, color: 'var(--ds-text-subtle,#42526E)' }}>{label}</span>
    </div>
  );
}

// ─── Public export wrapped in provider ───────────────────────────────────────

export function WorkflowDiagram(props: Props) {
  return (
    <ReactFlowProvider>
      <WorkflowDiagramInner {...props} />
    </ReactFlowProvider>
  );
}
