/**
 * JiraBulkActionBar — Jira-style fixed bottom floating bar for bulk actions
 * Matches Jira's exact pattern: X | "N work item(s) selected" | Edit | Copy to clipboard | Delete
 */
import { useCallback, useState } from 'react';
import { X, Pencil, Clipboard, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface JiraBulkActionBarProps {
  selectedIds: string[];
  /** Items data for copy-to-clipboard — needs at minimum issue_key + title */
  items?: Array<{ id: string; issue_key?: string; title?: string; summary?: string; status?: string; priority?: string; assignee_name?: string }>;
  onClear: () => void;
  onDelete?: (ids: string[]) => void;
  onEdit?: (ids: string[]) => void;
  /** Table name for generic delete if onDelete not provided */
  tableName?: 'ph_issues' | 'catalyst_issues' | 'ph_requests' | 'tm_defects';
  entityLabel?: string;
}

export function JiraBulkActionBar({
  selectedIds,
  items = [],
  onClear,
  onDelete,
  onEdit,
  tableName,
  entityLabel = 'work item',
}: JiraBulkActionBarProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const count = selectedIds.length;
  const pluralLabel = count === 1 ? entityLabel : `${entityLabel}s`;

  // ── Copy to clipboard ──
  const handleCopy = useCallback(() => {
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    if (selectedItems.length === 0) {
      // Fallback: copy just the IDs
      const text = selectedIds.join('\n');
      navigator.clipboard.writeText(text);
      toast.success(`${count} ${pluralLabel} copied to clipboard`);
      return;
    }

    // Format as TSV (tab-separated) for spreadsheet paste compatibility
    const header = 'Key\tSummary\tStatus\tPriority\tAssignee';
    const rows = selectedItems.map(item => {
      const key = item.issue_key || '—';
      const summary = item.title || item.summary || '—';
      const status = item.status || '—';
      const priority = item.priority || '—';
      const assignee = item.assignee_name || '—';
      return `${key}\t${summary}\t${status}\t${priority}\t${assignee}`;
    });
    const text = [header, ...rows].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${count} ${pluralLabel} copied to clipboard`, {
        description: 'Paste into any spreadsheet or text editor',
        duration: 3000,
      });
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  }, [selectedIds, items, count, pluralLabel]);

  // ── Edit ──
  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(selectedIds);
    } else {
      toast.info('Select items and use inline editing', { duration: 2000 });
    }
  }, [selectedIds, onEdit]);

  // ── Delete ──
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      if (onDelete) {
        onDelete(selectedIds);
      } else if (tableName) {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .in('id', selectedIds);
        if (error) throw error;
        toast.success(`${count} ${pluralLabel} deleted`);
      }
      onClear();
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  }, [deleteConfirm, selectedIds, onDelete, onClear, tableName, count, pluralLabel]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(false);
  }, []);

  if (count === 0) return null;

  const bar = (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]"
      style={{ animation: 'jira-bulk-slide-up 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div
        className="flex items-center gap-0 rounded-lg overflow-hidden"
        style={{
          backgroundColor: '#44546F',
          boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)',
          fontFamily: 'var(--cp-font-body)',
          height: 44,
        }}
        role="toolbar"
        aria-label="Bulk actions"
      >
        {/* Close button */}
        <button
          onClick={onClear}
          className="flex items-center justify-center hover:bg-white/10 transition-colors duration-100"
          style={{ width: 44, height: 44 }}
          aria-label="Clear selection"
        >
          <X size={18} color="#FFFFFF" strokeWidth={2} />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)' }} />

        {/* Selected count */}
        <span
          className="select-none whitespace-nowrap"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#FFFFFF',
            padding: '0 16px',
            letterSpacing: '-0.01em',
          }}
        >
          {count} {pluralLabel} selected
        </span>

        {/* Divider */}
        <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)' }} />

        {/* Edit */}
        <button
          onClick={handleEdit}
          className="flex items-center gap-2 hover:bg-white/10 transition-colors duration-100 whitespace-nowrap"
          style={{ height: 44, padding: '0 14px', color: '#FFFFFF', fontSize: 14, fontWeight: 500 }}
          aria-label="Edit selected items"
        >
          <Pencil size={15} strokeWidth={2} />
          Edit
        </button>

        {/* Copy to clipboard */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 hover:bg-white/10 transition-colors duration-100 whitespace-nowrap"
          style={{ height: 44, padding: '0 14px', color: '#FFFFFF', fontSize: 14, fontWeight: 500 }}
          aria-label="Copy to clipboard"
        >
          <Clipboard size={15} strokeWidth={2} />
          Copy to clipboard
        </button>

        {/* Delete */}
        {deleteConfirm ? (
          <div className="flex items-center gap-1" style={{ padding: '0 8px' }}>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded transition-colors duration-100"
              style={{
                height: 32,
                padding: '0 12px',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                opacity: isDeleting ? 0.6 : 1,
              }}
            >
              <Trash2 size={13} />
              {isDeleting ? 'Deleting...' : `Delete ${count}`}
            </button>
            <button
              onClick={handleCancelDelete}
              className="rounded hover:bg-white/10 transition-colors duration-100"
              style={{ height: 32, padding: '0 10px', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 hover:bg-white/10 transition-colors duration-100 whitespace-nowrap"
            style={{ height: 44, padding: '0 14px', color: '#FFFFFF', fontSize: 14, fontWeight: 500 }}
            aria-label="Delete selected items"
          >
            <Trash2 size={15} strokeWidth={2} />
            Delete
          </button>
        )}
      </div>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes jira-bulk-slide-up {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );

  return createPortal(bar, document.body);
}
