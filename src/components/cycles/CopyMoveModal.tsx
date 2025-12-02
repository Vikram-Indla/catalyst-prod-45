/**
 * CATALYST TESTS - Copy/Move Cycle Modal
 * Copy cycle with options or move to different folder
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Copy, FolderInput, Folder, ChevronRight } from 'lucide-react';
import { copyCycle, moveCycles } from '@/services/cycleManagementService';

interface CopyMoveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'copy' | 'move';
  cycleId: string;
  cycleName: string;
}

export function CopyMoveModal({ open, onOpenChange, mode, cycleId, cycleName }: CopyMoveModalProps) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState(`${cycleName} (Copy)`);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [copyOptions, setCopyOptions] = useState({
    copy_cases: true,
    copy_assignments: false,
    copy_execution_results: false,
    copy_attachments: true,
  });

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['test-folders-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_folders')
        .select('id, name, parent_folder_id')
        .eq('entity_type', 'test_cycles')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const copyMutation = useMutation({
    mutationFn: () => copyCycle({
      source_cycle_id: cycleId,
      new_name: newName,
      destination_folder_id: selectedFolderId,
      ...copyOptions,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Cycle copied successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const moveMutation = useMutation({
    mutationFn: () => moveCycles({
      cycle_ids: [cycleId],
      target_folder_id: selectedFolderId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Cycle moved successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    if (mode === 'copy') {
      if (!newName.trim()) {
        toast.error('Please enter a name for the copy');
        return;
      }
      copyMutation.mutate();
    } else {
      moveMutation.mutate();
    }
  };

  const isLoading = copyMutation.isPending || moveMutation.isPending;

  // Build folder tree
  const rootFolders = folders.filter((f) => !f.parent_folder_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {mode === 'copy' ? (
              <>
                <Copy className="h-5 w-5 text-brand-gold" />
                Copy Cycle
              </>
            ) : (
              <>
                <FolderInput className="h-5 w-5 text-brand-gold" />
                Move Cycle
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === 'copy' && (
            <>
              <div>
                <Label htmlFor="newName">New Cycle Name</Label>
                <Input
                  id="newName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div className="space-y-3">
                <Label>Copy Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="copy_cases"
                      checked={copyOptions.copy_cases}
                      onCheckedChange={(checked) =>
                        setCopyOptions((prev) => ({ ...prev, copy_cases: !!checked }))
                      }
                    />
                    <Label htmlFor="copy_cases" className="text-sm font-normal">
                      Copy test cases
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="copy_assignments"
                      checked={copyOptions.copy_assignments}
                      onCheckedChange={(checked) =>
                        setCopyOptions((prev) => ({ ...prev, copy_assignments: !!checked }))
                      }
                      disabled={!copyOptions.copy_cases}
                    />
                    <Label htmlFor="copy_assignments" className="text-sm font-normal">
                      Copy tester assignments
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="copy_execution_results"
                      checked={copyOptions.copy_execution_results}
                      onCheckedChange={(checked) =>
                        setCopyOptions((prev) => ({ ...prev, copy_execution_results: !!checked }))
                      }
                      disabled={!copyOptions.copy_cases}
                    />
                    <Label htmlFor="copy_execution_results" className="text-sm font-normal">
                      Copy execution results
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="copy_attachments"
                      checked={copyOptions.copy_attachments}
                      onCheckedChange={(checked) =>
                        setCopyOptions((prev) => ({ ...prev, copy_attachments: !!checked }))
                      }
                    />
                    <Label htmlFor="copy_attachments" className="text-sm font-normal">
                      Copy attachments
                    </Label>
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Destination Folder</Label>
            <ScrollArea className="h-48 mt-1.5 border border-border rounded-md">
              <div className="p-2">
                <div
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
                    selectedFolderId === null ? 'bg-brand-gold/10 border border-brand-gold' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedFolderId(null)}
                >
                  <Folder className="h-4 w-4" />
                  <span className="text-sm">Root (No folder)</span>
                </div>
                {rootFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
                      selectedFolderId === folder.id ? 'bg-brand-gold/10 border border-brand-gold' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Folder className="h-4 w-4 text-brand-gold" />
                    <span className="text-sm">{folder.name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-brand-gold hover:bg-brand-gold/90 text-background"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'copy' ? 'Copy Cycle' : 'Move Cycle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
