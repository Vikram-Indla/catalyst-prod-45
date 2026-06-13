import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import Spinner from '@atlaskit/spinner';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import type { TypeStatus, Transition } from '@/hooks/useTypeWorkflow';
import {
  useTypeWorkflow,
  useAddTypeStatus,
  useRemoveTypeStatus,
  useSetInitialStatus,
  useAddTransition,
  useDeleteTransition,
  useCopyTypeWorkflow,
  WORK_ITEM_TYPES,
  type WorkItemType,
} from '@/hooks/useTypeWorkflow';
import type { WorkflowStatusWithTypes } from '@/hooks/useWorkflowStatuses';
import { STATUS_CATEGORY_COLORS, STATUS_CATEGORY_LABELS, type StatusCategory } from '@/constants/statusCategoryColors';

// ── category → lozenge appearance ──────────────────────────────────────────
type LozengeAppearance = 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new';

const CAT_LOZENGE: Record<string, LozengeAppearance> = {
  todo:        'default',
  in_progress: 'inprogress',
  done:        'success',
  terminal:    'removed',
};

// ── icons (inline SVG only, no deps) ───────────────────────────────────────
function ChevronRight({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={style}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XIcon({ size = 9 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="5" y="5" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 10.5V3.8C3 3.4 3.4 3 3.8 3h6.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function EditorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function DiagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 5.5L10.5 10.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

// ── tiny status color dot ───────────────────────────────────────────────────
function PillDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}

// ── wf-chip (status chip in lane) ──────────────────────────────────────────
function StatusChip({
  name,
  color,
  isInitial,
  onRemove,
  onSetInitial,
}: {
  name: string;
  color: string;
  isInitial: boolean;
  onRemove: () => void;
  onSetInitial: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 10px',
        border: `1px solid var(--ds-border, #DFE1E6)`,
        borderRadius: 3,
        fontSize: 13,
        fontWeight: 500,
        background: hovered ? 'var(--ds-surface-sunken, #F7F8F9)' : 'var(--ds-surface, #FFFFFF)',
        cursor: 'default',
        transition: 'border-color 120ms ease, background 120ms ease',
        borderColor: hovered ? 'var(--ds-border-bold, #8C8F97)' : 'var(--ds-border, #DFE1E6)',
      }}
    >
      <PillDot color={color} />
      {name}
      {isInitial && (
        <Tooltip content="This is the initial status for this workflow">
          {(tp) => (
            <span
              {...tp}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ds-text-brand, #0C66E4)',
                background: 'var(--ds-background-selected, #E9F2FF)',
                borderRadius: 3,
                padding: '1px 4px',
              }}
            >
              Initial
            </span>
          )}
        </Tooltip>
      )}
      {!isInitial && hovered && (
        <Tooltip content={`Set "${name}" as initial status`}>
          {(tp) => (
            <button
              {...tp}
              onClick={onSetInitial}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ds-text-brand, #0C66E4)',
                fontSize: 10,
                fontWeight: 700,
                padding: 0,
                marginRight: -2,
              }}
              title="Set as initial"
            >
              ★
            </button>
          )}
        </Tooltip>
      )}
      {hovered && (
        <Tooltip content={`Remove "${name}" from this workflow`}>
          {(tp) => (
            <button
              {...tp}
              onClick={onRemove}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ds-text-subtle, #505258)',
                marginRight: -4,
                padding: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-danger-subtle, #FFECEB)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--ds-text-danger, #AE2E24)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--ds-text-subtle, #505258)';
              }}
            >
              <XIcon />
            </button>
          )}
        </Tooltip>
      )}
    </span>
  );
}

// ── pill (transition destination) ──────────────────────────────────────────
function TransitionPill({
  name,
  color,
  onRemove,
  isGlobal,
}: {
  name: string;
  color: string;
  onRemove: () => void;
  isGlobal: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 10px',
        border: `1px solid var(--ds-border, #DFE1E6)`,
        borderRadius: 3,
        fontSize: 13,
        fontWeight: 500,
        background: hovered ? 'var(--ds-surface-sunken, #F7F8F9)' : 'var(--ds-surface, #FFFFFF)',
        cursor: 'default',
        transition: 'border-color 120ms ease, background 120ms ease',
        borderColor: hovered ? 'var(--ds-border-bold, #8C8F97)' : 'var(--ds-border, #DFE1E6)',
      }}
    >
      <PillDot color={color} />
      {name}
      {hovered && (
        <Tooltip
          content={
            isGlobal
              ? 'This global rule affects all work item types. Deleting removes the transition everywhere.'
              : `Remove transition to "${name}"`
          }
        >
          {(tp) => (
            <button
              {...tp}
              onClick={onRemove}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ds-text-subtle, #505258)',
                marginRight: -4,
                padding: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-danger-subtle, #FFECEB)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--ds-text-danger, #AE2E24)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--ds-text-subtle, #505258)';
              }}
            >
              <XIcon />
            </button>
          )}
        </Tooltip>
      )}
    </span>
  );
}

// ── add pill (dashed border) ────────────────────────────────────────────────
function AddPill({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 32,
        padding: '0 10px',
        border: '1px dashed var(--ds-border, #DFE1E6)',
        borderRadius: 3,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ds-text-brand, #0C66E4)',
        background: hovered ? 'var(--ds-background-selected, #E9F2FF)' : 'transparent',
        borderColor: hovered ? 'var(--ds-text-brand, #0C66E4)' : 'var(--ds-border, #DFE1E6)',
        cursor: 'pointer',
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
    >
      <PlusIcon size={10} />
      {label}
    </button>
  );
}

// ── add status chip (dashed border, square corners) ─────────────────────────
function AddStatusChip({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 32,
        padding: '0 10px',
        border: '1px dashed var(--ds-border, #DFE1E6)',
        borderRadius: 3,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ds-text-brand, #0C66E4)',
        background: hovered ? 'var(--ds-background-selected, #E9F2FF)' : 'transparent',
        borderColor: hovered ? 'var(--ds-text-brand, #0C66E4)' : 'var(--ds-border, #DFE1E6)',
        cursor: 'pointer',
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
    >
      <PlusIcon size={10} />
      Add status
    </button>
  );
}

// ── transition group row ───────────────────────────────────────────────────
function TransitionGroupRow({
  fromStatus,
  isGlobal,
  transitions,
  allTypeStatuses,
  onDeleteTransition,
  onAddTransition,
}: {
  fromStatus: TypeStatus | null;
  isGlobal: boolean;
  transitions: Transition[];
  allTypeStatuses: TypeStatus[];
  onDeleteTransition: (id: string, isGlobal: boolean) => void;
  onAddTransition: (fromStatusId: string | null, toStatusId: string) => void;
}) {
  const [open, setOpen] = useState(isGlobal); // global is open by default, others closed
  const [showPicker, setShowPicker] = useState(false);

  const existingToIds = new Set(transitions.map((t) => t.to_status_id));
  const available = allTypeStatuses.filter(
    (s) => !existingToIds.has(s.id) && (!fromStatus || s.id !== fromStatus.id)
  );
  const fromStatusId = fromStatus ? fromStatus.id : null;

  return (
    <div
      style={{
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        marginBottom: 8,
        background: isGlobal ? 'var(--ds-surface-sunken, #F7F8F9)' : 'var(--ds-surface, #FFFFFF)',
      }}
    >
      {/* header */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          textAlign: 'left',
          fontSize: 14,
          fontWeight: 500,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ds-text, #292A2E)',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface-sunken, #F7F8F9)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
        aria-expanded={open}
      >
        <ChevronRight
          style={{
            color: 'var(--ds-text-brand, #0C66E4)',
            transition: 'transform 180ms ease',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ds-text-subtlest, #6B6E76)',
          }}
        >
          From
        </span>
        {isGlobal ? (
          <>
            <PillDot color="var(--ds-border-bold, #8C8F97)" />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #292A2E)' }}>
              Any status
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ds-text-subtle, #505258)',
                background: 'var(--ds-background-neutral, #F1F2F4)',
                borderRadius: 3,
                padding: '2px 5px',
              }}
            >
              Global · all types
            </span>
          </>
        ) : fromStatus ? (
          <>
            <PillDot color={fromStatus.color} />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #292A2E)' }}>
              {fromStatus.name}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #292A2E)' }}>
            Any status
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            fontWeight: 400,
            color: 'var(--ds-text-subtlest, #6B6E76)',
          }}
        >
          {transitions.length} destination{transitions.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* body */}
      {open && (
        <div
          style={{
            padding: '4px 16px 16px 40px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
          }}
        >
          {transitions.length === 0 && !showPicker ? (
            <span
              style={{
                fontSize: 13,
                color: 'var(--ds-text-subtlest, #6B6E76)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              No transitions defined
            </span>
          ) : (
            transitions.map((t) => {
              const toStatus = allTypeStatuses.find((s) => s.id === t.to_status_id);
              const isGlobalTrans = t.work_item_type === null || t.from_status_id === null;
              return (
                <TransitionPill
                  key={t.id}
                  name={toStatus?.name ?? t.to_status_id}
                  color={toStatus?.color ?? '#64748B'}
                  isGlobal={isGlobalTrans}
                  onRemove={() => {
                    if (isGlobalTrans) {
                      if (!window.confirm('This global rule affects all work item types. Delete it?')) return;
                    }
                    onDeleteTransition(t.id, isGlobalTrans);
                  }}
                />
              );
            })
          )}

          {showPicker ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {available.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B6E76)' }}>
                  All available statuses already have transitions.
                </span>
              ) : (
                available.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onAddTransition(fromStatusId, s.id);
                      setShowPicker(false);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      height: 32,
                      padding: '0 10px',
                      border: '1px solid var(--ds-border, #DFE1E6)',
                      borderRadius: 3,
                      fontSize: 13,
                      fontWeight: 500,
                      background: 'var(--ds-surface, #FFFFFF)',
                      cursor: 'pointer',
                      color: 'var(--ds-text, #292A2E)',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface-sunken, #F7F8F9)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface, #FFFFFF)')
                    }
                  >
                    <PillDot color={s.color} />
                    {s.name}
                  </button>
                ))
              )}
              <button
                onClick={() => setShowPicker(false)}
                style={{
                  fontSize: 13,
                  color: 'var(--ds-text-subtle, #505258)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 6px',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <AddPill label="+ Add" onClick={() => setShowPicker(true)} />
          )}
        </div>
      )}
    </div>
  );
}

// ── mode toggle ────────────────────────────────────────────────────────────
function ModeToggle({
  mode,
  onChange,
}: {
  mode: 'editor' | 'diagram';
  onChange: (m: 'editor' | 'diagram') => void;
}) {
  return (
    <span
      role="group"
      aria-label="Workflow view mode"
      style={{
        display: 'inline-flex',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {(['editor', 'diagram'] as const).map((m) => (
        <button
          key={m}
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          style={{
            height: 32,
            padding: '0 12px',
            fontSize: 14,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color:
              mode === m
                ? 'var(--ds-text-brand, #0C66E4)'
                : 'var(--ds-text-subtle, #505258)',
            background:
              mode === m
                ? 'var(--ds-background-selected, #E9F2FF)'
                : 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={(e) => {
            if (mode !== m)
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--ds-background-neutral, #F1F2F4)';
          }}
          onMouseLeave={(e) => {
            if (mode !== m)
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          {m === 'editor' ? <EditorIcon /> : <DiagramIcon />}
          {m === 'editor' ? 'Editor' : 'Diagram'}
        </button>
      ))}
    </span>
  );
}

// ── add status picker popover ─────────────────────────────────────────────
function AddStatusPicker({
  available,
  onSelect,
  onClose,
}: {
  available: WorkflowStatusWithTypes[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = available.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 50,
        top: 'calc(100% + 6px)',
        left: 0,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))',
        padding: 8,
        minWidth: 240,
        maxHeight: 320,
        overflowY: 'auto',
      }}
    >
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter statuses…"
        style={{
          width: '100%',
          height: 32,
          padding: '0 8px',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 3,
          fontSize: 13,
          marginBottom: 6,
          background: 'var(--ds-surface, #FFFFFF)',
          color: 'var(--ds-text, #292A2E)',
        }}
      />
      {filtered.length === 0 ? (
        <div
          style={{
            padding: '8px 4px',
            fontSize: 12,
            color: 'var(--ds-text-subtlest, #6B6E76)',
          }}
        >
          No more statuses available.
        </div>
      ) : (
        filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '7px 8px',
              fontSize: 13,
              borderRadius: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ds-text, #292A2E)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                'var(--ds-surface-sunken, #F7F8F9)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = 'none')
            }
          >
            <PillDot color={s.color} />
            {s.name}
          </button>
        ))
      )}
      <button
        onClick={onClose}
        style={{
          display: 'block',
          width: '100%',
          marginTop: 4,
          padding: '6px 8px',
          fontSize: 12,
          color: 'var(--ds-text-subtle, #505258)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        Cancel
      </button>
    </div>
  );
}

// ── main WorkflowTypePanel ─────────────────────────────────────────────────
interface WorkflowTypePanelProps {
  projectKey: string;
  workItemType: WorkItemType;
  allRegistryStatuses: WorkflowStatusWithTypes[];
  onFeedback?: (type: 'success' | 'error', title: string, description?: string) => void;
}

export function WorkflowTypePanel({
  projectKey,
  workItemType,
  allRegistryStatuses,
  onFeedback,
}: WorkflowTypePanelProps) {
  const { data, isLoading, error } = useTypeWorkflow(projectKey, workItemType);
  const addTypeStatus = useAddTypeStatus(projectKey, workItemType);
  const removeTypeStatus = useRemoveTypeStatus(projectKey, workItemType);
  const setInitialStatus = useSetInitialStatus(projectKey, workItemType);
  const addTransition = useAddTransition(projectKey, workItemType);
  const deleteTransition = useDeleteTransition(projectKey, workItemType);
  const copyWorkflow = useCopyTypeWorkflow(projectKey, workItemType);

  const [wfMode, setWfMode] = useState<'editor' | 'diagram'>('editor');
  const [showAddStatus, setShowAddStatus] = useState(false);

  if (isLoading) {
    return (
      <div
        style={{
          padding: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          color: 'var(--ds-text-subtlest, #6B6E76)',
          fontSize: 14,
        }}
      >
        <Spinner size="small" />
        Loading workflow…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          padding: 24,
          color: 'var(--ds-text-danger, #AE2E24)',
          fontSize: 14,
        }}
      >
        Failed to load workflow.
      </div>
    );
  }

  const { statuses, transitions, initialStatusId } = data;

  const assignedIds = new Set(statuses.map((s) => s.id));
  const unassigned = allRegistryStatuses.filter((s) => !assignedIds.has(s.id));
  const typeStatusMap = new Map(statuses.map((s) => [s.id, s]));

  // Group transitions
  const globalTransitions = transitions.filter((t) => t.from_status_id === null);
  const typeTransitions = transitions.filter((t) => t.from_status_id !== null);
  const transitionsByFrom = new Map<string, Transition[]>();
  for (const t of typeTransitions) {
    const key = t.from_status_id!;
    if (!transitionsByFrom.has(key)) transitionsByFrom.set(key, []);
    transitionsByFrom.get(key)!.push(t);
  }

  const totalTransitionRules = transitions.length;
  const initialName = initialStatusId ? typeStatusMap.get(initialStatusId)?.name ?? '—' : '—';

  // Group statuses by category
  const CATEGORY_ORDER: StatusCategory[] = ['todo', 'in_progress', 'done'];
  const statusesByCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: statuses.filter((s) => s.category === cat),
  })).filter((g) => g.items.length > 0);

  function handleAddStatus(statusId: string) {
    addTypeStatus.mutate(
      { statusId, position: statuses.length },
      { onSuccess: () => setShowAddStatus(false) }
    );
  }

  function handleRemoveStatus(status: TypeStatus) {
    const usedInTransitions = transitions.some(
      (t) => t.from_status_id === status.id || t.to_status_id === status.id
    );
    if (usedInTransitions) {
      if (
        !window.confirm(
          `"${status.name}" is referenced in transitions. Removing it will also delete those transitions. Continue?`
        )
      )
        return;
    }
    removeTypeStatus.mutate(status.id);
  }

  function handleSetInitial(statusId: string) {
    setInitialStatus.mutate({ statusId });
  }

  function handleAddTransition(fromStatusId: string | null, toStatusId: string) {
    addTransition.mutate({ fromStatusId, toStatusId });
  }

  function handleDeleteTransition(transitionId: string, isGlobal: boolean) {
    deleteTransition.mutate(transitionId);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── meta strip ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 16,
          padding: '12px 16px',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 4,
          background: 'var(--ds-surface-sunken, #F7F8F9)',
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: 'var(--ds-text-subtle, #505258)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <strong style={{ color: 'var(--ds-text, #292A2E)', fontWeight: 600 }}>
            {statuses.length}
          </strong>{' '}
          statuses
        </span>
        <span
          style={{
            fontSize: 13,
            color: 'var(--ds-text-subtle, #505258)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <strong style={{ color: 'var(--ds-text, #292A2E)', fontWeight: 600 }}>
            {totalTransitionRules}
          </strong>{' '}
          transition rules
        </span>
        <span
          style={{
            fontSize: 13,
            color: 'var(--ds-text-subtle, #505258)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Initial status:{' '}
          <strong style={{ color: 'var(--ds-text, #292A2E)', fontWeight: 600 }}>
            {initialName}
          </strong>
        </span>
        <span style={{ flex: 1 }} />
        <ModeToggle mode={wfMode} onChange={setWfMode} />
        <DropdownMenu
          trigger={({ triggerRef, ...triggerProps }) => (
            <button
              ref={triggerRef}
              {...triggerProps}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 32,
                padding: '0 10px',
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 3,
                fontSize: 14,
                fontWeight: 500,
                background: 'transparent',
                color: copyWorkflow.isPending ? 'var(--ds-text-subtlest, #6B6E76)' : 'var(--ds-text, #292A2E)',
                cursor: copyWorkflow.isPending ? 'not-allowed' : 'pointer',
                transition: 'background 120ms ease',
              }}
              disabled={copyWorkflow.isPending}
              title="Copy statuses and transitions from another work item type"
            >
              {copyWorkflow.isPending ? <Spinner size="small" /> : <CopyIcon />}
              Copy workflow from…
            </button>
          )}
          placement="bottom-end"
        >
          <DropdownItemGroup title="Copy from">
            {WORK_ITEM_TYPES.filter((t) => t !== workItemType).map((fromType) => (
              <DropdownItem
                key={fromType}
                onClick={() => {
                  copyWorkflow.mutate(fromType, {
                    onSuccess: ({ addedStatuses, addedTransitions }) => {
                      onFeedback?.(
                        'success',
                        `Copied from ${fromType}`,
                        `Added ${addedStatuses} status${addedStatuses !== 1 ? 'es' : ''} and ${addedTransitions} transition${addedTransitions !== 1 ? 's' : ''}.`
                      );
                    },
                    onError: (err: unknown) => {
                      onFeedback?.('error', 'Copy failed', (err as Error)?.message);
                    },
                  });
                }}
              >
                {fromType}
              </DropdownItem>
            ))}
          </DropdownItemGroup>
        </DropdownMenu>
      </div>

      {/* ── diagram placeholder ─────────────────────────────────────────── */}
      {wfMode === 'diagram' && (
        <div
          style={{
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
            padding: 32,
            textAlign: 'center',
            color: 'var(--ds-text-subtlest, #6B6E76)',
            fontSize: 14,
            background: 'var(--ds-surface-sunken, #F7F8F9)',
          }}
        >
          Diagram view — workflow diagram renders here
        </div>
      )}

      {wfMode === 'editor' && (
        <>
          {/* ── statuses section ──────────────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 653,
                marginBottom: 2,
                color: 'var(--ds-text, #292A2E)',
              }}
            >
              Statuses
            </h3>
            <p
              style={{
                fontSize: 12,
                color: 'var(--ds-text-subtlest, #6B6E76)',
                marginBottom: 10,
              }}
            >
              Statuses used in this workflow, grouped by category. Drag to reorder within a category.
            </p>

            {statuses.length === 0 && (
              <div
                style={{
                  padding: '12px 0',
                  fontSize: 13,
                  color: 'var(--ds-text-subtlest, #6B6E76)',
                }}
              >
                No statuses assigned. Add from the registry below.
              </div>
            )}

            {statusesByCategory.map(({ cat, items }) => (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 96,
                    paddingTop: 5,
                  }}
                >
                  <Lozenge appearance={CAT_LOZENGE[cat] ?? 'default'}>
                    {STATUS_CATEGORY_LABELS[cat as StatusCategory]}
                  </Lozenge>
                </span>
                <span
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  {items.map((s) => (
                    <StatusChip
                      key={s.id}
                      name={s.name}
                      color={s.color}
                      isInitial={s.id === initialStatusId}
                      onRemove={() => handleRemoveStatus(s)}
                      onSetInitial={() => handleSetInitial(s.id)}
                    />
                  ))}
                </span>
              </div>
            ))}

            {/* add status chip */}
            <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
              <AddStatusChip onClick={() => setShowAddStatus((v) => !v)} />
              {showAddStatus && unassigned.length > 0 && (
                <AddStatusPicker
                  available={unassigned}
                  onSelect={(id) => handleAddStatus(id)}
                  onClose={() => setShowAddStatus(false)}
                />
              )}
              {showAddStatus && unassigned.length === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    background: 'var(--ds-surface-overlay, #FFFFFF)',
                    border: '1px solid var(--ds-border, #DFE1E6)',
                    borderRadius: 4,
                    padding: '10px 12px',
                    fontSize: 13,
                    color: 'var(--ds-text-subtlest, #6B6E76)',
                    zIndex: 50,
                    whiteSpace: 'nowrap',
                  }}
                >
                  All registry statuses are already in this workflow.
                </div>
              )}
            </div>
          </div>

          {/* ── transitions section ────────────────────────────────────── */}
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 653,
                marginBottom: 2,
                color: 'var(--ds-text, #292A2E)',
              }}
            >
              Transition rules
            </h3>
            <p
              style={{
                fontSize: 12,
                color: 'var(--ds-text-subtlest, #6B6E76)',
                marginBottom: 10,
              }}
            >
              Each rule defines which statuses a work item can move to. Global rules apply to every type and are shown first.
            </p>

            {/* global group — always first */}
            <TransitionGroupRow
              fromStatus={null}
              isGlobal
              transitions={globalTransitions}
              allTypeStatuses={statuses}
              onDeleteTransition={handleDeleteTransition}
              onAddTransition={handleAddTransition}
            />

            {/* per-status groups */}
            {statuses.map((status) => (
              <TransitionGroupRow
                key={status.id}
                fromStatus={status}
                isGlobal={false}
                transitions={transitionsByFrom.get(status.id) ?? []}
                allTypeStatuses={statuses}
                onDeleteTransition={handleDeleteTransition}
                onAddTransition={(_, toId) => handleAddTransition(status.id, toId)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
