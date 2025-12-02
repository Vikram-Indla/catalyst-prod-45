import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, Plus, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderActionMenu } from './FolderActionMenu';
import { CreateSetFromFolderModal } from './CreateSetFromFolderModal';
import { AddFolderToSetModal } from './AddFolderToSetModal';
import { CreateCycleFromFolderModal } from './CreateCycleFromFolderModal';
import { AddFolderToCycleModal } from './AddFolderToCycleModal';
import type { TestFolder } from '@/types/test-management';

interface FolderTreeProps {
  folders: TestFolder[];
  selectedFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolder,
  onSelectFolder,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [actionModalState, setActionModalState] = useState<{
    type: 'createSet' | 'addToSet' | 'createCycle' | 'addToCycle' | null;
    folder: TestFolder | null;
  }>({ type: null, folder: null });

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
          <span className="text-sm font-medium flex-1">{folder.name}</span>
          <FolderActionMenu
            folder={folder}
            onCreateSet={() => setActionModalState({ type: 'createSet', folder })}
            onAddToSet={() => setActionModalState({ type: 'addToSet', folder })}
            onCreateCycle={() => setActionModalState({ type: 'createCycle', folder })}
            onAddToCycle={() => setActionModalState({ type: 'addToCycle', folder })}
          />
        </div>

        {isExpanded &&
          hasChildren &&
          buildTree(folder.id, level + 1).map(child =>
            renderFolder(child, level + 1)
          )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full w-16 border-r border-border">
        <div className="p-4 border-b border-border flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Folder className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Folders</h2>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
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

      {/* Action Modals */}
      {actionModalState.folder && (
        <>
          <CreateSetFromFolderModal
            isOpen={actionModalState.type === 'createSet'}
            onClose={() => setActionModalState({ type: null, folder: null })}
            folder={{ id: actionModalState.folder.id, name: actionModalState.folder.name }}
          />
          <AddFolderToSetModal
            isOpen={actionModalState.type === 'addToSet'}
            onClose={() => setActionModalState({ type: null, folder: null })}
            folder={{ id: actionModalState.folder.id, name: actionModalState.folder.name }}
          />
          <CreateCycleFromFolderModal
            isOpen={actionModalState.type === 'createCycle'}
            onClose={() => setActionModalState({ type: null, folder: null })}
            folder={{ id: actionModalState.folder.id, name: actionModalState.folder.name }}
          />
          <AddFolderToCycleModal
            isOpen={actionModalState.type === 'addToCycle'}
            onClose={() => setActionModalState({ type: null, folder: null })}
            folder={{ id: actionModalState.folder.id, name: actionModalState.folder.name }}
          />
        </>
      )}
    </div>
  );
};
