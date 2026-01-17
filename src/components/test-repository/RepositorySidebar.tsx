/**
 * Repository Sidebar
 * Contains tree navigation for folders and suites
 * Now wired to Supabase via useRepositoryData
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, ChevronDown, ChevronUp, FolderPlus, FileText, Loader2 } from 'lucide-react';
import { useRepositoryStore } from '@/stores/repositoryStore';
import { useRepositoryData } from '@/hooks/test-management/useRepositoryData';
import { useProjects } from '@/hooks/test-management/useProjects';
import { FolderTree } from './FolderTree';
import { cn } from '@/lib/utils';

export function RepositorySidebar() {
  const { 
    searchQuery, 
    setSearchQuery, 
    expandAll, 
    collapseAll,
    tree,
    setTree,
    openNewFolderModal,
    openNewSuiteModal,
  } = useRepositoryStore();

  // Get current project
  const { data: projects } = useProjects();
  const currentProjectId = projects?.[0]?.id;

  // Fetch real folder data from Supabase
  const { tree: realTree, isLoading, totalTestCount } = useRepositoryData(currentProjectId);

  // Sync real data to store when it changes
  useEffect(() => {
    if (realTree && realTree.length > 0) {
      setTree(realTree);
    }
  }, [realTree, setTree]);

  // Use store tree (which gets populated from real data)
  const displayTree = tree.length > 0 ? tree : realTree;
  const totalTests = totalTestCount || displayTree.reduce((sum, node) => sum + node.testCount, 0);

  return (
    <aside 
      className="w-[300px] border-r border-border bg-card flex flex-col shrink-0"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Test Repository</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="default" className="h-7 px-2 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem 
                className="text-xs"
                onClick={() => openNewFolderModal()}
              >
                <FolderPlus className="w-3.5 h-3.5 mr-2" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-xs"
                onClick={() => openNewSuiteModal()}
              >
                <FileText className="w-3.5 h-3.5 mr-2" />
                New Test Suite
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search folders & suites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-muted/50"
          />
        </div>
      </div>

      {/* Expand/Collapse Controls */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={expandAll}
        >
          <ChevronDown className="w-3 h-3 mr-1" />
          Expand All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={collapseAll}
        >
          <ChevronUp className="w-3 h-3 mr-1" />
          Collapse All
        </Button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <FolderTree />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-muted/30">
        <div className="text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground">{totalTests}</span> tests in repository
        </div>
      </div>
    </aside>
  );
}
