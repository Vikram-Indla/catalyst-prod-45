import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useBusinessRequest, useUpdateBusinessRequest, useDeleteBusinessRequest, useDuplicateBusinessRequest } from '@/hooks/useBusinessRequests';
import { PriorityPill } from './PriorityPill';
import { PriorityTier } from '@/hooks/usePrioritizationConfig';
import { BusinessRequest } from '@/types/business-request';
import { DemandDetailsViewTab } from './drawer-tabs/DemandDetailsViewTab';
import { BusinessScoreViewTab } from './drawer-tabs/BusinessScoreViewTab';
import { BudgetViewTab } from './drawer-tabs/BudgetViewTab';
import { LinksViewTab } from './drawer-tabs/LinksViewTab';
import { DiscussionsViewTab } from './drawer-tabs/DiscussionsViewTab';
import { ExecutiveDiscussionsTab } from './drawer-tabs/ExecutiveDiscussionsTab';
import { AuditHistoryTab } from './drawer-tabs/AuditHistoryTab';
import { ExecutiveAuditHistoryTab } from './drawer-tabs/ExecutiveAuditHistoryTab';
import { MilestonesViewTab } from './drawer-tabs/MilestonesViewTab';
import { RisksViewTab } from './drawer-tabs/RisksViewTab';
import { WorkflowViewerModal } from './WorkflowViewerModal';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVisibleDrawerTabs } from '@/hooks/useDrawerTabConfigs';
import { EnterpriseStatusControl } from './drawer';
import { EAReviewTab } from './drawer-tabs/EAReviewTab';
import { cn } from '@/lib/utils';

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

// Fallback tabs if config is not loaded
const FALLBACK_TABS = [
  { value: 'demand-details', label: 'Demand Details' },
  { value: 'business-score', label: 'Business Score' },
  { value: 'ea-review', label: 'EA Review' },
  { value: 'budget', label: 'Budget' },
  { value: 'risks', label: 'Risks' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'links', label: 'Links' },
  { value: 'discussions', label: 'Discussions' },
  { value: 'audit-history', label: 'Audit History' },
];

export function BusinessRequestDrawer({ isOpen, onClose, requestId, onRequestChange }: BusinessRequestDrawerProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: request, isLoading } = useBusinessRequest(requestId);
  const updateMutation = useUpdateBusinessRequest();
  const deleteMutation = useDeleteBusinessRequest();
  const duplicateMutation = useDuplicateBusinessRequest();
  
  // Fetch visible tabs from configuration
  const { visibleTabs, isLoading: tabsLoading } = useVisibleDrawerTabs();
  const VIEW_TABS = visibleTabs.length > 0 ? visibleTabs : FALLBACK_TABS;
  
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
  const [cioPanelCollapsed, setCioPanelCollapsed] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Track if we initiated a data update (to avoid resetting hasChanges on refetch)
  // Using ref instead of state to avoid triggering useEffect re-runs
  const skipNextFormResetRef = useRef(false);

  // Handle navigation to Epic from Links tab
  // Closes this drawer, navigates to Program Backlog (epic-backlog) with epicId param so drawer auto-opens there
  const handleNavigateToEpic = useCallback((epicId: string, programId?: string | null) => {
    // 1. Close the business drawer
    onClose();

    // 2. Build route to Program Backlog (epic-backlog) with epicId query param
    // This is the canonical route shown in screenshot as "Program Backlog" with "Epics" tab
    const path = programId
      ? `/program/${programId}/epic-backlog?epicId=${epicId}`
      : `/enterprise/epics?epicId=${epicId}`;

    // 3. Navigate using push (not replace) to preserve browser back behaviour
    navigate(path);
  }, [onClose, navigate]);

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
        <SheetContent 
          side="right" 
          hideClose 
          className={cn("p-0 flex flex-col", drawerWidthClass)}
          style={{ 
            background: 'var(--surface-bg, hsl(var(--background)))',
            borderLeft: '1px solid var(--border-default, hsl(var(--border)))'
          }}
        >
          <SheetHeader className="flex-col space-y-0 shrink-0 p-0">
            
            {/* ═══════════════════════════════════════════════════════════
                BREADCRUMB ROW
                ═══════════════════════════════════════════════════════════ */}
            <div 
              className="px-5 pt-2.5 pb-1.5 flex items-center gap-1.5"
              style={{ borderBottom: '1px solid var(--border-subtle, hsl(var(--border)/0.5))' }}
            >
              <span 
                className="text-[10px] font-medium uppercase tracking-[0.5px]"
                style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
              >
                Product Backlog
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>/</span>
              <span 
                className="text-[11px] font-semibold font-mono"
                style={{ color: '#8B7355' }}
              >
                {request?.request_key || '...'}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-1 rounded hover:bg-[var(--surface-hover,hsl(var(--muted)))] transition-colors"
                style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                title="Copy link"
              >
                <LinkIcon className="h-3 w-3" />
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                HERO ROW: Title + Meta + Actions
                ═══════════════════════════════════════════════════════════ */}
            <div className="flex items-start justify-between px-5 py-3 gap-4">
              
              {/* Left Side: Title + Meta Strip */}
              <div className="flex-1 min-w-0 space-y-2">
                
                {/* Title with Edit */}
                <div className="flex items-center gap-1.5 group">
                  {isEditingName ? (
                    <Input
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleNameKeyDown}
                      className="text-[18px] font-semibold h-auto py-1 px-2 max-w-[480px]"
                      style={{ 
                        background: 'var(--surface-subtle, hsl(var(--muted)))',
                        borderColor: '#5C7C5C',
                        color: 'var(--text-primary, hsl(var(--foreground)))'
                      }}
                    />
                  ) : (
                    <>
                      <SheetTitle 
                        className="text-[18px] font-semibold tracking-[-0.3px] truncate max-w-[480px] leading-tight"
                        style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}
                      >
                        {request?.title || 'Loading...'}
                      </SheetTitle>
                      <button
                        onClick={handleStartEditName}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--surface-hover,hsl(var(--muted)))] transition-all"
                        style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                        title="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>

                {/* Status Control */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <EnterpriseStatusControl
                    currentStep={formData.process_step || 'new_request'}
                    onChange={(step) => handleFieldChange('process_step', step)}
                  />
                </div>
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                
                {/* Save Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-[13px] font-medium text-white"
                      style={{ 
                        background: '#5C7C5C',
                        boxShadow: '0 2px 4px rgba(92, 124, 92, 0.25)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#4A6A4A'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#5C7C5C'}
                    >
                      Save
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="z-[400] w-40"
                    style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}
                  >
                    <DropdownMenuItem onSelect={handleSave}>
                      Save
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleSaveAndClose}>
                      Save & Close
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* More Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
                      style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-48 z-[400]"
                    style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}
                  >
                    <DropdownMenuItem onSelect={() => handleAdditionalOption('duplicate')}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Request
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onSelect={() => handleAdditionalOption('delete')}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Request
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Expand/Collapse */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleExpand}
                  className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                {/* Close */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleAttemptClose}
                  className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Bottom Border */}
            <div style={{ borderBottom: '1px solid var(--border-default, hsl(var(--border)))' }} />
            <SheetDescription className="sr-only">Business request details panel</SheetDescription>
          </SheetHeader>

          {/* Hidden workflow modal trigger */}
          <WorkflowViewerModal 
            currentStep={formData.process_step || 'new_request'}
            requestId={requestId || ''}
            submittedDate={request?.created_at}
            onStepChange={(step) => handleFieldChange('process_step', step)}
            open={workflowModalOpen}
            onOpenChange={setWorkflowModalOpen}
          />

          {/* ═══════════════════════════════════════════════════════════
              TABS - Catalyst Design System
              ═══════════════════════════════════════════════════════════ */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList 
              className="w-full justify-start rounded-none h-10 shrink-0 overflow-x-auto flex-nowrap px-5 bg-transparent"
              style={{ borderBottom: '1px solid var(--border-default, hsl(var(--border)))' }}
            >
              {VIEW_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap bg-transparent border-none rounded-none data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ═══════════════════════════════════════════════════════════
                DRAWER BODY
                ═══════════════════════════════════════════════════════════ */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto"
              style={{ background: 'var(--surface-subtle, hsl(var(--muted)/0.3))' }}
            >
              <TabsContent value="demand-details" className="m-0 focus-visible:outline-none p-5 pb-8">
                <DemandDetailsViewTab data={formData} onChange={handleFieldChange} onNavigateToTab={setActiveTab} />
              </TabsContent>
              
              <TabsContent value="business-score" className="m-0 focus-visible:outline-none p-5 pb-8">
                <BusinessScoreViewTab 
                  data={formData} 
                  onChange={handleFieldChange} 
                  requestId={requestId || undefined}
                  onDirtyChange={handleDirtyChange}
                />
              </TabsContent>
              
              <TabsContent value="ea-review" className="m-0 focus-visible:outline-none p-5 pb-8">
                <EAReviewTab data={formData} onChange={handleFieldChange} />
              </TabsContent>
              
              <TabsContent value="budget" className="m-0 focus-visible:outline-none p-5 pb-8">
                <BudgetViewTab data={formData} onChange={handleFieldChange} />
              </TabsContent>
              
              <TabsContent value="risks" className="m-0 focus-visible:outline-none p-5 pb-8">
                {requestId && <RisksViewTab requestId={requestId} />}
              </TabsContent>
              
              <TabsContent value="milestones" className="m-0 focus-visible:outline-none p-5 pb-8">
                {requestId && <MilestonesViewTab requestId={requestId} />}
              </TabsContent>
              
              <TabsContent value="links" className="m-0 focus-visible:outline-none p-5 pb-8">
                {requestId && <LinksViewTab requestId={requestId} onNavigateToEpic={handleNavigateToEpic} />}
              </TabsContent>
              
              <TabsContent value="discussions" className="m-0 focus-visible:outline-none p-5 pb-8">
                {requestId && <ExecutiveDiscussionsTab requestId={requestId} />}
              </TabsContent>
              
              <TabsContent value="audit-history" className="m-0 focus-visible:outline-none p-5 pb-8">
                {requestId && <ExecutiveAuditHistoryTab requestId={requestId} />}
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}>
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
              className="text-white"
              style={{ background: '#5C7C5C' }}
            >
              Save & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>Delete Request</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}>
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
