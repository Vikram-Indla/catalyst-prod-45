import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Copy,
  Loader2
} from 'lucide-react';
import { useBusinessRequest, useUpdateBusinessRequest, useDeleteBusinessRequest, useDuplicateBusinessRequest } from '@/hooks/useBusinessRequests';
import { BusinessRequest } from '@/types/business-request';
import { DemandDetailsViewTab } from './drawer-tabs/DemandDetailsViewTab';
import { BusinessScoreViewTab } from './drawer-tabs/BusinessScoreViewTab';
import { BudgetViewTab } from './drawer-tabs/BudgetViewTab';
import { LinksViewTab } from './drawer-tabs/LinksViewTab';
import { EAReviewTab } from './drawer-tabs/EAReviewTab';
import { AuditHistoryTab } from './drawer-tabs/AuditHistoryTab';
import { MilestonesViewTab } from './drawer-tabs/MilestonesViewTab';
import { RisksViewTab } from './drawer-tabs/RisksViewTab';
import { WorkflowViewerModal } from './WorkflowViewerModal';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessDrawerRoleTabs } from '@/hooks/useBusinessDrawerRoleTabs';
import { cn } from '@/lib/utils';

// Fields to track for audit logging (human-readable names)
const AUDIT_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  process_step: 'Process Step',
  department: 'Department',
  department_id: 'Department',
  business_owner: 'Business Owner',
  business_owner_id: 'Business Owner',
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
  impl_start_date: 'Kickoff Date',
  ea_review_required: 'EA Review Required',
  priority_tier: 'Priority Tier',
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

// Fallback tabs if role-based tabs not loaded
const FALLBACK_TABS = [
  { value: 'demand-details', label: 'Demand Details' },
  { value: 'business-score', label: 'Business Score' },
  { value: 'ea-review', label: 'EA Review' },
  { value: 'budget', label: 'Budget' },
  { value: 'risks', label: 'Risks' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'links', label: 'Links' },
  { value: 'audit-history', label: 'Audit History' },
];

export function BusinessRequestDrawer({ isOpen, onClose, requestId, onRequestChange }: BusinessRequestDrawerProps) {
  const queryClient = useQueryClient();
  const { data: request, isLoading } = useBusinessRequest(requestId);
  const updateMutation = useUpdateBusinessRequest();
  const deleteMutation = useDeleteBusinessRequest();
  const duplicateMutation = useDuplicateBusinessRequest();
  
  // Fetch visible tabs based on user role
  const { visibleTabs: roleBasedTabs, isLoading: roleTabsLoading } = useBusinessDrawerRoleTabs();
  const VIEW_TABS = roleBasedTabs.length > 0 ? roleBasedTabs : FALLBACK_TABS;
  
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
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Track if we initiated a data update (to avoid resetting hasChanges on refetch)
  // Using ref instead of state to avoid triggering useEffect re-runs
  const skipNextFormResetRef = useRef(false);

  // Reset to default tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('demand-details');
    }
  }, [isOpen]);

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
      'planned_quarter', 'start_date', 'end_date', 'impl_start_date',
      'executive_urgency', 'business_value', 'complexity_score', 'business_score',
      'department', 'department_id', 'business_owner', 'business_owner_id',
      'assignee', 'ea_review_required', 'priority_tier'
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

  // Auto-save timeout ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-save function
  const triggerAutoSave = useCallback((dataToSave: Partial<BusinessRequest> & Record<string, any>, originalDataForAudit: Partial<BusinessRequest> & Record<string, any>) => {
    if (!requestId) return;
    
    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Debounce auto-save by 800ms
    autoSaveTimeoutRef.current = setTimeout(async () => {
      console.log('Auto-saving changes...');
      setIsSaving(true);
      
      // Log field changes to audit table
      await logFieldChanges(requestId, originalDataForAudit, dataToSave);
      
      updateMutation.mutate({ id: requestId, data: dataToSave as Partial<BusinessRequest> }, {
        onSuccess: () => {
          console.log('Auto-save successful');
          setOriginalData(dataToSave);
          setHasChanges(false);
          setIsSaving(false);
          setShowSavedIndicator(true);
          setTimeout(() => setShowSavedIndicator(false), 2000);
          skipNextFormResetRef.current = true;
          // Refresh all views
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
          queryClient.invalidateQueries({ queryKey: ['business-request-audit', requestId] });
        },
        onError: () => {
          setIsSaving(false);
          toast.error('Failed to save changes');
        }
      });
    }, 800);
  }, [requestId, updateMutation, queryClient]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleFieldChange = (field: string, value: any) => {
    // Handle batch updates (multiple fields at once)
    if (field === '_batch' && typeof value === 'object') {
      setFormData(prev => {
        const updated = { ...prev, ...value };
        // Trigger auto-save with the updated data
        triggerAutoSave(updated, originalData);
        return updated;
      });
    } else {
      // Use functional update to ensure we always get the latest state
      setFormData(prev => {
        const updated = { ...prev, [field]: value };
        // Trigger auto-save with the updated data
        triggerAutoSave(updated, originalData);
        return updated;
      });
    }
    
    // Enable Save button on first edit
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

  // Get drawer width classes based on expanded state
  const drawerWidthClass = isExpanded 
    ? 'w-screen sm:w-[70vw] sm:max-w-[1120px]' 
    : 'w-screen sm:w-[65vw] sm:max-w-[980px]';

  if (!isOpen) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <SheetContent 
          side="right" 
          hideClose 
          className={cn(
            "p-0 flex flex-col transition-colors duration-300",
            drawerWidthClass
          )}
          style={{ 
            background: 'white',
            borderLeft: '1px solid rgba(229, 231, 235, 0.8)'
          }}
        >
          {/* Breadcrumb Row - 9.5 Executive */}
          <div className={cn(
            "px-6 py-3 flex items-center gap-3",
            "border-b border-gray-100 dark:border-[#242424]",
            "bg-gray-50/50 dark:bg-[#1c1c1c]/50"
          )}>
            <nav className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                Product Backlog
              </span>
              <span className="text-gray-300 dark:text-[#2c2c2c]">/</span>
              <span className="text-[11px] font-bold font-mono text-[#8b7355] dark:text-[#d4a855] tracking-wide">
                {request?.request_key || '...'}
              </span>
            </nav>
            
            {/* Copy Link Button */}
            <button 
              onClick={handleCopyLink}
              className={cn(
                "group p-1.5 -ml-1 rounded-lg transition-smooth",
                "text-gray-400 hover:text-[#c69c6d] dark:hover:text-[#d4a855]",
                "hover:bg-[#c69c6d]/10 dark:hover:bg-[#d4a855]/10"
              )}
              title="Copy link"
            >
              <LinkIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
            </button>
            
            <div className="flex-1" />
            
            {/* Auto-save Indicator */}
            {showSavedIndicator && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full",
                "bg-[#5c7c5c]/10 dark:bg-[#7a9a7a]/15",
                "border border-[#5c7c5c]/20 dark:border-[#7a9a7a]/20"
              )}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#5c7c5c] dark:bg-[#7a9a7a] pulse-subtle" />
                <span className="text-[11px] font-semibold text-[#5c7c5c] dark:text-[#7a9a7a] tracking-wide">
                  Saved
                </span>
              </div>
            )}
            
            {isSaving && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full",
                "bg-[#c69c6d]/10 dark:bg-[#d4a855]/15",
                "border border-[#c69c6d]/20 dark:border-[#d4a855]/20"
              )}>
                <Loader2 className="w-3 h-3 animate-spin text-[#c69c6d] dark:text-[#d4a855]" />
                <span className="text-[11px] font-semibold text-[#c69c6d] dark:text-[#d4a855] tracking-wide">
                  Saving...
                </span>
              </div>
            )}
          </div>

          {/* Hero Row - 9.5 Executive */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-[#242424] bg-white dark:bg-[#141414]">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="group flex items-center gap-2 mb-4">
                  {isEditingName ? (
                    <Input ref={nameInputRef} value={editedName} onChange={(e) => setEditedName(e.target.value)} onBlur={handleSaveName} onKeyDown={handleNameKeyDown} className="text-[22px] font-semibold h-auto py-1.5 px-2 max-w-[480px] border-[#c69c6d]" />
                  ) : (
                    <>
                      <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white truncate max-w-[480px] leading-tight tracking-[-0.02em]">{request?.title || 'Loading...'}</h1>
                      <button onClick={handleStartEditName} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-[#8b7355] hover:bg-[#8b7355]/10 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setWorkflowModalOpen(true)} className="inline-flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-amber-50/60 dark:from-amber-900/25 dark:to-amber-900/15 border border-amber-200/70 dark:border-amber-700/40 shadow-catalyst-xs transition-smooth press-scale">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-400">Status</span>
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300 capitalize">{formData.process_step?.replace(/_/g, ' ') || 'New Request'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                  </button>
                  {formData.rank && (<div className="inline-flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-[#2c2c2c] shadow-catalyst-xs"><span className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 bg-gray-50 dark:bg-[#242424]">Rank</span><span className="px-2.5 py-2 text-[13px] font-bold text-[#c69c6d] dark:text-[#d4a855] bg-white dark:bg-[#1c1c1c]/50">#{formData.rank}</span></div>)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" onClick={handleSave} className="h-9 px-4 rounded-lg bg-gradient-to-r from-[#5c7c5c] to-[#4a6a4a] hover:from-[#4a6a4a] hover:to-[#3d5a3d] text-white text-sm font-semibold shadow-catalyst-md press-scale">Save</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><button className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#242424]"><MoreVertical className="w-4 h-4" /></button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56"><DropdownMenuItem onSelect={() => handleAdditionalOption('duplicate')}><Copy className="h-4 w-4 mr-2" />Duplicate Request</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => handleAdditionalOption('delete')} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete Request</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
                <button onClick={toggleExpand} className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#242424]" title={isExpanded ? 'Collapse' : 'Expand'}>{isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
                <button onClick={handleAttemptClose} className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#242424]"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <WorkflowViewerModal currentStep={formData.process_step || 'new_request'} requestId={requestId || ''} submittedDate={request?.created_at} onStepChange={(step) => handleFieldChange('process_step', step)} open={workflowModalOpen} onOpenChange={setWorkflowModalOpen} />
          </div>

          {/* Tabs - 9.5 Executive */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start rounded-none h-auto px-6 py-0 bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-[#242424]">
              {VIEW_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="relative px-4 py-4 text-[13px] font-medium whitespace-nowrap bg-transparent border-none rounded-none text-gray-500 hover:text-gray-700 data-[state=active]:text-gray-900 data-[state=active]:font-semibold after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:rounded-full data-[state=inactive]:after:scale-x-0 data-[state=active]:after:scale-x-100 data-[state=active]:after:bg-[#c69c6d]">{tab.label}</TabsTrigger>
              ))}
            </TabsList>

            {/* DRAWER BODY: Single scroll container - flex-1 min-h-0 overflow-y-auto */}
            <div className="executive-drawer-content flex-1 min-h-0 overflow-y-auto">
              <TabsContent value="demand-details" className="m-0 focus-visible:outline-none p-4 md:p-5 pb-6">
                <DemandDetailsViewTab data={formData} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="business-score" className="m-0 focus-visible:outline-none data-[state=inactive]:hidden">
                <BusinessScoreViewTab 
                  data={formData} 
                  onChange={handleFieldChange} 
                  onDirtyChange={handleDirtyChange}
                />
              </TabsContent>
              <TabsContent value="ea-review" className="m-0 focus-visible:outline-none data-[state=inactive]:hidden">
                <EAReviewTab data={formData} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="budget" className="m-0 focus-visible:outline-none data-[state=inactive]:hidden">
                <BudgetViewTab data={formData} onChange={handleFieldChange} onDirtyChange={handleDirtyChange} />
              </TabsContent>
              <TabsContent value="risks" className="m-0 focus-visible:outline-none data-[state=inactive]:hidden">
                <RisksViewTab data={formData} onChange={handleFieldChange} onDirtyChange={handleDirtyChange} />
              </TabsContent>
              <TabsContent value="milestones" className="m-0 focus-visible:outline-none data-[state=inactive]:hidden">
                <MilestonesViewTab data={formData} onChange={handleFieldChange} onDirtyChange={handleDirtyChange} />
              </TabsContent>
              <TabsContent value="links" className="m-0 focus-visible:outline-none data-[state=inactive]:hidden">
                <LinksViewTab data={formData} onChange={handleFieldChange} onDirtyChange={handleDirtyChange} />
              </TabsContent>
              <TabsContent value="audit-history" className="m-0 focus-visible:outline-none data-[state=inactive]:hidden">
                <AuditHistoryTab data={formData} onChange={handleFieldChange} onDirtyChange={handleDirtyChange} />
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
              className="bg-brand-primary text-white hover:bg-brand-primary-hover"
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
