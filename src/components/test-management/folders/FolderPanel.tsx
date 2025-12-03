/**
 * Folder Panel - Main container for folder tree with header controls
 */

import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderTree } from './FolderTree';
import { CreateFolderModal } from './CreateFolderModal';
import { useFolderState } from '@/hooks/useFolderState';
import { getFolders, getFolderCounts } from '@/services/folderService';
import { FolderNode, EntityType } from '@/types/folder';
import { useToast } from '@/hooks/use-toast';

interface FolderPanelProps {
  entityType: EntityType;
  programId: string;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  test_cases: 'Cases',
  test_sets: 'Sets',
  test_cycles: 'Cycles'
};

export const FolderPanel: React.FC<FolderPanelProps> = ({
  entityType,
  programId,
  selectedFolderId,
  onFolderSelect
}) => {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isCollapsed, toggleCollapse, expandedFolders, toggleFolder } = useFolderState(entityType);
  const { toast } = useToast();

  // Load folders
  useEffect(() => {
    loadFolders();
  }, [programId, entityType]);

  const loadFolders = async () => {
    setIsLoading(true);
    try {
      const folderData = await getFolders(programId, entityType);
      const counts = await getFolderCounts(programId, entityType);
      
      // Attach counts to folders
      const attachCounts = (nodes: FolderNode[]): FolderNode[] => {
        return nodes.map(node => ({
          ...node,
          count: counts.get(node.id) || 0,
          children: attachCounts(node.children)
        }));
      };

      setFolders(attachCounts(folderData));
    } catch (error: any) {
      toast({
        title: 'Error loading folders',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = () => {
    setIsCreateModalOpen(true);
  };

  const handleFolderCreated = async () => {
    setIsCreateModalOpen(false);
    // Ensure folders are refreshed after modal closes
    await loadFolders();
  };

  // Filter folders by search query
  const filterFolders = (nodes: FolderNode[], query: string): FolderNode[] => {
    if (!query) return nodes;

    const lowerQuery = query.toLowerCase();
    return nodes.reduce<FolderNode[]>((acc, node) => {
      const matches = node.name.toLowerCase().includes(lowerQuery);
      const filteredChildren = filterFolders(node.children, query);

      if (matches || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren
        });
      }

      return acc;
    }, []);
  };

  const filteredFolders = filterFolders(folders, searchQuery);

  if (isCollapsed) {
    return (
      <div className="folder-panel-collapsed border-r bg-surface-gray-50">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-sm font-semibold text-foreground">{ENTITY_LABELS[entityType]}</h3>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleCollapse}
              className="h-7 w-7 text-brand-gold hover:text-brand-gold-hover"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="folder-panel w-[300px] border-r bg-surface-gray-50 flex flex-col h-full">
      {/* Header */}
      <div className="folder-panel-header flex items-center justify-between p-3 border-b bg-background">
        <h3 className="text-base font-semibold text-foreground">
          {ENTITY_LABELS[entityType]}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleCollapse}
            className="h-7 w-7 text-brand-gold hover:text-brand-gold-hover"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleCreateFolder}
            className="h-7 px-3 bg-brand-gold hover:bg-brand-gold-hover text-white font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading folders...
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <p className="text-sm text-muted-foreground mb-2">
              {searchQuery ? 'No folders match your search' : 'No folders yet'}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateFolder}
                className="text-brand-gold hover:text-brand-gold-hover"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create first folder
              </Button>
            )}
          </div>
        ) : (
          <FolderTree
            folders={filteredFolders}
            entityType={entityType}
            programId={programId}
            selectedFolderId={selectedFolderId}
            onFolderSelect={onFolderSelect}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            onRefresh={loadFolders}
          />
        )}
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleFolderCreated}
        entityType={entityType}
        programId={programId}
        folders={folders}
      />
    </div>
  );
};
