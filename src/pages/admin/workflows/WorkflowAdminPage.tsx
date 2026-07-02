import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
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
  useWorkflowTemplates,
  useTemplateDetail,
  useProjectWorkflowAssignment,
  useApplyTemplate,
  usePushTemplate,
  type WorkflowTemplate,
} from '@/hooks/useWorkflowTemplates';
import {
  STATUS_CATEGORY_COLORS,
  STATUS_CATEGORY_LABELS,
  type StatusCategory,
} from '@/constants/statusCategoryColors';
import { STATUS_TEXT } from '@/components/catalyst-detail-views/shared/sections/statusPalette';
import { SectionMessage } from '@/components/ads/SectionMessage';
import { CatalystWorkflowBuilder } from './CatalystWorkflowBuilder';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

const T = {
  surface: 'var(--ds-surface)',
  text: 'var(--ds-text)',
  textSubtle: 'var(--ds-text-subtle)',
  textSubtlest: 'var(--ds-text-subtlest)',
  textBrand: 'var(--ds-link)',
  textDanger: 'var(--ds-text-danger)',
  border: 'var(--ds-border)',
  bgHover: 'var(--ds-background-neutral-hovered)',
  bgNeutral: 'var(--ds-background-neutral)',
  bgSelected: 'var(--ds-background-selected)',
  iconBrand: 'var(--ds-icon-brand)',
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
  const bg = STATUS_CATEGORY_COLORS[category as StatusCategory] ?? 'var(--ds-border)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 20,
        padding: '0 8px',
        borderRadius: 3,
        fontSize: 'var(--ds-font-size-100)',
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
  padding: '4px 12px',
  fontSize: 'var(--ds-font-size-300)',
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
        background: 'var(--ds-surface)',
        border: `1px solid ${T.border}`,
        borderRadius: '6px',
        boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
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
        background: 'var(--ds-surface)',
        border: `1px solid ${T.border}`,
        borderRadius: '6px',
        boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
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
        gap: '4px',
        padding: '8px 8px 7px 12px',
        background: hovered && !editing ? T.bgHover : 'transparent',
        transition: 'background 0.1s',
        minHeight: '36px',
      }}
    >
      <span
        style={{
          color: T.textSubtlest,
          opacity: hovered ? 0.5 : 0,
          fontSize: 'var(--ds-font-size-300)',
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
            fontSize: 'var(--ds-font-size-300)',
            color: T.text,
            border: `1px solid var(--ds-border-focused)`,
            borderRadius: '3px',
            padding: '0px 4px',
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
          style={{ color: 'var(--ds-background-warning-bold)', fontSize: 'var(--ds-font-size-100)', flexShrink: 0, lineHeight: 1 }}
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
            fontSize: 'var(--ds-font-size-400)',
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
            fontSize: 'var(--ds-font-size-100)',
            color: T.textSubtlest,
            background: T.bgNeutral,
            borderRadius: '10px',
            padding: '0px 7px',
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
              fontSize: 'var(--ds-font-size-200)',
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
              padding: '4px 8px',
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
                fontSize: 'var(--ds-font-size-300)',
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
                    fontSize: 'var(--ds-font-size-400)',
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
                    fontSize: 'var(--ds-font-size-400)',
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
              gap: '4px',
              width: '100%',
              padding: '4px 8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: T.textSubtlest,
              fontSize: 'var(--ds-font-size-300)',
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
            <span style={{ fontSize: 'var(--ds-font-size-500)', lineHeight: 1 }}>+</span>
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
  return <CatalystWorkflowBuilder projectKey={projectKey} workItemType={workItemType} />;
}

function StatusBoard({
  projectKey,
  workItemType,
}: {
  projectKey: string;
  workItemType: WorkItemType;
}) {
  const {
    data: workflow,
    isLoading,
    isError,
    error,
    refetch,
  } = useTypeWorkflow(projectKey, workItemType);
  const createStatus = useCreateStatus(projectKey);
  const updateStatus = useUpdateStatus(projectKey);
  const archiveStatus = useArchiveStatus(projectKey);
  const setInitial = useSetInitialStatus(projectKey, workItemType);
  const removeType = useRemoveTypeStatus(projectKey, workItemType);

  // isError alone misses the persisted-cache case: hydrated data keeps status
  // 'success' while the background refetch fails and only `error` is set.
  if (isError || error) {
    return (
      <div style={{ padding: '16px 24px', maxWidth: 720 }}>
        <SectionMessage
          appearance="error"
          title="Couldn't load this workflow"
          actions={[{ key: 'retry', text: 'Retry', onClick: () => refetch() }]}
        >
          {(error as Error)?.message ?? 'Unknown error loading workflow statuses.'}
        </SectionMessage>
      </div>
    );
  }

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

// ── Assignment badge: shows which template a project-type workflow is based on ──

function AssignmentBadge({
  projectKey,
  workItemType,
}: {
  projectKey: string;
  workItemType: string;
}) {
  const { data: assignment } = useProjectWorkflowAssignment(projectKey, workItemType);
  if (!assignment?.template_id) return null;
  const tmplName = (assignment.template as any)?.name ?? '—';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 500,
        color: assignment.is_customized ? T.textSubtlest : T.textBrand,
        background: assignment.is_customized ? T.bgNeutral : T.bgSelected,
        border: `1px solid ${assignment.is_customized ? T.border : 'var(--ds-border-brand)'}`,
        borderRadius: 3,
        padding: '0px 6px',
        flexShrink: 0,
      }}
      title={
        assignment.is_customized
          ? `Started from "${tmplName}" — customized since`
          : `In sync with "${tmplName}" template`
      }
    >
      {assignment.is_customized ? '✏ ' : '✓ '}
      {tmplName}
      {assignment.is_customized ? ' (customized)' : ''}
    </span>
  );
}

// ── Templates view ──────────────────────────────────────────────────────────

function TemplateCard({
  template,
  projectKey,
  activeType,
}: {
  template: WorkflowTemplate;
  projectKey: string;
  activeType: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [pushed, setPushed] = useState(false);
  const { data: detail } = useTemplateDetail(expanded ? template.id : null);
  const applyTemplate = useApplyTemplate();
  const pushTemplate = usePushTemplate();

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyTemplate.mutateAsync({
        templateId: template.id,
        projectKey,
        workItemType: template.work_item_type,
      });
    } finally {
      setApplying(false);
    }
  };

  const handlePush = async () => {
    await pushTemplate.mutateAsync(template.id);
    setPushed(true);
    setTimeout(() => setPushed(false), 3000);
  };

  const isActiveType = template.work_item_type === activeType;

  return (
    <div
      style={{
        border: `1px solid ${isActiveType ? 'var(--ds-border-brand)' : T.border}`,
        borderRadius: 6,
        background: T.surface,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          cursor: 'pointer',
          background: expanded ? T.bgNeutral : 'transparent',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <JiraIssueTypeIcon type={template.work_item_type as WorkItemType} size={16} />
        <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-300)', color: T.text, flex: 1 }}>
          {template.name}
        </span>
        {template.is_default && (
          <span
            style={{
              fontSize: 'var(--ds-font-size-50)',
              fontWeight: 600,
              color: T.textBrand,
              background: T.bgSelected,
              border: `1px solid var(--ds-border-brand)`,
              borderRadius: 3,
              padding: '0px 5px',
            }}
          >
            DEFAULT
          </span>
        )}
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.textSubtlest }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {!detail ? (
            <Spinner size="small" />
          ) : (
            <>
              {/* Status list */}
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 'var(--ds-font-size-100)',
                    fontWeight: 600,
                    color: T.textSubtlest,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: 4,
                    paddingTop: 8,
                  }}
                >
                  Statuses ({detail.statuses.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {detail.statuses.map((s) => (
                    <span
                      key={s.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '0px 8px',
                        borderRadius: 3,
                        fontSize: 'var(--ds-font-size-100)',
                        fontWeight: 500,
                        background: STATUS_CATEGORY_COLORS[s.category as StatusCategory] ?? 'var(--ds-border)',
                        color: STATUS_TEXT,
                      }}
                    >
                      {s.is_initial && (
                        <span style={{ fontSize: 'var(--ds-font-size-100)', opacity: 0.7 }}>★</span>
                      )}
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Transition count */}
              <div
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  color: T.textSubtle,
                  marginBottom: 12,
                }}
              >
                {detail.transitions.length} transition{detail.transitions.length !== 1 ? 's' : ''}
                {detail.transitions.some((t) => !t.from_status_name) && (
                  <span style={{ color: T.textSubtlest }}> (includes global transitions)</span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={handleApply}
                  disabled={applying}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 4,
                    border: 'none',
                    background: 'var(--ds-background-brand-bold)',
                    color: 'var(--ds-text-inverse)',
                    fontSize: 'var(--ds-font-size-200)',
                    fontWeight: 600,
                    cursor: applying ? 'not-allowed' : 'pointer',
                    opacity: applying ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                  title={`Apply "${template.name}" to ${projectKey} project — ${template.work_item_type} workflow`}
                >
                  {applying ? 'Applying…' : `Apply to ${projectKey}`}
                </button>
                <button
                  onClick={handlePush}
                  disabled={pushTemplate.isPending || pushed}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 4,
                    border: `1px solid ${T.border}`,
                    background: T.surface,
                    color: T.text,
                    fontSize: 'var(--ds-font-size-200)',
                    fontWeight: 500,
                    cursor: pushTemplate.isPending || pushed ? 'not-allowed' : 'pointer',
                    opacity: pushTemplate.isPending ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                  title="Push to all projects that haven't customized this workflow"
                >
                  {pushed ? '✓ Pushed' : pushTemplate.isPending ? 'Pushing…' : 'Push to all (non-customized)'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TemplatesView({
  projectKey,
  activeType,
}: {
  projectKey: string;
  activeType: string;
}) {
  const {
    data: templates = [],
    isLoading,
    isError: templatesError,
    error: templatesErrorObj,
    refetch: refetchTemplates,
  } = useWorkflowTemplates();

  // Group by work_item_type; put activeType first
  const grouped = React.useMemo(() => {
    const m = new Map<string, WorkflowTemplate[]>();
    for (const t of templates) {
      if (!m.has(t.work_item_type)) m.set(t.work_item_type, []);
      m.get(t.work_item_type)!.push(t);
    }
    // Sort: activeType first, then alphabetical
    return [...m.entries()].sort(([a], [b]) => {
      if (a === activeType) return -1;
      if (b === activeType) return 1;
      return a.localeCompare(b);
    });
  }, [templates, activeType]);

  if (templatesError || templatesErrorObj) {
    return (
      <div style={{ padding: '16px 24px', maxWidth: 720 }}>
        <SectionMessage
          appearance="error"
          title="Couldn't load workflow templates"
          actions={[{ key: 'retry', text: 'Retry', onClick: () => refetchTemplates() }]}
        >
          {(templatesErrorObj as Error)?.message ?? 'Unknown error loading templates.'}
        </SectionMessage>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (!templates.length) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: T.textSubtlest,
        }}
      >
        <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: T.textSubtle }}>
          No templates yet
        </p>
        <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)' }}>
          Apply the migration to seed default templates for Business Request, BRD Task, and Story.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px 24px' }}>
      <p style={{ margin: '0 0 16px', fontSize: 'var(--ds-font-size-300)', color: T.textSubtle }}>
        Master templates define the canonical workflow for each work item type. Apply a template to
        copy its statuses and transitions into a project. Projects with{' '}
        <span style={{ fontWeight: 600 }}>in-sync</span> assignments update automatically when you
        "Push to all".
      </p>
      {grouped.map(([type, tmplList]) => (
        <div key={type} style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginBottom: 8,
            }}
          >
            <JiraIssueTypeIcon type={type as WorkItemType} size={16} />
            <span
              style={{
                fontSize: 'var(--ds-font-size-200)',
                fontWeight: 653,
                color: T.textSubtle,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {type}
            </span>
            {type === activeType && (
              <span
                style={{
                  fontSize: 'var(--ds-font-size-50)',
                  fontWeight: 600,
                  color: T.textSubtlest,
                  background: T.bgNeutral,
                  borderRadius: 3,
                  padding: '0px 5px',
                  border: `1px solid ${T.border}`,
                }}
              >
                selected type
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tmplList.map((tmpl) => (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
                projectKey={projectKey}
                activeType={activeType}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorkflowAdminPage() {
  const [projectKey, setProjectKey] = useState('BAU');
  const [typeIdx, setTypeIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'board' | 'diagram'>('board');
  const [pageMode, setPageMode] = useState<'workflows' | 'templates'>('workflows');
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
          background: 'var(--ds-surface)',
        }}
      >
        {/* P5 deprecation: this editor writes the LEGACY ph_workflow_* tables,
            which the runtime does not enforce. It stays only for board-column
            grooming until MapStatuses absorbs that; the Studio is canonical. */}
        <div style={{ padding: '12px 24px 0' }}>
          <SectionMessage appearance="warning" title="Deprecated — edits here are not runtime-enforced">
            This classic builder writes the legacy board tables only. Statuses, transitions,
            roles and guards that the runtime actually enforces are managed in the{' '}
            <Link to="/admin/workflows" style={{ color: 'var(--ds-text-brand)' }}>
              Workflow Studio →
            </Link>
          </SectionMessage>
        </div>
        <div
          style={{
            padding: '16px 24px 0',
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
                fontSize: 'var(--ds-font-size-800)',
                fontWeight: 653,
                color: T.text,
                lineHeight: '28px',
                fontFamily: "'Atlassian Sans', var(--ds-font-family-body)",
              }}
            >
              Workflows
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--ds-font-size-400)', color: T.textSubtle }}>
              Status workflows and master templates per work item type
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '4px' }}>
            {/* Page mode toggle */}
            <div
              style={{
                display: 'flex',
                background: T.bgNeutral,
                borderRadius: 6,
                padding: 0,
                gap: 0,
              }}
            >
              {(['workflows', 'templates'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPageMode(mode)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 4,
                    border: 'none',
                    fontSize: 'var(--ds-font-size-200)',
                    fontWeight: pageMode === mode ? 600 : 400,
                    background: pageMode === mode ? T.surface : 'transparent',
                    color: pageMode === mode ? T.text : T.textSubtlest,
                    cursor: 'pointer',
                    boxShadow: pageMode === mode ? `0 1px 2px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.12))` : 'none',
                    fontFamily: 'inherit',
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
            <Link
              to="/admin/workflows/versions"
              style={{
                fontSize: 'var(--ds-font-size-200)',
                fontWeight: 600,
                color: T.textBrand,
                textDecoration: 'none',
                padding: '4px 10px',
                borderRadius: 4,
                border: `1px solid ${T.border}`,
                whiteSpace: 'nowrap',
              }}
              title="Open the versioned workflow engine (ph_wf_* foundation)"
            >
              Versioned engine →
            </Link>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '4px' }}>
            <select
              value={projectKey}
              onChange={(e) => {
                setProjectKey(e.target.value);
                setTypeIdx(0);
              }}
              style={{
                fontSize: 'var(--ds-font-size-300)',
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
                  fontSize: 'var(--ds-font-size-500)',
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

        {/* Type pills — hidden in templates mode */}
        {pageMode === 'workflows' && (
          <div
            style={{
              padding: '16px 24px 0',
              display: 'flex',
              gap: '4px',
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
                  gap: '4px',
                  padding: '4px 8px 4px 8px',
                  borderRadius: '20px',
                  border: `1px solid ${typeIdx === i ? T.iconBrand : T.border}`,
                  fontSize: 'var(--ds-font-size-200)',
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
        )}

        {/* View toggle + assignment badge — hidden in templates mode */}
        {pageMode === 'workflows' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px 0',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  background: T.bgNeutral,
                  borderRadius: 6,
                  padding: 0,
                  gap: 0,
                }}
              >
                {(['board', 'diagram'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 4,
                      border: 'none',
                      fontSize: 'var(--ds-font-size-200)',
                      fontWeight: viewMode === mode ? 600 : 400,
                      background: viewMode === mode ? T.surface : 'transparent',
                      color: viewMode === mode ? T.text : T.textSubtlest,
                      cursor: 'pointer',
                      boxShadow: viewMode === mode ? `0 1px 2px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.12))` : 'none',
                      fontFamily: 'inherit',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <AssignmentBadge projectKey={projectKey} workItemType={activeType} />
            </div>
          </div>
        )}

        <div
          style={{
            height: '1px',
            background: T.border,
            margin: '12px 0 0',
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {pageMode === 'templates' ? (
            <TemplatesView projectKey={projectKey} activeType={activeType} />
          ) : viewMode === 'board' ? (
            <StatusBoard projectKey={projectKey} workItemType={activeType} />
          ) : (
            <DiagramView projectKey={projectKey} workItemType={activeType} />
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
