/**
 * CATALYST TESTS - Generic Folder Panel
 * Reusable folder panel component for test_cases, test_sets, and test_cycles
 */

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, Plus, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FolderActionMenu } from './FolderActionMenu';
import { CreateSetFromFolderModal } from './CreateSetFromFolderModal';
import { AddFolderToSetModal } from './AddFolderToSetModal';
import { CreateCycleFromFolderModal } from './CreateCycleFromFolderModal';
import { AddFolderToCycleModal } from './AddFolderToCycleModal';
import type { TestFolder } from '@/types/test-management';

type EntityType = 'test_cases' | 'test_sets' | 'test_cycles';

interface FolderPanelProps {
  entityType: EntityType;
  folders: TestFolder[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  test_cases: 'Test Cases',
  test_sets: 'Test Sets',
  test_cycles: 'Test Cycles',
};

export const FolderPanel: React.FC<FolderPanelProps> = ({
  entityType,
  folders,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [actionModalState, setActionModalState] = useState<{
    type: 'createSet' | 'addToSet' | 'createCycle' | 'addToCycle' | null;
    folder: TestFolder | null;
  }>({ type: null, folder: null });

  const entityLabel = ENTITY_LABELS[entityType];

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
      .filter((f) => f.parent_folder_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const renderFolder = (folder: TestFolder, level: number) => {
    const hasChildren = folders.some((f) => f.parent_folder_id === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent rounded-md transition-colors ${
            isSelected ? 'bg-brand-gold/20 text-brand-gold' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => onFolderSelect(folder.id)}
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
          {entityType === 'test_cases' && (
            <FolderActionMenu
              folder={folder}
              onCreateSet={() => setActionModalState({ type: 'createSet', folder })}
              onAddToSet={() => setActionModalState({ type: 'addToSet', folder })}
              onCreateCycle={() => setActionModalState({ type: 'createCycle', folder })}
              onAddToCycle={() => setActionModalState({ type: 'addToCycle', folder })}
            />
          )}
        </div>

        {isExpanded &&
          hasChildren &&
          buildTree(folder.id, level + 1).map((child) => renderFolder(child, level + 1))}
      </div>
    );
  };

  // Collapsed state
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full w-16 border-r border-border">
        <div className="p-4 border-b border-border flex items-center justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Expand folder panel</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Folder className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">Folders</h3>
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onToggleCollapse}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Collapse folder panel</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCreateFolder}
                    className="h-8 w-8 text-brand-gold hover:bg-brand-gold/10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Create new folder</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Folder list */}
      <ScrollArea className="flex-1 p-2">
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent rounded-md mb-2 ${
            selectedFolderId === null ? 'bg-brand-gold/20 text-brand-gold' : ''
          }`}
          onClick={() => onFolderSelect(null)}
        >
          <Folder className="h-4 w-4" />
          <span className="text-sm font-medium">All {entityLabel}</span>
        </div>

        {buildTree(null, 0).map((folder) => renderFolder(folder, 0))}
      </ScrollArea>

      {/* Action Modals - Only for test_cases */}
      {entityType === 'test_cases' && actionModalState.folder && (
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
