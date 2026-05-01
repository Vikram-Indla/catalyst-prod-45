/**
 * ColumnManager — Show/hide/reorder columns dropdown
 * Catalyst V5 Design System
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, Check } from 'lucide-react';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean; // cannot be hidden
}

interface ColumnManagerProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

// Block D rule 2 (2026-05-01): 8-column canonical aligned with Project
// Backlog. Visible by default: Type · Key · Summary · Status · Comments ·
// Parent · Assignee · Priority. Order matters — this is also the column
// reorder default.
//
// The legacy Catalyst-extra columns (Roadmap, Source, Score, Department,
// Quarter, Kickoff, Target, Progress, EA Review) stay registered so they're
// available via Manage columns, but visible:false on first load. Users who
// had a saved layout in localStorage keep theirs (loadColumns() merges
// new columns conservatively).
//
// Field renames vs. previous header labels:
//   ID    → Key      (initiative_key column id unchanged)
//   Title → Summary  (title column id unchanged)
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  // ── 8-column canonical — visible by default ──
  { id: 'type', label: 'Type', visible: true },
  { id: 'initiative_key', label: 'Key', visible: true, locked: true },
  { id: 'title', label: 'Summary', visible: true, locked: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'comments', label: 'Comments', visible: true },
  { id: 'parent', label: 'Parent', visible: true },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'priority', label: 'Priority', visible: true },

  // ── Optional Catalyst-extras — hidden by default, available via Manage columns ──
  { id: 'roadmap', label: 'Roadmap', visible: false },
  { id: 'source', label: 'Source', visible: false },
  { id: 'score', label: 'Score', visible: false },
  { id: 'department', label: 'Department', visible: false },
  { id: 'quarter', label: 'Quarter', visible: false },
  { id: 'kickoff', label: 'Kickoff', visible: false },
  { id: 'target', label: 'Target', visible: false },
  { id: 'progress', label: 'Progress', visible: false },
  { id: 'ea_review', label: 'EA Review', visible: false },
];

export function ColumnManager({ columns, onChange, anchorRef, isOpen, onClose }: ColumnManagerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [isOpen, onClose, anchorRef]);

  const toggleColumn = useCallback((id: string) => {
    onChange(columns.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  }, [columns, onChange]);

  const handleReset = useCallback(() => {
    onChange(DEFAULT_COLUMNS.map(d => ({ ...d })));
  }, [onChange]);

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...columns];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    onChange(reordered);
    setDragIdx(idx);
  }, [dragIdx, columns, onChange]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  if (!isOpen) return null;

  const anchorRect = anchorRef.current?.getBoundingClientRect();
  if (!anchorRect) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed rounded-lg overflow-hidden bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-border dark:border-gray-700"
      style={{
        top: anchorRect.bottom + 4,
        left: anchorRect.left,
        width: 240,
        maxHeight: 400,
        boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
        zIndex: 500,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border dark:border-gray-700">
        <span className="text-[13px] font-semibold text-foreground">Manage Columns</span>
        <button
          type="button"
          onClick={handleReset}
          className="text-[12px] hover:underline"
          style={{ color: 'var(--cp-blue)' }}
        >
          Reset
        </button>
      </div>

      {/* Column List */}
      <div className="overflow-y-auto" style={{ maxHeight: 350 }}>
        {columns.map((col, idx) => (
          <div
            key={col.id}
            draggable={!col.locked}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className="flex items-center gap-2 px-3 py-1.5 transition-colors cursor-grab border-b border-border dark:border-gray-700/50 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] hover:bg-muted/50 dark:hover:bg-white/5"
            style={{
              opacity: dragIdx === idx ? 0.5 : 1,
            }}
          >
            <GripVertical size={12} className="text-zinc-300 dark:text-gray-600 shrink-0" />
            <button
              type="button"
              onClick={() => !col.locked && toggleColumn(col.id)}
              disabled={col.locked}
              className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
              style={{
                border: col.visible ? '1.5px solid var(--cp-blue)' : '1.5px solid var(--tw-prose-counters, #d4d4d8)',
                background: col.visible ? 'var(--cp-blue)' : 'transparent',
                cursor: col.locked ? 'not-allowed' : 'pointer',
                opacity: col.locked ? 0.5 : 1,
              }}
            >
              {col.visible && <Check size={10} className="text-white" strokeWidth={3} />}
            </button>
            <span className="text-[13px] flex-1 text-foreground">{col.label}</span>
            {col.locked && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted dark:bg-gray-800 text-muted-foreground dark:text-gray-400">
                Required
              </span>
            )}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}
