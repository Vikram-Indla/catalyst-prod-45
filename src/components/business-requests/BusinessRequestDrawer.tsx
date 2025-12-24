import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Copy,
  Check
} from 'lucide-react';
import { useBusinessRequest, useUpdateBusinessRequest, useDeleteBusinessRequest, useDuplicateBusinessRequest } from '@/hooks/useBusinessRequests';
import { PriorityPill } from './PriorityPill';
import { PriorityTier } from '@/hooks/usePrioritizationConfig';
import { BusinessRequest } from '@/types/business-request';
import { DemandDetailsViewTab } from './drawer-tabs/DemandDetailsViewTab';
import { BusinessScoreViewTab } from './drawer-tabs/BusinessScoreViewTab';
import { BudgetViewTab } from './drawer-tabs/BudgetViewTab';
import { LinksViewTab } from './drawer-tabs/LinksViewTab';
import { AuditHistoryTab } from './drawer-tabs/AuditHistoryTab';
import { ExecutiveAuditHistoryTab } from './drawer-tabs/ExecutiveAuditHistoryTab';
import { MilestonesViewTab } from './drawer-tabs/MilestonesViewTab';
import { RisksViewTab } from './drawer-tabs/RisksViewTab';
import { WorkflowViewerModal } from './WorkflowViewerModal';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { StoryDetailsPanel } from '@/components/items/stories/StoryDetailsPanel';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVisibleDrawerTabs } from '@/hooks/useDrawerTabConfigs';
import { useBusinessDrawerRoleTabs } from '@/hooks/useBusinessDrawerRoleTabs';
import { EnterpriseStatusControl, WorkflowFooter, getNextWorkflowAction, StatusDropdown } from './drawer';
import { EAReviewTab } from './drawer-tabs/EAReviewTab';
import { ScoringReviewTab } from './drawer-tabs/ScoringReviewTab';
import { PlanningViewTab } from './drawer-tabs/PlanningViewTab';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Debounce delay for auto-save (ms)
const AUTO_SAVE_DELAY = 800;

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
  initialTab?: string;
}

// Consolidated tabs - 5 tabs instead of 8
const FALLBACK_TABS = [
  { value: 'details', label: 'Details' },
  { value: 'scoring', label: 'Scoring & Review' },
  { value: 'planning', label: 'Planning' },
  { value: 'links', label: 'Links' },
  { value: 'history', label: 'History' },
];

export function BusinessRequestDrawer({ isOpen, onClose, requestId, onRequestChange, initialTab }: BusinessRequestDrawerProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: request, isLoading } = useBusinessRequest(requestId);
  const updateMutation = useUpdateBusinessRequest();
  const deleteMutation = useDeleteBusinessRequest();
  const duplicateMutation = useDuplicateBusinessRequest();
  
  // Fetch visible tabs based on user role
  const { visibleTabs: roleBasedTabs, isLoading: roleTabsLoading } = useBusinessDrawerRoleTabs();
  const VIEW_TABS = roleBasedTabs.length > 0 ? roleBasedTabs : FALLBACK_TABS;
  
  // Fetch tab counts for dynamic status indicators
  const { data: risksCount = 0 } = useQuery({
    queryKey: ['business-request-risks-count', requestId],
    queryFn: async () => {
      if (!requestId) return 0;
      const { count } = await supabase
        .from('business_request_links')
        .select('id', { count: 'exact', head: true })
        .eq('business_request_id', requestId)
        .eq('kind', 'risk');
      return count || 0;
    },
    enabled: !!requestId,
    staleTime: 30000,
  });
  
  const { data: milestonesCount = 0 } = useQuery({
    queryKey: ['business-request-milestones-count', requestId],
    queryFn: async () => {
      if (!requestId) return 0;
      const { count } = await supabase
        .from('milestones')
        .select('id', { count: 'exact', head: true })
        .eq('business_request_id', requestId);
      return count || 0;
    },
    enabled: !!requestId,
    staleTime: 30000,
  });
  
  const { data: linksCount = 0 } = useQuery({
    queryKey: ['business-request-links-count', requestId],
    queryFn: async () => {
      if (!requestId) return 0;
      const { count } = await supabase
        .from('business_request_links')
        .select('id', { count: 'exact', head: true })
        .eq('business_request_id', requestId);
      return count || 0;
    },
    enabled: !!requestId,
    staleTime: 30000,
  });
  
  const { data: auditCount = 0 } = useQuery({
    queryKey: ['business-request-audit-count', requestId],
    queryFn: async () => {
      if (!requestId) return 0;
      const { count } = await supabase
        .from('business_request_audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('business_request_id', requestId);
      return count || 0;
    },
    enabled: !!requestId,
    staleTime: 60000,
  });
  
  const [activeTab, setActiveTab] = useState('demand-details');
  const [formData, setFormData] = useState<Partial<BusinessRequest> & Record<string, any>>({});
  const [originalData, setOriginalData] = useState<Partial<BusinessRequest> & Record<string, any>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  
  // Linked item panel state
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  // Fetch selected feature data
  const { data: selectedFeature } = useQuery({
    queryKey: ['feature-for-panel', selectedFeatureId],
    queryFn: async () => {
      if (!selectedFeatureId) return null;
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('id', selectedFeatureId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFeatureId,
  });

  // Fetch selected story data
  const { data: selectedStory } = useQuery({
    queryKey: ['story-for-panel', selectedStoryId],
    queryFn: async () => {
      if (!selectedStoryId) return null;
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', selectedStoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStoryId,
  });
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const tabsBodyScrollRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Partial<BusinessRequest> & Record<string, any>>({});

  // Track if we initiated a data update (to avoid resetting form data on refetch)
  const skipNextFormResetRef = useRef(false);

  // Handle navigation to Epic from Links tab
  const handleNavigateToEpic = useCallback((epicId: string, programId?: string | null) => {
    onClose();
    const path = programId
      ? `/program/${programId}/epic-backlog?epicId=${epicId}`
      : `/enterprise/epics?epicId=${epicId}`;
    navigate(path);
  }, [onClose, navigate]);

  // Handle navigation to Feature from Links tab - opens inline panel
  const handleNavigateToFeature = useCallback((featureId: string) => {
    setSelectedFeatureId(featureId);
  }, []);

  // Handle navigation to Story from Links tab - opens inline panel
  const handleNavigateToStory = useCallback((storyId: string) => {
    setSelectedStoryId(storyId);
  }, []);

  // Auto-save function
  const performAutoSave = useCallback(async (dataToSave: Partial<BusinessRequest> & Record<string, any>) => {
    if (!requestId) return;

    setIsSaving(true);

    try {
      // Persist first; only write audit logs after a successful save
      await updateMutation.mutateAsync({ id: requestId, data: dataToSave as Partial<BusinessRequest> });

      // Log all field changes to audit table
      await logFieldChanges(requestId, originalData, dataToSave);

      setOriginalData(dataToSave);
      skipNextFormResetRef.current = true;

      // Show saved indicator briefly
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);

      // Refresh related queries
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['business-request-audit', requestId] });
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [requestId, originalData, updateMutation, queryClient]);

  // Debounced auto-save effect
  useEffect(() => {
    return () => {
      // Cleanup timeout on unmount
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Reset to initial tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'demand-details');
    }
  }, [isOpen, initialTab]);

  // Reset scroll position when switching tabs
  useEffect(() => {
    tabsBodyScrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab, requestId]);

  // Sync form data when request changes
  useEffect(() => {
    if (request) {
      if (!skipNextFormResetRef.current) {
        setFormData(request);
        setOriginalData(request);
        setEditedName(request.title || '');
      } else {
        setOriginalData(request);
      }
      skipNextFormResetRef.current = false;
    }
  }, [request]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => {
      // Handle batch updates (multiple fields at once)
      const newData = field === '_batch' && value && typeof value === 'object'
        ? { ...prev, ...value }
        : { ...prev, [field]: value };

      // Store pending changes for auto-save
      pendingChangesRef.current = newData;

      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Schedule auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave(pendingChangesRef.current);
      }, AUTO_SAVE_DELAY);

      return newData;
    });

    skipNextFormResetRef.current = true;
  }, [performAutoSave]);

  const handleDirtyChange = (isDirty: boolean) => {
    if (isDirty) {
      skipNextFormResetRef.current = true;
    }
  };

  const handleClose = () => {
    // Flush any pending auto-save before closing
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      // Perform immediate save if there are pending changes
      if (Object.keys(pendingChangesRef.current).length > 0) {
        performAutoSave(pendingChangesRef.current);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    onClose();
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

  // Get drawer width classes based on expanded state - full screen when expanded
  const drawerWidthClass = isExpanded 
    ? 'fixed inset-0 w-screen h-screen max-w-none' 
    : 'w-screen sm:w-[65vw] sm:max-w-[980px]';

  if (!isOpen) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
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
                className="p-1 rounded hover:bg-[var(--surface-hover,hsl(var(--muted)))] transition-smooth press-scale"
                style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                title="Copy link"
              >
                <LinkIcon className="h-3 w-3" />
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                HERO ROW: Title + Status Badge + Rank Badge
                ═══════════════════════════════════════════════════════════ */}
            <div className="flex items-start justify-between px-5 py-4 gap-4">
              
              {/* Left Side: Title + Status Badge Row */}
              <div className="flex-1 min-w-0 space-y-2.5">
                
                {/* Title with Edit */}
                <div className="flex items-center gap-1.5 group">
                  {isEditingName ? (
                    <Input
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleNameKeyDown}
                      className="text-[22px] font-semibold h-auto py-1.5 px-2 max-w-[480px] border-[#c69c6d] focus-visible:ring-[#c69c6d]/20 focus-visible:glow-gold transition-smooth"
                      style={{ 
                        background: 'var(--surface-subtle, hsl(var(--muted)))',
                        color: 'var(--text-primary, hsl(var(--foreground)))'
                      }}
                    />
                  ) : (
                    <>
                      <SheetTitle 
                        className="text-[22px] font-semibold tracking-[-0.3px] truncate max-w-[520px] leading-tight"
                        style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}
                      >
                        {request?.title || 'Loading...'}
                      </SheetTitle>
                      <button
                        onClick={handleStartEditName}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--surface-hover,hsl(var(--muted)))] transition-smooth press-scale"
                        style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Status Badge + Rank Badge Row */}
                <div className="flex items-center gap-2.5">
                  {/* Status Dropdown - CLICKABLE */}
                  <StatusDropdown
                    currentStep={formData.process_step}
                    onChange={(step) => handleFieldChange('process_step', step)}
                  />

                  {/* Rank Badge - shows "Rank #4" format */}
                  {formData.rank && (
                    <div 
                      className="inline-flex items-center px-2 py-1 rounded text-[12px] font-semibold"
                      style={{
                        background: 'hsl(var(--muted))',
                        color: 'var(--text-primary, hsl(var(--foreground)))'
                      }}
                    >
                      Rank #{formData.rank}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                
                {/* Auto-save indicator - smooth transition between states */}
                <div className="min-w-[70px] flex items-center justify-end">
                  <div 
                    className={`
                      flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                      transition-all duration-300 ease-in-out
                      ${isSaving 
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 opacity-100' 
                        : showSavedIndicator 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 opacity-100' 
                          : 'opacity-0'
                      }
                    `}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : showSavedIndicator ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Saved</span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* More Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))] press-scale transition-smooth"
                      style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-48 z-[400] shadow-catalyst-lg"
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
                  className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))] press-scale transition-smooth"
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                {/* Close */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleClose}
                  className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))] press-scale transition-smooth"
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
              className="w-full justify-start rounded-none h-auto shrink-0 flex-nowrap px-5 bg-transparent py-0"
              style={{ borderBottom: '1px solid var(--border-default, hsl(var(--border)))' }}
            >
              {VIEW_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "relative px-3 md:px-4 py-3 text-xs md:text-[13px] font-medium whitespace-nowrap",
                    "bg-transparent border-none rounded-none",
                    "data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground",
                    // Active indicator
                    "after:absolute after:bottom-0 after:left-2 after:right-2",
                    "after:h-[2px] after:rounded-t-sm after:transition-all",
                    "data-[state=inactive]:after:bg-transparent data-[state=inactive]:after:opacity-0",
                    "data-[state=active]:after:bg-[#c69c6d] data-[state=active]:after:opacity-100"
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ═══════════════════════════════════════════════════════════
                DRAWER BODY
                ═══════════════════════════════════════════════════════════ */}
            <div 
              ref={tabsBodyScrollRef}
              className="flex-1 min-h-0 overflow-y-auto"
              style={{ background: 'var(--surface-subtle, hsl(var(--muted)/0.3))' }}
            >
              {/* Demand Details Tab */}
              <TabsContent value="demand-details" className="mt-0 focus-visible:outline-none">
                <DemandDetailsViewTab 
                  data={formData} 
                  onChange={handleFieldChange} 
                  onDirtyChange={handleDirtyChange}
                  requestId={requestId}
                />
              </TabsContent>
              
              {/* Business Score Tab */}
              <TabsContent value="business-score" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                <BusinessScoreViewTab 
                  data={formData} 
                  onChange={handleFieldChange} 
                  requestId={requestId || undefined}
                  onDirtyChange={handleDirtyChange}
                />
              </TabsContent>
              
              {/* EA Review Tab */}
              <TabsContent value="ea-review" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                <EAReviewTab 
                  data={formData} 
                  onChange={handleFieldChange}
                />
              </TabsContent>
              
              {/* Budget Tab */}
              <TabsContent value="budget" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                <BudgetViewTab 
                  data={formData} 
                  onChange={handleFieldChange}
                />
              </TabsContent>
              
              {/* Risks Tab */}
              <TabsContent value="risks" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                {requestId && <RisksViewTab requestId={requestId} />}
              </TabsContent>
              
              {/* Milestones Tab */}
              <TabsContent value="milestones" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                {requestId && <MilestonesViewTab requestId={requestId} />}
              </TabsContent>
              
              {/* Links Tab */}
              <TabsContent value="links" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                {requestId && (
                  <LinksViewTab 
                    requestId={requestId} 
                    onNavigateToEpic={handleNavigateToEpic}
                    onNavigateToFeature={handleNavigateToFeature}
                    onNavigateToStory={handleNavigateToStory}
                  />
                )}
              </TabsContent>
              
              {/* Audit History Tab */}
              <TabsContent value="audit-history" className="mt-0 p-5 pb-8 focus-visible:outline-none">
                {requestId && <ExecutiveAuditHistoryTab requestId={requestId} />}
              </TabsContent>
            </div>
          </Tabs>

        </SheetContent>
      </Sheet>


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

      {/* Feature Details Panel */}
      <FeatureDetailsPanel
        feature={selectedFeature || undefined}
        open={!!selectedFeatureId}
        onClose={() => setSelectedFeatureId(null)}
      />

      {/* Story Details Panel */}
      <StoryDetailsPanel
        story={selectedStory}
        open={!!selectedStoryId}
        onClose={() => setSelectedStoryId(null)}
      />
    </>
  );
}
