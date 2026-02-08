import { useState } from 'react';
import { Folder, FolderOpen, Plus, ChevronsLeft, ChevronRight } from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  testCaseCount: number;
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

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const rootFolders = folders.filter(f => f.parentId === null);

  // Collapsed state - show only icon
  if (isCollapsed) {
    return (
      <div style={{
        width: 48,
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand folders"
          style={{
            width: 36,
            height: 36,
            padding: 0,
            border: 'none',
            borderRadius: 8,
            backgroundColor: '#F8FAFC',
            color: '#64748B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#EFF6FF';
            e.currentTarget.style.color = '#2563EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.color = '#64748B';
          }}
        >
          <Folder style={{ width: 20, height: 20 }} />
        </button>
      </div>
    );
  }

  // Expanded state
  return (
    <div style={{
      width: 240,
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        height: 48,
        padding: '0 12px 0 16px',
        borderBottom: '1px solid #F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Folder style={{ width: 16, height: 16, color: '#64748B' }} />
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#64748B',
          }}>Folders</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={onCreateFolder}
            title="Create folder"
            style={{
              width: 28,
              height: 28,
              padding: 0,
              border: 'none',
              borderRadius: 6,
              backgroundColor: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.color = '#475569';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94A3B8';
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            title="Collapse panel"
            style={{
              width: 26,
              height: 26,
              padding: 0,
              border: 'none',
              borderRadius: 6,
              backgroundColor: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.color = '#475569';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94A3B8';
            }}
          >
            <ChevronsLeft style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* Folder Tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {/* All Test Cases */}
        <div
          onClick={() => onSelectFolder(null)}
          style={{
            height: 36,
            padding: '0 12px',
            margin: '1px 8px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            backgroundColor: selectedFolderId === null ? 'rgba(37,99,235,0.1)' : 'transparent',
            position: 'relative',
            transition: 'background-color 0.1s',
          }}
          onMouseEnter={(e) => {
            if (selectedFolderId !== null) {
              e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.06)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedFolderId !== null) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {selectedFolderId === null && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: 6,
              bottom: 6,
              width: 3,
              backgroundColor: '#2563EB',
              borderRadius: '0 2px 2px 0',
            }} />
          )}
          <div style={{ width: 20, height: 20, marginRight: 0 }} /> {/* Spacer for alignment */}
          <Folder style={{
            width: 17,
            height: 17,
            marginRight: 12,
            color: selectedFolderId === null ? '#2563EB' : '#64748B',
          }} />
          <span style={{
            flex: 1,
            fontSize: 13.5,
            fontWeight: selectedFolderId === null ? 600 : 500,
            color: selectedFolderId === null ? '#2563EB' : '#475569',
          }}>All Test Cases</span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{totalTestCases}</span>
        </div>

        {/* Root Folders */}
        {rootFolders.map(folder => (
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

interface FolderTreeItemProps {
  folder: FolderItem;
  allFolders: FolderItem[];
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string, e: React.MouseEvent) => void;
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
        onClick={() => onSelect(folder.id)}
        style={{
          height: 36,
          padding: '0 12px',
          paddingLeft: 12 + depth * 20,
          margin: '1px 8px',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          backgroundColor: isSelected ? 'rgba(37,99,235,0.1)' : 'transparent',
          position: 'relative',
          transition: 'background-color 0.1s',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.06)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {isSelected && (
          <div style={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 6,
            width: 3,
            backgroundColor: '#2563EB',
            borderRadius: '0 2px 2px 0',
          }} />
        )}
        
        {/* Chevron */}
        <div
          onClick={(e) => hasChildren && onToggleExpand(folder.id, e)}
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            cursor: hasChildren ? 'pointer' : 'default',
            transform: isExpanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s',
            visibility: hasChildren ? 'visible' : 'hidden',
          }}
        >
          <ChevronRight style={{ width: 14, height: 14 }} />
        </div>

        {/* Folder Icon */}
        {isExpanded && hasChildren ? (
          <FolderOpen style={{
            width: 17,
            height: 17,
            marginRight: 12,
            color: isSelected ? '#2563EB' : '#64748B',
          }} />
        ) : (
          <Folder style={{
            width: 17,
            height: 17,
            marginRight: 12,
            color: isSelected ? '#2563EB' : '#64748B',
          }} />
        )}

        {/* Name */}
        <span style={{
          flex: 1,
          fontSize: 13.5,
          fontWeight: isSelected ? 600 : 500,
          color: isSelected ? '#2563EB' : '#475569',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{folder.name}</span>

        {/* Count */}
        <span style={{ fontSize: 12, color: '#94A3B8' }}>{folder.testCaseCount}</span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && children.map(child => (
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
    </>
  );
}

export default FolderPanel;
