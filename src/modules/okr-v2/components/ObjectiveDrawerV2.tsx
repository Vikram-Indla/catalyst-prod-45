/**
 * =====================================================
 * Objective Drawer V2 - Unified with Canonical Shell
 * =====================================================
 * 
 * Uses the CanonicalDrawerShell for unified drawer structure.
 * Module-specific content: OKR overview, key results, linked work
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useObjectiveV2, useUpdateObjectiveV2, useDeleteObjectiveV2, useCreateObjectiveV2 } from '@/hooks/useObjectivesV2';
import { useKeyResultsV2 } from '@/hooks/useKeyResultsV2';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Trash2, Users, Calendar, Target, Copy, Download } from 'lucide-react';
import { CanonicalDrawerShell, DrawerTab, KebabMenuItem } from '@/components/shared/CanonicalDrawerShell';
import { ObjectiveOverviewTabV2, ObjectiveFormData } from './ObjectiveOverviewTabV2';
import { KeyResultsTabV2 } from './KeyResultsTabV2';
import { LinkedWorkTabV2 } from './LinkedWorkTabV2';
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
  const [isDuplicating, setIsDuplicating] = useState(false);
  
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
        due_date: objective.due_date || undefined,
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

  // Handle title change
  const handleTitleChange = async (newName: string) => {
    if (!objectiveId) return;
    
    try {
      await updateObjective.mutateAsync({
        id: objectiveId,
        name: newName,
      });
      queryClient.invalidateQueries({ queryKey: ['objectives-v2'] });
      queryClient.invalidateQueries({ queryKey: ['objective-v2', objectiveId] });
      toast.success('Objective name updated');
    } catch (error: any) {
      toast.error(`Failed to update name: ${error?.message || 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <CanonicalDrawerShell
        open={open}
        onClose={onClose}
        entityId=""
        entityTitle="Loading..."
        entityType="okr/objectives"
        tabs={[{ value: 'loading', label: 'Loading', content: (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}]}
      />
    );
  }

  if (!objective) {
    return (
      <CanonicalDrawerShell
        open={open}
        onClose={onClose}
        entityId=""
        entityTitle="Not Found"
        entityType="okr/objectives"
        tabs={[{ value: 'error', label: 'Error', content: (
          <div className="flex items-center justify-center h-full text-muted-foreground p-6">
            Objective not found
          </div>
        )}]}
      />
    );
  }

  // Build kebab menu items
  const kebabMenuItems: KebabMenuItem[] = [
    {
      label: isDuplicating ? 'Duplicating...' : 'Duplicate',
      icon: <Copy className="h-4 w-4 mr-2" />,
      onClick: handleDuplicate,
    },
    {
      label: 'Export',
      icon: <Download className="h-4 w-4 mr-2" />,
      onClick: handleExport,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      onClick: () => setShowDeleteDialog(true),
      variant: 'destructive',
      separator: true,
    },
  ];

  // Secondary header row with progress and meta
  const secondaryHeaderRow = (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
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
  );

  // Build tabs
  const tabs: DrawerTab[] = [
    {
      value: 'overview',
      label: 'Overview',
      content: formData && (
        <ObjectiveOverviewTabV2 
          formData={formData} 
          onChange={handleFormChange}
          objective={objective}
        />
      ),
    },
    {
      value: 'key-results',
      label: 'Key Results',
      content: <KeyResultsTabV2 objectiveId={objective.id} onMutation={markDrawerChanged} />,
    },
    {
      value: 'work',
      label: 'Work',
      content: <LinkedWorkTabV2 objectiveId={objective.id} onMutation={markDrawerChanged} />,
    },
    {
      value: 'links',
      label: 'Links',
      content: <UnifiedLinksTab entityType="objective" entityId={objective.id} />,
    },
    {
      value: 'discussions',
      label: 'Discussions',
      content: (
        <div className="p-6">
          <DiscussionsTab objectiveId={objective.id} />
        </div>
      ),
    },
    {
      value: 'audit',
      label: 'Audit History',
      content: (
        <div className="h-[500px]">
          <UnifiedAuditHistoryTab entityType="objective" entityId={objective.id} />
        </div>
      ),
    },
  ];

  return (
    <>
      <CanonicalDrawerShell
        open={open}
        onClose={onClose}
        entityId={objective.id}
        entityKey={`OBJ-${objective.id.slice(0, 4)}`}
        entityTitle={objective.name}
        entityType="okr/objectives"
        onTitleChange={handleTitleChange}
        isTitleEditable={true}
        onSave={handleSave}
        onSaveAndClose={handleSaveAndClose}
        hasChanges={hasChanges}
        isSaving={updateObjective.isPending}
        secondaryHeaderRow={secondaryHeaderRow}
        tabs={tabs}
        defaultTab="overview"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kebabMenuItems={kebabMenuItems}
        description="Objective details and key results"
      />

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
