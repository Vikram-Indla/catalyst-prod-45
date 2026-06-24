import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProjects } from '@/hooks/test-management/useProjects';
import {
  useFolderTree,
  useFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from '@/hooks/test-management/useFolders';
import {
  useTestCases,
  useDeleteTestCase,
  useBulkArchiveTestCases,
  useBulkCopyTestCases,
  useBulkUpdateTestCases,
  useBulkDeleteTestCases,
  useCreateCaseVersion,
} from '@/hooks/test-management/useTestCases';
import { supabase } from '@/integrations/supabase/client';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Folder,
  FolderOpen,
  Search,
  Trash2,
  MoreHorizontal,
  Edit2,
} from '@/lib/atlaskit-icons';
import { TMFolder, TMTestCase, CaseStatus, TMCasePriority, CaseFilters } from '@/types/test-management';
import { CaseDrawer } from './CaseDrawer';

// ── Folder Modal ──────────────────────────────────────────────────────────────

function FolderModal({
  projectId,
  folders,
  initialParentId,
  onClose,
  saving,
  onSave,
}: {
  projectId: string;
  folders: TMFolder[];
  initialParentId: string | null;
  onClose: () => void;
  saving: boolean;
  onSave: (name: string, parentId: string | null) => void;
}) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, [onClose]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), parentId);
  };

  const flat = flattenFolders(folders);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, background: 'var(--ds-shadow-raised, rgba(9,30,66,0.54))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        borderRadius: 8,
        width: 400,
        padding: '24px',
        boxShadow: '0 8px 32px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          Add new folder
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', marginBottom: 4 }}>
            Parent folder
          </label>
          <select
            value={parentId ?? ''}
            onChange={e => setParentId(e.target.value || null)}
            style={{
              width: '100%', padding: '6px 8px', fontSize: 14, borderRadius: 4,
              border: '2px solid var(--ds-border, #DFE1E6)',
              background: 'var(--ds-surface, #FFFFFF)',
              color: 'var(--ds-text, #172B4D)',
              outline: 'none',
            }}
          >
            <option value="">All</option>
            {flat.map(f => (
              <option key={f.id} value={f.id}>{f.indent}{f.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', marginBottom: 4 }}>
            Folder name <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
          </label>
          <input
            ref={nameRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            placeholder="Enter folder name"
            style={{
              width: '100%', padding: '6px 8px', fontSize: 14, borderRadius: 4,
              border: '2px solid var(--ds-border-focused, #4C9AFF)',
              background: 'var(--ds-surface, #FFFFFF)',
              color: 'var(--ds-text, #172B4D)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px', fontSize: 13, fontWeight: 500, borderRadius: 4,
              border: '2px solid var(--ds-border, #DFE1E6)',
              background: 'var(--ds-surface, #FFFFFF)',
              color: 'var(--ds-text, #172B4D)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{
              padding: '6px 16px', fontSize: 13, fontWeight: 500, borderRadius: 4,
              border: 'none',
              background: !name.trim() || saving ? 'var(--ds-background-disabled, #F1F2F4)' : 'var(--ds-background-brand-bold, #0052CC)',
              color: !name.trim() || saving ? 'var(--ds-text-disabled, #A5ADBA)' : 'var(--ds-text-inverse, #FFFFFF)',
              cursor: !name.trim() || saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Ok'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Rename Folder Modal ───────────────────────────────────────────────────────

function RenameFolderModal({
  folder,
  onClose,
  saving,
  onSave,
}: {
  folder: TMFolder;
  onClose: () => void;
  saving: boolean;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, [onClose]);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, background: 'var(--ds-shadow-raised, rgba(9,30,66,0.54))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        borderRadius: 8, width: 360, padding: '24px',
        boxShadow: '0 8px 32px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          Rename folder
        </h2>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
          style={{
            width: '100%', padding: '6px 8px', fontSize: 14, borderRadius: 4,
            border: '2px solid var(--ds-border-focused, #4C9AFF)',
            background: 'var(--ds-surface, #FFFFFF)',
            color: 'var(--ds-text, #172B4D)',
            outline: 'none', boxSizing: 'border-box', marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button
            onClick={() => { if (name.trim()) onSave(name.trim()); }}
            disabled={!name.trim() || saving}
            style={{
              padding: '6px 16px', fontSize: 13, fontWeight: 500, borderRadius: 4,
              border: 'none',
              background: !name.trim() || saving ? 'var(--ds-background-disabled, #F1F2F4)' : 'var(--ds-background-brand-bold, #0052CC)',
              color: !name.trim() || saving ? 'var(--ds-text-disabled, #A5ADBA)' : 'var(--ds-text-inverse, #FFFFFF)',
              cursor: !name.trim() || saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Portal Folder Context Menu ────────────────────────────────────────────────

function FolderContextMenu({
  triggerRef,
  onNewSubfolder,
  onRename,
  onDelete,
  onClose,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onNewSubfolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) &&
          !triggerRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose, triggerRef]);

  if (!triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: rect.bottom + 2,
        left: rect.left,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.18))',
        minWidth: 160,
        zIndex: 9999,
        padding: '4px 0',
      }}
    >
      {([
        { label: 'New subfolder', action: onNewSubfolder },
        { label: 'Rename', action: onRename },
        { label: 'Delete', action: onDelete, danger: true },
      ] as { label: string; action: () => void; danger?: boolean }[]).map(item => (
        <button
          key={item.label}
          role="menuitem"
          onClick={() => { item.action(); onClose(); }}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '7px 16px', fontSize: 13, border: 'none',
            background: 'transparent', cursor: 'pointer',
            color: item.danger ? 'var(--ds-text-danger, #AE2A19)' : 'var(--ds-text, #172B4D)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle, #F7F8F9)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
}

// ── Helper: flatten folder tree for dropdown ──────────────────────────────────

function flattenFolders(folders: TMFolder[], depth = 0): Array<{ id: string; name: string; indent: string }> {
  const result: Array<{ id: string; name: string; indent: string }> = [];
  for (const f of folders) {
    result.push({ id: f.id, name: f.name, indent: '  '.repeat(depth) });
    if (f.children?.length) {
      result.push(...flattenFolders(f.children, depth + 1));
    }
  }
  return result;
}

// ── Archive Confirmation Modal ────────────────────────────────────────────────

function ArchiveModal({ count, onConfirm, onClose, saving }: {
  count: number; onConfirm: () => void; onClose: () => void; saving: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, [onClose]);

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--ds-shadow-raised, rgba(9,30,66,0.54))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        borderRadius: 8, width: 400, padding: 24,
        boxShadow: '0 8px 32px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          Archive {count} case{count > 1 ? 's' : ''}?
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--ds-text-subtle, #42526E)' }}>
          Archived cases are hidden from the repository but can be restored later.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={saving}
            style={{
              padding: '6px 16px', fontSize: 13, fontWeight: 500, borderRadius: 4,
              border: 'none',
              background: saving ? 'var(--ds-background-disabled, #F1F2F4)' : 'var(--ds-background-warning-bold, #0052CC)',
              color: saving ? 'var(--ds-text-disabled, #A5ADBA)' : 'var(--ds-text-inverse, #FFFFFF)',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Copy Cases Modal ──────────────────────────────────────────────────────────

function CopyModal({ count, folders, onConfirm, onClose, saving }: {
  count: number;
  folders: TMFolder[];
  onConfirm: (targetFolderId: string | null, addSuffix: boolean) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [targetFolderId, setTargetFolderId] = useState<string>('');
  const [addSuffix, setAddSuffix] = useState(true);
  const flat = flattenFolders(folders);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, [onClose]);

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--ds-shadow-raised, rgba(9,30,66,0.54))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        borderRadius: 8, width: 440, padding: 24,
        boxShadow: '0 8px 32px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          Copy {count} case{count > 1 ? 's' : ''}
        </h2>

        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)' }}>
          Target folder
        </label>
        <select
          value={targetFolderId}
          onChange={e => setTargetFolderId(e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 4,
            border: '1px solid var(--ds-border, #DFE1E6)',
            background: 'var(--ds-surface, #FFFFFF)',
            color: 'var(--ds-text, #172B4D)',
            marginBottom: 16, boxSizing: 'border-box',
          }}
        >
          <option value="">Same folder</option>
          {flat.map(f => (
            <option key={f.id} value={f.id}>{f.indent}{f.name}</option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 20 }}>
          <input
            type="checkbox"
            checked={addSuffix}
            onChange={e => setAddSuffix(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>Add "(Copy)" suffix to titles</span>
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button
            onClick={() => onConfirm(targetFolderId || null, addSuffix)}
            disabled={saving}
            style={{
              padding: '6px 16px', fontSize: 13, fontWeight: 500, borderRadius: 4,
              border: 'none',
              background: saving ? 'var(--ds-background-disabled, #F1F2F4)' : 'var(--ds-background-brand-bold, #0052CC)',
              color: saving ? 'var(--ds-text-disabled, #A5ADBA)' : 'var(--ds-text-inverse, #FFFFFF)',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Copying…' : 'Copy'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Bulk Dropdown (portal, same pattern as FolderContextMenu) ─────────────────

function BulkDropdown({ triggerRef, onArchive, onCopy, onClose }: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onArchive: () => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) &&
          !triggerRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [onClose, triggerRef]);

  if (!triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();

  const itemStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left',
    border: 'none', background: 'none', cursor: 'pointer',
    fontSize: 13, color: 'var(--ds-text, #172B4D)',
  };

  return createPortal(
    <div ref={menuRef} role="menu" style={{
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      background: 'var(--ds-surface-overlay, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)',
      borderRadius: 6,
      boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
      padding: '4px 0',
      minWidth: 160,
      zIndex: 9999,
    }}>
      <button role="menuitem" style={itemStyle}
        onClick={() => { onClose(); onCopy(); }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle, rgba(9,30,66,0.04))'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
        Copy cases
      </button>
      <button role="menuitem" style={{ ...itemStyle, color: 'var(--ds-text-warning, #974F0C)' }}
        onClick={() => { onClose(); onArchive(); }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle, rgba(9,30,66,0.04))'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
        Archive cases
      </button>
    </div>,
    document.body
  );
}

// ── Change Status Dropdown (portal) ──────────────────────────────────────────

const CASE_STATUSES: { label: string; value: string }[] = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Review', value: 'REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Deprecated', value: 'DEPRECATED' },
];

function StatusDropdown({ triggerRef, onSelect, onClose }: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (status: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [onClose, triggerRef]);

  if (!triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  const itemStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left',
    border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
    color: 'var(--ds-text, #172B4D)',
  };
  return createPortal(
    <div ref={menuRef} role="menu" style={{
      position: 'fixed', top: rect.bottom + 4, left: rect.left,
      background: 'var(--ds-surface-overlay, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)',
      borderRadius: 6, boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
      padding: '4px 0', minWidth: 140, zIndex: 9999,
    }}>
      {CASE_STATUSES.map(s => (
        <button key={s.value} role="menuitem" style={itemStyle}
          onClick={() => { onSelect(s.value); onClose(); }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle, rgba(9,30,66,0.04))'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
          {s.label}
        </button>
      ))}
    </div>,
    document.body
  );
}

// ── Change Priority Dropdown (portal) ─────────────────────────────────────────

function PriorityDropdown({ triggerRef, priorities, onSelect, onClose }: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  priorities: TMCasePriority[];
  onSelect: (priorityId: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [onClose, triggerRef]);

  if (!triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  const itemStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left',
    border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
    color: 'var(--ds-text, #172B4D)',
  };
  return createPortal(
    <div ref={menuRef} role="menu" style={{
      position: 'fixed', top: rect.bottom + 4, left: rect.left,
      background: 'var(--ds-surface-overlay, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)',
      borderRadius: 6, boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
      padding: '4px 0', minWidth: 140, zIndex: 9999,
    }}>
      {priorities.length === 0 ? (
        <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)' }}>No priorities</div>
      ) : priorities.map(p => (
        <button key={p.id} role="menuitem" style={itemStyle}
          onClick={() => { onSelect(p.id); onClose(); }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle, rgba(9,30,66,0.04))'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {p.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />}
            {p.name}
          </span>
        </button>
      ))}
    </div>,
    document.body
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RepositoryPage() {
  const navigate = useNavigate();
  const { projectKey = 'BAU' } = useParams<{ projectKey: string }>();
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'unfiled'>(null);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TMTestCase | null>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const bulkBtnRef = useRef<HTMLButtonElement | null>(null);

  // Bulk modal state
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);

  // Bulk status/priority dropdown state
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const [priorityDropOpen, setPriorityDropOpen] = useState(false);
  const statusBtnRef = useRef<HTMLButtonElement | null>(null);
  const priorityBtnRef = useRef<HTMLButtonElement | null>(null);

  // Folder modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalParentId, setFolderModalParentId] = useState<string | null>(null);

  const createFolder = useCreateFolder();
  const { data: allFolders = [] } = useFolderTree(projectId);
  const archiveCases = useBulkArchiveTestCases();
  const copyCases = useBulkCopyTestCases();

  const openFolderModal = (parentId: string | null = null) => {
    setFolderModalParentId(parentId);
    setFolderModalOpen(true);
  };

  const handleCreateFolder = (name: string, parentId: string | null) => {
    if (!projectId) return;
    createFolder.mutate(
      { project_id: projectId, name, parent_id: parentId },
      { onSuccess: () => setFolderModalOpen(false) }
    );
  };

  const filters: CaseFilters = {
    folder_id: selectedFolderId === 'unfiled' ? 'unfiled' : (selectedFolderId ?? undefined),
    search: search || undefined,
  };

  const { data: casesResult, isLoading: casesLoading } = useTestCases(projectId, filters);
  const cases = casesResult?.cases ?? [];

  const { data: priorities = [] } = useQuery({
    queryKey: ['tm-priorities', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from('tm_case_priorities')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      return (data ?? []) as TMCasePriority[];
    },
    enabled: !!projectId,
  });

  const priorityMap = Object.fromEntries(
    (priorities as TMCasePriority[]).map(p => [p.id, p])
  );

  const deleteCase = useDeleteTestCase();

  const activeFolderId =
    selectedFolderId === null || selectedFolderId === 'unfiled'
      ? null
      : selectedFolderId;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === cases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cases.map(c => c.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleArchiveConfirm = () => {
    if (!projectId) return;
    archiveCases.mutate(
      { case_ids: Array.from(selectedIds), project_id: projectId },
      { onSuccess: () => { setArchiveModalOpen(false); exitSelectMode(); } }
    );
  };

  const handleCopyConfirm = (targetFolderId: string | null, _addSuffix: boolean) => {
    if (!projectId) return;
    copyCases.mutate(
      { case_ids: Array.from(selectedIds), folder_id: targetFolderId, project_id: projectId },
      { onSuccess: () => { setCopyModalOpen(false); exitSelectMode(); } }
    );
  };

  const createCaseButton = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        onClick={() => { setSelectMode(s => !s); setSelectedIds(new Set()); }}
        title={selectMode ? 'Exit select mode' : 'Select multiple'}
        style={{
          padding: '6px 10px', background: selectMode ? 'var(--ds-background-selected, #E9F2FE)' : 'var(--ds-surface, #FFFFFF)',
          color: selectMode ? 'var(--ds-text-selected, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <Edit2 size={13} />
        {selectMode ? 'Cancel' : 'Select'}
      </button>
      <button
        onClick={() => { setEditingCase(null); setDrawerOpen(true); }}
        style={{
          padding: '6px 12px',
          background: 'var(--ds-background-brand-bold, #0052CC)',
          color: 'var(--ds-text-inverse, #FFFFFF)', border: 'none', borderRadius: 4,
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <Plus size={14} />
        Create case
      </button>
    </div>
  );

  return (
    <>
      {/* Bulk action bar (visible when items selected) */}
      {selectMode && selectedIds.size > 0 && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--ds-background-information, #DEEBFF)',
          borderBottom: '1px solid var(--ds-border-information, #4C9AFF)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-information, #0747A6)' }}>
            {selectedIds.size} selected
          </span>
          <button
            ref={bulkBtnRef}
            onClick={() => setBulkMenuOpen(o => !o)}
            style={{
              padding: '5px 12px', fontSize: 13, fontWeight: 500, borderRadius: 4,
              border: '1px solid var(--ds-border, #DFE1E6)',
              background: 'var(--ds-surface, #FFFFFF)',
              color: 'var(--ds-text, #172B4D)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            Bulk <MoreHorizontal size={13} />
          </button>
          {bulkMenuOpen && (
            <BulkDropdown
              triggerRef={bulkBtnRef}
              onArchive={() => setArchiveModalOpen(true)}
              onCopy={() => setCopyModalOpen(true)}
              onClose={() => setBulkMenuOpen(false)}
            />
          )}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: folder tree */}
        <div style={{
          width: 240, minWidth: 240,
          borderRight: '1px solid var(--ds-border, #DFE1E6)',
          background: 'var(--ds-surface-sunken, #F7F8F9)',
          overflowY: 'auto', padding: '12px 0',
        }}>
          <div style={{
            padding: '0 12px', marginBottom: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--ds-text-subtlest, #6B778C)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Folders
            </span>
            <button
              onClick={() => openFolderModal(null)}
              title="Add new folder"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ds-text-subtlest, #6B778C)',
                padding: 2, display: 'flex', alignItems: 'center',
              }}
            >
              <Plus size={13} />
            </button>
          </div>

          <SystemFolderItem
            label="All"
            selected={selectedFolderId === null}
            onClick={() => setSelectedFolderId(null)}
          />
          <SystemFolderItem
            label="Not Assigned"
            selected={selectedFolderId === 'unfiled'}
            onClick={() => setSelectedFolderId('unfiled')}
          />
          <FolderTreeView
            projectId={projectId}
            selectedId={selectedFolderId as string | null}
            onSelect={id => setSelectedFolderId(id)}
            onNewSubfolder={openFolderModal}
          />
        </div>

        {/* Right: case list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--ds-border, #DFE1E6)',
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--ds-surface, #FFFFFF)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 320 }}>
              <Search size={14} style={{ color: 'var(--ds-text-subtlest, #6B778C)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search cases..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, border: '1px solid var(--ds-border, #DFE1E6)',
                  borderRadius: 4, padding: '4px 8px', fontSize: 13,
                  background: 'var(--ds-surface, #FFFFFF)',
                  color: 'var(--ds-text, #172B4D)', outline: 'none',
                }}
              />
            </div>
            <span style={{ fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)', marginLeft: 'auto' }}>
              {casesResult?.total ?? 0} cases
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--ds-surface, #FFFFFF)' }}>
            {casesLoading ? (
              <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
                <Spinner size="large" />
              </div>
            ) : cases.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>
                No test cases found
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                    position: 'sticky', top: 0,
                    background: 'var(--ds-surface-sunken, #F7F8F9)', zIndex: 1,
                  }}>
                    {selectMode && (
                      <th style={{ ...thStyle, width: 40 }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.size === cases.length && cases.length > 0}
                          onChange={toggleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                    )}
                    <th style={thStyle}>Key</th>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Priority</th>
                    {!selectMode && <th style={{ ...thStyle, width: 48 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => {
                    const isSelected = selectedIds.has(c.id);
                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                        }}
                        onClick={() => {
                          if (selectMode) { toggleSelect(c.id); return; }
                          setEditingCase(c); setDrawerOpen(true);
                        }}
                        onMouseEnter={e => {
                          if (!isSelected)
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
                        }}
                        onMouseLeave={e => {
                          if (!isSelected)
                            (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                        }}
                      >
                        {selectMode && (
                          <td style={{ ...tdStyle, width: 40 }} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(c.id)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                        )}
                        <td style={{
                          ...tdStyle,
                          fontFamily: 'var(--ds-font-family-code)',
                          color: 'var(--ds-text-subtlest, #6B778C)',
                          fontSize: 12, whiteSpace: 'nowrap',
                        }}>
                          {c.key ?? '—'}
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--ds-text, #172B4D)', fontWeight: 500 }}>
                          {c.title}
                        </td>
                        <td style={tdStyle}><CaseStatusPill status={c.status} /></td>
                        <td style={tdStyle}>
                          {c.priority_ref ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: c.priority_ref.color ?? 'var(--ds-background-neutral, #F1F2F4)',
                                flexShrink: 0,
                              }} />
                              {c.priority_ref.name}
                            </span>
                          ) : c.priority_id && priorityMap[c.priority_id] ? (
                            <PriorityChip priority={priorityMap[c.priority_id]} />
                          ) : (
                            <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>—</span>
                          )}
                        </td>
                        {!selectMode && (
                          <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => { if (projectId) deleteCase.mutate({ id: c.id, project_id: projectId }); }}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--ds-text-subtlest, #6B778C)',
                                padding: 4, display: 'flex', alignItems: 'center',
                              }}
                              title="Delete case"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {drawerOpen && projectId && (
          <CaseDrawer
            projectId={projectId}
            folderId={activeFolderId}
            existingCase={editingCase}
            onClose={() => { setDrawerOpen(false); setEditingCase(null); }}
          />
        )}
      </div>

      {/* Folder creation modal */}
      {folderModalOpen && projectId && (
        <FolderModal
          projectId={projectId}
          folders={allFolders}
          initialParentId={folderModalParentId}
          onClose={() => setFolderModalOpen(false)}
          saving={createFolder.isPending}
          onSave={handleCreateFolder}
        />
      )}

      {/* Archive modal */}
      {archiveModalOpen && (
        <ArchiveModal
          count={selectedIds.size}
          onConfirm={handleArchiveConfirm}
          onClose={() => setArchiveModalOpen(false)}
          saving={archiveCases.isPending}
        />
      )}

      {/* Copy modal */}
      {copyModalOpen && (
        <CopyModal
          count={selectedIds.size}
          folders={allFolders}
          onConfirm={handleCopyConfirm}
          onClose={() => setCopyModalOpen(false)}
          saving={copyCases.isPending}
        />
      )}
    </>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left',
  fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)',
};

const tdStyle: React.CSSProperties = { padding: '10px 12px' };

const cancelBtnStyle: React.CSSProperties = {
  padding: '6px 14px', fontSize: 13, fontWeight: 500, borderRadius: 4,
  border: '2px solid var(--ds-border, #DFE1E6)',
  background: 'var(--ds-surface, #FFFFFF)',
  color: 'var(--ds-text, #172B4D)', cursor: 'pointer',
};

// ── System folder item (All / Not Assigned) ───────────────────────────────────

function SystemFolderItem({ label, selected, onClick }: {
  label: string; selected: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '6px 12px 6px 12px', cursor: 'pointer',
        background: selected ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
        color: selected ? 'var(--ds-text-selected, #0052CC)' : 'var(--ds-text, #172B4D)',
        fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle, rgba(9,30,66,0.04))'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {selected ? <FolderOpen size={14} /> : <Folder size={14} />}
      {label}
    </div>
  );
}

// ── Folder tree view ──────────────────────────────────────────────────────────

function FolderTreeView({
  projectId, selectedId, onSelect, onNewSubfolder,
}: {
  projectId: string | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewSubfolder: (parentId: string) => void;
}) {
  const { data: tree = [], isLoading } = useFolderTree(projectId);
  if (isLoading) return <div style={{ padding: 8 }}><Spinner size="small" /></div>;
  if (tree.length === 0) return null;
  return (
    <>
      {tree.map(f => (
        <FolderNode
          key={f.id}
          folder={f}
          selectedId={selectedId}
          onSelect={onSelect}
          onNewSubfolder={onNewSubfolder}
          indent={0}
          projectId={projectId}
        />
      ))}
    </>
  );
}

// ── Folder node with context menu ─────────────────────────────────────────────

function FolderNode({
  folder, selectedId, onSelect, onNewSubfolder, indent, projectId,
}: {
  folder: TMFolder;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewSubfolder: (parentId: string) => void;
  indent: number;
  projectId: string | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const hasChildren = (folder.children?.length ?? 0) > 0;
  const isSelected = selectedId === folder.id;

  const handleRename = (name: string) => {
    if (!projectId) return;
    updateFolder.mutate(
      { id: folder.id, project_id: projectId, name },
      { onSuccess: () => setRenaming(false) }
    );
  };

  const handleDelete = () => {
    if (!projectId) return;
    deleteFolder.mutate({ id: folder.id, project_id: projectId });
  };

  return (
    <>
      <div
        style={{
          padding: `6px 8px 6px ${12 + indent * 16}px`, cursor: 'pointer',
          background: isSelected ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
          color: isSelected ? 'var(--ds-text-selected, #0052CC)' : 'var(--ds-text, #172B4D)',
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
          position: 'relative',
        }}
        onClick={() => onSelect(folder.id)}
        onMouseEnter={e => {
          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle, rgba(9,30,66,0.04))';
          const btn = (e.currentTarget as HTMLElement).querySelector('.folder-menu-btn') as HTMLElement;
          if (btn) btn.style.opacity = '1';
        }}
        onMouseLeave={e => {
          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
          if (!menuOpen) {
            const btn = (e.currentTarget as HTMLElement).querySelector('.folder-menu-btn') as HTMLElement;
            if (btn) btn.style.opacity = '0';
          }
        }}
      >
        {/* Expand chevron */}
        {hasChildren ? (
          <span
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span style={{ width: 12, flexShrink: 0 }} />
        )}

        <Folder size={14} style={{ flexShrink: 0 }} />

        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {folder.name}
        </span>

        {/* Ellipsis menu button */}
        <button
          ref={menuBtnRef}
          className="folder-menu-btn"
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ds-text-subtlest, #6B778C)',
            padding: 2, display: 'flex', alignItems: 'center',
            borderRadius: 3, flexShrink: 0, opacity: menuOpen ? 1 : 0,
            transition: 'opacity 0.1s',
          }}
          title="Folder options"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Context menu */}
      {menuOpen && (
        <FolderContextMenu
          triggerRef={menuBtnRef}
          onClose={() => setMenuOpen(false)}
          onNewSubfolder={() => { onNewSubfolder(folder.id); }}
          onRename={() => setRenaming(true)}
          onDelete={handleDelete}
        />
      )}

      {/* Rename modal */}
      {renaming && (
        <RenameFolderModal
          folder={folder}
          onClose={() => setRenaming(false)}
          saving={updateFolder.isPending}
          onSave={handleRename}
        />
      )}

      {/* Children */}
      {expanded && hasChildren && (folder.children ?? []).map(child => (
        <FolderNode
          key={child.id}
          folder={child}
          selectedId={selectedId}
          onSelect={onSelect}
          onNewSubfolder={onNewSubfolder}
          indent={indent + 1}
          projectId={projectId}
        />
      ))}
    </>
  );
}

// ── Status / Priority pills ───────────────────────────────────────────────────

function CaseStatusPill({ status }: { status: CaseStatus }) {
  const map: Record<CaseStatus, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    APPROVED:   { appearance: 'success',   label: 'Approved' },
    REVIEW:     { appearance: 'moved',     label: 'Review' },
    DEPRECATED: { appearance: 'removed',   label: 'Deprecated' },
    DRAFT:      { appearance: 'default',   label: 'Draft' },
  };
  const cfg = map[status] ?? { appearance: 'default' as const, label: status };
  return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
}

function PriorityChip({ priority }: { priority: TMCasePriority }) {
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 12,
      background: 'var(--ds-background-neutral, #F1F2F4)',
      color: 'var(--ds-text-subtle, #42526E)', fontWeight: 500,
    }}>
      {priority.name}
    </span>
  );
}
