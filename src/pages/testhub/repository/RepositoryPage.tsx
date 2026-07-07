import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Routes } from '@/lib/routes';
import { useQuery } from '@tanstack/react-query';
import { useTestHubProject } from '@/hooks/test-management/useTestHubProject';
import { Select } from '@/components/ads';
import { WorkItemTypeIcon } from '@/components/icons';
import {
  useFolderTree,
  useFoldersWithCounts,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useMoveFolder,
} from '@/hooks/test-management/useFolders';
// C3 (CAT-TESTHUB-V2): folder drag/drop moves via the canonical DnD infra
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  useTestCases,
  useCreateTestCase,
  useBulkArchiveTestCases,
  useBulkCopyTestCases,
  useMoveTestCase,
} from '@/hooks/test-management/useTestCases';
import { supabase } from '@/integrations/supabase/client';
import { CatyIconCTA } from '@/components/ui/CatyIconCTA';
import { AIGenerateTestCasesDialog } from '@/components/testhub/AIGenerateTestCasesDialog';
import type { GeneratedTestCase } from '@/hooks/test-management/useAIGeneration';
import { catalystToast } from '@/lib/catalystToast';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable, makeKeyCell, makeSummaryCell } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { PanelLeftClose, PanelLeftOpen } from '@/lib/atlaskit-icons';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Folder,
  FolderOpen,
  Search,
  Archive,
  MoreHorizontal,
  Edit2,
} from '@/lib/atlaskit-icons';
import type { TMFolder, TMTestCase, CaseStatus, TMCasePriority, CaseFilters } from '@/types/test-management';
import { formatTestKey } from '@/lib/test-management/formatTestKey';
import { useCaseCoverage } from '@/hooks/test-management/useCaseCoverage';
import type { CoverageVerdict, CaseRunStatus } from '@/hooks/test-management/useCaseCoverage';
// C2 (CAT-TESTHUB-V2): 13-column repository table — type/origin/health/sprint/
// release/designer/updated/open-defects come from the tm_case_table_v2 view.
import { useCaseTableV2 } from '@/hooks/test-management/useCaseTableV2';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { AddToCycleSetSheet } from './AddToCycleSetSheet';
import type { LinkTarget } from './AddToCycleSetSheet';
import { useCaseStatusConfig } from '@/hooks/test-management/useCaseStatusConfig';
// D4 (2026-06-27) — view/edit a case via the canonical CatalystViewBase shell
// (entityKind='test_case'). Router wires query params to detail panel.
import CatalystDetailRouter from '@/components/catalyst-detail-views/CatalystDetailRouter';
// Phase C, Wave 2 — "+ Create case" opens the canonical CreateStoryModal
// (defaultWorkType='Test Case' → tm_test_cases), unifying all TestHub CREATE
// flows through the single canonical modal.
import { CreateStoryModal } from '@/components/workhub/create-story/CreateStoryModal';

// ── Folder modal (ADS modal-dialog) ──────────────────────────────────────────

function FolderModal({
  folders,
  initialParentId,
  onClose,
  saving,
  onSave,
}: {
  folders: TMFolder[];
  initialParentId: string | null;
  onClose: () => void;
  saving: boolean;
  onSave: (name: string, parentId: string | null) => void;
}) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const flat = flattenFolders(folders);

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Add new folder</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Parent folder</label>
          <Select
            options={[{ value: '', label: 'All' }, ...flat.map(f => ({ value: f.id, label: `${f.indent}${f.name}` }))]}
            value={[{ value: '', label: 'All' }, ...flat.map(f => ({ value: f.id, label: `${f.indent}${f.name}` }))].find(o => o.value === (parentId ?? '')) ?? null}
            onChange={opt => setParentId(opt?.value || null)}
            isSearchable
          />
        </div>
        <div>
          <label style={labelStyle}>
            Folder name <span style={{ color: 'var(--ds-text-danger)' }}>*</span>
          </label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim(), parentId); }}
            placeholder="Enter folder name"
            style={inputStyle}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button
          onClick={() => { if (name.trim()) onSave(name.trim(), parentId); }}
          disabled={!name.trim() || saving}
          style={primaryBtnStyle(!name.trim() || saving)}
        >
          {saving ? 'Saving…' : 'Ok'}
        </button>
      </ModalFooter>
    </ModalDialog>
  );
}

// ── Rename folder modal ───────────────────────────────────────────────────────

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

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Rename folder</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
          style={inputStyle}
        />
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button
          onClick={() => { if (name.trim()) onSave(name.trim()); }}
          disabled={!name.trim() || saving}
          style={primaryBtnStyle(!name.trim() || saving)}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </ModalFooter>
    </ModalDialog>
  );
}

// ── Archive confirmation modal ────────────────────────────────────────────────

function ArchiveModal({ count, onConfirm, onClose, saving }: {
  count: number; onConfirm: () => void; onClose: () => void; saving: boolean;
}) {
  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Archive {count} case{count > 1 ? 's' : ''}?</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtle)' }}>
          Archived cases are hidden from the repository but can be restored later.
        </p>
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button
          onClick={onConfirm}
          disabled={saving}
          style={primaryBtnStyle(saving)}
        >
          {saving ? 'Archiving…' : 'Archive'}
        </button>
      </ModalFooter>
    </ModalDialog>
  );
}

// ── Copy cases modal ──────────────────────────────────────────────────────────

function CopyModal({ count, folders, onConfirm, onClose, saving }: {
  count: number;
  folders: TMFolder[];
  onConfirm: (targetFolderId: string | null, addSuffix: boolean) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [targetFolderId, setTargetFolderId] = useState('');
  const [addSuffix, setAddSuffix] = useState(true);
  const flat = flattenFolders(folders);

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Copy {count} case{count > 1 ? 's' : ''}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Target folder</label>
          <Select
            options={[{ value: '', label: 'Same folder' }, ...flat.map(f => ({ value: f.id, label: `${f.indent}${f.name}` }))]}
            value={[{ value: '', label: 'Same folder' }, ...flat.map(f => ({ value: f.id, label: `${f.indent}${f.name}` }))].find(o => o.value === targetFolderId) ?? null}
            onChange={opt => setTargetFolderId(opt?.value ?? '')}
            isSearchable
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={addSuffix}
            onChange={e => setAddSuffix(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>Add "(Copy)" suffix to titles</span>
        </label>
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button
          onClick={() => onConfirm(targetFolderId || null, addSuffix)}
          disabled={saving}
          style={primaryBtnStyle(saving)}
        >
          {saving ? 'Copying…' : 'Copy'}
        </button>
      </ModalFooter>
    </ModalDialog>
  );
}

// ── Move cases modal ──────────────────────────────────────────────────────────
// Journey gap: cases could only be COPIED across folders; useMoveTestCase existed
// with zero consumers. Same folder-picker shape as CopyModal, no suffix option.

function MoveModal({ count, folders, onConfirm, onClose, saving }: {
  count: number;
  folders: TMFolder[];
  onConfirm: (targetFolderId: string | null) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [targetFolderId, setTargetFolderId] = useState('');
  const flat = flattenFolders(folders);
  const options = [{ value: '', label: 'Not assigned (no folder)' }, ...flat.map(f => ({ value: f.id, label: `${f.indent}${f.name}` }))];

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Move {count} case{count > 1 ? 's' : ''}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <label style={labelStyle}>Target folder</label>
        <Select
          options={options}
          value={options.find(o => o.value === targetFolderId) ?? null}
          onChange={opt => setTargetFolderId(opt?.value ?? '')}
          isSearchable
        />
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button
          onClick={() => onConfirm(targetFolderId || null)}
          disabled={saving}
          style={primaryBtnStyle(saving)}
        >
          {saving ? 'Moving…' : 'Move'}
        </button>
      </ModalFooter>
    </ModalDialog>
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

// ── System folder item (All / Not Assigned) ───────────────────────────────────

function SystemFolderItem({ label, selected, onClick }: {
  label: string; selected: boolean; onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      style={{
        padding: '4px 12px', cursor: 'pointer',
        background: selected ? 'var(--ds-background-selected)' : 'transparent',
        color: selected ? 'var(--ds-text-selected)' : 'var(--ds-text)',
        fontSize: 'var(--ds-font-size-300)', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {selected ? <FolderOpen size={14} /> : <Folder size={14} />}
      {label}
    </div>
  );
}

// ── Folder node (with ADS dropdown-menu context menu) ────────────────────────

function FolderNode({
  folder, selectedId, onSelect, onNewSubfolder, indent, projectId, onMove,
}: {
  folder: TMFolder;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewSubfolder: (parentId: string) => void;
  indent: number;
  projectId: string | undefined;
  onMove?: (folderId: string, newParentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // C3: drag state — row highlights while a folder hovers over it
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const hasChildren = (folder.children?.length ?? 0) > 0;
  const isSelected = selectedId === folder.id;
  const rollupCount = (folder as TMFolder & { rollupCount?: number }).rollupCount ?? folder.case_count ?? 0;
  // C3: system folders (project/product roots + Functional/UAT/Regression/
  // Incident/Defect) never move, rename or delete.
  const isSystem = folder.is_system === true;

  React.useEffect(() => {
    const el = rowRef.current;
    if (!el || !onMove) return;
    const cleanups = [
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) => source.data.type === 'tm-folder' && source.data.folderId !== folder.id,
        onDragEnter: () => setIsDraggedOver(true),
        onDragLeave: () => setIsDraggedOver(false),
        onDrop: ({ source }) => {
          setIsDraggedOver(false);
          const sourceId = source.data.folderId as string;
          if (sourceId && sourceId !== folder.id) onMove(sourceId, folder.id);
        },
      }),
    ];
    if (!isSystem) {
      cleanups.push(
        draggable({
          element: el,
          getInitialData: () => ({ type: 'tm-folder', folderId: folder.id }),
        }),
      );
    }
    return combine(...cleanups);
  }, [folder.id, isSystem, onMove]);

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
        ref={rowRef}
        style={{
          padding: `6px 8px 6px ${12 + indent * 16}px`, cursor: 'pointer',
          background: isDraggedOver
            ? 'var(--ds-background-selected)'
            : isSelected ? 'var(--ds-background-selected)' : 'transparent',
          color: isSelected ? 'var(--ds-text-selected)' : 'var(--ds-text)',
          fontSize: 'var(--ds-font-size-300)', display: 'flex', alignItems: 'center', gap: 4,
          position: 'relative',
          outline: isDraggedOver ? '2px solid var(--ds-border-focused)' : 'none',
          outlineOffset: -2,
        }}
        onClick={() => onSelect(folder.id)}
        onMouseEnter={e => {
          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle)';
          const btn = (e.currentTarget as HTMLElement).querySelector('.folder-menu-btn') as HTMLElement;
          if (btn) btn.style.opacity = '1';
        }}
        onMouseLeave={e => {
          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
          const btn = (e.currentTarget as HTMLElement).querySelector('.folder-menu-btn') as HTMLElement;
          if (btn) btn.style.opacity = '0';
        }}
      >
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

        {rollupCount > 0 && (
          <span
            style={{
              flexShrink: 0, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, minWidth: 18, textAlign: 'center',
              padding: '0 6px', borderRadius: 10, marginRight: 0,
              background: 'var(--ds-background-neutral)', color: 'var(--ds-text-subtle)',
            }}
            title={`${rollupCount} case${rollupCount === 1 ? '' : 's'} (incl. subfolders)`}
          >
            {rollupCount}
          </span>
        )}

        <span onClick={e => e.stopPropagation()}>
          <DropdownMenu
            trigger={({ triggerRef, isSelected: _isSelected, testId: _testId, ...props }) => (
              <button
                ref={triggerRef as React.Ref<HTMLButtonElement>}
                className="folder-menu-btn"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ds-text-subtlest)',
                  padding: 0, display: 'flex', alignItems: 'center',
                  borderRadius: 3, flexShrink: 0, opacity: 0,
                  transition: 'opacity 0.1s',
                }}
                title="Folder options"
                {...props}
              >
                <MoreHorizontal size={14} />
              </button>
            )}
            placement="bottom-start"
          >
            <DropdownItemGroup>
              <DropdownItem onClick={() => onNewSubfolder(folder.id)}>New subfolder</DropdownItem>
              {/* C3: system folders are locked — no rename, no delete */}
              {!isSystem && <DropdownItem onClick={() => setRenaming(true)}>Rename</DropdownItem>}
              {!isSystem && <DropdownItem onClick={() => setConfirmingDelete(true)}>Delete</DropdownItem>}
            </DropdownItemGroup>
          </DropdownMenu>
        </span>
      </div>

      {renaming && (
        <RenameFolderModal
          folder={folder}
          onClose={() => setRenaming(false)}
          saving={updateFolder.isPending}
          onSave={handleRename}
        />
      )}

      {confirmingDelete && (
        <ModalDialog onClose={() => setConfirmingDelete(false)}>
          <ModalHeader>
            <ModalTitle appearance="warning">Delete folder?</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: 0, color: 'var(--ds-text)' }}>
              <strong>{folder.name}</strong> will be deleted.
              {rollupCount > 0 && ` Its ${rollupCount} case${rollupCount === 1 ? '' : 's'}`}
              {rollupCount > 0 && hasChildren ? ' and subfolders' : hasChildren ? ' Subfolders' : ''}
              {(rollupCount > 0 || hasChildren) ? ' will move to the parent folder.' : ''}
            </p>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setConfirmingDelete(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px', fontWeight: 500, color: 'var(--ds-text-subtle)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => { handleDelete(); setConfirmingDelete(false); }}
              disabled={deleteFolder.isPending}
              style={{ background: 'var(--ds-background-danger-bold)', color: 'var(--ds-text-inverse)', border: 'none', borderRadius: 3, cursor: 'pointer', padding: '4px 14px', fontWeight: 600 }}
            >
              {deleteFolder.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </ModalFooter>
        </ModalDialog>
      )}

      {expanded && hasChildren && (folder.children ?? []).map(child => (
        <FolderNode
          key={child.id}
          folder={child}
          selectedId={selectedId}
          onSelect={onSelect}
          onNewSubfolder={onNewSubfolder}
          indent={indent + 1}
          projectId={projectId}
          onMove={onMove}
        />
      ))}
    </>
  );
}

// ── Folder tree view ──────────────────────────────────────────────────────────

// Build a tree from flat folders (each carrying direct case_count) and annotate
// every node with rollupCount = own cases + all descendants' cases.
type CountedFolder = TMFolder & { rollupCount: number; children: CountedFolder[] };
function buildCountedTree(flat: TMFolder[]): CountedFolder[] {
  const map = new Map<string, CountedFolder>();
  flat.forEach(f => map.set(f.id, { ...f, children: [], rollupCount: f.case_count ?? 0 }));
  const roots: CountedFolder[] = [];
  flat.forEach(f => {
    const node = map.get(f.id)!;
    const parent = f.parent_id ? map.get(f.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const sum = (n: CountedFolder): number => {
    n.rollupCount = (n.case_count ?? 0) + n.children.reduce((acc, c) => acc + sum(c), 0);
    return n.rollupCount;
  };
  roots.forEach(sum);
  return roots;
}

function FolderTreeView({
  projectId, selectedId, onSelect, onNewSubfolder,
}: {
  projectId: string | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewSubfolder: (parentId: string) => void;
}) {
  const { data: flat = [], isLoading } = useFoldersWithCounts(projectId);
  const tree = useMemo(() => buildCountedTree(flat), [flat]);
  // C3: drop a folder row onto another row to re-parent (atomic tm_move_folder
  // RPC — system folders reject the move server-side too).
  const moveFolder = useMoveFolder();
  const handleMove = useCallback((folderId: string, newParentId: string) => {
    if (!projectId) return;
    moveFolder.mutate({ id: folderId, project_id: projectId, new_parent_id: newParentId });
  }, [projectId, moveFolder]);
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
          onMove={handleMove}
        />
      ))}
    </>
  );
}

// ── Status / Priority cells ───────────────────────────────────────────────────

// Maps the UI status vocabulary (DRAFT/REVIEW/APPROVED/DEPRECATED) back to the
// tm_case_status enum key used by tm_case_status_config (S6b).
const UI_STATUS_TO_KEY: Record<string, string> = {
  DRAFT: 'draft', REVIEW: 'ready', APPROVED: 'approved', DEPRECATED: 'deprecated',
  draft: 'draft', ready: 'ready', approved: 'approved', deprecated: 'deprecated',
};

function CaseStatusPill({ status, override }: {
  status: CaseStatus;
  // S6b: when the project has a saved workflow, the label + ADS category come
  // from tm_case_status_config; otherwise this is undefined and the hardcoded
  // canonical map below is used verbatim (unconfigured = unchanged behaviour).
  override?: { label: string; appearance: 'success' | 'removed' | 'inprogress' | 'default' };
}) {
  if (override) return <Lozenge appearance={override.appearance}>{override.label}</Lozenge>;
  // D032: useTestCases normalises the tm_case_status enum to the UI vocabulary
  // DRAFT/REVIEW/APPROVED/DEPRECATED, so rows arrive uppercase. @atlaskit/lozenge
  // owns its dark-mode-correct colour via `appearance` — no hardcoded pastel.
  const map: Record<string, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    DRAFT:      { appearance: 'default',    label: 'Draft' },
    REVIEW:     { appearance: 'inprogress', label: 'Review' },
    APPROVED:   { appearance: 'success',    label: 'Approved' },
    DEPRECATED: { appearance: 'removed',    label: 'Deprecated' },
    // raw tm_case_status enum aliases (lowercase)
    draft:      { appearance: 'default',    label: 'Draft' },
    ready:      { appearance: 'inprogress', label: 'Review' },
    approved:   { appearance: 'success',    label: 'Approved' },
    deprecated: { appearance: 'removed',    label: 'Deprecated' },
  };
  const cfg = map[status] ?? { appearance: 'default' as const, label: status };
  return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
}

function PriorityChip({ priority }: { priority: TMCasePriority }) {
  return (
    <span style={{
      fontSize: 'var(--ds-font-size-100)', padding: '0px 8px', borderRadius: 12,
      background: 'var(--ds-background-neutral)',
      color: 'var(--ds-text-subtle)', fontWeight: 500,
    }}>
      {priority.name}
    </span>
  );
}

// ── S3: inline quick-create row (sticky footer) ───────────────────────────────
// Type-and-Enter case authoring. Status defaults to DRAFT, folder is inherited
// from the active repository folder. Only ever creates a Test Case (TESTHUB-owned
// per CRE A11/D4), so no type catalogue is presented. Full CreateStoryModal stays
// available behind "Create case" for the rare case needing every field.
function TestCaseInlineCreateRow({
  folderLabel, submitting, onSubmit, onCancel,
}: {
  folderLabel: string;
  submitting: boolean;
  onSubmit: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)', width: '100%', padding: '0 var(--ds-space-100)' }}>
      <WorkItemTypeIcon type="test-case" size={16} />
      <input
        autoFocus
        value={title}
        placeholder="What should this case verify? Press Enter to save."
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && title.trim() && !submitting) onSubmit(title.trim());
          if (e.key === 'Escape') onCancel();
        }}
        style={{
          flex: 1, border: 'none', background: 'transparent', outline: 'none',
          fontSize: 'var(--ds-font-size-400)', lineHeight: 'var(--ds-line-height-body)',
          color: 'var(--ds-text)',
        }}
      />
      <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', whiteSpace: 'nowrap' }}>
        Draft · {folderLabel}
      </span>
      <button
        onClick={() => { if (title.trim() && !submitting) onSubmit(title.trim()); }}
        disabled={!title.trim() || submitting}
        style={primaryBtnStyle(!title.trim() || submitting)}
      >
        {submitting ? 'Saving…' : 'Create'}
      </button>
      <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
  color: 'var(--ds-text-subtle)', marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '4px 8px', fontSize: 'var(--ds-font-size-400)', borderRadius: 4,
  border: '1px solid var(--ds-border-focused)',
  background: 'var(--ds-surface)',
  color: 'var(--ds-text)', outline: 'none', boxSizing: 'border-box',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '4px 14px', fontSize: 'var(--ds-font-size-300)', fontWeight: 500, borderRadius: 4,
  border: '2px solid var(--ds-border)',
  background: 'var(--ds-surface)',
  color: 'var(--ds-text)', cursor: 'pointer',
};

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '4px 16px', fontSize: 'var(--ds-font-size-300)', fontWeight: 500, borderRadius: 4,
  border: 'none',
  background: disabled ? 'var(--ds-background-disabled)' : 'var(--ds-background-brand-bold)',
  color: disabled ? 'var(--ds-text-disabled)' : 'var(--ds-text-inverse)',
  cursor: disabled ? 'not-allowed' : 'pointer',
});

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RepositoryPage() {
  const { projectKey = 'TESTHUB' } = useParams<{ projectKey: string }>();
  const { projectId, project } = useTestHubProject();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // C1 (CAT-TESTHUB-V2): Board/My Work deep-link `?case=<uuid>` was dead —
  // RepositoryPage never read it. Resolve uuid → case_key and forward to the
  // full-page authoring route.
  const deepLinkCaseId = searchParams.get('case');
  React.useEffect(() => {
    if (!deepLinkCaseId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('tm_test_cases')
        .select('case_key')
        .eq('id', deepLinkCaseId)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data?.case_key) {
        navigate(Routes.testHub.repositoryCase(data.case_key), { replace: true });
      } else {
        navigate(Routes.testHub.repository(), { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [deepLinkCaseId, navigate]);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'unfiled'>(null);
  const [search, setSearch] = useState('');
  // Phase C, Wave 2 — canonical CreateStoryModal (Test Case type) for new cases.
  const [createOpen, setCreateOpen] = useState(false);
  // D4: row-click opens the case in the canonical detail panel (not CaseDrawer).
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // S1 (rail redesign): the folders rail is a collapsible ResizablePanel, not a
  // hardcoded 240px div. Collapse state persists per user so the choice survives
  // reloads. The imperative handle drives collapse/expand from the header toggle.
  const folderPanelRef = useRef<ImperativePanelHandle>(null);
  const [railCollapsed, setRailCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('testhub.repo.railCollapsed') === '1'; } catch { return false; }
  });
  const toggleRail = useCallback(() => {
    const panel = folderPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  }, []);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalParentId, setFolderModalParentId] = useState<string | null>(null);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  // S5: link selected cases to a cycle or set from the repository.
  const [linkTarget, setLinkTarget] = useState<LinkTarget | null>(null);
  // P1-S4: row-level hard delete replaced with archive (VER-004) — a case
  // and its history are never destructible from the repository UI.
  const [caseToArchive, setCaseToArchive] = useState<{ id: string; case_key?: string; title?: string } | null>(null);
  const [aiDialogOpen, setAIDialogOpen] = useState(false);

  const createFolder = useCreateFolder();
  const { data: allFolders = [] } = useFolderTree(projectId);
  const archiveCases = useBulkArchiveTestCases();
  const copyCases = useBulkCopyTestCases();
  const moveCases = useMoveTestCase();
  const createCase = useCreateTestCase({ silent: true });
  // S2: real project-hub traceability (ph_issues links + latest run) per case.
  const { data: coverageMap } = useCaseCoverage(projectId);
  // C2: single-query enrichment for the 13-column table (no per-row fetches).
  const { data: tableV2Map } = useCaseTableV2(projectId);
  // S6b: per-project status workflow — drives the status pill label + category
  // when configured. Falls back to the canonical hardcoded pill otherwise.
  const { data: statusCfg } = useCaseStatusConfig(projectId);
  const statusOverride = useMemo(() => {
    if (!statusCfg?.isCustom) return undefined;
    const byKey = new Map(statusCfg.config.map(c => [c.status_key, c]));
    return (uiStatus: string) => {
      const c = byKey.get(UI_STATUS_TO_KEY[uiStatus] ?? '');
      return c ? { label: c.display_label, appearance: c.category } : undefined;
    };
  }, [statusCfg]);
  // S3: inline quick-create footer state.
  const [footerCreateActive, setFooterCreateActive] = useState(false);
  const [inlineSubmitting, setInlineSubmitting] = useState(false);

  const handleAIGeneratedTestCases = useCallback((generatedTestCases: GeneratedTestCase[]) => {
    if (!projectId) {
      catalystToast.error('No project selected.');
      return;
    }
    Promise.all(
      generatedTestCases.map(tc =>
        createCase.mutateAsync({
          project_id: projectId,
          title: tc.title,
          objective: tc.summary,
          preconditions: tc.preconditions?.join('\n'),
          status: 'DRAFT',
          is_ai_generated: true,
          folder_id: selectedFolderId !== 'unfiled' ? (selectedFolderId ?? undefined) : undefined,
          steps: tc.steps.map(step => ({
            action: step.action,
            expected_result: step.expectedResult,
            test_data: step.testData,
          })),
        }),
      ),
    )
      .then(results => catalystToast.success(`Created ${results.length} AI-generated cases`))
      .catch(() => catalystToast.error('Failed to create some AI-generated cases'));
  }, [projectId, selectedFolderId, createCase]);

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

  const activeFolderId =
    selectedFolderId === null || selectedFolderId === 'unfiled' ? null : selectedFolderId;

  // S3: label shown in the inline-create row so the author sees where it lands.
  const activeFolderLabel = useMemo(() => {
    if (selectedFolderId === null) return 'All';
    if (selectedFolderId === 'unfiled') return 'Not Assigned';
    const flat = flattenFolders(allFolders);
    return flat.find(f => f.id === selectedFolderId)?.name ?? 'Folder';
  }, [selectedFolderId, allFolders]);

  const handleInlineCreate = useCallback((title: string) => {
    if (!projectId) return;
    setInlineSubmitting(true);
    createCase.mutateAsync({
      project_id: projectId,
      title,
      status: 'DRAFT',
      folder_id: activeFolderId ?? undefined,
    })
      .then(() => { catalystToast.success('Case created', title); setFooterCreateActive(false); })
      .catch((e: unknown) => catalystToast.error(e instanceof Error ? e.message : 'Create failed'))
      .finally(() => setInlineSubmitting(false));
  }, [projectId, activeFolderId, createCase]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleCreateFolder = (name: string, parentId: string | null) => {
    if (!projectId) return;
    createFolder.mutate(
      { project_id: projectId, name, parent_id: parentId },
      { onSuccess: () => setFolderModalOpen(false) }
    );
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

  const handleMoveConfirm = (targetFolderId: string | null) => {
    if (!projectId) return;
    const folderName = targetFolderId
      ? flattenFolders(allFolders).find(f => f.id === targetFolderId)?.name
      : 'Not assigned';
    moveCases.mutate(
      { case_ids: Array.from(selectedIds), folder_id: targetFolderId, project_id: projectId, folder_name: folderName },
      { onSuccess: () => { setMoveModalOpen(false); exitSelectMode(); } }
    );
  };

  // Canonical typography parity with the Project Backlog: key text renders via
  // makeKeyCell (13px link, --ds-line-height-body) and title via makeSummaryCell
  // (14px subtle) — Grid H (RULE_TABLE.md). The type glyph rides in the key cell
  // via getIcon, exactly like Backlog's Work column, so we retire the standalone
  // inline key span. onOpen opens the canonical detail panel.
  const columns: Column<TMTestCase>[] = [
    {
      id: 'key',
      label: 'Key',
      width: 10,
      alwaysVisible: true,
      cell: makeKeyCell(
        (row: TMTestCase) => formatTestKey(row.key) ?? '—',
        // C6 (CAT-TESTHUB-V2): key click = full-page authoring; row click keeps
        // the inline peek panel.
        (row: TMTestCase) => {
          if (selectMode) return;
          const key = row.case_key ?? formatTestKey(row.key);
          if (key) navigate(Routes.testHub.repositoryCase(key));
        },
        undefined,
        () => <WorkItemTypeIcon type="test-case" size={16} />,
      ),
    },
    {
      id: 'title',
      label: 'Title',
      flex: true,
      alwaysVisible: true,
      cell: makeSummaryCell((row: TMTestCase) => row.title),
    },
    {
      id: 'status',
      label: 'Status',
      width: 12,
      cell: ({ row }) => <CaseStatusPill status={row.status} override={statusOverride?.(row.status)} />,
    },
    {
      id: 'health',
      label: 'Health',
      width: 10,
      cell: ({ row }) => {
        const v2 = tableV2Map?.get(row.id);
        // Zero-assumption: never run + no defects → no fabricated health.
        if (!v2 || (v2.latest_run_status == null && v2.open_defects === 0)) {
          return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
        }
        const atRisk = v2.open_defects > 0 || v2.latest_run_status === 'failed' || v2.latest_run_status === 'blocked';
        if (atRisk) return <Lozenge appearance="removed">At risk</Lozenge>;
        if (v2.latest_run_status === 'passed') return <Lozenge appearance="success">Healthy</Lozenge>;
        return <Lozenge appearance="default">Unproven</Lozenge>;
      },
    },
    {
      id: 'sprint',
      label: 'Sprint',
      width: 12,
      cell: ({ row }) => {
        const v2 = tableV2Map?.get(row.id);
        return v2?.sprint_name
          ? <span style={{ fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: 'var(--ds-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v2.sprint_name}>{v2.sprint_name}</span>
          : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
      },
    },
    {
      id: 'release',
      label: 'Release',
      width: 12,
      cell: ({ row }) => {
        const v2 = tableV2Map?.get(row.id);
        return v2?.release_name
          ? <span style={{ fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: 'var(--ds-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v2.release_name}>{v2.release_name}</span>
          : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
      },
    },
    {
      id: 'priority',
      label: 'Priority',
      width: 12,
      cell: ({ row }) => {
        if (row.priority_ref) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-075)', fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: 'var(--ds-text-subtle)' }}>
              {/* ADS: DB color strings are not design tokens — dot stays neutral */}
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--ds-background-neutral-bold, var(--ds-background-neutral))',
                flexShrink: 0,
              }} />
              {row.priority_ref.name}
            </span>
          );
        }
        if (row.priority_id && priorityMap[row.priority_id]) {
          return <PriorityChip priority={priorityMap[row.priority_id]} />;
        }
        return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
      },
    },
    {
      id: 'type',
      label: 'Type',
      width: 10,
      cell: ({ row }) => {
        const v2 = tableV2Map?.get(row.id);
        return v2?.case_type
          ? <span style={{ fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: 'var(--ds-text-subtle)' }}>{v2.case_type}</span>
          : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
      },
    },
    {
      id: 'origin',
      label: 'Origin',
      width: 8,
      cell: ({ row }) => {
        const v2 = tableV2Map?.get(row.id);
        if (!v2?.origin) return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
        const label = v2.origin === 'ai' ? 'AI' : v2.origin === 'hybrid' ? 'Hybrid' : 'Manual';
        return <Lozenge appearance={v2.origin === 'manual' ? 'default' : 'new'}>{label}</Lozenge>;
      },
    },
    {
      id: 'designer',
      label: 'Designer',
      width: 12,
      cell: ({ row }) => {
        const v2 = tableV2Map?.get(row.id);
        if (!v2?.designer_name) return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-075)', minWidth: 0 }}>
            <CatalystAvatar name={v2.designer_name} src={v2.designer_avatar} size="xsmall" />
            <span style={{ fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: 'var(--ds-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {v2.designer_name}
            </span>
          </span>
        );
      },
    },
    {
      id: 'updated',
      label: 'Updated',
      width: 10,
      cell: ({ row }) => {
        const v2 = tableV2Map?.get(row.id);
        if (!v2?.updated_at) return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
        return (
          <span style={{ fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: 'var(--ds-text-subtle)' }}>
            {new Date(v2.updated_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        );
      },
    },
    {
      id: 'openDefects',
      label: 'Open defects',
      width: 9,
      align: 'end',
      cell: ({ row }) => {
        const v2 = tableV2Map?.get(row.id);
        if (!v2 || v2.open_defects === 0) return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
        return (
          <span style={{ fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: 'var(--ds-text-danger)', fontWeight: 'var(--ds-font-weight-medium)' as never }}>
            {v2.open_defects}
          </span>
        );
      },
    },
    {
      id: 'coverage',
      label: 'Parent',
      width: 16,
      cell: ({ row }) => {
        const cov = coverageMap?.get(row.id);
        if (!cov || cov.requirementKeys.length === 0) {
          // Zero-assumption: no linked requirement → no fabricated state.
          return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
        }
        const verdictAppearance: Record<CoverageVerdict, 'success' | 'removed' | 'default'> = {
          ok: 'success', nok: 'removed', not_run: 'default',
        };
        const first = cov.requirementKeys[0];
        const extra = cov.requirementKeys.length - 1;
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Lozenge appearance={verdictAppearance[cov.verdict]}>
              {cov.verdict === 'ok' ? 'Covered' : cov.verdict === 'nok' ? 'At risk' : 'Not run'}
            </Lozenge>
            <span style={{
              fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)',
              color: 'var(--ds-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={cov.requirementKeys.join(', ')}>
              {first}{extra > 0 ? ` +${extra}` : ''}
            </span>
          </span>
        );
      },
    },
    {
      id: 'lastRun',
      label: 'Last run',
      width: 12,
      cell: ({ row }) => {
        const cov = coverageMap?.get(row.id);
        const status = cov?.latestRun ?? null;
        if (!status || status === 'not_run') {
          return <Lozenge appearance="default">Not run</Lozenge>;
        }
        const map: Record<Exclude<CaseRunStatus, 'not_run'>, { appearance: 'success' | 'removed' | 'moved' | 'inprogress'; label: string }> = {
          passed: { appearance: 'success', label: 'Passed' },
          failed: { appearance: 'removed', label: 'Failed' },
          blocked: { appearance: 'moved', label: 'Blocked' },
          in_progress: { appearance: 'inprogress', label: 'In progress' },
        };
        const cfg = map[status as Exclude<CaseRunStatus, 'not_run'>];
        return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
      },
    },
    {
      id: 'actions',
      label: '',
      width: 5,
      align: 'end',
      cell: ({ row }) => (
        <button
          onClick={e => {
            e.stopPropagation();
            setCaseToArchive({ id: row.id, case_key: row.case_key, title: row.title });
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ds-text-subtlest)',
            padding: 4, display: 'flex', alignItems: 'center',
          }}
          title="Archive case"
        >
          <Archive size={14} />
        </button>
      ),
    },
  ];

  return (
    <>
      <ProjectPageHeader projectKey={projectKey} hubType="test" />

      {selectMode && selectedIds.size > 0 && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--ds-background-information)',
          borderBottom: '1px solid var(--ds-border-information)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text-information)' }}>
            {selectedIds.size} selected
          </span>
          <DropdownMenu trigger="Bulk actions" placement="bottom-start">
            <DropdownItemGroup>
              <DropdownItem onClick={() => setLinkTarget('cycle')}>Add to cycle…</DropdownItem>
              {/* "Add to set…" removed: sets are deprecated into plans (D-004) and no
                  surface reads tm_set_cases — writing there was a silent data black hole. */}
              <DropdownItem onClick={() => setCopyModalOpen(true)}>Copy cases</DropdownItem>
              <DropdownItem onClick={() => setMoveModalOpen(true)}>Move to folder…</DropdownItem>
              <DropdownItem onClick={() => setArchiveModalOpen(true)}>Archive cases</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* S1: full-viewport, resizable two-pane layout. The folders rail is a
            collapsible ResizablePanel (localStorage-persisted), the case list
            fills the rest of the viewport generously. When the rail is
            collapsed a slim expand strip keeps the affordance visible. */}
        {railCollapsed && (
          <div style={{
            width: 44, minWidth: 44, flexShrink: 0,
            borderRight: '1px solid var(--ds-border)',
            background: 'var(--ds-surface-sunken)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, gap: 8,
          }}>
            <button
              onClick={toggleRail}
              title="Expand folders"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ds-text-subtle)', padding: 'var(--ds-space-075)', display: 'flex', borderRadius: 'var(--ds-border-radius)',
              }}
            >
              <PanelLeftOpen size={18} />
            </button>
          </div>
        )}

        <ResizablePanelGroup
          direction="horizontal"
          style={{ flex: 1, minHeight: 0 }}
        >
          {/* Folders rail */}
          <ResizablePanel
            ref={folderPanelRef}
            order={1}
            collapsible
            collapsedSize={0}
            defaultSize={railCollapsed ? 0 : 18}
            minSize={12}
            maxSize={28}
            onCollapse={() => { setRailCollapsed(true); try { localStorage.setItem('testhub.repo.railCollapsed', '1'); } catch { /* ignore */ } }}
            onExpand={() => { setRailCollapsed(false); try { localStorage.setItem('testhub.repo.railCollapsed', '0'); } catch { /* ignore */ } }}
            style={{
              borderRight: '1px solid var(--ds-border)',
              background: 'var(--ds-surface-sunken)',
              overflowY: 'auto',
              display: railCollapsed ? 'none' : 'block',
            }}
          >
            <div style={{ padding: 'var(--ds-space-200) 0' }}>
              <div style={{
                padding: '0 var(--ds-space-200)', marginBottom: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{
                  fontSize: 'var(--ds-font-size-100)', fontWeight: 700,
                  color: 'var(--ds-text-subtlest)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  Folders
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => { setFolderModalParentId(null); setFolderModalOpen(true); }}
                    title="Add new folder"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--ds-text-subtle)', padding: 4, display: 'flex', borderRadius: 4,
                    }}
                  >
                    <Plus size={15} />
                  </button>
                  <button
                    onClick={toggleRail}
                    title="Collapse folders"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--ds-text-subtle)', padding: 4, display: 'flex', borderRadius: 4,
                    }}
                  >
                    <PanelLeftClose size={16} />
                  </button>
                </div>
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
                onNewSubfolder={parentId => { setFolderModalParentId(parentId); setFolderModalOpen(true); }}
              />
            </div>
          </ResizablePanel>

          {!railCollapsed && <ResizableHandle withHandle />}

          {/* Case list — fills the viewport */}
          <ResizablePanel order={2} minSize={40} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Search + actions bar — generous height and spacing */}
            <div style={{
              padding: 'var(--ds-space-200) var(--ds-space-300)',
              borderBottom: '1px solid var(--ds-border)',
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'var(--ds-surface)',
            }}>
              {railCollapsed && (
                <button
                  onClick={toggleRail}
                  title="Show folders"
                  style={{
                    background: 'none', border: '1px solid var(--ds-border)', cursor: 'pointer',
                    color: 'var(--ds-text-subtle)', padding: 'var(--ds-space-075)', display: 'flex', borderRadius: 'var(--ds-border-radius)',
                  }}
                >
                  <PanelLeftOpen size={16} />
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 420 }}>
                <Search size={16} style={{ color: 'var(--ds-text-subtlest)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search cases…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    flex: 1, border: '1px solid var(--ds-border)',
                    borderRadius: 6, padding: 'var(--ds-space-075) var(--ds-space-150)', fontSize: 'var(--ds-font-size-300)',
                    lineHeight: 'var(--ds-line-height-body)',
                    background: 'var(--ds-surface)',
                    color: 'var(--ds-text)', outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginLeft: 'auto' }}>
                <CatyIconCTA
                  tooltip="Generate test cases with Caty"
                  onClick={() => setAIDialogOpen(true)}
                  size={22}
                />
                <button
                  onClick={() => { setSelectMode(s => !s); setSelectedIds(new Set()); }}
                  style={{
                    padding: 'var(--ds-space-075) var(--ds-space-150)',
                    background: selectMode ? 'var(--ds-background-selected)' : 'var(--ds-surface)',
                    color: selectMode ? 'var(--ds-text-selected)' : 'var(--ds-text-subtle)',
                    border: '1px solid var(--ds-border)',
                    borderRadius: 6, fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)',
                    fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 'var(--ds-space-075)',
                  }}
                >
                  <Edit2 size={14} />
                  {selectMode ? 'Cancel' : 'Select'}
                </button>
                <button
                  onClick={() => setCreateOpen(true)}
                  style={{
                    padding: 'var(--ds-space-075) var(--ds-space-200)',
                    background: 'var(--ds-background-brand-bold)',
                    color: 'var(--ds-text-inverse)', border: 'none', borderRadius: 6,
                    fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)',
                    fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 'var(--ds-space-075)',
                  }}
                >
                  <Plus size={16} />
                  Create case
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--ds-space-050) var(--ds-space-150) var(--ds-space-300)' }}>
              {casesLoading ? (
                <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
                  <Spinner size="large" />
                </div>
              ) : (
                <JiraTable<TMTestCase>
                  columns={columns}
                  data={cases}
                  getRowId={row => row.id}
                  onRowClick={row => {
                    if (selectMode) return;
                    setSelectedCaseId(row.id);
                  }}
                  selectable={selectMode}
                  selection={selectedIds}
                  onSelectionChange={next => setSelectedIds(new Set(next))}
                  focusedRowId={selectedCaseId ?? undefined}
                  showRowCount
                  totalRowCount={casesResult?.total}
                  enableStickyCreateFooter
                  stickyCreateFooter={{
                    placeholder: 'Create case',
                    onActivate: () => setFooterCreateActive(true),
                    active: footerCreateActive ? (
                      <TestCaseInlineCreateRow
                        folderLabel={activeFolderLabel}
                        submitting={inlineSubmitting}
                        onSubmit={handleInlineCreate}
                        onCancel={() => setFooterCreateActive(false)}
                      />
                    ) : null,
                  }}
                />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* D4: canonical detail panel for view/edit. */}
        {selectedCaseId && (
          <CatalystDetailRouter
            entityKind="test_case"
            itemId={selectedCaseId}
            isOpen={!!selectedCaseId}
            panelMode
            projectKey={projectKey}
            onClose={() => setSelectedCaseId(null)}
          />
        )}
      </div>

      {folderModalOpen && projectId && (
        <FolderModal
          folders={allFolders}
          initialParentId={folderModalParentId}
          onClose={() => setFolderModalOpen(false)}
          saving={createFolder.isPending}
          onSave={handleCreateFolder}
        />
      )}

      {archiveModalOpen && (
        <ArchiveModal
          count={selectedIds.size}
          onConfirm={handleArchiveConfirm}
          onClose={() => setArchiveModalOpen(false)}
          saving={archiveCases.isPending}
        />
      )}

      {caseToArchive && (
        <ModalDialog onClose={() => setCaseToArchive(null)}>
          <ModalHeader>
            <ModalTitle>Archive test case?</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: 0, color: 'var(--ds-text)' }}>
              {caseToArchive.case_key ? `${caseToArchive.case_key} · ` : ''}
              <strong>{caseToArchive.title ?? 'This case'}</strong> will be hidden from the repository.
              Its steps, versions, and execution history are preserved and it can be restored later.
            </p>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setCaseToArchive(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px', fontWeight: 500, color: 'var(--ds-text-subtle)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (projectId && caseToArchive) archiveCases.mutate({ case_ids: [caseToArchive.id], project_id: projectId });
                setCaseToArchive(null);
              }}
              disabled={archiveCases.isPending}
              style={{ background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)', border: 'none', borderRadius: 3, cursor: 'pointer', padding: '4px 14px', fontWeight: 600 }}
            >
              {archiveCases.isPending ? 'Archiving…' : 'Archive'}
            </button>
          </ModalFooter>
        </ModalDialog>
      )}

      {copyModalOpen && (
        <CopyModal
          count={selectedIds.size}
          folders={allFolders}
          onConfirm={handleCopyConfirm}
          onClose={() => setCopyModalOpen(false)}
          saving={copyCases.isPending}
        />
      )}

      {moveModalOpen && (
        <MoveModal
          count={selectedIds.size}
          folders={allFolders}
          onConfirm={handleMoveConfirm}
          onClose={() => setMoveModalOpen(false)}
          saving={moveCases.isPending}
        />
      )}

      {linkTarget && (
        <AddToCycleSetSheet
          mode={linkTarget}
          projectId={projectId}
          caseIds={Array.from(selectedIds)}
          onClose={() => setLinkTarget(null)}
          onDone={exitSelectMode}
        />
      )}

      <AIGenerateTestCasesDialog
        open={aiDialogOpen}
        onOpenChange={setAIDialogOpen}
        onTestCasesGenerated={handleAIGeneratedTestCases}
      />

      {/* Phase C, Wave 2 — canonical create flow. Opens on 'Test Case' with the
          currently-selected repository folder pre-filled. The modal resolves
          the canonical project to its tm_projects mirror internally. */}
      <CreateStoryModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectKey={project?.key ?? undefined}
        defaultWorkType="Test Case"
        initialFolderId={activeFolderId}
        onSuccess={() => setCreateOpen(false)}
      />
    </>
  );
}
