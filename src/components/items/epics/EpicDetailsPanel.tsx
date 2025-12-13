/**
 * =====================================================
 * EPIC DETAILS PANEL - Cloned from BusinessRequestDrawer
 * =====================================================
 * 
 * This is a structural clone with renamed fields.
 * Behavior matches Business Request Drawer exactly.
 * 
 * TABS (ORDER LOCKED):
 * 1. Epic Details
 * 2. Technical Score
 * 3. Budget
 * 4. Risks
 * 5. Milestones
 * 6. Links
 * 7. Features
 * 8. Discussions
 * 9. Audit History
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
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
} from "@/components/ui/alert-dialog";
import { 
  X, 
  Pencil, 
  Link as LinkIcon, 
  ChevronDown, 
  Maximize2, 
  Minimize2,
  MoreVertical,
  Trash2,
  Copy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Import drawer tabs
import { EpicDetailsViewTab } from './drawer-tabs/EpicDetailsViewTab';
import { TechnicalScoreViewTab } from './drawer-tabs/TechnicalScoreViewTab';
import { EpicBudgetViewTab } from './drawer-tabs/EpicBudgetViewTab';
import { EpicRisksViewTab } from './drawer-tabs/EpicRisksViewTab';
import { EpicMilestonesViewTab } from './drawer-tabs/EpicMilestonesViewTab';
import { EpicLinksViewTab } from './drawer-tabs/EpicLinksViewTab';
import { EpicFeaturesViewTab } from './drawer-tabs/EpicFeaturesViewTab';
import { EpicDiscussionsViewTab } from './drawer-tabs/EpicDiscussionsViewTab';
import { EpicAuditHistoryTab } from './drawer-tabs/EpicAuditHistoryTab';

// Status workflow modal
import { EpicStatusWorkflowModal } from './EpicStatusWorkflowModal';

// Epic Status values as per spec
const EPIC_STATUS_VALUES = [
  'New',
  'Analysis',
  'Design',
  'Technical Validation',
  'Ready for Implementation',
  'In Implementation',
  'On Hold',
  'Done',
] as const;

// Fields to track for audit logging
const AUDIT_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  status: 'Status',
  reporter_id: 'Reporter',
  assignee_id: 'Assignee',
  theme_id: 'Strategic Theme',
  linked_business_request_id: 'Linked Business Request',
  start_date: 'Start Date',
  target_completion_date: 'Target Completion Date',
  delivery_track: 'Delivery Track',
  delivery_platform: 'Delivery Platform',
  quarters: 'Quarter',
  mvp: 'MVP',
  business_value: 'Business Alignment',
  time_value: 'Time Criticality',
  rroe_value: 'Investor Enablement',
  job_size: 'Job Size',
  health: 'Health',
};

// Log field changes to audit table
async function logFieldChanges(
  epicId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user?.id)
      .single();

    const actorName = profile?.full_name || user?.email || 'Unknown User';
    const auditLogs: any[] = [];

    // Compare each tracked field
    for (const [field, label] of Object.entries(AUDIT_FIELD_LABELS)) {
      const oldValue = oldData[field];
      const newValue = newData[field];

      // Skip if values are the same
      const oldNormalized = oldValue === undefined ? null : oldValue;
      const newNormalized = newValue === undefined ? null : newValue;
      
      if (JSON.stringify(oldNormalized) === JSON.stringify(newNormalized)) continue;

      const formatValue = (val: any): string => {
        if (val === null || val === undefined) return 'None';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      };

      auditLogs.push({
        entity_type: 'epics',
        entity_id: epicId,
        action: 'UPDATE',
        actor_id: user?.id,
        before_json: { [field]: oldNormalized },
        after_json: { [field]: newNormalized },
      });
    }

    // Insert all audit logs
    if (auditLogs.length > 0) {
      await supabase.from('activity_logs').insert(auditLogs);
    }
  } catch (error) {
    console.error('Failed to log field changes:', error);
  }
}

// Fixed tabs for Epic drawer
const EPIC_TABS = [
  { value: 'epic-details', label: 'Epic Details' },
  { value: 'technical-score', label: 'Technical Score' },
  { value: 'budget', label: 'Budget' },
  { value: 'risks', label: 'Risks' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'links', label: 'Links' },
  { value: 'features', label: 'Features' },
  { value: 'discussions', label: 'Discussions' },
  { value: 'audit-history', label: 'Audit History' },
];

interface EpicDetailsPanelProps {
  epic: any;
  open: boolean;
  onClose: () => void;
}

export function EpicDetailsPanel({ epic: initialEpic, open, onClose }: EpicDetailsPanelProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Fetch fresh epic data
  const { data: freshEpic } = useQuery({
    queryKey: ['epic-detail', initialEpic?.id],
    queryFn: async () => {
      if (!initialEpic?.id) return null;
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .eq('id', initialEpic.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!initialEpic?.id && open,
  });

  const epic = freshEpic || initialEpic;
  
  const [activeTab, setActiveTab] = useState('epic-details');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [originalData, setOriginalData] = useState<Record<string, any>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const skipNextFormResetRef = useRef(false);

  // Reset to default tab when drawer opens
  useEffect(() => {
    if (open) {
      setActiveTab('epic-details');
    }
  }, [open]);

  // Sync form data when epic changes
  useEffect(() => {
    if (epic) {
      if (!skipNextFormResetRef.current) {
        setFormData(epic);
        setOriginalData(epic);
        setEditedName(epic.name || '');
        setHasChanges(false);
      } else {
        setOriginalData(epic);
      }
      skipNextFormResetRef.current = false;
    }
  }, [epic]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (!hasChanges) {
      setHasChanges(true);
    }
    skipNextFormResetRef.current = true;
  };

  const handleDirtyChange = (isDirty: boolean) => {
    if (isDirty) {
      setHasChanges(true);
      skipNextFormResetRef.current = true;
    }
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const { error } = await supabase
        .from('epics')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', epic.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['epic-detail', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('epics')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', epic.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success(`Epic ${epic.epic_key || ''} deleted`);
      onClose();
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .insert({
          name: `${epic.name} (Copy)`,
          description: epic.description,
          primary_program_id: epic.primary_program_id,
          theme_id: epic.theme_id,
          status: 'proposed',
          health: 'green',
          reporter_id: epic.reporter_id,
          assignee_id: epic.assignee_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (newEpic) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success(`Epic duplicated as ${newEpic.epic_key || 'new epic'}`);
    },
  });

  const handleSave = async () => {
    if (!epic?.id) return;
    
    // Log field changes to audit
    await logFieldChanges(epic.id, originalData, formData);
    
    updateMutation.mutate(formData, {
      onSuccess: () => {
        setOriginalData(formData);
        setHasChanges(false);
        skipNextFormResetRef.current = true;
        toast.success('Epic saved');
      }
    });
  };

  const handleAttemptClose = () => {
    if (hasChanges) {
      setShowUnsavedChangesDialog(true);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setHasChanges(false);
    setShowUnsavedChangesDialog(false);
    queryClient.invalidateQueries({ queryKey: ['epics'] });
    onClose();
  };

  const handleDiscardAndClose = () => {
    setFormData(originalData);
    setHasChanges(false);
    setShowUnsavedChangesDialog(false);
    onClose();
  };

  const handleSaveAndClose = async () => {
    if (!epic?.id) return;
    
    await logFieldChanges(epic.id, originalData, formData);
    
    setShowUnsavedChangesDialog(false);
    setHasChanges(false);
    onClose();
    
    updateMutation.mutate(formData, {
      onSuccess: () => {
        setOriginalData(formData);
        toast.success('Epic saved');
      }
    });
  };

  // Copy link handler
  const handleCopyLink = () => {
    const url = `${window.location.origin}/program/${epic.primary_program_id}/epic-backlog?epicId=${epic.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Edit name handlers
  const handleStartEditName = () => {
    setIsEditingName(true);
    setEditedName(epic?.name || '');
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== epic?.name && epic?.id) {
      updateMutation.mutate({ name: editedName.trim() }, {
        onSuccess: () => {
          setIsEditingName(false);
          queryClient.invalidateQueries({ queryKey: ['epics'] });
        }
      });
    } else {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(epic?.name || '');
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAdditionalOption = (action: string) => {
    switch (action) {
      case 'duplicate':
        duplicateMutation.mutate();
        break;
      case 'delete':
        setShowDeleteConfirm(true);
        break;
    }
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirm(false);
  };

  // Get drawer width classes
  const drawerWidthClass = isExpanded 
    ? 'w-screen sm:w-[70vw] sm:max-w-[1120px]' 
    : 'w-screen sm:w-[65vw] sm:max-w-[980px]';

  // Get display status
  const displayStatus = formData.status?.replace(/_/g, ' ') || 'New';

  if (!open) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleAttemptClose()}>
        <SheetContent side="right" hideClose className={`executive-drawer ${drawerWidthClass} p-0 flex flex-col overflow-hidden bg-white`}>
          <SheetHeader className="executive-drawer-header flex-col space-y-0 shrink-0 p-0 bg-white">
            {/* Header row */}
            <div className="flex items-center justify-between px-4 md:px-5 pt-4 pb-3 border-b border-brand-gold bg-white">
              {/* Left side: Epic ID + Title */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-medium text-brand-gold">{epic?.epic_key || `E-${epic?.id?.slice(0, 4)}`}</span>
                  <button
                    onClick={handleCopyLink}
                    className="text-muted-foreground/60 hover:text-brand-gold transition-colors p-0.5"
                    title="Copy link"
                  >
                    <LinkIcon className="h-3 w-3" />
                  </button>
                </div>
                
                {/* Editable title */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 group">
                  {isEditingName ? (
                    <Input
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleNameKeyDown}
                      className="text-base font-medium h-auto py-1 px-2 border-brand-gold/50 focus:border-brand-gold"
                    />
                  ) : (
                    <>
                      <SheetTitle className="truncate text-base font-medium text-foreground">
                        {epic?.name || 'Loading...'}
                      </SheetTitle>
                      <button
                        onClick={handleStartEditName}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-brand-gold transition-all p-0.5"
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Right side: Save button + action icons */}
              <div className="flex items-center gap-2 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-sm font-medium bg-brand-gold hover:bg-brand-gold-hover text-white"
                    >
                      Save
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem onSelect={handleSave}>
                      Save
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleSaveAndClose}>
                      Save & Close
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* More options dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover">
                    <DropdownMenuItem onSelect={() => handleAdditionalOption('duplicate')}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Epic
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onSelect={() => handleAdditionalOption('delete')}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Epic
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleExpand}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleAttemptClose}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <SheetDescription className="sr-only">Epic details panel</SheetDescription>
          </SheetHeader>

          {/* Status Row */}
          <div className="px-4 md:px-5 py-2 flex items-center bg-white shrink-0">
            <button 
              onClick={() => setStatusModalOpen(true)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <span>Status:</span>
              <span className="text-brand-gold capitalize underline underline-offset-2">
                {displayStatus}
              </span>
              <span className="text-xs font-normal text-muted-foreground/70">(click to update)</span>
            </button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="executive-tabs-list w-full justify-start rounded-none border-b border-border h-10 shrink-0 overflow-x-auto flex-nowrap bg-white px-4 md:px-5">
              {EPIC_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="executive-tab whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="executive-drawer-content flex-1 flex flex-col min-h-0 overflow-y-auto">
              <TabsContent value="epic-details" className="m-0 focus-visible:outline-none flex-1 p-4 md:p-5 pb-6">
                <EpicDetailsViewTab data={formData} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="technical-score" className="m-0 focus-visible:outline-none">
                <TechnicalScoreViewTab 
                  data={formData} 
                  onChange={handleFieldChange}
                  epicId={epic?.id}
                  onDirtyChange={handleDirtyChange}
                />
              </TabsContent>
              <TabsContent value="budget" className="m-0 focus-visible:outline-none flex-1 p-4 md:p-5 pb-6">
                <EpicBudgetViewTab data={formData} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="risks" className="m-0 focus-visible:outline-none flex-1 p-4 md:p-5 pb-6">
                {epic?.id && <EpicRisksViewTab epicId={epic.id} />}
              </TabsContent>
              <TabsContent value="milestones" className="m-0 focus-visible:outline-none flex-1 p-4 md:p-5 pb-6">
                {epic?.id && <EpicMilestonesViewTab epicId={epic.id} />}
              </TabsContent>
              <TabsContent value="links" className="m-0 focus-visible:outline-none">
                {epic?.id && <EpicLinksViewTab epicId={epic.id} />}
              </TabsContent>
              <TabsContent value="features" className="m-0 focus-visible:outline-none">
                {epic?.id && <EpicFeaturesViewTab epicId={epic.id} />}
              </TabsContent>
              <TabsContent value="discussions" className="m-0 focus-visible:outline-none h-[500px]">
                {epic?.id && <EpicDiscussionsViewTab epicId={epic.id} />}
              </TabsContent>
              <TabsContent value="audit-history" className="m-0 focus-visible:outline-none flex-1 flex flex-col min-h-0">
                {epic?.id && <EpicAuditHistoryTab epicId={epic.id} />}
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Status Workflow Modal */}
      <EpicStatusWorkflowModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        currentStatus={formData.status || 'new'}
        epicId={epic?.id || ''}
        onStatusChange={(status) => handleFieldChange('status', status)}
      />

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
              Cancel
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Epic</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{epic?.epic_key || epic?.name}</span>? 
              This epic will be moved to deleted items and can be restored within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
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
