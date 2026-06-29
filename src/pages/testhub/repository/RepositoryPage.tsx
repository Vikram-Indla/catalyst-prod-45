import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProjects } from '@/hooks/test-management/useProjects';
import { WorkItemTypeIcon } from '@/components/icons';
import {
  useFolderTree,
  useFoldersWithCounts,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from '@/hooks/test-management/useFolders';
import {
  useTestCases,
  useCreateTestCase,
  useDeleteTestCase,
  useBulkArchiveTestCases,
  useBulkCopyTestCases,
} from '@/hooks/test-management/useTestCases';
import { supabase } from '@/integrations/supabase/client';
import { CatyIconCTA } from '@/components/ui/CatyIconCTA';
import { AIGenerateTestCasesDialog } from '@/components/testhub/AIGenerateTestCasesDialog';
import type { GeneratedTestCase } from '@/hooks/test-management/useAIGeneration';
import { catalystToast } from '@/lib/catalystToast';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
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
  Trash2,
  MoreHorizontal,
  Edit2,
} from '@/lib/atlaskit-icons';
import type { TMFolder, TMTestCase, CaseStatus, TMCasePriority, CaseFilters } from '@/types/test-management';
import { CaseDrawer } from './CaseDrawer';
// D4 (2026-06-27) — view/edit a case via the canonical CatalystViewBase shell
// (entityKind='test_case'). Create still uses CaseDrawer (coexist).
import CatalystDetailRouter from '@/components/catalyst-detail-views/CatalystDetailRouter';

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
          <select
            value={parentId ?? ''}
            onChange={e => setParentId(e.target.value || null)}
            style={selectStyle}
          >
            <option value="">All</option>
            {flat.map(f => (
              <option key={f.id} value={f.id}>{f.indent}{f.name}</option>
            ))}
          </select>
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
          <select
            value={targetFolderId}
            onChange={e => setTargetFolderId(e.target.value)}
            style={selectStyle}
          >
            <option value="">Same folder</option>
            {flat.map(f => (
              <option key={f.id} value={f.id}>{f.indent}{f.name}</option>
            ))}
          </select>
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
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const hasChildren = (folder.children?.length ?? 0) > 0;
  const isSelected = selectedId === folder.id;
  const rollupCount = (folder as TMFolder & { rollupCount?: number }).rollupCount ?? folder.case_count ?? 0;

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
          background: isSelected ? 'var(--ds-background-selected)' : 'transparent',
          color: isSelected ? 'var(--ds-text-selected)' : 'var(--ds-text)',
          fontSize: 'var(--ds-font-size-300)', display: 'flex', alignItems: 'center', gap: 4,
          position: 'relative',
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
            trigger={({ triggerRef, ...props }) => (
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
              <DropdownItem onClick={() => setRenaming(true)}>Rename</DropdownItem>
              <DropdownItem onClick={() => setConfirmingDelete(true)}>Delete</DropdownItem>
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

// ── Status / Priority cells ───────────────────────────────────────────────────

function CaseStatusPill({ status }: { status: CaseStatus }) {
  const map: Record<CaseStatus, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    APPROVED:   { appearance: 'success',  label: 'Approved' },
    REVIEW:     { appearance: 'moved',    label: 'Review' },
    DEPRECATED: { appearance: 'removed',  label: 'Deprecated' },
    DRAFT:      { appearance: 'default',  label: 'Draft' },
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

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '4px 8px', fontSize: 'var(--ds-font-size-400)', borderRadius: 4,
  border: '2px solid var(--ds-border)',
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
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'unfiled'>(null);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TMTestCase | null>(null);
  // D4: row-click opens the case in the canonical detail panel (not CaseDrawer).
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalParentId, setFolderModalParentId] = useState<string | null>(null);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<{ id: string; case_key?: string; title?: string } | null>(null);
  const [aiDialogOpen, setAIDialogOpen] = useState(false);

  const createFolder = useCreateFolder();
  const { data: allFolders = [] } = useFolderTree(projectId);
  const archiveCases = useBulkArchiveTestCases();
  const copyCases = useBulkCopyTestCases();
  const deleteCase = useDeleteTestCase();
  const createCase = useCreateTestCase({ silent: true });

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

  const columns: Column<TMTestCase>[] = [
    {
      id: 'key',
      label: 'Key',
      width: 8,
      alwaysVisible: true,
      cell: ({ row }) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
          <WorkItemTypeIcon type="test-case" size={14} />
          <span style={{
            fontFamily: 'var(--ds-font-family-code, monospace)',
            color: 'var(--ds-text-subtlest)',
            fontSize: 'var(--ds-font-size-200)',
          }}>
            {row.key ?? '—'}
          </span>
        </span>
      ),
    },
    {
      id: 'title',
      label: 'Title',
      flex: true,
      alwaysVisible: true,
      cell: ({ row }) => (
        <span style={{ color: 'var(--ds-text)', fontWeight: 500 }}>
          {row.title}
        </span>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: 12,
      cell: ({ row }) => <CaseStatusPill status={row.status} />,
    },
    {
      id: 'priority',
      label: 'Priority',
      width: 12,
      cell: ({ row }) => {
        if (row.priority_ref) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--ds-font-size-200)' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: row.priority_ref.color ?? 'var(--ds-background-neutral)',
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
      id: 'actions',
      label: '',
      width: 4,
      cell: ({ row }) => (
        <button
          onClick={e => {
            e.stopPropagation();
            setCaseToDelete({ id: row.id, case_key: row.case_key, title: row.title });
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ds-text-subtlest)',
            padding: 4, display: 'flex', alignItems: 'center',
          }}
          title="Delete case"
        >
          <Trash2 size={14} />
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
              <DropdownItem onClick={() => setCopyModalOpen(true)}>Copy cases</DropdownItem>
              <DropdownItem onClick={() => setArchiveModalOpen(true)}>Archive cases</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Folder tree sidebar */}
        <div style={{
          width: 240, minWidth: 240,
          borderRight: '1px solid var(--ds-border)',
          background: 'var(--ds-surface-sunken)',
          overflowY: 'auto', padding: '12px 0',
        }}>
          <div style={{
            padding: '0 12px', marginBottom: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
              color: 'var(--ds-text-subtlest)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Folders
            </span>
            <button
              onClick={() => { setFolderModalParentId(null); setFolderModalOpen(true); }}
              title="Add new folder"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ds-text-subtlest)',
                padding: 0, display: 'flex', alignItems: 'center',
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
            onNewSubfolder={parentId => { setFolderModalParentId(parentId); setFolderModalOpen(true); }}
          />
        </div>

        {/* Case list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search + actions bar */}
          <div style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--ds-border)',
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--ds-surface)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 320 }}>
              <Search size={14} style={{ color: 'var(--ds-text-subtlest)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search cases..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, border: '1px solid var(--ds-border)',
                  borderRadius: 4, padding: '4px 8px', fontSize: 'var(--ds-font-size-300)',
                  background: 'var(--ds-surface)',
                  color: 'var(--ds-text)', outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
              <CatyIconCTA
                tooltip="Generate test cases with Caty"
                onClick={() => setAIDialogOpen(true)}
                size={20}
              />
              <button
                onClick={() => { setSelectMode(s => !s); setSelectedIds(new Set()); }}
                style={{
                  padding: '4px 10px',
                  background: selectMode ? 'var(--ds-background-selected)' : 'var(--ds-surface)',
                  color: selectMode ? 'var(--ds-text-selected)' : 'var(--ds-text-subtle)',
                  border: '1px solid var(--ds-border)',
                  borderRadius: 4, fontSize: 'var(--ds-font-size-300)', fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Edit2 size={13} />
                {selectMode ? 'Cancel' : 'Select'}
              </button>
              <button
                onClick={() => { setEditingCase(null); setDrawerOpen(true); }}
                style={{
                  padding: '4px 12px',
                  background: 'var(--ds-background-brand-bold)',
                  color: 'var(--ds-text-inverse)', border: 'none', borderRadius: 4,
                  fontSize: 'var(--ds-font-size-300)', fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Plus size={14} />
                Create case
              </button>
            </div>
          </div>

          {casesLoading ? (
            <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
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
              showRowCount
              totalRowCount={casesResult?.total}
            />
          )}
        </div>

        {drawerOpen && projectId && (
          <CaseDrawer
            projectId={projectId}
            folderId={activeFolderId}
            existingCase={editingCase}
            onClose={() => { setDrawerOpen(false); setEditingCase(null); }}
          />
        )}

        {/* D4: canonical detail panel for view/edit (coexists with CaseDrawer). */}
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

      {caseToDelete && (
        <ModalDialog onClose={() => setCaseToDelete(null)}>
          <ModalHeader>
            <ModalTitle appearance="danger">Delete test case?</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: 0, color: 'var(--ds-text)' }}>
              {caseToDelete.case_key ? `${caseToDelete.case_key} · ` : ''}
              <strong>{caseToDelete.title ?? 'This case'}</strong> and its steps will be permanently
              deleted. This cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setCaseToDelete(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px', fontWeight: 500, color: 'var(--ds-text-subtle)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (projectId && caseToDelete) deleteCase.mutate({ id: caseToDelete.id, project_id: projectId });
                setCaseToDelete(null);
              }}
              disabled={deleteCase.isPending}
              style={{ background: 'var(--ds-background-danger-bold)', color: 'var(--ds-text-inverse)', border: 'none', borderRadius: 3, cursor: 'pointer', padding: '4px 14px', fontWeight: 600 }}
            >
              {deleteCase.isPending ? 'Deleting…' : 'Delete'}
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

      <AIGenerateTestCasesDialog
        open={aiDialogOpen}
        onOpenChange={setAIDialogOpen}
        onTestCasesGenerated={handleAIGeneratedTestCases}
      />
    </>
  );
}
