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
  Settings 
} from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  testCaseCount: number;
  icon?: string;
}

interface FolderPanelProps {
  folders: FolderItem[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: () => void;
  totalTestCases: number;
}

// Lucide icon mapping function based on folder name
const getFolderIcon = (folderName: string, isSelected: boolean = false, hasParent: boolean = false) => {
  const color = isSelected ? '#2563EB' : '#64748B';
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
  totalTestCases,
}: FolderPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
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
    <div className="th-folder-panel" style={{
      width: 280,
      minWidth: 280,
      maxWidth: 280,
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
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#64748B',
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
            color: '#94A3B8',
            pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              paddingLeft: 32,
              paddingRight: 12,
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              color: '#0F172A',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              outline: 'none',
              transition: 'all 0.15s',
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = '#FFFFFF';
              e.target.style.borderColor = '#2563EB';
              e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = '#F8FAFC';
              e.target.style.borderColor = '#E2E8F0';
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
          <span style={{ display: 'flex', alignItems: 'center', marginRight: 10 }}>{getFolderIcon('All Test Cases', selectedFolderId === null, false)}</span>
          <span style={{
            flex: 1,
            fontSize: 14,
            fontWeight: selectedFolderId === null ? 600 : 500,
            color: selectedFolderId === null ? '#2563EB' : '#334155',
          }}>All Test Cases</span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{totalTestCases}</span>
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
            depth={0}
            showNested={!searchQuery}
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
  showNested: boolean;
}

function FolderTreeItem({
  folder,
  allFolders,
  selectedFolderId,
  expandedFolders,
  onSelect,
  onToggleExpand,
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
        {showNested && (
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
          color: isSelected ? '#2563EB' : '#334155',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{folder.name}</span>

        {/* Count */}
        <span style={{ fontSize: 12, color: '#94A3B8' }}>{folder.testCaseCount}</span>
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
          depth={depth + 1}
          showNested={showNested}
        />
      ))}
    </>
  );
}

export default FolderPanel;
