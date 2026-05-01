import { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderOpen, 
  Plus, 
  ChevronsLeft, 
  ChevronRight, 
  Search, 
  Shield, 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Plug, 
  Settings,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus
} from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  testCaseCount: number;
  icon?: string;
}

interface FolderContextMenuState {
  x: number;
  y: number;
  folderId: string;
  folderName: string;
}

interface FolderPanelProps {
  folders: FolderItem[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onDeleteFolder?: (folderId: string, folderName: string) => void;
  onRenameFolder?: (folderId: string, currentName: string) => void;
  totalTestCases: number;
}

// Lucide icon mapping function based on folder name
const getFolderIcon = (folderName: string, isSelected: boolean = false, hasParent: boolean = false) => {
  const color = isSelected ? 'var(--cp-blue)' : 'var(--fg-3)';
  const size = 16;
  
  // Child folders always get simple folder icon
  if (hasParent) {
    return <Folder size={size} color={color} />;
  }
  
  const name = folderName.toLowerCase();
  if (name === 'all test cases') return <FolderOpen size={size} color={color} />;
  if (name.includes('auth') || name.includes('login') || name.includes('password')) return <Shield size={size} color={color} />;
  if (name.includes('dashboard')) return <LayoutDashboard size={size} color={color} />;
  if (name.includes('user')) return <Users size={size} color={color} />;
  if (name.includes('report')) return <BarChart3 size={size} color={color} />;
  if (name.includes('api') || name.includes('endpoint')) return <Plug size={size} color={color} />;
  if (name.includes('setting')) return <Settings size={size} color={color} />;
  return <Folder size={size} color={color} />;
};

export function FolderPanel({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  totalTestCases,
}: FolderPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [folderContextMenu, setFolderContextMenu] = useState<FolderContextMenuState | null>(null);
  
  // Auto-expand parent folders that have children
  const getInitialExpandedFolders = () => {
    const expanded = new Set<string>();
    folders.forEach(folder => {
      const hasChildren = folders.some(f => f.parentId === folder.id);
      if (hasChildren) {
        expanded.add(folder.id);
      }
    });
    return expanded;
  };
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(getInitialExpandedFolders());
  const [searchQuery, setSearchQuery] = useState('');

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-folder-menu]')) {
        setFolderContextMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, []);

  // Update expanded folders when folders prop changes
  useEffect(() => {
    setExpandedFolders(getInitialExpandedFolders());
  }, [folders.length]); // Only re-run when folder count changes

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

  const handleFolderRightClick = (e: React.MouseEvent, folder: FolderItem) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu({
      x: e.clientX,
      y: e.clientY,
      folderId: folder.id,
      folderName: folder.name,
    });
  };

  const rootFolders = folders.filter(f => f.parentId === null);
  
  // Filter folders by search
  const filterFolders = (items: FolderItem[]): FolderItem[] => {
    if (!searchQuery.trim()) return items;
    return items.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const filteredRootFolders = searchQuery ? filterFolders(folders) : rootFolders;

  // Collapsed state - show only icon
  if (isCollapsed) {
    return (
      <div style={{
        width: 48,
        backgroundColor: 'var(--cp-float)',
        borderRight: '1px solid var(--divider)',
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
            height: 50,
            padding: 0,
            border: 'none',
            borderRadius: 8,
            backgroundColor: 'var(--bg-1)',
            color: 'var(--fg-3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--cp-blue) 8%, transparent)';
            e.currentTarget.style.color = 'var(--cp-blue)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-1)';
            e.currentTarget.style.color = 'var(--fg-3)';
          }}
        >
          <Folder style={{ width: 20, height: 20 }} />
        </button>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="th-folder-panel" style={{
      width: 280,
      minWidth: 280,
      maxWidth: 280,
      backgroundColor: 'var(--cp-float)',
      borderRight: '1px solid var(--divider)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        height: 48,
        padding: '0 12px 0 16px',
        borderBottom: '1px solid var(--cp-bd-zone)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--fg-3)',
        }}>Folders</span>
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
              color: 'var(--fg-4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cp-bd-zone)';
              e.currentTarget.style.color = 'var(--fg-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--fg-4)';
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
              color: 'var(--fg-4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cp-bd-zone)';
              e.currentTarget.style.color = 'var(--fg-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--fg-4)';
            }}
          >
            <ChevronsLeft style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 14,
            height: 14,
            color: 'var(--fg-4)',
            pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: 50,
              paddingLeft: 32,
              paddingRight: 12,
              fontSize: 13,
              fontFamily: 'var(--cp-font-body)',
              color: 'var(--fg-1)',
              backgroundColor: 'var(--bg-1)',
              border: '1px solid var(--divider)',
              borderRadius: 8,
              outline: 'none',
              transition: 'all 0.15s',
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = 'var(--cp-float)';
              e.target.style.borderColor = 'var(--cp-blue)';
              e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = 'var(--bg-1)';
              e.target.style.borderColor = 'var(--divider)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Folder Tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 8px 0' }}>
        {/* All Test Cases */}
        <div
          onClick={() => onSelectFolder(null)}
          style={{
            height: 50,
            padding: '8px 12px',
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
              backgroundColor: 'var(--cp-blue)',
              borderRadius: '0 2px 2px 0',
            }} />
          )}
          <span style={{ display: 'flex', alignItems: 'center', marginRight: 10 }}>{getFolderIcon('All Test Cases', selectedFolderId === null, false)}</span>
          <span style={{
            flex: 1,
            fontSize: 14,
            fontWeight: selectedFolderId === null ? 600 : 500,
            color: selectedFolderId === null ? 'var(--cp-blue)' : 'var(--fg-2)',
          }}>All Test Cases</span>
          <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>{totalTestCases}</span>
        </div>

        {/* Folders */}
        {(searchQuery ? filteredRootFolders : rootFolders).map(folder => (
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            allFolders={folders}
            selectedFolderId={selectedFolderId}
            expandedFolders={expandedFolders}
            onSelect={onSelectFolder}
            onToggleExpand={toggleExpand}
            onContextMenu={handleFolderRightClick}
            depth={0}
            showNested={!searchQuery}
          />
        ))}
      </div>

      {/* Folder Context Menu */}
      {folderContextMenu && (
        <div
          data-folder-menu
          style={{
            position: 'fixed',
            top: folderContextMenu.y,
            left: folderContextMenu.x,
            backgroundColor: 'var(--cp-float)',
            border: '1px solid var(--divider)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 99999,
            minWidth: 160,
            padding: '4px 0',
          }}
        >
          {onRenameFolder && (
            <button
              onClick={() => {
                onRenameFolder(folderContextMenu.folderId, folderContextMenu.folderName);
                setFolderContextMenu(null);
              }}
              style={{
                width: '100%',
                height: 50,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: 13,
                color: 'var(--fg-2)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Pencil size={14} color="var(--fg-3)" />
              Rename
            </button>
          )}
          {onDeleteFolder && (
            <button
              onClick={() => {
                onDeleteFolder(folderContextMenu.folderId, folderContextMenu.folderName);
                setFolderContextMenu(null);
              }}
              style={{
                width: '100%',
                height: 50,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: 13,
                color: 'var(--sem-danger)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Trash2 size={14} color="var(--sem-danger)" />
              Delete
            </button>
          )}
        </div>
      )}
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
  onContextMenu: (e: React.MouseEvent, folder: FolderItem) => void;
  depth: number;
  showNested: boolean;
}

function FolderTreeItem({
  folder,
  allFolders,
  selectedFolderId,
  expandedFolders,
  onSelect,
  onToggleExpand,
  onContextMenu,
  depth,
  showNested,
}: FolderTreeItemProps) {
  const children = allFolders.filter(f => f.parentId === folder.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasParent = folder.parentId !== null;
  const icon = getFolderIcon(folder.name, isSelected, hasParent);

  return (
    <>
      <div
        onClick={() => onSelect(folder.id)}
        onContextMenu={(e) => onContextMenu(e, folder)}
        style={{
          height: 50,
          padding: '8px 12px',
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
            backgroundColor: 'var(--cp-blue)',
            borderRadius: '0 2px 2px 0',
          }} />
        )}
        
        {/* Chevron */}
        {showNested && (
          <div
            onClick={(e) => hasChildren && onToggleExpand(folder.id, e)}
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg-4)',
              cursor: hasChildren ? 'pointer' : 'default',
              transform: isExpanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.15s',
              visibility: hasChildren ? 'visible' : 'hidden',
              marginRight: 2,
            }}
          >
            <ChevronRight style={{ width: 14, height: 14 }} />
          </div>
        )}

        {/* Lucide Icon */}
        <span style={{ display: 'flex', alignItems: 'center', marginRight: 10 }}>{icon}</span>

        {/* Name */}
        <span style={{
          flex: 1,
          fontSize: 14,
          fontWeight: isSelected ? 600 : 500,
          color: isSelected ? 'var(--cp-blue)' : 'var(--fg-2)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{folder.name}</span>

        {/* Count */}
        <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>{folder.testCaseCount}</span>
      </div>

      {/* Children */}
      {showNested && hasChildren && isExpanded && children.map(child => (
        <FolderTreeItem
          key={child.id}
          folder={child}
          allFolders={allFolders}
          selectedFolderId={selectedFolderId}
          expandedFolders={expandedFolders}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          onContextMenu={onContextMenu}
          depth={depth + 1}
          showNested={showNested}
        />
      ))}
    </>
  );
}

export default FolderPanel;
