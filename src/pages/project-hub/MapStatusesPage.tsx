/**
 * MapStatusesPage — Full inline Catalyst page for mapping workflow statuses to board columns
 * Route: /project-hub/:key/boards/map-statuses
 * Uses @dnd-kit for drag-and-drop status pills between columns/backlog/unmapped
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { KANBAN_TOKENS } from '@/components/kanban/kanban-tokens';
import { useMapStatuses, DraftColumn, DraftMapping } from '@/hooks/useMapStatuses';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft, Plus, GripVertical, Trash2, Check, X, Pencil,
} from 'lucide-react';

/* ═══ STATUS PILL (draggable) ═══ */
function StatusPill({
  mapping, count, tk, isDragging, disabled,
}: {
  mapping: DraftMapping; count: number; tk: any; isDragging?: boolean; disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({
    id: mapping.statusId,
    disabled,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortDragging ? 0.4 : 1,
  };

  const catColor = mapping.bucketType === 'column'
    ? (mapping.statusName.toLowerCase().includes('done') || mapping.statusName.toLowerCase().includes('closed') || mapping.statusName.toLowerCase().includes('production') || mapping.statusName.toLowerCase().includes('resolved')
      ? '#006644' : mapping.statusName.toLowerCase().includes('progress') || mapping.statusName.toLowerCase().includes('dev') || mapping.statusName.toLowerCase().includes('qa') || mapping.statusName.toLowerCase().includes('uat') || mapping.statusName.toLowerCase().includes('design') || mapping.statusName.toLowerCase().includes('beta') || mapping.statusName.toLowerCase().includes('testing') || mapping.statusName.toLowerCase().includes('review')
        ? '#0747A6' : '#253858')
    : '#253858';

  const catBg = catColor === '#006644' ? '#E3FCEF' : catColor === '#0747A6' ? '#DEEBFF' : '#DFE1E6';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
      role="listitem"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0" style={{ padding: '5px 0' }}>
        <GripVertical size={14} color={tk.textDisabled} className="flex-shrink-0" />
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.03em', color: catColor, background: catBg,
          borderRadius: 3, padding: '2px 8px', lineHeight: '20px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {mapping.statusName}
        </span>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, color: tk.textMuted,
        fontFamily: 'var(--cp-font-mono)', flexShrink: 0,
      }}>
        {count}
      </span>
    </div>
  );
}

/* ═══ OVERLAY PILL ═══ */
function OverlayPill({ name, tk }: { name: string; tk: any }) {
  return (
    <div className="flex items-center gap-2" style={{
      padding: '5px 10px', background: tk.surfaceBg,
      border: `1px solid ${tk.selectedAccent}`,
      borderRadius: 4, boxShadow: tk.cardDragShadow,
    }}>
      <GripVertical size={14} color={tk.textDisabled} />
      <span style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.03em', color: '#253858', background: '#DFE1E6',
        borderRadius: 3, padding: '2px 8px', lineHeight: '20px',
      }}>
        {name}
      </span>
    </div>
  );
}

/* ═══ COLUMN CARD ═══ */
function ColumnCard({
  column, mappings, countsMap, tk, onRename, onDelete, isDragOverlay,
}: {
  column: DraftColumn;
  mappings: DraftMapping[];
  countsMap: Map<string, number>;
  tk: any;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isDragOverlay?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== column.name) {
      onRename(column.id, trimmed);
    }
    setEditing(false);
  };

  const totalCount = mappings.reduce((sum, m) => sum + (countsMap.get(m.statusName) ?? 0), 0);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col-${column.id}`,
    disabled: isDragOverlay,
  });

  const style: React.CSSProperties = isDragOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        width: 260, minWidth: 260, flexShrink: 0,
        background: tk.surfaceBg,
        border: `1px solid ${tk.border}`,
        borderRadius: 6,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-2" style={{ borderBottom: `1px solid ${tk.borderSubtle}` }}>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex-shrink-0">
          <GripVertical size={14} color={tk.textDisabled} />
        </div>

        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              ref={inputRef}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
              maxLength={40}
              style={{
                flex: 1, fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.04em', color: tk.textPrimary,
                background: tk.inputBg, border: `1px solid ${tk.selectedAccent}`,
                borderRadius: 3, padding: '2px 6px', outline: 'none',
                fontFamily: 'var(--cp-font-body)',
              }}
            />
            <button onClick={commitRename} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <Check size={14} color="#36B37E" />
            </button>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={14} color={tk.textMuted} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span style={{
              fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.04em', color: tk.textPrimary,
              fontFamily: 'var(--cp-font-body)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {column.name}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: tk.textSecondary,
              background: tk.badgeBg, borderRadius: 10,
              padding: '1px 7px', lineHeight: '18px', flexShrink: 0,
            }}>
              {totalCount}
            </span>
          </div>
        )}

        {!editing && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => { setEditName(column.name); setEditing(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              title="Rename"
            >
              <Pencil size={12} color={tk.textMuted} />
            </button>
            <button
              onClick={() => onDelete(column.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              title="Delete column"
            >
              <Trash2 size={12} color={tk.textMuted} />
            </button>
          </div>
        )}
      </div>

      {/* Status list — drop zone */}
      <div
        data-column-id={column.id}
        className="flex-1 px-3 py-2"
        style={{ minHeight: 60 }}
      >
        <SortableContext items={mappings.map(m => m.statusId)} strategy={verticalListSortingStrategy}>
          {mappings.length === 0 ? (
            <div style={{ fontSize: 12, color: tk.textDisabled, textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
              Drag statuses here
            </div>
          ) : (
            mappings.map(m => (
              <StatusPill key={m.statusId} mapping={m} count={countsMap.get(m.statusName) ?? 0} tk={tk} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

/* ═══ BUCKET PANEL (Unmapped / Backlog) ═══ */
function BucketPanel({
  title, bucketType, mappings, countsMap, tk,
}: {
  title: string;
  bucketType: 'unmapped' | 'backlog';
  mappings: DraftMapping[];
  countsMap: Map<string, number>;
  tk: any;
}) {
  const totalCount = mappings.reduce((sum, m) => sum + (countsMap.get(m.statusName) ?? 0), 0);

  return (
    <div style={{
      width: 240, minWidth: 240, flexShrink: 0,
      background: tk.surfaceBg,
      border: `1px solid ${tk.border}`,
      borderRadius: 6,
      display: 'flex', flexDirection: 'column',
    }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${tk.borderSubtle}` }}>
        <span style={{
          fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.04em', color: tk.textPrimary,
          fontFamily: 'var(--cp-font-body)',
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, color: tk.textSecondary,
          background: tk.badgeBg, borderRadius: 10,
          padding: '1px 7px', lineHeight: '18px',
        }}>
          {totalCount}
        </span>
      </div>
      <div data-bucket={bucketType} className="flex-1 px-3 py-2" style={{ minHeight: 60 }}>
        <SortableContext items={mappings.map(m => m.statusId)} strategy={verticalListSortingStrategy}>
          {mappings.length === 0 ? (
            <div style={{ fontSize: 12, color: tk.textDisabled, textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
              {bucketType === 'unmapped' ? 'No unmapped statuses' : 'Drag statuses here'}
            </div>
          ) : (
            mappings.map(m => (
              <StatusPill key={m.statusId} mapping={m} count={countsMap.get(m.statusName) ?? 0} tk={tk} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

/* ═══ ADD COLUMN FORM ═══ */
function AddColumnBtn({ tk, onAdd }: { tk: any; onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) { onAdd(trimmed); setName(''); setOpen(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1"
        style={{
          height: 36, padding: '0 12px', borderRadius: 6,
          border: `1px dashed ${tk.border}`, background: 'transparent',
          color: tk.textSecondary, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        <Plus size={14} /> Add column
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
      <input
        ref={inputRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false); }}
        placeholder="Column name"
        maxLength={40}
        style={{
          width: 160, height: 32, fontSize: 12, padding: '0 8px',
          border: `1px solid ${tk.selectedAccent}`, borderRadius: 4,
          background: tk.inputBg, color: tk.textPrimary, outline: 'none',
          fontFamily: 'var(--cp-font-body)',
        }}
      />
      <button onClick={submit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
        <Check size={16} color="#36B37E" />
      </button>
      <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
        <X size={16} color={tk.textMuted} />
      </button>
    </div>
  );
}

/* ═══ DELETE CONFIRMATION ═══ */
function DeleteConfirm({
  columnName, tk, onConfirm, onCancel,
}: {
  columnName: string; tk: any; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }}>
      <div style={{
        background: tk.surfaceBg, border: `1px solid ${tk.border}`,
        borderRadius: 8, padding: 24, width: 360,
        boxShadow: tk.cardDragShadow,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: tk.textPrimary, marginBottom: 8, fontFamily: 'var(--cp-font-heading)' }}>
          Delete column
        </div>
        <div style={{ fontSize: 13, color: tk.textSecondary, marginBottom: 16, fontFamily: 'var(--cp-font-body)' }}>
          Are you sure you want to delete <strong>{columnName}</strong>? Mapped statuses will be moved to Unmapped.
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            style={{
              height: 32, padding: '0 12px', borderRadius: 6,
              border: `1px solid ${tk.border}`, background: 'transparent',
              color: tk.textSecondary, fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--cp-font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 32, padding: '0 12px', borderRadius: 6,
              border: 'none', background: '#E5493A', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--cp-font-body)',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function MapStatusesPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const tk = isDark ? KANBAN_TOKENS.dark : KANBAN_TOKENS.light;

  const {
    draft, countsMap, loading, saving, saveError, hasChanges,
    moveStatus, reorderColumns, addColumn, renameColumn, deleteColumn,
    save, cancel,
  } = useMapStatuses(key);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [dragStatusId, setDragStatusId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DraftColumn | null>(null);

  // Unsaved changes guard
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  const handleBack = useCallback(() => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    navigate(`/project-hub/${key}/boards`);
  }, [hasChanges, navigate, key]);

  // DnD handlers
  const findDropTarget = useCallback((overId: string | null): { bucket: 'column' | 'backlog' | 'unmapped'; columnId: string | null } | null => {
    if (!overId || !draft) return null;
    // Check if over a column card
    if (typeof overId === 'string' && overId.startsWith('col-')) {
      return { bucket: 'column', columnId: overId.replace('col-', '') };
    }
    // Check if over a status in a column
    const mapping = draft.mappings.find(m => m.statusId === overId);
    if (mapping) {
      return { bucket: mapping.bucketType, columnId: mapping.columnId };
    }
    return null;
  }, [draft]);

  const onDragStart = useCallback((e: DragStartEvent) => {
    const id = String(e.active.id);
    if (!id.startsWith('col-')) {
      setDragStatusId(id);
    }
  }, []);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    setDragStatusId(null);
    if (!e.over || !draft) return;

    const activeId = String(e.active.id);
    const overId = String(e.over.id);

    // Column reorder
    if (activeId.startsWith('col-') && overId.startsWith('col-')) {
      const fromColId = activeId.replace('col-', '');
      const toColId = overId.replace('col-', '');
      const activeCols = draft.columns.filter(c => !c.isDeleted);
      const fromIdx = activeCols.findIndex(c => c.id === fromColId);
      const toIdx = activeCols.findIndex(c => c.id === toColId);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        reorderColumns(fromIdx, toIdx);
      }
      return;
    }

    // Status drag
    if (!activeId.startsWith('col-')) {
      // Determine target bucket
      let target: { bucket: 'column' | 'backlog' | 'unmapped'; columnId: string | null } | null = null;

      if (overId.startsWith('col-')) {
        target = { bucket: 'column', columnId: overId.replace('col-', '') };
      } else {
        // Over another status — find its bucket
        const overMapping = draft.mappings.find(m => m.statusId === overId);
        if (overMapping) {
          target = { bucket: overMapping.bucketType, columnId: overMapping.columnId };
        }
      }

      // Check if dropped on a bucket panel via DOM
      const overEl = document.querySelector(`[data-bucket="unmapped"]`);
      const overEl2 = document.querySelector(`[data-bucket="backlog"]`);
      if (!target) {
        // Fallback: check if the element is inside a bucket
        const node = e.over?.id ? document.querySelector(`[data-column-id]`) : null;
      }

      if (target) {
        moveStatus(activeId, target.bucket, target.columnId);
      }
    }
  }, [draft, moveStatus, reorderColumns]);

  const onDragOver = useCallback((e: DragOverEvent) => {
    if (!e.over || !draft) return;
    const activeId = String(e.active.id);
    const overId = String(e.over.id);

    if (activeId.startsWith('col-')) return; // Column reorder handled in onDragEnd

    // Status moving between containers
    const activeMapping = draft.mappings.find(m => m.statusId === activeId);
    if (!activeMapping) return;

    let targetBucket: 'column' | 'backlog' | 'unmapped' = activeMapping.bucketType;
    let targetColumnId: string | null = activeMapping.columnId;

    if (overId.startsWith('col-')) {
      targetBucket = 'column';
      targetColumnId = overId.replace('col-', '');
    } else {
      const overMapping = draft.mappings.find(m => m.statusId === overId);
      if (overMapping) {
        targetBucket = overMapping.bucketType;
        targetColumnId = overMapping.columnId;
      }
    }

    if (targetBucket !== activeMapping.bucketType || targetColumnId !== activeMapping.columnId) {
      moveStatus(activeId, targetBucket, targetColumnId);
    }
  }, [draft, moveStatus]);

  const dragMapping = dragStatusId ? draft?.mappings.find(m => m.statusId === dragStatusId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100%', background: tk.pageBg }}>
        <div style={{ fontSize: 13, color: tk.textMuted }}>Loading status mappings…</div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100%', background: tk.pageBg }}>
        <div style={{ fontSize: 13, color: tk.textMuted }}>No board configuration found</div>
      </div>
    );
  }

  const activeCols = draft.columns.filter(c => !c.isDeleted);
  const unmapped = draft.mappings.filter(m => m.bucketType === 'unmapped');
  const backlog = draft.mappings.filter(m => m.bucketType === 'backlog');

  return (
    <div className="flex flex-col" style={{ height: '100%', background: tk.pageBg }}>
      {/* Page header */}
      <div className="flex items-center justify-between px-6" style={{
        height: 52, borderBottom: `1px solid ${tk.border}`, background: tk.surfaceBg, flexShrink: 0,
      }}>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: tk.textSecondary, fontSize: 13, fontFamily: 'var(--cp-font-body)',
            }}
          >
            <ArrowLeft size={16} />
            Back to board
          </button>
          <div style={{ width: 1, height: 20, background: tk.border }} />
          <span style={{
            fontSize: 15, fontWeight: 600, color: tk.textPrimary,
            fontFamily: 'var(--cp-font-heading)',
          }}>
            Map statuses
          </span>
          {hasChanges && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#DE350B',
              background: '#FFEBE6', borderRadius: 3, padding: '2px 8px',
            }}>
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveError && (
            <span style={{ fontSize: 12, color: '#DE350B' }}>{saveError}</span>
          )}
          <button
            onClick={() => { cancel(); }}
            disabled={!hasChanges || saving}
            style={{
              height: 32, padding: '0 14px', borderRadius: 6,
              border: `1px solid ${tk.border}`, background: 'transparent',
              color: hasChanges ? tk.textSecondary : tk.textDisabled,
              fontSize: 13, fontWeight: 500, cursor: hasChanges ? 'pointer' : 'default',
              fontFamily: 'var(--cp-font-body)',
              opacity: hasChanges ? 1 : 0.5,
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!hasChanges || saving}
            style={{
              height: 32, padding: '0 14px', borderRadius: 6,
              border: 'none', background: hasChanges ? '#2563EB' : tk.chipBg,
              color: hasChanges ? '#FFFFFF' : tk.textDisabled,
              fontSize: 13, fontWeight: 600, cursor: hasChanges ? 'pointer' : 'default',
              fontFamily: 'var(--cp-font-body)',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-auto" style={{ padding: 24 }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 items-start" style={{ minWidth: 'fit-content' }}>
            {/* Left rail — Unmapped + Backlog */}
            <div className="flex flex-col gap-4" style={{ flexShrink: 0 }}>
              <BucketPanel title="Unmapped statuses" bucketType="unmapped" mappings={unmapped} countsMap={countsMap} tk={tk} />
              <BucketPanel title="Kanban backlog" bucketType="backlog" mappings={backlog} countsMap={countsMap} tk={tk} />
            </div>

            {/* Column cards */}
            <SortableContext items={activeCols.map(c => `col-${c.id}`)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-4 items-start">
                {activeCols.map(col => {
                  const colMappings = draft.mappings.filter(m => m.bucketType === 'column' && m.columnId === col.id);
                  return (
                    <ColumnCard
                      key={col.id}
                      column={col}
                      mappings={colMappings}
                      countsMap={countsMap}
                      tk={tk}
                      onRename={renameColumn}
                      onDelete={id => {
                        const c = activeCols.find(x => x.id === id);
                        if (c) setDeleteTarget(c);
                      }}
                    />
                  );
                })}

                <AddColumnBtn tk={tk} onAdd={addColumn} />
              </div>
            </SortableContext>
          </div>

          <DragOverlay dropAnimation={null}>
            {dragMapping ? <OverlayPill name={dragMapping.statusName} tk={tk} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteConfirm
          columnName={deleteTarget.name}
          tk={tk}
          onConfirm={() => { deleteColumn(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
