import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Spinner from '@atlaskit/spinner';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { usePhProjects } from '@/hooks/useProjects';
import {
  useCreateStatus,
  useUpdateStatus,
  useArchiveStatus,
} from '@/hooks/useWorkflowStatuses';
import {
  useTypeWorkflow,
  useSetInitialStatus,
  useRemoveTypeStatus,
  useAddTransition,
  useDeleteTransition,
  WORK_ITEM_TYPES,
  type WorkItemType,
  type TypeStatus,
  type Transition,
} from '@/hooks/useTypeWorkflow';
import { useResetProjectWorkflow } from '@/hooks/useWorkflowDefaults';
import {
  STATUS_CATEGORY_COLORS,
  STATUS_CATEGORY_LABELS,
  type StatusCategory,
} from '@/constants/statusCategoryColors';
import { STATUS_TEXT } from '@/components/catalyst-detail-views/shared/sections/statusPalette';
import { CatalystWorkflowDiagram } from '@/components/catalyst-detail-views/shared/workflow/CatalystWorkflowDiagram';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  text: 'var(--ds-text, #172B4D)',
  textSubtle: 'var(--ds-text-subtle, #44546F)',
  textSubtlest: 'var(--ds-text-subtlest, #626F86)',
  textBrand: 'var(--ds-link, #0C66E4)',
  textDanger: 'var(--ds-text-danger, #AE2A19)',
  border: 'var(--ds-border, #DCDFE4)',
  bgHover: 'var(--ds-background-neutral-hovered, #F1F2F4)',
  bgNeutral: 'var(--ds-background-neutral, #F1F2F4)',
  bgSelected: 'var(--ds-background-selected, #E9F2FE)',
  iconBrand: 'var(--ds-icon-brand, #0C66E4)',
};

const CATS: StatusCategory[] = ['todo', 'in_progress', 'done'];

function CatPill({ cat, label, bold }: { cat: StatusCategory; label?: string; bold?: boolean }) {
  const bg = STATUS_CATEGORY_COLORS[cat];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: bold ? 24 : 20,
        padding: '0 8px',
        borderRadius: 3,
        fontSize: bold ? 12 : 11,
        fontWeight: bold ? 600 : 500,
        background: bg,
        color: STATUS_TEXT,
        whiteSpace: 'nowrap',
      }}
    >
      {label ?? STATUS_CATEGORY_LABELS[cat]}
    </span>
  );
}

function StatusPillInline({ name, category }: { name: string; category: string }) {
  const bg = STATUS_CATEGORY_COLORS[category as StatusCategory] ?? '#DDDEE1';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 20,
        padding: '0 8px',
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 500,
        background: bg,
        color: STATUS_TEXT,
        whiteSpace: 'nowrap',
        maxWidth: 160,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {name}
    </span>
  );
}

function usePortalMenu(
  triggerRef: React.RefObject<HTMLButtonElement | null>,
  onClose: () => void,
  isOpen: boolean
) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [isOpen, onClose, triggerRef]);
  return menuRef;
}

const menuItemBase: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  background: 'none',
  padding: '6px 12px',
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  lineHeight: '20px',
};

function MenuItem({
  onClick,
  children,
  danger,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...menuItemBase,
        color: danger ? T.textDanger : T.text,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLElement).style.background = T.bgHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'none';
      }}
    >
      {children}
    </button>
  );
}

function RowMenu({
  triggerRef,
  isInitial,
  onClose,
  onRename,
  onSetInitial,
  onRemove,
  onDelete,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  isInitial: boolean;
  onClose: () => void;
  onRename: () => void;
  onSetInitial: () => Promise<void>;
  onRemove: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const menuRef = usePortalMenu(triggerRef, onClose, true);
  if (!triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        background: '#FFFFFF',
        border: `1px solid ${T.border}`,
        borderRadius: '6px',
        boxShadow: '0 8px 28px rgba(9,30,66,0.25)',
        padding: '4px 0',
        minWidth: '180px',
        zIndex: 9999,
      }}
    >
      {!isInitial && (
        <MenuItem onClick={async () => { await onSetInitial(); onClose(); }}>
          Set as initial status
        </MenuItem>
      )}
      <MenuItem onClick={() => { onRename(); onClose(); }}>Rename</MenuItem>
      <MenuItem onClick={async () => { await onRemove(); onClose(); }}>
        Remove from workflow
      </MenuItem>
      <div style={{ borderTop: `1px solid ${T.border}`, margin: '4px 0' }} />
      <MenuItem danger onClick={async () => { await onDelete(); onClose(); }}>
        Delete status
      </MenuItem>
    </div>,
    document.body
  );
}

function OverflowMenu({
  triggerRef,
  onClose,
  resetConfirm,
  resetLoading,
  onReset,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  resetConfirm: boolean;
  resetLoading: boolean;
  onReset: () => void;
}) {
  const menuRef = usePortalMenu(triggerRef, onClose, true);
  if (!triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        background: '#FFFFFF',
        border: `1px solid ${T.border}`,
        borderRadius: '6px',
        boxShadow: '0 8px 28px rgba(9,30,66,0.25)',
        padding: '4px 0',
        minWidth: '220px',
        zIndex: 9999,
      }}
    >
      <MenuItem onClick={onReset} disabled={resetLoading} danger={resetConfirm}>
        {resetLoading
          ? 'Resetting…'
          : resetConfirm
          ? 'Confirm — re-derive from Jira?'
          : 'Reset from Jira data'}
      </MenuItem>
    </div>,
    document.body
  );
}

function StatusRow({
  status,
  isInitial,
  cat,
  onRename,
  onSetInitial,
  onRemoveFromType,
  onDelete,
}: {
  status: TypeStatus;
  isInitial: boolean;
  cat: StatusCategory;
  onRename: (name: string) => Promise<void>;
  onSetInitial: () => Promise<void>;
  onRemoveFromType: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);
  const [showMenu, setShowMenu] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  const commitRename = async () => {
    const n = editName.trim();
    setEditing(false);
    if (n && n !== status.name) await onRename(n);
    else setEditName(status.name);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 8px 7px 12px',
        background: hovered && !editing ? T.bgHover : 'transparent',
        transition: 'background 0.1s',
        minHeight: '36px',
      }}
    >
      <span
        style={{
          color: T.textSubtlest,
          opacity: hovered ? 0.5 : 0,
          fontSize: '13px',
          flexShrink: 0,
          cursor: 'grab',
          lineHeight: 1,
          transition: 'opacity 0.1s',
          userSelect: 'none',
        }}
      >
        ⠿
      </span>

      {editing ? (
        <input
          ref={editRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') {
              setEditing(false);
              setEditName(status.name);
            }
          }}
          onBlur={commitRename}
          style={{
            flex: 1,
            fontSize: '13px',
            color: T.text,
            border: `1px solid var(--ds-border-focused, #388BFF)`,
            borderRadius: '3px',
            padding: '1px 4px',
            outline: 'none',
            fontFamily: 'inherit',
            minWidth: 0,
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{ flex: 1, cursor: 'text', minWidth: 0, overflow: 'hidden' }}
          title={status.name}
        >
          <StatusPillInline name={status.name} category={cat} />
        </span>
      )}

      {isInitial && (
        <span
          title="Initial status — new items start here"
          style={{ color: '#FFD700', fontSize: '11px', flexShrink: 0, lineHeight: 1 }}
        >
          ★
        </span>
      )}

      {hovered && !editing && (
        <button
          ref={menuBtnRef}
          onClick={() => setShowMenu((v) => !v)}
          style={{
            width: '20px',
            height: '20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: T.textSubtlest,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '3px',
            flexShrink: 0,
            padding: 0,
          }}
          aria-label="Status actions"
        >
          ⋯
        </button>
      )}

      {showMenu && (
        <RowMenu
          triggerRef={menuBtnRef}
          isInitial={isInitial}
          onClose={() => setShowMenu(false)}
          onRename={() => setEditing(true)}
          onSetInitial={onSetInitial}
          onRemove={onRemoveFromType}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

function StatusColumn({
  cat,
  statuses,
  initialId,
  isLast,
  onAddStatus,
  onRename,
  onSetInitial,
  onRemoveFromType,
  onDelete,
}: {
  cat: StatusCategory;
  statuses: TypeStatus[];
  initialId: string | null;
  isLast: boolean;
  onAddStatus: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onSetInitial: (id: string) => Promise<void>;
  onRemoveFromType: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const submitAdd = async () => {
    const n = newName.trim();
    if (!n) {
      setAdding(false);
      return;
    }
    setAddLoading(true);
    try {
      await onAddStatus(n);
      setNewName('');
      setAdding(false);
    } finally {
      setAddLoading(false);
    }
  };

  const catColor = STATUS_CATEGORY_COLORS[cat];

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRight: isLast ? 'none' : `1px solid ${T.border}`,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: `2px solid ${catColor}`,
          background: T.surface,
          flexShrink: 0,
        }}
      >
        <CatPill cat={cat} bold />
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '11px',
            color: T.textSubtlest,
            background: T.bgNeutral,
            borderRadius: '10px',
            padding: '1px 7px',
            fontWeight: 500,
          }}
        >
          {statuses.length}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {statuses.length === 0 && !adding && (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: T.textSubtlest,
              fontSize: '12px',
            }}
          >
            No statuses
          </div>
        )}
        {statuses.map((s) => (
          <StatusRow
            key={s.id}
            status={s}
            isInitial={s.id === initialId}
            cat={cat}
            onRename={(name) => onRename(s.id, name)}
            onSetInitial={() => onSetInitial(s.id)}
            onRemoveFromType={() => onRemoveFromType(s.id)}
            onDelete={() => onDelete(s.id)}
          />
        ))}
      </div>

      <div style={{ padding: '4px 8px 8px', flexShrink: 0 }}>
        {adding ? (
          <div
            style={{
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              padding: '6px 8px',
              background: T.bgNeutral,
              borderRadius: '4px',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: catColor,
                flexShrink: 0,
              }}
            />
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitAdd();
                if (e.key === 'Escape') {
                  setAdding(false);
                  setNewName('');
                }
              }}
              placeholder="Status name…"
              disabled={addLoading}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: T.text,
                fontFamily: 'inherit',
                minWidth: 0,
              }}
            />
            {addLoading ? (
              <Spinner size="small" />
            ) : (
              <>
                <button
                  onClick={submitAdd}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: T.textBrand,
                    fontSize: '14px',
                    padding: '0 2px',
                    lineHeight: 1,
                  }}
                  aria-label="Confirm"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setAdding(false);
                    setNewName('');
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: T.textSubtlest,
                    fontSize: '14px',
                    padding: '0 2px',
                    lineHeight: 1,
                  }}
                  aria-label="Cancel"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              width: '100%',
              padding: '6px 8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: T.textSubtlest,
              fontSize: '13px',
              borderRadius: '4px',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = T.textBrand;
              (e.currentTarget as HTMLElement).style.background = T.bgHover;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = T.textSubtlest;
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
            Add status
          </button>
        )}
      </div>
    </div>
  );
}

function DiagramView({
  projectKey,
  workItemType,
}: {
  projectKey: string;
  workItemType: WorkItemType;
}) {
  const { data: workflow, isLoading } = useTypeWorkflow(projectKey, workItemType);
  const addTransition = useAddTransition(projectKey, workItemType);
  const deleteTransition = useDeleteTransition(projectKey, workItemType);
  const createStatus = useCreateStatus(projectKey);

  const [zoom, setZoom] = useState(100);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Add-status inline form state
  const [addingStatus, setAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusCat, setNewStatusCat] = useState<StatusCategory>('todo');
  const [addStatusLoading, setAddStatusLoading] = useState(false);
  const addStatusInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (addingStatus) addStatusInputRef.current?.focus(); }, [addingStatus]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Spinner size="medium" />
      </div>
    );
  }

  const statuses = workflow?.statuses ?? [];
  const transitions = workflow?.transitions ?? [];
  const statusMap = new Map<string, TypeStatus>(statuses.map((s) => [s.id, s]));

  // Transitions touching the selected node
  const highlightedTransitionIds = selectedNodeId
    ? new Set(
        transitions
          .filter((t) => t.from_status_id === selectedNodeId || t.to_status_id === selectedNodeId)
          .map((t) => t.id)
      )
    : undefined;

  // Filtered transition list — show only those involving selected node, or all
  const visibleTransitions = selectedNodeId
    ? transitions.filter(
        (t) => t.from_status_id === selectedNodeId || t.to_status_id === selectedNodeId
      )
    : transitions;

  const handleNodeClick = (id: string) => {
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
      setFromId('');
    } else {
      setSelectedNodeId(id);
      setFromId(id);
    }
  };

  const handleEdgeDelete = async (transitionId: string) => {
    await deleteTransition.mutateAsync(transitionId);
  };

  const submitAddTransition = async () => {
    if (!toId) return;
    setAddLoading(true);
    try {
      await addTransition.mutateAsync({ fromStatusId: fromId || null, toStatusId: toId });
      setToId('');
    } finally {
      setAddLoading(false);
    }
  };

  const submitAddStatus = async () => {
    const n = newStatusName.trim();
    if (!n) { setAddingStatus(false); return; }
    setAddStatusLoading(true);
    try {
      await createStatus.mutateAsync({
        name: n,
        category: newStatusCat,
        color: STATUS_CATEGORY_COLORS[newStatusCat],
        typeAssignments: [workItemType],
      });
      setNewStatusName('');
      setAddingStatus(false);
    } finally {
      setAddStatusLoading(false);
    }
  };

  const selectStyle: React.CSSProperties = {
    fontSize: '12px',
    color: T.text,
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: '4px',
    padding: '3px 6px',
    height: '28px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    minWidth: 120,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Toolbar: zoom + add status */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: T.textSubtlest }}>Zoom</span>
          <input type="range" min={40} max={150} step={10} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: 80, accentColor: 'var(--ds-link, #0C66E4)' }} />
          <span style={{ fontSize: 11, color: T.textSubtlest, minWidth: 30 }}>{zoom}%</span>

          {selectedNodeId && (
            <span style={{ fontSize: 11, color: T.textBrand, background: T.bgSelected, borderRadius: 3, padding: '2px 8px' }}>
              {statusMap.get(selectedNodeId)?.name} selected — click to deselect
            </span>
          )}

          <div style={{ marginLeft: 'auto' }}>
            {addingStatus ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <select
                  value={newStatusCat}
                  onChange={(e) => setNewStatusCat(e.target.value as StatusCategory)}
                  style={{ ...selectStyle, minWidth: 100 }}
                >
                  {CATS.map((c) => (
                    <option key={c} value={c}>{STATUS_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <input
                  ref={addStatusInputRef}
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitAddStatus();
                    if (e.key === 'Escape') { setAddingStatus(false); setNewStatusName(''); }
                  }}
                  placeholder="Status name…"
                  disabled={addStatusLoading}
                  style={{
                    height: 28, fontSize: 12, border: `1px solid ${T.border}`,
                    borderRadius: 4, padding: '0 8px', fontFamily: 'inherit',
                    color: T.text, background: T.surface, width: 160,
                  }}
                />
                <button onClick={submitAddStatus} disabled={addStatusLoading || !newStatusName.trim()}
                  style={{
                    height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500, border: 'none',
                    borderRadius: 3, cursor: newStatusName.trim() ? 'pointer' : 'not-allowed',
                    background: newStatusName.trim() ? 'var(--ds-background-brand-bold, #0C66E4)' : T.bgNeutral,
                    color: newStatusName.trim() ? '#FFFFFF' : T.textSubtlest, fontFamily: 'inherit',
                  }}>
                  {addStatusLoading ? '…' : 'Add'}
                </button>
                <button onClick={() => { setAddingStatus(false); setNewStatusName(''); }}
                  style={{ height: 28, padding: '0 8px', fontSize: 12, border: `1px solid ${T.border}`,
                    borderRadius: 3, cursor: 'pointer', background: T.surface, color: T.textSubtlest,
                    fontFamily: 'inherit' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingStatus(true)}
                style={{
                  height: 28, padding: '0 12px', fontSize: 12, fontWeight: 500,
                  border: `1px solid ${T.border}`, borderRadius: 3, cursor: 'pointer',
                  background: T.surface, color: T.textSubtle, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add status
              </button>
            )}
          </div>
        </div>

        <div style={{
          flex: 1, border: `1px solid ${T.border}`, borderRadius: 4,
          background: 'var(--ds-surface-sunken, #F7F8F9)', overflow: 'auto', minHeight: 200,
        }}>
          {workflow ? (
            <CatalystWorkflowDiagram
              statuses={statuses}
              transitions={transitions}
              initialStatusId={workflow.initialStatusId}
              showTransitionLabels={false}
              zoom={zoom}
              selectedNodeId={selectedNodeId ?? undefined}
              highlightedTransitionIds={highlightedTransitionIds}
              onNodeClick={handleNodeClick}
              onEdgeDelete={handleEdgeDelete}
            />
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: T.textSubtlest, fontSize: 13 }}>
              No statuses configured for {workItemType}
            </div>
          )}
        </div>
      </div>

      {/* Transitions panel */}
      <div style={{
        flexShrink: 0, borderTop: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', maxHeight: 260, overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0, borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
            {selectedNodeId ? `Transitions for ${statusMap.get(selectedNodeId)?.name ?? '…'}` : 'Transitions'}
            <span style={{
              marginLeft: 8, fontSize: 11, fontWeight: 500, color: T.textSubtlest,
              background: T.bgNeutral, borderRadius: 10, padding: '1px 7px',
            }}>
              {visibleTransitions.length}
              {selectedNodeId && transitions.length !== visibleTransitions.length && ` of ${transitions.length}`}
            </span>
            {selectedNodeId && (
              <button onClick={() => { setSelectedNodeId(null); setFromId(''); }}
                style={{ marginLeft: 8, fontSize: 11, color: T.textBrand, background: 'none',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                show all
              </button>
            )}
          </span>

          {/* Add transition form */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)}
              style={selectStyle} aria-label="From status">
              <option value="">— any —</option>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span style={{ fontSize: 14, color: T.textSubtlest }}>→</span>
            <select value={toId} onChange={(e) => setToId(e.target.value)}
              style={selectStyle} aria-label="To status">
              <option value="">— target —</option>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={submitAddTransition} disabled={!toId || addLoading}
              style={{
                height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
                border: 'none', borderRadius: 3,
                background: toId ? 'var(--ds-background-brand-bold, #0C66E4)' : T.bgNeutral,
                color: toId ? '#FFFFFF' : T.textSubtlest,
                cursor: toId ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              }}>
              {addLoading ? '…' : 'Add'}
            </button>
          </div>
        </div>

        {/* Transition rows */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {visibleTransitions.length === 0 && (
            <div style={{ padding: '20px 24px', color: T.textSubtlest, fontSize: 12, textAlign: 'center' }}>
              {selectedNodeId
                ? `No transitions for ${statusMap.get(selectedNodeId)?.name ?? 'this status'}`
                : 'No transitions — add one above'}
            </div>
          )}
          {visibleTransitions.map((t) => {
            const fromStatus = t.from_status_id ? statusMap.get(t.from_status_id) : null;
            const toStatus = statusMap.get(t.to_status_id);
            const isHighlighted = highlightedTransitionIds?.has(t.id);
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 24px',
                borderBottom: `1px solid var(--ds-border-subtle, #F1F2F4)`,
                background: isHighlighted ? T.bgSelected : 'transparent',
              }}>
                {fromStatus ? (
                  <StatusPillInline name={fromStatus.name} category={fromStatus.category} />
                ) : (
                  <span style={{ fontSize: 11, color: T.textSubtlest, fontStyle: 'italic' }}>any status</span>
                )}
                <span style={{ fontSize: 13, color: T.textSubtlest }}>→</span>
                {toStatus ? (
                  <StatusPillInline name={toStatus.name} category={toStatus.category} />
                ) : (
                  <span style={{ fontSize: 11, color: T.textSubtlest }}>?</span>
                )}
                <button
                  onClick={() => deleteTransition.mutateAsync(t.id)}
                  style={{
                    marginLeft: 'auto', border: 'none', background: 'none',
                    cursor: 'pointer', color: T.textSubtlest, fontSize: 14,
                    padding: '2px 4px', borderRadius: 3, lineHeight: 1, fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = T.textDanger;
                    (e.currentTarget as HTMLElement).style.background = T.bgHover;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = T.textSubtlest;
                    (e.currentTarget as HTMLElement).style.background = 'none';
                  }}
                  aria-label="Delete transition" title="Delete transition">
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBoard({
  projectKey,
  workItemType,
}: {
  projectKey: string;
  workItemType: WorkItemType;
}) {
  const { data: workflow, isLoading } = useTypeWorkflow(projectKey, workItemType);
  const createStatus = useCreateStatus(projectKey);
  const updateStatus = useUpdateStatus(projectKey);
  const archiveStatus = useArchiveStatus(projectKey);
  const setInitial = useSetInitialStatus(projectKey, workItemType);
  const removeType = useRemoveTypeStatus(projectKey, workItemType);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <Spinner size="medium" />
      </div>
    );
  }

  const statuses = workflow?.statuses ?? [];
  const initialId = workflow?.initialStatusId ?? null;

  const byCat = CATS.reduce(
    (acc, cat) => {
      acc[cat] = statuses.filter((s) => s.category === cat);
      return acc;
    },
    {} as Record<StatusCategory, TypeStatus[]>
  );

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {CATS.map((cat, i) => (
        <StatusColumn
          key={cat}
          cat={cat}
          statuses={byCat[cat]}
          initialId={initialId}
          isLast={i === CATS.length - 1}
          onAddStatus={(name) =>
            createStatus.mutateAsync({
              name,
              category: cat,
              color: STATUS_CATEGORY_COLORS[cat],
              typeAssignments: [workItemType],
            })
          }
          onRename={(id, name) => updateStatus.mutateAsync({ id, name })}
          onSetInitial={(id) => setInitial.mutateAsync({ statusId: id })}
          onRemoveFromType={(id) => removeType.mutateAsync(id)}
          onDelete={(id) => archiveStatus.mutateAsync(id)}
        />
      ))}
    </div>
  );
}

export default function WorkflowAdminPage() {
  const [projectKey, setProjectKey] = useState('BAU');
  const [typeIdx, setTypeIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'board' | 'diagram'>('board');
  const [showOverflow, setShowOverflow] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const overflowRef = useRef<HTMLButtonElement>(null);

  const { data: projects = [] } = usePhProjects();
  const resetMutation = useResetProjectWorkflow(projectKey);

  const activeType = WORK_ITEM_TYPES[Math.min(typeIdx, WORK_ITEM_TYPES.length - 1)];

  const handleReset = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    setResetConfirm(false);
    setShowOverflow(false);
    await resetMutation.mutateAsync();
  };

  return (
    <AdminGuard>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--ds-surface, #FFFFFF)',
        }}
      >
        <div
          style={{
            padding: '20px 24px 0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            flexShrink: 0,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 653,
                color: T.text,
                lineHeight: '28px',
                fontFamily: "'Atlassian Sans', var(--ds-font-family-body)",
              }}
            >
              Workflows
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: T.textSubtle }}>
              Status workflows per work item type
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '4px' }}>
            <select
              value={projectKey}
              onChange={(e) => {
                setProjectKey(e.target.value);
                setTypeIdx(0);
              }}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: T.text,
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                height: '32px',
                fontFamily: 'inherit',
              }}
            >
              {projects.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>

            <div style={{ position: 'relative' }}>
              <button
                ref={overflowRef}
                onClick={() => {
                  setShowOverflow((v) => !v);
                  setResetConfirm(false);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  border: `1px solid ${T.border}`,
                  background: showOverflow ? T.bgNeutral : T.surface,
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: T.textSubtle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
                aria-label="More actions"
              >
                ⋯
              </button>
              {showOverflow && (
                <OverflowMenu
                  triggerRef={overflowRef}
                  onClose={() => {
                    setShowOverflow(false);
                    setResetConfirm(false);
                  }}
                  resetConfirm={resetConfirm}
                  resetLoading={resetMutation.isPending}
                  onReset={handleReset}
                />
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px 0',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {WORK_ITEM_TYPES.map((t, i) => (
            <button
              key={t}
              onClick={() => setTypeIdx(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px 3px 8px',
                borderRadius: '20px',
                border: `1px solid ${typeIdx === i ? T.iconBrand : T.border}`,
                fontSize: '12px',
                fontWeight: typeIdx === i ? 600 : 400,
                color: typeIdx === i ? T.textBrand : T.textSubtle,
                background: typeIdx === i ? T.bgSelected : T.surface,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <JiraIssueTypeIcon type={t} size={14} />
              {t}
            </button>
          ))}
        </div>

        {/* View toggle + divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px 0',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              background: T.bgNeutral,
              borderRadius: 6,
              padding: 2,
              gap: 2,
            }}
          >
            {(['board', 'diagram'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '3px 12px',
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: viewMode === mode ? 600 : 400,
                  background: viewMode === mode ? T.surface : 'transparent',
                  color: viewMode === mode ? T.text : T.textSubtlest,
                  cursor: 'pointer',
                  boxShadow: viewMode === mode ? `0 1px 2px rgba(9,30,66,0.12)` : 'none',
                  fontFamily: 'inherit',
                  textTransform: 'capitalize',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            height: '1px',
            background: T.border,
            margin: '12px 0 0',
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {viewMode === 'board' ? (
            <StatusBoard projectKey={projectKey} workItemType={activeType} />
          ) : (
            <DiagramView projectKey={projectKey} workItemType={activeType} />
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
