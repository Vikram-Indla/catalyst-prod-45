/**
 * Test Folder Sidebar Component
 * Folder tree navigation for test cases, similar to TestRail's section navigation
 * Catalyst V5 Enterprise Design System
 */

import { useState, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  Plus, 
  MoreHorizontal 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// ============================================
// Types
// ============================================

export interface TestFolder {
  id: string;
  name: string;
  parentId: string | null;
  count: number;
  children: TestFolder[];
  isExpanded: boolean;
}

interface TestFolderSidebarProps {
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  totalCount?: number;
}

// ============================================
// Mock Data
// ============================================

const createMockFolders = (totalCount: number): TestFolder[] => [
  {
    id: 'all',
    name: 'All Test Cases',
    parentId: null,
    count: totalCount,
    children: [],
    isExpanded: true,
  },
  {
    id: 'folder-1',
    name: 'Authentication',
    parentId: null,
    count: 4,
    isExpanded: true,
    children: [
      { id: 'folder-1-1', name: 'Login', parentId: 'folder-1', count: 2, children: [], isExpanded: false },
      { id: 'folder-1-2', name: 'Registration', parentId: 'folder-1', count: 1, children: [], isExpanded: false },
      { id: 'folder-1-3', name: 'Password Reset', parentId: 'folder-1', count: 1, children: [], isExpanded: false },
    ],
  },
  {
    id: 'folder-2',
    name: 'Investment Portal',
    parentId: null,
    count: 5,
    isExpanded: true,
    children: [
      { id: 'folder-2-1', name: 'License Management', parentId: 'folder-2', count: 2, children: [], isExpanded: false },
      { id: 'folder-2-2', name: 'Contract Triggers', parentId: 'folder-2', count: 3, children: [], isExpanded: false },
    ],
  },
  {
    id: 'folder-3',
    name: 'Reports & Analytics',
    parentId: null,
    count: 2,
    children: [],
    isExpanded: false,
  },
  {
    id: 'folder-4',
    name: 'API Integration',
    parentId: null,
    count: 1,
    children: [],
    isExpanded: false,
  },
];

// ============================================
// Helper Functions
// ============================================

function toggleFolderExpanded(folders: TestFolder[], folderId: string): TestFolder[] {
  return folders.map(folder => {
    if (folder.id === folderId) {
      return { ...folder, isExpanded: !folder.isExpanded };
    }
    if (folder.children.length > 0) {
      return { ...folder, children: toggleFolderExpanded(folder.children, folderId) };
    }
    return folder;
  });
}

// ============================================
// Folder Tree Item Component
// ============================================

interface FolderTreeItemProps {
  folder: TestFolder;
  level: number;
  selectedFolderId: string | null;
  hoveredFolderId: string | null;
  onSelect: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
  onHover: (folderId: string | null) => void;
}

function FolderTreeItem({
  folder,
  level,
  selectedFolderId,
  hoveredFolderId,
  onSelect,
  onToggleExpand,
  onHover,
}: FolderTreeItemProps) {
  const isSelected = selectedFolderId === folder.id;
  const isHovered = hoveredFolderId === folder.id;
  const hasChildren = folder.children.length > 0;
  const isAllFolder = folder.id === 'all';

  const handleContextAction = (action: string) => {
    switch (action) {
      case 'rename':
        toast.info('Rename folder coming soon');
        break;
      case 'add-subfolder':
        toast.info('Add subfolder coming soon');
        break;
      case 'delete':
        toast.info('Delete folder coming soon');
        break;
    }
  };

  return (
    <div>
      {/* Folder Row */}
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-150',
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
        onMouseEnter={() => onHover(folder.id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Expand/Collapse Chevron */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(folder.id);
            }}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {folder.isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        ) : (
          <span className="w-[18px]" /> // Spacer for alignment
        )}

        {/* Folder Icon */}
        {isAllFolder ? (
          <Folder className={cn(
            'w-4 h-4 flex-shrink-0',
            isSelected ? 'text-blue-600' : 'text-slate-400'
          )} />
        ) : folder.isExpanded && hasChildren ? (
          <FolderOpen className={cn(
            'w-4 h-4 flex-shrink-0',
            isSelected ? 'text-blue-600' : 'text-amber-500'
          )} />
        ) : (
          <Folder className={cn(
            'w-4 h-4 flex-shrink-0',
            isSelected ? 'text-blue-600' : 'text-amber-500'
          )} />
        )}

        {/* Folder Name */}
        <span className={cn(
          'flex-1 text-sm font-medium truncate',
          isSelected ? 'text-blue-700 dark:text-blue-300' : ''
        )}>
          {folder.name}
        </span>

        {/* Count Badge */}
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
          isSelected
            ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        )}>
          {folder.count}
        </span>

        {/* More Actions (visible on hover) */}
        {!isAllFolder && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all',
                  isSelected ? 'text-blue-600' : 'text-slate-400'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => handleContextAction('rename')}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleContextAction('add-subfolder')}>
                Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleContextAction('delete')}
                className="text-red-600 focus:text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Children (if expanded) */}
      {hasChildren && folder.isExpanded && (
        <div className="animate-in slide-in-from-top-1 duration-150">
          {folder.children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              hoveredFolderId={hoveredFolderId}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onHover={onHover}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function TestFolderSidebar({ 
  selectedFolderId, 
  onFolderSelect,
  totalCount = 12,
}: TestFolderSidebarProps) {
  const [folders, setFolders] = useState<TestFolder[]>(() => createMockFolders(totalCount));
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);

  const toggleExpand = useCallback((folderId: string) => {
    setFolders(prev => toggleFolderExpanded(prev, folderId));
  }, []);

  const handleCreateFolder = () => {
    toast.info('Create folder coming soon');
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Folders
        </h3>
        <button
          onClick={handleCreateFolder}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Create folder"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Folder Tree */}
      <div className="p-2 flex-1 overflow-y-auto">
        {folders.map(folder => (
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            level={0}
            selectedFolderId={selectedFolderId}
            hoveredFolderId={hoveredFolderId}
            onSelect={onFolderSelect}
            onToggleExpand={toggleExpand}
            onHover={setHoveredFolderId}
          />
        ))}
      </div>
    </div>
  );
}
