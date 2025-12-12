import { useState, useEffect, useCallback, useMemo } from 'react';
import { useObjectiveV2, useUpdateObjectiveV2, useDeleteObjectiveV2, useCreateObjectiveV2 } from '@/hooks/useObjectivesV2';
import { useKeyResultsV2 } from '@/hooks/useKeyResultsV2';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MoreVertical, Trash2, Users, Calendar, Target, ChevronDown, X, Copy, Download } from 'lucide-react';
import { ObjectiveOverviewTabV2, ObjectiveFormData } from './ObjectiveOverviewTabV2';
import { KeyResultsTabV2 } from './KeyResultsTabV2';
import { LinkedWorkTabV2 } from './LinkedWorkTabV2';
// Reuse v1 tab components for Discussions, Audit Log (NO Details tab in v2)
import { UnifiedLinksTab } from '@/components/shared/UnifiedLinksTab';
import { DiscussionsTab } from '@/components/okr/DiscussionsTab';
import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { logAuditEntry, getChangedFields } from '@/lib/auditLogger';

interface ObjectiveDrawerV2Props {
  objectiveId: string | null;
  open: boolean;
  onClose: () => void;
  onDuplicated?: (newObjectiveId: string) => void;
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
    case 'good': return 'bg-green-500';
    case 'fair': return 'bg-amber-500';
    case 'poor': return 'bg-red-500';
    case 'at_risk': return 'bg-orange-500';
    default: return 'bg-muted';
  }
}

export function ObjectiveDrawerV2({ objectiveId, open, onClose, onDuplicated }: ObjectiveDrawerV2Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  // Form state for dirty tracking
  const [formData, setFormData] = useState<ObjectiveFormData | null>(null);
  const [originalData, setOriginalData] = useState<ObjectiveFormData | null>(null);
  const [hasOverviewChanges, setHasOverviewChanges] = useState(false);
  const [hasChildChanges, setHasChildChanges] = useState(false);
  
  // Unified flag: true if any changes in drawer (overview OR child entities)
  const hasChanges = hasOverviewChanges || hasChildChanges;
  
  // Callback for child components (KRs, Work, Links, etc.) to mark drawer as changed
  const markDrawerChanged = useCallback(() => {
    setHasChildChanges(true);
  }, []);

  const { data: objective, isLoading } = useObjectiveV2(objectiveId || undefined);
  const { data: keyResults } = useKeyResultsV2(objectiveId || undefined);
  const updateObjective = useUpdateObjectiveV2();
  const deleteObjective = useDeleteObjectiveV2();
  const createObjective = useCreateObjectiveV2();

  // V2 Progress calculation - average of all KR progress values
  const v2Progress = useMemo(() => {
    if (!keyResults || keyResults.length === 0) return 0;
    const totalProgress = keyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0);
    return Math.round(totalProgress / keyResults.length);
  }, [keyResults]);

  // V2 Health derived from progress
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
        due_date: objective.due_date || '',
        owner_id: objective.owner_id || '',
      };
      setFormData(data);
      setOriginalData(data);
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

  // Handle form changes from Overview tab
  const handleFormChange = useCallback((newData: ObjectiveFormData) => {
    setFormData(newData);
    setHasOverviewChanges(true);
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
      // Prepare update payload
      const updatePayload = {
        id: objectiveId,
        name: formData.name.trim(),
        description: formData.description || null,
        notes: formData.notes || null,
        theme_id: formData.theme_id || null,
        status: formData.status as any,
        health: formData.health as any,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        owner_id: formData.owner_id || null,
      };

      // Log audit entry for changes
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

      // Update original data to current
      setOriginalData(formData);
      setHasOverviewChanges(false);
      setHasChildChanges(false);

      // Refresh relevant queries
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['objective-v2', objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });

      toast.success('Objective updated successfully');
    } catch (error: any) {
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
    }
  };

  // Handle Close attempt (checks for unsaved changes)
  const handleAttemptClose = () => {
    if (hasChanges) {
      setShowUnsavedChangesDialog(true);
    } else {
      handleClose();
    }
  };

  // Actual close
  const handleClose = () => {
    setHasOverviewChanges(false);
    setHasChildChanges(false);
    setShowUnsavedChangesDialog(false);
    onClose();
  };

  // Discard and close
  const handleDiscardAndClose = () => {
    setFormData(originalData);
    setHasOverviewChanges(false);
    setHasChildChanges(false);
    setShowUnsavedChangesDialog(false);
    onClose();
  };

  // Save and close
  const handleSaveAndClose = async () => {
    if (!objectiveId || !formData) return;

    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(errors.join('. '));
      return;
    }

    setShowUnsavedChangesDialog(false);
    setHasOverviewChanges(false);
    setHasChildChanges(false);
    onClose();

    // Save in background
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
        due_date: formData.due_date || null,
        owner_id: formData.owner_id || null,
      };

      if (originalData) {
        await logAuditEntry({
          entityType: 'objective',
          entityId: objectiveId,
          action: 'updated',
          beforeData: originalData,
          afterData: formData,
        });
      }

      await updateObjective.mutateAsync(updatePayload);
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['objective-v2', objectiveId] });
      toast.success('Objective updated successfully');
    } catch (error: any) {
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
    }
  };

  // Handle Delete with audit log
  const handleDelete = async () => {
    if (!objectiveId) return;
    
    try {
      // Audit log is written inside the hook
      await deleteObjective.mutateAsync(objectiveId);
      setShowDeleteDialog(false);
      toast.success('Objective deleted successfully');
      onClose();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error?.message || 'Unknown error'}`);
    }
  };

  // Handle Duplicate Objective
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
        due_date: objective.due_date || undefined,
        status: objective.status,
        health: objective.health || 'at_risk',
        notes: (objective as any).notes || undefined,
      });
      
      toast.success('Objective duplicated');
      
      // Refresh the hub list
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      
      // Open the duplicated objective
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
        due_date: objective.due_date,
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

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleAttemptClose()}>
        <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col" hideClose>
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : objective ? (
            <>
              {/* Header - Business Drawer pattern: Save button in header, no footer */}
              <SheetHeader className="px-6 py-4 border-b-2 border-brand-gold bg-card flex-shrink-0">
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Title area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {objective.theme_name && (
                        <Badge variant="secondary" className="text-xs">
                          {objective.theme_name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {objective.status?.replace('_', ' ')}
                      </Badge>
                      <div className={`w-2 h-2 rounded-full ${getHealthColor(v2Health)}`} />
                    </div>
                    <SheetTitle className="text-lg font-semibold truncate">
                      {objective.name}
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      Objective details and key results
                    </SheetDescription>
                  </div>

                  {/* Right: Save dropdown + Kebab + X (Business Drawer pattern) */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Save dropdown button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          className="bg-brand-gold hover:bg-brand-gold-hover text-white gap-1"
                          disabled={!hasChanges}
                        >
                          Save
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleSave}>
                          Save
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleSaveAndClose}>
                          Save & Close
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Kebab menu - wired actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
                          <Copy className="h-4 w-4 mr-2" />
                          {isDuplicating ? 'Duplicating...' : 'Duplicate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExport}>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setShowDeleteDialog(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Close X button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9"
                      onClick={handleAttemptClose}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress & Meta row below title */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {objective.owner_name && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{objective.owner_name}</span>
                      </div>
                    )}
                    {objective.due_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(objective.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      <span>{keyResults?.length || 0} Key Results</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="font-medium">{v2Progress}%</span>
                    </div>
                    <Progress value={v2Progress} className="h-2" />
                  </div>
                </div>
              </SheetHeader>

              {/* Tabs - v2 tabs: Overview, Key Results, Work, Links, Discussions, Audit Log (NO Details) */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="px-4 py-0 h-12 bg-card border-b border-border justify-start rounded-none gap-0 flex-shrink-0">
                  <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="key-results" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Key Results
                  </TabsTrigger>
                  <TabsTrigger value="work" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Work
                  </TabsTrigger>
                  <TabsTrigger value="links" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Links
                  </TabsTrigger>
                  <TabsTrigger value="discussions" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Discussions
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Audit Log
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-auto">
                  <TabsContent value="overview" className="m-0 h-full">
                    {formData && (
                      <ObjectiveOverviewTabV2 
                        formData={formData} 
                        onChange={handleFormChange}
                        objective={objective}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="key-results" className="m-0 h-full">
                    <KeyResultsTabV2 objectiveId={objective.id} onMutation={markDrawerChanged} />
                  </TabsContent>
                  <TabsContent value="work" className="m-0 h-full">
                    <LinkedWorkTabV2 objectiveId={objective.id} onMutation={markDrawerChanged} />
                  </TabsContent>
                  <TabsContent value="links" className="m-0">
                    <UnifiedLinksTab entityType="objective" entityId={objective.id} />
                  </TabsContent>
                  <TabsContent value="discussions" className="m-0 p-6">
                    <DiscussionsTab objectiveId={objective.id} />
                  </TabsContent>
                  <TabsContent value="audit" className="m-0 h-[500px]">
                    <UnifiedAuditHistoryTab entityType="objective" entityId={objective.id} />
                  </TabsContent>
                </div>
              </Tabs>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Objective not found
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedChangesDialog(false)}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDiscardAndClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={handleSaveAndClose}
              className="bg-brand-gold text-white hover:bg-brand-gold-hover"
            >
              Save & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
