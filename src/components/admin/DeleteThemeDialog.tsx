/**
 * DeleteThemeDialog - Handles theme deletion with linked items warning
 * Shows linked epics and allows reassignment before deletion
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Link2, ArrowRight } from 'lucide-react';
import { 
  useThemeLinkedEpics, 
  useReassignEpicsToTheme, 
  useDeleteThemeGroup,
  ThemeGroupWithCounts 
} from '@/hooks/useThemeGroups';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DeleteThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeGroupWithCounts | null;
  allThemes: ThemeGroupWithCounts[];
}

export function DeleteThemeDialog({
  open,
  onOpenChange,
  theme,
  allThemes,
}: DeleteThemeDialogProps) {
  const [targetThemeId, setTargetThemeId] = useState<string>('');
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');
  
  const { data: linkedEpics = [], isLoading: loadingEpics } = useThemeLinkedEpics(theme?.id || null);
  const reassignMutation = useReassignEpicsToTheme();
  const deleteMutation = useDeleteThemeGroup();
  
  const hasLinkedItems = (theme?.epic_count || 0) > 0;
  const availableThemes = allThemes.filter(t => t.id !== theme?.id && t.status === 'active');
  
  useEffect(() => {
    if (open) {
      setStep('warning');
      setTargetThemeId('');
    }
  }, [open]);
  
  const handleReassignAndDelete = async () => {
    if (!theme) return;
    
    try {
      // Reassign epics to target theme (or null to unlink)
      await reassignMutation.mutateAsync({
        fromThemeId: theme.id,
        toThemeId: targetThemeId || null,
      });
      
      // Then delete the theme
      await deleteMutation.mutateAsync(theme.id);
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleDirectDelete = async () => {
    if (!theme) return;
    
    try {
      await deleteMutation.mutateAsync(theme.id);
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  if (!theme) return null;
  
  const isPending = reassignMutation.isPending || deleteMutation.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Theme: {theme.name}
          </DialogTitle>
          <DialogDescription>
            {hasLinkedItems
              ? 'This theme has linked items. You must reassign them before deletion.'
              : 'Are you sure you want to delete this theme? This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>
        
        {hasLinkedItems ? (
          <div className="space-y-4">
            {/* Linked items summary */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium mb-2">
                <Link2 className="h-4 w-4" />
                Linked Items
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p>• {theme.epic_count} Epic{theme.epic_count !== 1 ? 's' : ''}</p>
                {theme.objective_count > 0 && (
                  <p>• {theme.objective_count} Objective link{theme.objective_count !== 1 ? 's' : ''} (will be removed)</p>
                )}
              </div>
            </div>
            
            {/* List of linked epics */}
            {linkedEpics.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Linked Epics:</Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-1">
                    {linkedEpics.map(epic => (
                      <div key={epic.id} className="text-sm py-1 px-2 rounded bg-muted/50">
                        <span className="font-mono text-xs text-muted-foreground mr-2">
                          {epic.epic_key}
                        </span>
                        {epic.name}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* Target theme selection */}
            <div>
              <Label className="mb-2 block">Move epics to:</Label>
              <Select value={targetThemeId} onValueChange={setTargetThemeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target theme (or leave empty to unlink)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlink">
                    <span className="text-muted-foreground italic">Unlink from any theme</span>
                  </SelectItem>
                  {availableThemes.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        {t.color_tag && (
                          <span 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: t.color_tag }}
                          />
                        )}
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This theme has no linked items and can be safely deleted.
            </p>
          </div>
        )}
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          
          {hasLinkedItems ? (
            <Button 
              variant="destructive" 
              onClick={handleReassignAndDelete}
              disabled={isPending}
            >
              {isPending ? 'Processing...' : (
                <>
                  Move Items & Delete
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              onClick={handleDirectDelete}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete Theme'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
