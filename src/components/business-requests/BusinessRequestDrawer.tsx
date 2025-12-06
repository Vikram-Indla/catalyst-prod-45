import { useState, useEffect, useRef, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
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
import { useBusinessRequest, useUpdateBusinessRequest, useDeleteBusinessRequest, useDuplicateBusinessRequest } from '@/hooks/useBusinessRequests';
import { BusinessRequest } from '@/types/business-request';
import { DemandDetailsViewTab } from './drawer-tabs/DemandDetailsViewTab';
import { BusinessScoreViewTab } from './drawer-tabs/BusinessScoreViewTab';
import { LinksViewTab } from './drawer-tabs/LinksViewTab';
import { DiscussionsViewTab } from './drawer-tabs/DiscussionsViewTab';
import { AuditHistoryTab } from './drawer-tabs/AuditHistoryTab';
import { WorkflowViewerModal } from './WorkflowViewerModal';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fields to track for audit logging (human-readable names)
const AUDIT_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  process_step: 'Process Step',
  department: 'Department',
  business_owner: 'Business Owner',
  requestor: 'Requestor',
  assignee: 'Assignee',
  delivery_platform: 'Delivery Platform',
  delivery_track: 'Delivery Track',
  planned_quarter: 'Planned Quarter',
  urgency: 'Urgency',
  complexity: 'Complexity',
  risk_rating: 'Risk Rating',
  estimated_effort: 'Estimated Effort',
  estimated_cost: 'Estimated Cost',
  start_date: 'Start Date',
  end_date: 'End Date',
  executive_urgency: 'Executive Urgency',
  business_value: 'Business Value',
  complexity_score: 'Complexity Score',
  business_score: 'Business Score',
  rank: 'Rank',
  is_force_ranked: 'Force Ranked',
  rank_override_justification: 'Rank Justification',
  health: 'Health',
  acceptance_criteria: 'Acceptance Criteria',
  dependencies: 'Dependencies',
  platform: 'Platform',
  track: 'Track',
};

// Log field changes to audit table
async function logFieldChanges(
  requestId: string,
  oldData: Partial<BusinessRequest> & Record<string, any>,
  newData: Partial<BusinessRequest> & Record<string, any>
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

      // Skip if values are the same (handle null/undefined as equal)
      const oldNormalized = oldValue === undefined ? null : oldValue;
      const newNormalized = newValue === undefined ? null : newValue;
      
      if (JSON.stringify(oldNormalized) === JSON.stringify(newNormalized)) continue;

      // Format values for display
      const formatValue = (val: any): string => {
        if (val === null || val === undefined) return 'None';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      };

      auditLogs.push({
        business_request_id: requestId,
        actor_id: user?.id,
        actor_name: actorName,
        action: 'UPDATE',
        field_changed: label,
        old_value: formatValue(oldNormalized),
        new_value: formatValue(newNormalized),
      });
    }

    // Insert all audit logs
    if (auditLogs.length > 0) {
      console.log('Inserting audit logs:', auditLogs);
      const { error } = await supabase
        .from('business_request_audit_logs')
        .insert(auditLogs);
      
      if (error) {
        console.error('Failed to insert audit logs:', error);
      }
    }
  } catch (error) {
    console.error('Failed to log field changes:', error);
  }
}

interface BusinessRequestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
  onRequestChange?: (newRequestId: string) => void;
}

// Four tabs for the view drawer
const VIEW_TABS = [
  { value: 'demand-details', label: 'Demand Details' },
  { value: 'business-score', label: 'Business Score' },
  { value: 'links', label: 'Links' },
  { value: 'discussions', label: 'Discussions' },
  { value: 'audit-history', label: 'Audit History' },
];

export function BusinessRequestDrawer({ isOpen, onClose, requestId, onRequestChange }: BusinessRequestDrawerProps) {
  const queryClient = useQueryClient();
  const { data: request, isLoading } = useBusinessRequest(requestId);
  const updateMutation = useUpdateBusinessRequest();
  const deleteMutation = useDeleteBusinessRequest();
  const duplicateMutation = useDuplicateBusinessRequest();
  
  const [activeTab, setActiveTab] = useState('demand-details');
  const [formData, setFormData] = useState<Partial<BusinessRequest> & Record<string, any>>({});
  const [originalData, setOriginalData] = useState<Partial<BusinessRequest> & Record<string, any>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Track if we initiated a data update (to avoid resetting hasChanges on refetch)
  // Using ref instead of state to avoid triggering useEffect re-runs
  const skipNextFormResetRef = useRef(false);

  // Sync form data when request changes
  useEffect(() => {
    if (request) {
      // Only overwrite formData if we didn't just trigger this update ourselves
      if (!skipNextFormResetRef.current) {
        setFormData(request);
        setOriginalData(request);
        setEditedName(request.title || '');
        setHasChanges(false);
      } else {
        // Still update originalData for change detection, but keep formData as-is
        setOriginalData(request);
      }
      skipNextFormResetRef.current = false;
    }
  }, [request]);

  // Check if data has changed
  const checkForChanges = useCallback((newData: Partial<BusinessRequest>) => {
    const fieldsToCheck = [
      'title', 'description', 'requestor', 'delivery_platform', 'delivery_track',
      'platform', 'complexity', 'urgency', 'track', 'health', 'process_step',
      'planned_quarter', 'start_date', 'end_date', 'executive_urgency', 
      'business_value', 'complexity_score', 'business_score'
    ];
    
    for (const field of fieldsToCheck) {
      const originalValue = originalData[field as keyof typeof originalData];
      const newValue = newData[field as keyof typeof newData];
      if (originalValue !== newValue) {
        return true;
      }
    }
    return false;
  }, [originalData]);

  const handleFieldChange = (field: string, value: any) => {
    // Use functional update to ensure we always get the latest state
    // This is critical when multiple onChange calls happen in sequence
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Enable Save button on first edit - stays enabled until user manually saves
    if (!hasChanges) {
      setHasChanges(true);
    }
    // Prevent useEffect from resetting hasChanges when query refetches
    skipNextFormResetRef.current = true;
  };

  const handleDirtyChange = (isDirty: boolean) => {
    if (isDirty) {
      setHasChanges(true);
      skipNextFormResetRef.current = true;
    }
  };

  const handleSave = async () => {
    if (!requestId) return;
    
    console.log('Drawer handleSave - saving formData:', {
      rank: formData.rank,
      is_force_ranked: formData.is_force_ranked,
      rank_override_justification: formData.rank_override_justification
    });
    
    // Log all field changes to audit table
    await logFieldChanges(requestId, originalData, formData);
    
    updateMutation.mutate({ id: requestId, data: formData as Partial<BusinessRequest> }, {
      onSuccess: () => {
        console.log('Drawer save successful');
        setOriginalData(formData);
        setHasChanges(false);
        skipNextFormResetRef.current = true; // Prevent overwriting formData on refetch
        // Refresh table
        queryClient.invalidateQueries({ queryKey: ['business-requests'] });
        queryClient.invalidateQueries({ queryKey: ['business-request-audit', requestId] });
        toast.success('Business request saved');
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
    // Refresh table on close to ensure sorting is updated
    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    onClose();
  };

  const handleDiscardAndClose = () => {
    setFormData(originalData);
    setHasChanges(false);
    setShowUnsavedChangesDialog(false);
    onClose();
  };


  const handleSaveAndClose = async () => {
    if (!requestId) return;
    
    console.log('Drawer handleSaveAndClose - saving formData:', {
      rank: formData.rank,
      is_force_ranked: formData.is_force_ranked,
      rank_override_justification: formData.rank_override_justification
    });
    
    // Log all field changes to audit table
    await logFieldChanges(requestId, originalData, formData);
    
    // Close dialog and drawer immediately
    setShowUnsavedChangesDialog(false);
    setHasChanges(false);
    onClose();
    
    // Save in background
    updateMutation.mutate({ id: requestId, data: formData as Partial<BusinessRequest> }, {
      onSuccess: () => {
        console.log('Drawer save and close successful');
        setOriginalData(formData);
        queryClient.invalidateQueries({ queryKey: ['business-requests'] });
        queryClient.invalidateQueries({ queryKey: ['business-request-audit', requestId] });
        toast.success('Business request saved');
      }
    });
  };

  // Copy link handler
  const handleCopyLink = () => {
    const url = `${window.location.origin}/industry?request=${requestId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Edit name handlers
  const handleStartEditName = () => {
    setIsEditingName(true);
    setEditedName(request?.title || '');
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== request?.title && requestId) {
      updateMutation.mutate({ id: requestId, data: { title: editedName.trim() } }, {
        onSuccess: () => {
          setIsEditingName(false);
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
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
      setEditedName(request?.title || '');
    }
  };

  // Toggle expand/collapse
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // More options handlers
  const handleAdditionalOption = (action: string) => {
    switch (action) {
      case 'duplicate':
        if (requestId) {
          duplicateMutation.mutate(requestId, {
            onSuccess: (newRequest) => {
              queryClient.invalidateQueries({ queryKey: ['business-requests'] });
              // Open the duplicated request in the same drawer
              if (onRequestChange) {
                onRequestChange(newRequest.id);
              }
            }
          });
        }
        break;
      case 'delete':
        setShowDeleteConfirm(true);
        break;
    }
  };

  const handleConfirmDelete = () => {
    if (requestId) {
      deleteMutation.mutate(requestId, {
        onSuccess: () => {
          setShowDeleteConfirm(false);
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
          onClose();
        }
      });
    }
  };

  // Get drawer width classes based on expanded state - reduced by 30%
  const drawerWidthClass = isExpanded 
    ? 'w-screen sm:w-[70vw] sm:max-w-[1120px]' 
    : 'w-screen sm:w-[65vw] sm:max-w-[980px]';

  if (!isOpen) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <SheetContent side="right" hideClose className={`executive-drawer ${drawerWidthClass} p-0 flex flex-col overflow-hidden bg-white`}>
          <SheetHeader className="executive-drawer-header flex-col space-y-0 shrink-0 p-0 bg-white">
            {/* Compact header row */}
            <div className="flex items-center justify-between px-3 md:px-4 h-10 border-b border-neutral-200 bg-white">
              {/* Left side: Request ID + Title */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-medium text-brand-gold">{request?.request_key || '...'}</span>
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
                        {request?.title || 'Loading...'}
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
              
              {/* Right side: Save button + action icons all inline */}
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
                      Duplicate Request
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onSelect={() => handleAdditionalOption('delete')}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Request
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
            <SheetDescription className="sr-only">Business request details panel</SheetDescription>
          </SheetHeader>

          {/* Workflow History link - compact */}
          <div className="px-3 md:px-4 h-9 flex items-center border-b border-neutral-200 bg-white shrink-0">
            <button 
              onClick={() => setWorkflowModalOpen(true)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <span>Status:</span>
              <span className="font-medium text-brand-gold capitalize underline underline-offset-2">
                {formData.process_step?.replace(/_/g, ' ') || 'New Request'}
              </span>
              <span className="text-[10px] text-muted-foreground/70">(click to update)</span>
            </button>
            <WorkflowViewerModal 
              currentStep={formData.process_step || 'new_request'}
              requestId={requestId || ''}
              submittedDate={request?.created_at}
              onStepChange={(step) => handleFieldChange('process_step', step)}
              open={workflowModalOpen}
              onOpenChange={setWorkflowModalOpen}
            />
          </div>

          {/* Tabs with horizontal scroll */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="executive-tabs-list w-full justify-start rounded-none border-b border-neutral-200 h-10 shrink-0 overflow-x-auto flex-nowrap bg-white">
              {VIEW_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="executive-tab whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="executive-drawer-content flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
              <TabsContent value="demand-details" className="m-0 focus-visible:outline-none flex-1 overflow-auto">
                <DemandDetailsViewTab data={formData} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="business-score" className="m-0 focus-visible:outline-none">
                <BusinessScoreViewTab 
                  data={formData} 
                  onChange={handleFieldChange} 
                  requestId={requestId || undefined}
                  onDirtyChange={handleDirtyChange}
                />
              </TabsContent>
              <TabsContent value="links" className="m-0 focus-visible:outline-none">
                {requestId && <LinksViewTab requestId={requestId} />}
              </TabsContent>
              <TabsContent value="discussions" className="m-0 focus-visible:outline-none h-[500px]">
                {requestId && <DiscussionsViewTab requestId={requestId} />}
              </TabsContent>
              <TabsContent value="audit-history" className="m-0 focus-visible:outline-none flex-1 flex flex-col min-h-0">
                {requestId && <AuditHistoryTab requestId={requestId} />}
              </TabsContent>
            </div>
          </Tabs>
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
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{request?.request_key}</span>? 
              This request will be moved to deleted items and can be restored within 30 days.
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
