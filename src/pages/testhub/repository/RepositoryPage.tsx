import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useFolderTree, useCreateFolder } from '@/hooks/test-management/useFolders';
import { useTestCases, useDeleteTestCase } from '@/hooks/test-management/useTestCases';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';
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
} from '@/lib/atlaskit-icons';
import { TMFolder, TMTestCase, CaseStatus, TMCasePriority, CaseFilters } from '@/types/test-management';
import { CaseDrawer } from './CaseDrawer';

export default function RepositoryPage() {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'unfiled'>(null);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TMTestCase | null>(null);

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

  const createCaseButton = (
    <button
      onClick={() => { setEditingCase(null); setDrawerOpen(true); }}
      style={{
        padding: '6px 12px',
        background: 'var(--ds-background-brand-bold, #0052CC)',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 4,
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Plus size={14} />
      Create case
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--ds-font-family-body)' }}>
      <Breadcrumbs items={[
        { key: 'testhub', text: 'Test Hub', onClick: () => navigate('/testhub/dashboard') },
        { key: 'repository', text: 'Repository', isCurrent: true },
      ]} />
      <PageHeader title="Test Repository" actions={createCaseButton} />
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', fontFamily: 'var(--ds-font-family-body)' }}>
      {/* Left: folder tree */}
      <div style={{
        width: 240,
        minWidth: 240,
        borderRight: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface-sunken, #F7F8F9)',
        overflowY: 'auto',
        padding: '16px 0',
      }}>
        <div style={{
          padding: '0 12px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ds-text-subtlest, #6B778C)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Folders
          </span>
          <NewFolderButton projectId={projectId} parentId={null} />
        </div>

        <FolderItem
          label="All cases"
          selected={selectedFolderId === null}
          onClick={() => setSelectedFolderId(null)}
          isOpen={selectedFolderId === null}
          indent={0}
        />
        <FolderItem
          label="Unfiled"
          selected={selectedFolderId === 'unfiled'}
          onClick={() => setSelectedFolderId('unfiled')}
          isOpen={selectedFolderId === 'unfiled'}
          indent={0}
        />

        <FolderTreeView
          projectId={projectId}
          selectedId={selectedFolderId as string | null}
          onSelect={id => setSelectedFolderId(id)}
        />
      </div>

      {/* Right: case list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
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
                flex: 1,
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 13,
                background: 'var(--ds-surface, #FFFFFF)',
                color: 'var(--ds-text, #172B4D)',
                outline: 'none',
              }}
            />
          </div>

          <span style={{ fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)', marginLeft: 'auto' }}>
            {casesResult?.total ?? 0} cases
          </span>
        </div>

        {/* Table */}
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
                  position: 'sticky',
                  top: 0,
                  background: 'var(--ds-surface-sunken, #F7F8F9)',
                  zIndex: 1,
                }}>
                  <th style={thStyle}>Key</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Priority</th>
                  <th style={{ ...thStyle, width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)', cursor: 'pointer' }}
                    onClick={() => { setEditingCase(c); setDrawerOpen(true); }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                    }}
                  >
                    <td style={{
                      ...tdStyle,
                      fontFamily: 'var(--ds-font-family-code)',
                      color: 'var(--ds-text-subtlest, #6B778C)',
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                    }}>
                      {c.key ?? '—'}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--ds-text, #172B4D)', fontWeight: 500 }}>
                      {c.title}
                    </td>
                    <td style={tdStyle}>
                      <CaseStatusPill status={c.status} />
                    </td>
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
                    <td
                      style={{ ...tdStyle, textAlign: 'center' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          if (projectId) {
                            deleteCase.mutate({ id: c.id, project_id: projectId });
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--ds-text-subtlest, #6B778C)',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Delete case"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ds-text-subtle, #42526E)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
};

function FolderItem({
  label,
  selected,
  onClick,
  isOpen,
  indent,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  isOpen: boolean;
  indent: number;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: `6px 12px 6px ${12 + indent * 16}px`,
        cursor: 'pointer',
        background: selected ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
        color: selected ? 'var(--ds-text-selected, #0052CC)' : 'var(--ds-text, #172B4D)',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        userSelect: 'none',
      }}
    >
      {isOpen ? <FolderOpen size={14} /> : <Folder size={14} />}
      {label}
    </div>
  );
}

function FolderTreeView({
  projectId,
  selectedId,
  onSelect,
}: {
  projectId: string | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
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
          indent={0}
          projectId={projectId}
        />
      ))}
    </>
  );
}

function FolderNode({
  folder,
  selectedId,
  onSelect,
  indent,
  projectId,
}: {
  folder: TMFolder;
  selectedId: string | null;
  onSelect: (id: string) => void;
  indent: number;
  projectId: string | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = (folder.children?.length ?? 0) > 0;
  const isSelected = selectedId === folder.id;

  return (
    <>
      <div
        style={{
          padding: `6px 12px 6px ${12 + indent * 16}px`,
          cursor: 'pointer',
          background: isSelected ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
          color: isSelected ? 'var(--ds-text-selected, #0052CC)' : 'var(--ds-text, #172B4D)',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
        onClick={() => onSelect(folder.id)}
      >
        {hasChildren ? (
          <span
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{ display: 'flex', alignItems: 'center' }}
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
        <NewFolderButton projectId={projectId} parentId={folder.id} />
      </div>
      {expanded && hasChildren && (folder.children ?? []).map(child => (
        <FolderNode
          key={child.id}
          folder={child}
          selectedId={selectedId}
          onSelect={onSelect}
          indent={indent + 1}
          projectId={projectId}
        />
      ))}
    </>
  );
}

function NewFolderButton({
  projectId,
  parentId,
}: {
  projectId: string | undefined;
  parentId: string | null;
}) {
  const createFolder = useCreateFolder();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  if (creating) {
    return (
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={() => { setCreating(false); setName(''); }}
        onKeyDown={e => {
          if (e.key === 'Enter' && name.trim() && projectId) {
            createFolder.mutate({ project_id: projectId, name: name.trim(), parent_id: parentId });
            setCreating(false);
            setName('');
          }
          if (e.key === 'Escape') { setCreating(false); setName(''); }
        }}
        placeholder="Folder name"
        style={{
          fontSize: 12,
          border: '1px solid var(--ds-border-focused, #4C9AFF)',
          borderRadius: 3,
          padding: '2px 6px',
          width: 100,
          outline: 'none',
        }}
        onClick={e => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setCreating(true); }}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--ds-text-subtlest, #6B778C)',
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}
      title="New folder"
    >
      <Plus size={12} />
    </button>
  );
}

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
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 12,
      background: 'var(--ds-background-neutral, #F1F2F4)',
      color: 'var(--ds-text-subtle, #42526E)',
      fontWeight: 500,
    }}>
      {priority.name}
    </span>
  );
}
