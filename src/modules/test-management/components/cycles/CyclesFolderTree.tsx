/**
 * CyclesFolderTree - Folder tree navigation for test cycles
 * Based on Catalyst V5 Phase 5 spec
 */

import React, { useState } from 'react';
import { 
  Search, 
  Folder, 
  FolderOpen,
  ChevronDown, 
  ChevronRight, 
  Archive, 
  LayoutList,
  Plus,
  MoreVertical
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface CycleFolder {
  id: string;
  name: string;
  count: number;
  children?: CycleFolder[];
}

interface CyclesFolderTreeProps {
  folders: CycleFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onSearch: (query: string) => void;
  totalCyclesCount?: number;
  archivedCount?: number;
  onCreateFolder?: () => void;
}

export function CyclesFolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onSearch,
  totalCyclesCount = 0,
  archivedCount = 0,
  onCreateFolder,
}: CyclesFolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['sprint-cycles']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };

  const renderFolder = (folder: CycleFolder, depth: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <button
          onClick={() => onSelectFolder(folder.id)}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors group',
            isSelected 
              ? 'bg-primary/10 text-primary font-medium' 
              : 'text-foreground hover:bg-muted'
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-selected={isSelected}
        >
          {hasChildren && (
            <span 
              className="w-4 h-4 flex items-center justify-center cursor-pointer"
              onClick={(e) => toggleFolder(folder.id, e)}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-4" />}
          
          {isExpanded ? (
            <FolderOpen className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-amber-500')} />
          ) : (
            <Folder className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-amber-500')} />
          )}
          
          <span className="flex-1 text-left truncate">{folder.name}</span>
          
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded',
            isSelected ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
          )}>
            {folder.count}
          </span>

          {/* Context menu on hover */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem>Rename</DropdownMenuItem>
              <DropdownMenuItem>Move</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </button>
        
        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {folder.children!.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search cycles..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-9 h-9"
            aria-label="Search cycles"
          />
        </div>
      </div>
      
      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-3" role="tree" aria-label="Cycle folders">
        {/* All Cycles */}
        <div className="mb-2">
          <button
            onClick={() => onSelectFolder(null)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors',
              selectedFolderId === null 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-foreground hover:bg-muted'
            )}
            aria-selected={selectedFolderId === null}
          >
            <LayoutList className={cn('w-4 h-4', selectedFolderId === null ? 'text-primary' : 'text-muted-foreground')} />
            <span className="flex-1 text-left">All Cycles</span>
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              selectedFolderId === null ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
            )}>
              {totalCyclesCount}
            </span>
          </button>
        </div>
        
        {/* Create Folder Button */}
        {onCreateFolder && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 mb-2 text-muted-foreground hover:text-foreground"
            onClick={onCreateFolder}
          >
            <Plus className="w-4 h-4" />
            New Folder
          </Button>
        )}
        
        {/* Folder Tree */}
        <div className="space-y-0.5">
          {folders.map((folder) => renderFolder(folder))}
        </div>
        
        {/* Archived Section */}
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => onSelectFolder('archived')}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors',
              selectedFolderId === 'archived' 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Archive className="w-4 h-4" />
            <span className="flex-1 text-left">Archived</span>
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded">
              {archivedCount}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default CyclesFolderTree;
