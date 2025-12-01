import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TestFolder } from '@/types/test-management';

interface FolderTreeProps {
  folders: TestFolder[];
  selectedFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolder,
  onSelectFolder
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const buildTree = (parentId: string | null = null, level = 0): TestFolder[] => {
    return folders
      .filter(f => f.parent_folder_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const renderFolder = (folder: TestFolder, level: number) => {
    const hasChildren = folders.some(f => f.parent_folder_id === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent rounded-md transition-colors ${
            isSelected ? 'bg-brand-gold/20 text-brand-gold' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => onSelectFolder(folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0 hover:bg-transparent"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <span className="w-4" />}
          <Folder className="h-4 w-4" />
          <span className="text-sm font-medium">{folder.name}</span>
        </div>

        {isExpanded &&
          hasChildren &&
          buildTree(folder.id, level + 1).map(child =>
            renderFolder(child, level + 1)
          )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Folders</h2>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent rounded-md mb-2 ${
            selectedFolder === null ? 'bg-brand-gold/20 text-brand-gold' : ''
          }`}
          onClick={() => onSelectFolder(null)}
        >
          <Folder className="h-4 w-4" />
          <span className="text-sm font-medium">All Test Cases</span>
        </div>

        {buildTree(null, 0).map(folder => renderFolder(folder, 0))}
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full border-brand-gold text-brand-gold hover:bg-brand-gold/10"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      </div>
    </div>
  );
};
