/**
 * TestHub Folder Tree Component
 * Ring-fenced CATALYST V10 design with th-* classes
 */

import { useState, useMemo } from 'react';
import { ChevronRight, Folder, FolderOpen, Plus, Trash2, Edit2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TMFolder } from '@/types/test-management';

interface TestHubFolderTreeProps {
  folders: TMFolder[];
  selectedFolderId: string | null;
  folderCounts: Record<string, number>;
  onSelect: (folderId: string | null) => void;
  onCreateFolder: (parentId?: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
}

interface FolderNode extends TMFolder {
  children: FolderNode[];
}

function buildTree(folders: TMFolder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  folders.forEach(folder => {
    map.set(folder.id, { ...folder, children: [] });
  });

  folders.forEach(folder => {
    const node = map.get(folder.id)!;
    if (folder.parent_id && map.has(folder.parent_id)) {
      map.get(folder.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

interface FolderItemProps {
  folder: FolderNode;
  level: number;
  selectedFolderId: string | null;
  folderCounts: Record<string, number>;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (folderId: string | null) => void;
  onCreateFolder: (parentId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
}

function FolderItem({
  folder,
  level,
  selectedFolderId,
  folderCounts,
  expandedIds,
  onToggleExpand,
  onSelect,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}: FolderItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);

  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children.length > 0;
  const count = folderCounts[folder.id] || 0;

  const handleRenameSubmit = () => {
    if (renameName.trim() && renameName !== folder.name) {
      onRenameFolder(folder.id, renameName.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setRenameName(folder.name);
      setIsRenaming(false);
    }
  };

  return (
    <>
      <div
        className={cn('th-folder-item', isSelected && 'selected', isExpanded && 'expanded')}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect(folder.id)}
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        {/* Expand/collapse chevron */}
        <div 
          className="th-folder-chevron"
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folder.id);
          }}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </div>

        {/* Folder icon */}
        {isExpanded && hasChildren ? (
          <FolderOpen className="th-folder-icon" style={{ color: '#D97706' }} />
        ) : (
          <Folder className="th-folder-icon" style={{ color: '#D97706' }} />
        )}

        {/* Folder name or rename input */}
        {isRenaming ? (
          <input
            type="text"
            className="th-input"
            style={{ height: '24px', fontSize: 'var(--th-text-sm)' }}
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="th-folder-name">{folder.name}</span>
        )}

        {/* Count badge */}
        {count > 0 && !isRenaming && (
          <span className="th-folder-count">{count}</span>
        )}

        {/* Action menu */}
        {showMenu && !isRenaming && (
          <div 
            className="th-folder-item-actions"
            style={{ display: 'flex' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="th-folder-item-btn"
              onClick={() => onCreateFolder(folder.id)}
              title="Add subfolder"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              className="th-folder-item-btn"
              onClick={() => {
                setRenameName(folder.name);
                setIsRenaming(true);
              }}
              title="Rename"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              className="th-folder-item-btn"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete"
              style={{ color: '#DC2626' }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children.map(child => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              folderCounts={folderCounts}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onCreateFolder={onCreateFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="th-modal-overlay open" onClick={() => setShowDeleteConfirm(false)}>
          <div className="th-modal th-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="th-modal-header">
              <div>
                <h2 className="th-modal-title">Delete Folder</h2>
                <p className="th-modal-subtitle">
                  Are you sure you want to delete "{folder.name}"?
                </p>
              </div>
            </div>
            <div className="th-modal-body">
              <p style={{ color: '#334155', fontSize: '14px' }}>
                Test cases in this folder will be moved to the parent folder.
              </p>
            </div>
            <div className="th-modal-footer">
              <button className="th-btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button 
                className="th-btn-danger"
                onClick={() => {
                  onDeleteFolder(folder.id);
                  setShowDeleteConfirm(false);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TestHubFolderTree({
  folders,
  selectedFolderId,
  folderCounts,
  onSelect,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}: TestHubFolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(folders), [folders]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {/* All Test Cases */}
      <div
        className={cn('th-folder-item', selectedFolderId === null && 'selected')}
        onClick={() => onSelect(null)}
      >
        <Folder className="th-folder-icon" />
        <span className="th-folder-name">All Test Cases</span>
      </div>

      {/* Folder tree */}
      {tree.map(folder => (
        <FolderItem
          key={folder.id}
          folder={folder}
          level={0}
          selectedFolderId={selectedFolderId}
          folderCounts={folderCounts}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
          onSelect={onSelect}
          onCreateFolder={onCreateFolder}
          onDeleteFolder={onDeleteFolder}
          onRenameFolder={onRenameFolder}
        />
      ))}

      {/* Empty state */}
      {tree.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8' }}>
          <Folder style={{ width: '32px', height: '32px', margin: '0 auto 8px', opacity: 0.5 }} />
          <p style={{ fontSize: '12px' }}>No folders yet</p>
          <button
            className="th-btn-ghost"
            style={{ marginTop: '8px' }}
            onClick={() => onCreateFolder()}
          >
            Create first folder
          </button>
        </div>
      )}
    </div>
  );
}
