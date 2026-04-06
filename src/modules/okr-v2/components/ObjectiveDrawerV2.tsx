/**
 * =====================================================
 * Objective Drawer V2 - Catalyst Theme Styled
 * =====================================================
 * 
 * Styled to match CatalystThemeDrawer exactly.
 * Features premium progress bar, KPI cards, and enterprise styling.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useObjectiveV2, useUpdateObjectiveV2, useDeleteObjectiveV2, useCreateObjectiveV2 } from '@/hooks/useObjectivesV2';
import { supabase } from '@/integrations/supabase/client';
import { useKeyResultsV2 } from '@/hooks/useKeyResultsV2';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Trash2, Copy, X, Pencil, Link as LinkIcon, 
  MoreVertical, Download, Target, Clock, Users, Calendar,
  TrendingUp, HelpCircle
} from 'lucide-react';
import { ObjectiveOverviewTabV2, ObjectiveFormData } from './ObjectiveOverviewTabV2';
import { KeyResultsTabV2 } from './KeyResultsTabV2';
import { LinkedWorkTabV2 } from './LinkedWorkTabV2';
import { UnifiedLinksTab } from '@/components/shared/UnifiedLinksTab';
import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { logAuditEntry, getChangedFields } from '@/lib/auditLogger';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ObjectiveDrawerV2Props {
  objectiveId: string | null;
  open: boolean;
  onClose: () => void;
  onDuplicated?: (newObjectiveId: string) => void;
}

// Format objective key
function formatObjectiveKey(id: string): string {
  return `OBJ-${id.slice(0, 4).toUpperCase()}`;
}

// Determine health from progress (v2 logic)
function determineHealthFromProgress(progress: number): string {
  if (progress >= 70) return 'good';
  if (progress >= 40) return 'fair';
  if (progress >= 20) return 'at_risk';
  return 'poor';
}

function getHealthColor(health?: string): string {
  switch (health) {
    case 'good': return 'hsl(173 58% 39%)';
    case 'fair': return 'hsl(38 92% 50%)';
    case 'poor': return 'hsl(0 84% 60%)';
    case 'at_risk': return 'hsl(25 95% 53%)';
    default: return 'hsl(var(--muted-foreground))';
  }
}

// Premium Progress Bar - matching CatalystThemeDrawer
function PremiumProgressBar({ progress, health }: { progress: number; health: string }) {
  const getProgressColor = () => {
    if (progress === 0) return {
      fill: 'hsl(var(--muted))',
      glow: 'none',
      text: 'hsl(var(--muted-foreground))'
    };
    if (progress === 100) return {
      fill: 'linear-gradient(90deg, hsl(var(--success)) 0%, hsl(173 58% 45%) 100%)',
      glow: '0 0 20px hsl(var(--success) / 0.4), 0 0 40px hsl(var(--success) / 0.2)',
      text: 'hsl(var(--success))'
    };
    return {
      fill: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(217 91% 65%) 100%)',
      glow: '0 0 16px hsl(var(--primary) / 0.3)',
      text: 'hsl(var(--primary))'
    };
  };

  const colors = getProgressColor();

  return (
    <div 
      className="px-6 py-5"
      style={{ 
        background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.3) 100%)',
        borderBottom: '1px solid hsl(var(--border))'
      }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded-lg"
            style={{ background: 'hsl(var(--primary) / 0.1)' }}
          >
            <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
          </div>
          <span 
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            Overall Progress
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span 
            className="text-2xl font-bold tabular-nums tracking-tight"
            style={{ color: colors.text }}
          >
            {progress}%
          </span>
          <button
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            title="How is progress calculated?"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Progress Track */}
      <div 
        className="relative h-3 w-full rounded-full overflow-hidden"
        style={{ 
          background: 'hsl(var(--muted))',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, #1F1F1F 10px, #1F1F1F 20px)'
          }}
        />
        <div 
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{ 
            width: `${Math.max(progress, 0)}%`,
            background: colors.fill,
            boxShadow: colors.glow
          }}
        >
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)'
            }}
          />
        </div>
        {[25, 50, 75].map((marker) => (
          <div
            key={marker}
            className="absolute top-0 bottom-0 w-px"
            style={{ 
              left: `${marker}%`,
              background: 'hsl(var(--border))',
              opacity: 0.5
            }}
          />
        ))}
      </div>
      
      {/* Progress Labels */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>0%</span>
        <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>50%</span>
        <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>100%</span>
      </div>
    </div>
  );
}

export function ObjectiveDrawerV2({ objectiveId, open, onClose, onDuplicated }: ObjectiveDrawerV2Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Form state for dirty tracking
  const [formData, setFormData] = useState<ObjectiveFormData | null>(null);
  const [originalData, setOriginalData] = useState<ObjectiveFormData | null>(null);
  const [hasOverviewChanges, setHasOverviewChanges] = useState(false);
  const [hasChildChanges, setHasChildChanges] = useState(false);
  
  const hasChanges = hasOverviewChanges || hasChildChanges;
  
  const markDrawerChanged = useCallback(() => {
    setHasChildChanges(true);
  }, []);

  const { data: objective, isLoading } = useObjectiveV2(objectiveId || undefined);
  const { data: keyResults } = useKeyResultsV2(objectiveId || undefined);
  const updateObjective = useUpdateObjectiveV2();
  const deleteObjective = useDeleteObjectiveV2();
  const createObjective = useCreateObjectiveV2();

  // V2 Progress calculation
  const v2Progress = useMemo(() => {
    if (!keyResults || keyResults.length === 0) return 0;
    const totalProgress = keyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0);
    return Math.round(totalProgress / keyResults.length);
  }, [keyResults]);

  const v2Health = useMemo(() => {
    return determineHealthFromProgress(v2Progress);
  }, [v2Progress]);

  // Sync form data when objective loads
  useEffect(() => {
    if (objective) {
      const data: ObjectiveFormData = {
        name: objective.name,
        description: objective.description || '',
        notes: (objective as any).notes || '',
        theme_id: objective.theme_id || '',
        status: objective.status,
        health: objective.health || 'at_risk',
        start_date: objective.start_date || '',
        end_date: objective.end_date || '',
        owner_id: objective.owner_id || '',
      };
      setFormData(data);
      setOriginalData(data);
      setEditedName(objective.name);
      setHasOverviewChanges(false);
      setHasChildChanges(false);
    }
  }, [objective]);

  // Reset tab when drawer opens
  useEffect(() => {
    if (open) {
      setActiveTab('overview');
      setHasChildChanges(false);
    }
  }, [open]);

  // Real-time subscription for objective updates
  useEffect(() => {
    if (!objectiveId || !open) return;

    const channel = supabase
      .channel(`objective-drawer-${objectiveId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'objectives',
          filter: `id=eq.${objectiveId}`
        },
        () => {
          // Refetch objective data when it changes in the database
          queryClient.invalidateQueries({ queryKey: ['objective-v2', objectiveId] });
          queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [objectiveId, open, queryClient]);

  // Autosave debounce ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // Autosave function
  const autoSave = useCallback(async (dataToSave: ObjectiveFormData) => {
    if (!objectiveId || isSavingRef.current) return;
    
    const errors: string[] = [];
    if (!dataToSave.name?.trim()) errors.push('Name is required');
    if (!dataToSave.theme_id) errors.push('Theme is required');
    if (errors.length > 0) return; // Don't autosave if validation fails

    isSavingRef.current = true;
    try {
      const updatePayload = {
        id: objectiveId,
        name: dataToSave.name.trim(),
        description: dataToSave.description || null,
        notes: dataToSave.notes || null,
        theme_id: dataToSave.theme_id || null,
        status: dataToSave.status as any,
        health: dataToSave.health as any,
        start_date: dataToSave.start_date || null,
        end_date: dataToSave.end_date || null,
        owner_id: dataToSave.owner_id || null,
      };

      if (originalData) {
        const changedFields = getChangedFields(originalData as any, dataToSave as any);
        if (changedFields.length > 0) {
          await logAuditEntry({
            entityType: 'objective',
            entityId: objectiveId,
            action: 'updated',
            beforeData: originalData,
            afterData: dataToSave,
          });
        }
      }

      await updateObjective.mutateAsync(updatePayload);
      setOriginalData(dataToSave);
      setHasOverviewChanges(false);
    } catch (error: any) {
      console.error('Autosave failed:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [objectiveId, originalData, updateObjective, queryClient]);

  // Handle form changes from Overview tab with autosave
  const handleFormChange = useCallback((newData: ObjectiveFormData) => {
    setFormData(newData);
    setHasOverviewChanges(true);
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Debounced autosave after 800ms of no changes
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave(newData);
    }, 800);
  }, [autoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Validate required fields
  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (!formData?.name?.trim()) {
      errors.push('Name is required');
    }
    if (!formData?.theme_id) {
      errors.push('Theme is required');
    }
    return errors;
  };

  // Handle Save
  const handleSave = async () => {
    if (!objectiveId || !formData) return;

    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(errors.join('. '));
      return;
    }

    try {
      const updatePayload = {
        id: objectiveId,
        name: formData.name.trim(),
        description: formData.description || null,
        notes: formData.notes || null,
        theme_id: formData.theme_id || null,
        status: formData.status as any,
        health: formData.health as any,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        owner_id: formData.owner_id || null,
      };

      if (originalData) {
        const changedFields = getChangedFields(originalData as any, formData as any);
        if (changedFields.length > 0) {
          await logAuditEntry({
            entityType: 'objective',
            entityId: objectiveId,
            action: 'updated',
            beforeData: originalData,
            afterData: formData,
          });
        }
      }

      await updateObjective.mutateAsync(updatePayload);

      setOriginalData(formData);
      setHasOverviewChanges(false);
      setHasChildChanges(false);

      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['objective-v2', objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });

      toast.success('Objective updated successfully');
    } catch (error: any) {
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleSaveAndClose = async () => {
    await handleSave();
    onClose();
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!objectiveId) return;
    
    try {
      await deleteObjective.mutateAsync(objectiveId);
      setShowDeleteDialog(false);
      toast.success('Objective deleted successfully');
      onClose();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error?.message || 'Unknown error'}`);
    }
  };

  // Handle Duplicate
  const handleDuplicate = async () => {
    if (!objective) return;
    
    setIsDuplicating(true);
    try {
      const newObjective = await createObjective.mutateAsync({
        name: `${objective.name} (copy)`,
        description: objective.description || undefined,
        theme_id: objective.theme_id || '',
        owner_id: objective.owner_id || undefined,
        start_date: objective.start_date || undefined,
        end_date: objective.end_date || undefined,
        status: objective.status,
        health: objective.health || 'at_risk',
        notes: (objective as any).notes || undefined,
      });
      
      toast.success('Objective duplicated');
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      
      if (onDuplicated && newObjective?.id) {
        onDuplicated(newObjective.id);
      }
    } catch (error: any) {
      toast.error(`Failed to duplicate: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsDuplicating(false);
    }
  };

  // Handle Export
  const handleExport = () => {
    if (!objective) return;
    
    try {
      const exportData = {
        id: objective.id,
        name: objective.name,
        description: objective.description,
        theme: objective.theme_name,
        owner: objective.owner_name,
        status: objective.status,
        health: objective.health,
        start_date: objective.start_date,
        end_date: objective.end_date,
        overall_progress: objective.overall_progress,
        key_results: keyResults?.map(kr => ({
          summary: kr.summary,
          metric_type: kr.metric_type,
          baseline_value: kr.baseline_value,
          current_value: kr.current_value,
          target_value: kr.target_value,
          progress: kr.progress,
        })) || [],
        exported_at: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `objective-${objective.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Objective exported');
    } catch (error: any) {
      toast.error(`Failed to export: ${error?.message || 'Unknown error'}`);
    }
  };

  // Copy link handler
  const handleCopyLink = () => {
    const url = `${window.location.origin}/okr/objectives/${objectiveId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Edit name handlers
  const handleStartEditName = () => {
    setIsEditingName(true);
    setEditedName(objective?.name || '');
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = async () => {
    if (editedName.trim() && editedName !== objective?.name && objectiveId) {
      try {
        await updateObjective.mutateAsync({
          id: objectiveId,
          name: editedName.trim(),
        });
        queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
        queryClient.invalidateQueries({ queryKey: ['objective-v2', objectiveId] });
        toast.success('Objective name updated');
      } catch (error: any) {
        toast.error(`Failed to update name: ${error?.message || 'Unknown error'}`);
      }
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(objective?.name || '');
    }
  };

  // Status badge
  const getStatusConfig = (status?: string) => {
    const configs: Record<string, { label: string; bg: string; text: string }> = {
      pending: { label: 'Pending', bg: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))' },
      in_progress: { label: 'In Progress', bg: 'hsl(217 91% 60% / 0.12)', text: 'hsl(var(--primary))' },
      on_track: { label: 'On Track', bg: 'hsl(173 58% 39% / 0.12)', text: 'hsl(var(--success))' },
      at_risk: { label: 'At Risk', bg: 'hsl(38 92% 50% / 0.12)', text: 'hsl(38 92% 45%)' },
      off_track: { label: 'Off Track', bg: 'hsl(0 84% 60% / 0.12)', text: 'hsl(var(--destructive))' },
      completed: { label: 'Completed', bg: 'hsl(173 58% 39% / 0.12)', text: 'hsl(var(--success))' },
    };
    return configs[status || ''] || configs.pending;
  };

  if (!open) return null;

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent
          side="right"
          hideClose
          className={cn(
            "flex flex-col p-0 gap-0 border-l border-border-default",
            "bg-surface-0 text-text-primary",
            "rounded-l-[20px] rounded-r-none",
            "transition-all duration-300 ease-out",
            "w-[640px] sm:max-w-[640px]",
          )}
        >
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!objective) {
    return (
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent
          side="right"
          hideClose
          className={cn(
            "flex flex-col p-0 gap-0 border-l border-border-default",
            "bg-surface-0 text-text-primary",
            "rounded-l-[20px] rounded-r-none",
            "w-[640px] sm:max-w-[640px]",
          )}
        >
          <div className="flex items-center justify-center h-full text-muted-foreground p-6">
            Objective not found
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const statusConfig = getStatusConfig(objective.status);
  const lastUpdated = objective.updated_at || objective.created_at;

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent
          side="right"
          hideClose
          className={cn(
            "flex flex-col p-0 gap-0 border-l border-border-default",
            "bg-surface-0 text-text-primary",
            "rounded-l-[20px] rounded-r-none",
            "transition-all duration-300 ease-out",
            "w-[640px] sm:max-w-[640px]",
          )}
        >
          {/* HEADER */}
          <SheetHeader className="shrink-0 space-y-0">
            {/* Breadcrumb + Controls */}
            <div 
              className="flex items-center justify-between px-6 py-3"
              style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}
            >
              <div className="flex items-center gap-2.5">
                <span 
                  className="text-[10px] font-semibold uppercase tracking-[0.5px]"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  Objectives
                </span>
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>/</span>
                <span 
                  className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md"
                  style={{ 
                    color: 'hsl(var(--primary))',
                    background: 'hsl(var(--primary) / 0.1)'
                  }}
                >
                  {formatObjectiveKey(objective.id)}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                  title="Copy link"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Actions in header */}
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg hover:bg-muted transition-colors"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-48 rounded-xl"
                    style={{ 
                      background: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  >
                    <DropdownMenuItem className="rounded-lg" onSelect={handleDuplicate}>
                      <Copy className="h-4 w-4 mr-2" />
                      {isDuplicating ? 'Duplicating...' : 'Duplicate'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="rounded-lg text-destructive" onSelect={() => setShowDeleteDialog(true)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Objective
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg hover:bg-muted transition-colors"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Hero Row */}
            <div className="flex items-start px-6 py-5 gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                {/* Title with Edit */}
                <div className="flex items-center gap-1.5 group">
                  {isEditingName ? (
                    <Input
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleNameKeyDown}
                      className="text-2xl font-bold h-auto py-1.5 px-2 max-w-[480px] border-primary focus-visible:ring-primary/20"
                      style={{ 
                        background: 'hsl(var(--muted))',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                  ) : (
                    <>
                      <SheetTitle 
                        className="text-2xl font-bold tracking-tight truncate max-w-[520px] leading-tight"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {objective.name || 'Untitled Objective'}
                      </SheetTitle>
                      <button
                        onClick={handleStartEditName}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Theme badge */}
                  {objective.theme_name && (
                    <span 
                      className="text-xs font-medium px-2.5 py-1 rounded-lg"
                      style={{ 
                        background: 'hsl(var(--muted))',
                        color: 'hsl(var(--foreground))'
                      }}
                    >
                      {objective.theme_name}
                    </span>
                  )}

                  {/* Status badge */}
                  <span 
                    className="text-xs font-medium px-2.5 py-1 rounded-lg"
                    style={{ 
                      background: statusConfig.bg,
                      color: statusConfig.text
                    }}
                  >
                    {statusConfig.label}
                  </span>

                  {/* Health dot */}
                  <div 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getHealthColor(v2Health) }}
                    title={`Health: ${v2Health}`}
                  />

                  <div className="w-px h-5" style={{ background: 'hsl(var(--border))' }} />

                  {/* Owner */}
                  {objective.owner_name && (
                    <div 
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>{objective.owner_name}</span>
                    </div>
                  )}

                  {/* End date */}
                  {objective.end_date && (
                    <div 
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(objective.end_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Key Results count */}
                  <div 
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    <Target className="h-3.5 w-3.5" />
                    <span>{keyResults?.length || 0} Key Results</span>
                  </div>
                </div>
              </div>
            </div>

            <SheetDescription className="sr-only">Objective details panel</SheetDescription>
          </SheetHeader>

          {/* PROGRESS BAR */}
          <PremiumProgressBar progress={v2Progress} health={v2Health} />

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList
              className={cn(
                "w-full justify-start rounded-none shrink-0",
                "!bg-transparent !p-0 !h-auto",
                "px-6",
                "border-b border-border-default",
              )}
            >
              {[
                { value: 'overview', label: 'Overview' },
                { value: 'key-results', label: 'Key Results', count: keyResults?.length || 0 },
                { value: 'work', label: 'Work' },
                { value: 'links', label: 'Links' },
                { value: 'audit', label: 'Audit History' },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "relative",
                    "px-4 py-3.5",
                    "text-[14px] font-medium",
                    "rounded-none",
                    "bg-transparent",
                    "text-text-muted hover:text-text-secondary",
                    "data-[state=active]:text-text-primary",
                    "data-[state=active]:bg-transparent",
                    "data-[state=active]:shadow-none",
                    "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                    "after:absolute after:bottom-0 after:left-2 after:right-2",
                    "after:h-[3px] after:rounded-t-full after:transition-all after:duration-200",
                    "data-[state=inactive]:after:bg-transparent data-[state=inactive]:after:scale-x-0",
                    "data-[state=active]:after:bg-brand-primary data-[state=active]:after:scale-x-100",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center bg-surface-2 text-text-muted">
                        {tab.count}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* TAB CONTENT */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto"
              style={{ background: 'hsl(var(--muted) / 0.3)' }}
            >
              <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                {formData && (
                  <ObjectiveOverviewTabV2 
                    formData={formData} 
                    onChange={handleFormChange}
                    objective={objective}
                  />
                )}
              </TabsContent>

              <TabsContent value="key-results" className="mt-0 p-6 focus-visible:outline-none">
                <KeyResultsTabV2 objectiveId={objective.id} onMutation={markDrawerChanged} />
              </TabsContent>

              <TabsContent value="work" className="mt-0 p-6 focus-visible:outline-none">
                <LinkedWorkTabV2 objectiveId={objective.id} onMutation={markDrawerChanged} />
              </TabsContent>

              <TabsContent value="links" className="mt-0 p-6 focus-visible:outline-none">
                <UnifiedLinksTab entityType="objective" entityId={objective.id} hideTiles={['implementation', 'knowledge-hub']} />
              </TabsContent>

              <TabsContent value="audit" className="mt-0 p-6 focus-visible:outline-none">
                <div className="h-[500px]">
                  <UnifiedAuditHistoryTab entityType="objective" entityId={objective.id} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Objective</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this objective? This will also remove all associated key results and work alignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}