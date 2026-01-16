/**
 * Folder Tree Component
 * Recursive tree structure for folders and suites
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronRight, Folder, FolderOpen, FileText } from 'lucide-react';
import { useRepositoryStore } from '@/stores/repositoryStore';
import { cn } from '@/lib/utils';
import type { TreeNode } from '@/types/test-repository';
import { Input } from '@/components/ui/input';

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
}

function TreeNodeItem({ node, depth }: TreeNodeItemProps) {
  const {
    expandedFolders,
    toggleFolder,
    selectedId,
    selectItem,
    renamingId,
    startRename,
    finishRename,
    cancelRename,
    openContextMenu,
    searchQuery,
  } = useRepositoryStore();

  const [renameValue, setRenameValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFolder = node.type === 'folder';
  const isExpanded = expandedFolders.has(node.id);
  const isSelected = selectedId === node.id;
  const isRenaming = renamingId === node.id;

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Filter by search
  const matchesSearch = !searchQuery || 
    node.name.toLowerCase().includes(searchQuery.toLowerCase());

  const hasMatchingChildren = node.children?.some(child => 
    child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    child.children?.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (searchQuery && !matchesSearch && !hasMatchingChildren) {
    return null;
  }

  const handleClick = () => {
    if (isFolder) {
      toggleFolder(node.id);
    }
    selectItem(node.id, node.type);
  };

  const handleDoubleClick = () => {
    startRename(node.id);
    setRenameValue(node.name);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu(node.id, node.type, e.clientX, e.clientY);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishRename(renameValue);
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  const handleRenameBlur = () => {
    finishRename(renameValue);
  };

  // Force expand if search matches child
  const shouldExpand = isExpanded || (searchQuery && hasMatchingChildren);

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1.5 cursor-pointer transition-colors rounded-sm mx-1",
          "hover:bg-muted/50",
          isSelected && "bg-primary/10 border-l-[3px] border-l-primary ml-0 pl-[calc(0.5rem-3px)]"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Chevron for folders */}
        {isFolder && (
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform",
              shouldExpand && "rotate-90"
            )}
          />
        )}
        {!isFolder && <div className="w-3.5" />}

        {/* Icon */}
        {isFolder ? (
          shouldExpand ? (
            <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
          )
        ) : (
          <FileText className="w-4 h-4 text-primary shrink-0" />
        )}

        {/* Label or Input */}
        {isRenaming ? (
          <Input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameBlur}
            className="h-5 px-1 py-0 text-xs flex-1"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-xs font-medium text-foreground truncate flex-1">
            {node.name}
          </span>
        )}

        {/* Test Count */}
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {node.testCount}
        </span>
      </div>

      {/* Children */}
      {isFolder && shouldExpand && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNodeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree() {
  const { tree } = useRepositoryStore();

  return (
    <div>
      {tree.map(node => (
        <TreeNodeItem key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}
