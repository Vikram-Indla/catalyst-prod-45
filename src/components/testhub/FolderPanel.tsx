// ═══════════════════════════════════════════════════════════════════════════
// FOLDER PANEL COMPONENT
// Copy this ENTIRE file to: src/components/testhub/FolderPanel.tsx
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, Plus, MoreHorizontal, ChevronLeft, ChevronsLeft } from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
  icon?: string;
  parentId: string | null;
  testCaseCount: number;
  children?: FolderItem[];
}

interface FolderPanelProps {
  folders: FolderItem[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: () => void;
  totalTestCases: number;
}

export function FolderPanel({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  totalTestCases,
}: FolderPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Collapsed strip (48px)
  if (isCollapsed) {
    return (
      <div className="th-folder-strip visible">
        <button
          className="th-folder-expand-btn"
          onClick={() => setIsCollapsed(false)}
          title="Expand folders"
        >
          <Folder />
        </button>
      </div>
    );
  }

  // Full panel (240px)
  return (
    <div className="th-folder-panel">
      {/* Header */}
      <div className="th-folder-header">
        <div className="th-folder-header-left">
          <Folder className="th-folder-header-icon" />
          <span className="th-folder-header-title">Folders</span>
        </div>
        <div className="th-folder-header-actions">
          <button
            className="th-folder-header-btn"
            onClick={onCreateFolder}
            title="Create folder"
          >
            <Plus />
          </button>
          <button
            className="th-folder-collapse-btn"
            onClick={() => setIsCollapsed(true)}
            title="Collapse panel"
          >
            <ChevronsLeft />
          </button>
        </div>
      </div>

      {/* Folder Tree */}
      <div className="th-folder-tree">
        {/* All Test Cases */}
        <div
          className={`th-folder-item ${selectedFolderId === null ? 'selected' : ''}`}
          onClick={() => onSelectFolder(null)}
        >
          <div className="th-folder-chevron" style={{ visibility: 'hidden' }}>
            <ChevronRight />
          </div>
          <Folder className="th-folder-icon" />
          <span className="th-folder-name">All Test Cases</span>
          <span className="th-folder-count">{totalTestCases}</span>
        </div>

        {/* Folder Items */}
        {folders.filter(f => f.parentId === null).map(folder => (
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            allFolders={folders}
            selectedFolderId={selectedFolderId}
            expandedFolders={expandedFolders}
            onSelect={onSelectFolder}
            onToggleExpand={toggleExpand}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

// Recursive folder tree item
interface FolderTreeItemProps {
  folder: FolderItem;
  allFolders: FolderItem[];
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onSelect: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
  depth: number;
}

function FolderTreeItem({
  folder,
  allFolders,
  selectedFolderId,
  expandedFolders,
  onSelect,
  onToggleExpand,
  depth,
}: FolderTreeItemProps) {
  const children = allFolders.filter(f => f.parentId === folder.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;

  return (
    <>
      <div
        className={`th-folder-item ${isSelected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''} ${!hasChildren ? 'no-children' : ''}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onSelect(folder.id)}
      >
        <div
          className="th-folder-chevron"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(folder.id);
          }}
        >
          <ChevronRight />
        </div>
        {isExpanded && hasChildren ? (
          <FolderOpen className="th-folder-icon" />
        ) : (
          <Folder className="th-folder-icon" />
        )}
        <span className="th-folder-name">{folder.name}</span>
        <span className="th-folder-count">{folder.testCaseCount}</span>
        <div className="th-folder-item-actions">
          <button className="th-folder-item-btn" onClick={(e) => e.stopPropagation()}>
            <Plus />
          </button>
          <button className="th-folder-item-btn" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="th-folder-children">
          {children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              allFolders={allFolders}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default FolderPanel;
