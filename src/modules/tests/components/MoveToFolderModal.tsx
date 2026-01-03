/**
 * Move to Folder Modal
 * Select a folder to move test cases to
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, FolderOpen, Search, Check, FolderPlus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import {
  runMutationWithAudit,
  createPipelineContext,
  PipelineError,
} from '../lib/actionPipeline';

interface MoveToFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseIds: string[];
  scopeType: 'program' | 'project';
  scopeId: string;
  onSuccess?: () => void;
}

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
}

export function MoveToFolderModal({
  open,
  onOpenChange,
  caseIds,
  scopeType,
  scopeId,
  onSuccess,
}: MoveToFolderModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Fetch folders
  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['test-folders-for-modal', scopeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_folders')
        .select('id, name, parent_folder_id')
        .eq('program_id', scopeId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Folder[];
    },
    enabled: open,
  });

  // Build folder tree for display
  const buildTree = (parentId: string | null = null, depth = 0): Array<Folder & { depth: number }> => {
    const children = folders.filter(f => f.parent_folder_id === parentId);
    return children.flatMap(child => [
      { ...child, depth },
      ...buildTree(child.id, depth + 1),
    ]);
  };

  const treeItems = buildTree();
  const filtered = treeItems.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const moveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const context = createPipelineContext(user.id, scopeType, scopeId);

      return runMutationWithAudit({ folderId: selectedFolderId, caseIds }, {
        context,
        action: 'move',
        entityType: 'test_cases',
        activityType: 'updated',
        successMessage: `${caseIds.length} case(s) moved`,
        queryClient,
        invalidateKeys: [
          ['test-cases', scopeId],
        ],
        mutationFn: async () => {
          const { error } = await supabase
            .from('test_cases')
            .update({ folder_id: selectedFolderId, updated_at: new Date().toISOString() })
            .in('id', caseIds);
          if (error) throw new PipelineError('unknown', error.message);
          return { folderId: selectedFolderId, count: caseIds.length };
        },
        getAuditInfo: () => ({
          entityId: caseIds[0],
          description: `Moved ${caseIds.length} case(s) to folder`,
          metadata: { caseIds, folderId: selectedFolderId },
        }),
      });
    },
    onSuccess: () => {
      onOpenChange(false);
      setSelectedFolderId(null);
      onSuccess?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-surface-1 border-border-default">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4" />
            Move {caseIds.length} case(s) to Folder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search folders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-surface-2"
            />
          </div>

          <ScrollArea className="h-[250px] border border-border-default rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
              </div>
            ) : (
              <div className="p-1">
                {/* Root option */}
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                    selectedFolderId === null
                      ? 'bg-accent-subtle border border-accent-primary/30'
                      : 'hover:bg-surface-3'
                  )}
                >
                  <FolderOpen className="h-4 w-4 text-text-tertiary" />
                  <span className="text-sm text-text-primary flex-1">(Root - No Folder)</span>
                  {selectedFolderId === null && (
                    <Check className="h-4 w-4 text-accent-primary shrink-0" />
                  )}
                </button>

                {filtered.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                      selectedFolderId === folder.id
                        ? 'bg-accent-subtle border border-accent-primary/30'
                        : 'hover:bg-surface-3'
                    )}
                    style={{ paddingLeft: `${12 + folder.depth * 16}px` }}
                  >
                    {folder.depth > 0 && (
                      <ChevronRight className="h-3 w-3 text-text-tertiary" />
                    )}
                    <FolderOpen className="h-4 w-4 text-text-tertiary" />
                    <span className="text-sm text-text-primary flex-1 truncate">{folder.name}</span>
                    {selectedFolderId === folder.id && (
                      <Check className="h-4 w-4 text-accent-primary shrink-0" />
                    )}
                  </button>
                ))}

                {folders.length === 0 && (
                  <div className="text-center py-6 text-text-tertiary text-sm">
                    <p>No folders yet</p>
                    <p className="text-xs mt-1">Use the folder tree to create folders</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => moveMutation.mutate()}
            disabled={moveMutation.isPending}
            className="bg-accent-primary text-white"
          >
            {moveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
