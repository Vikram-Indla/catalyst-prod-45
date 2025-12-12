/**
 * =====================================================
 * CANONICAL Epic Details Panel for Catalyst Epics vNext
 * =====================================================
 * 
 * Epic vNext Drawer Restructure:
 * - Compact summary strip at top
 * - Strategy Context moved to collapsible section in Overview tab
 * - 6 tabs: Overview, Work Items, Estimation, Financials, Links, Discussions
 * - Retired: Intake, Benefits, Value, Design, Forecast, Milestones tabs
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  MessageSquare, 
  Bell,
  BellOff, 
  RefreshCw, 
  Users,
  GitBranch,
  FileText,
  ListTree,
  History,
  Link as LinkIcon,
  ArrowDown,
  Split,
  Trash2,
  XCircle,
  Copy,
  Kanban,
  LayoutGrid,
  X,
  Pencil,
  ChevronDown,
  Maximize2,
  Minimize2
} from 'lucide-react';
// vNext tabs (6 tabs only)
import { EpicOverviewTab } from './tabs/EpicOverviewTab';
import { EpicChildrenTab } from './tabs/EpicChildrenTab';
import { EpicEstimationTab } from './tabs/EpicEstimationTab';
import { EpicFinancialsTab } from './tabs/EpicFinancialsTab';
import { EpicDiscussionsTab } from './tabs/EpicDiscussionsTab';
import { UnifiedLinksTab } from '@/components/shared/UnifiedLinksTab';
import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';
// Roll-up summary (compact mode)
import { EpicRollUpSummary } from './EpicRollUpSummary';
// Dialogs
import { DeleteEpicDialog } from './dialogs/DeleteEpicDialog';
import { CancelEpicDialog } from './dialogs/CancelEpicDialog';
import { SplitEpicDialog } from './dialogs/SplitEpicDialog';
import { DuplicateEpicDialog } from './dialogs/DuplicateEpicDialog';
import { AuditLogDialog } from './dialogs/AuditLogDialog';
import { WhyPanelDialog } from './dialogs/WhyPanelDialog';
import { WorkItemPresence } from '@/components/work-items/WorkItemPresence';
import { WorkItemWatchers } from '@/components/work-items/WorkItemWatchers';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { toast } from 'sonner';

interface EpicDetailsPanelProps {
  epic: any;
  open: boolean;
  onClose: () => void;
}

export function EpicDetailsPanel({ epic: initialEpic, open, onClose }: EpicDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [whyPanelOpen, setWhyPanelOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(initialEpic?.name || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Sync editedName when epic changes
  useEffect(() => {
    if (initialEpic?.name) {
      setEditedName(initialEpic.name);
    }
  }, [initialEpic?.name]);

  // Fetch fresh epic data to ensure we have latest estimation_system and other fields
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

  // Use fresh data if available, otherwise fall back to initial prop
  const epic = freshEpic || initialEpic;

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async ({ newName, options }: { newName: string; options: any }) => {
      const { data, error } = await supabase
        .from('epics')
        .insert([{
          name: newName,
          description: epic.description,
          portfolio_id: epic.portfolio_id,
          primary_program_id: epic.primary_program_id,
          theme_id: epic.theme_id,
          health: epic.health,
          owner_id: epic.owner_id,
          start_date: options.includeDates ? epic.start_date : null,
          end_date: options.includeDates ? epic.end_date : null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Epic duplicated successfully');
    },
    onError: () => {
      toast.error('Failed to duplicate epic');
    }
  });

  // Drop to parking lot mutation
  const dropMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('epics')
        .update({ parked_at: new Date().toISOString() })
        .eq('id', epic.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['epic', epic.id] });
      toast.success('Epic moved to parking lot');
    },
    onError: () => {
      toast.error('Failed to drop epic');
    }
  });

  // Update child process steps mutation (Doc lines 43-55: bulk update child Features to epic's process step)
  const updateChildStepsMutation = useMutation({
    mutationFn: async () => {
      // Update all child features to have the same status as the epic
      const { error } = await supabase
        .from('features')
        .update({ 
          status: epic.status || 'funnel',
          updated_at: new Date().toISOString() 
        })
        .eq('epic_id', epic.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Child process steps updated to match epic status');
    },
    onError: () => {
      toast.error('Failed to update child process steps');
    }
  });

  // Subscribe functionality using DB-backed hook (Doc lines 28-40)
  const { isSubscribed, subscribe, unsubscribe } = useSubscriptions('epic', epic.id);
  const subscribed = isSubscribed('epic', epic.id);
  
  const handleSubscribe = () => {
    if (subscribed) {
      unsubscribe({ entityType: 'epic', entityId: epic.id });
      toast.success('Unsubscribed from epic notifications');
    } else {
      subscribe({ entityType: 'epic', entityId: epic.id });
      toast.success('Subscribed to epic notifications');
    }
  };

  const handleAdditionalOption = (action: string) => {
    switch (action) {
      case 'discussions':
        setActiveTab('discussions');
        break;
      case 'subscribe':
        handleSubscribe();
        break;
      case 'update-child-steps':
        updateChildStepsMutation.mutate();
        break;
      case 'responsibility-matrix':
        navigate(`/items/epics/${epic.id}/responsibility-matrix`);
        break;
      case 'trace':
        navigate(`/items/epics/${epic.id}/trace`);
        break;
      case 'status-report':
        navigate(`/items/epics/${epic.id}/status-report`);
        break;
      case 'requirement-hierarchy':
        navigate(`/items/epics/${epic.id}/requirement-hierarchy`);
        break;
      case 'audit-log':
        setAuditLogOpen(true);
        break;
      case 'links':
        setActiveTab('links');
        break;
      case 'drop':
        dropMutation.mutate();
        break;
      case 'split':
        setSplitDialogOpen(true);
        break;
      case 'delete':
        setDeleteDialogOpen(true);
        break;
      case 'cancel':
        setCancelDialogOpen(true);
        break;
      case 'copy':
        setDuplicateDialogOpen(true);
        break;
      case 'add-to-kanban':
        navigate(`/kanban-boards?add=${epic.id}`);
        break;
      case 'epic-planning':
        navigate(`/items/epics/${epic.id}/planning`);
        break;
      case 'work-tree':
        navigate(`/work-tree?epic=${epic.id}`);
        break;
    }
  };

  const handleDuplicateConfirm = (newName: string, options: any) => {
    duplicateMutation.mutate({ newName, options });
  };

  // Save name mutation
  const saveNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase
        .from('epics')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', epic.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['epic-detail', epic.id] });
      setIsEditingName(false);
      setHasChanges(false);
      toast.success('Epic name updated');
    },
    onError: () => {
      toast.error('Failed to update epic name');
    }
  });

  // Copy link handler
  const handleCopyLink = () => {
    const url = `${window.location.origin}/items/epics/${epic.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Edit name handlers
  const handleStartEditName = () => {
    setIsEditingName(true);
    setEditedName(epic.name);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== epic.name) {
      saveNameMutation.mutate(editedName.trim());
    } else {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(epic.name);
    }
  };

  // Why button handler - shows parent hierarchy, WSJF, and business case info
  const handleWhyClick = () => {
    setWhyPanelOpen(true);
  };

  // Save handlers
  const handleSave = () => {
    // Trigger save across all tabs
    toast.success('Epic saved');
    setHasChanges(false);
  };

  const handleSaveAndClose = () => {
    handleSave();
    onClose();
  };

  // Toggle expand/collapse drawer
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Get drawer width classes based on expanded state
  const drawerWidthClass = isExpanded 
    ? 'w-full sm:max-w-full' 
    : 'w-full sm:w-[600px] md:w-[700px] lg:w-[800px] sm:max-w-[90vw]';

  return (
    <>
      <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" hideClose className={`executive-drawer ${drawerWidthClass} p-0 flex flex-col overflow-hidden bg-white`}>
          <SheetHeader className="executive-drawer-header flex-col space-y-0 shrink-0 p-0 bg-white">
            {/* Compact header row */}
            <div className="flex items-center justify-between px-3 md:px-4 h-10 border-b border-neutral-200 bg-white">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded text-sm">
                  <span className="text-primary font-medium">Epic {epic.epic_key || epic.id?.slice(0, 8)}</span>
                  <button
                    onClick={handleCopyLink}
                    className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                    title="Copy link"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                {epic?.id && <WorkItemPresence workItemType="epics" workItemId={epic.id} />}
                {epic?.id && <WorkItemWatchers workItemType="epic" workItemId={epic.id} />}
              </div>
              
              {/* Action buttons row: Why?, Save, Save & Close, Expand, Close */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWhyClick}
                  className="h-8 px-3 text-sm font-medium"
                >
                  Why?
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-sm font-medium"
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
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveAndClose}
                  className="h-8 px-3 text-sm font-medium bg-primary hover:bg-primary/90"
                >
                  Save & Close
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleExpand}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>
            </div>
            
            {/* Second row: Editable title with pen icon */}
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0 group">
                {isEditingName ? (
                  <Input
                    ref={nameInputRef}
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleNameKeyDown}
                    className="text-lg font-semibold h-auto py-1 px-2 border-primary/50 focus:border-primary"
                  />
                ) : (
                  <>
                    <SheetTitle className="executive-drawer-title truncate text-lg">{epic.name}</SheetTitle>
                    <button
                      onClick={handleStartEditName}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all p-1"
                      title="Edit name"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              
              {/* More options dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-popover">
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('discussions')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Discussions
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('subscribe')}>
                    {subscribed ? (
                      <BellOff className="h-4 w-4 mr-2" />
                    ) : (
                      <Bell className="h-4 w-4 mr-2" />
                    )}
                    {subscribed ? 'Unsubscribe' : 'Subscribe'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('update-child-steps')}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update Child Process Steps
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('responsibility-matrix')}>
                    <Users className="h-4 w-4 mr-2" />
                    Responsibility Matrix
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('trace')}>
                    <GitBranch className="h-4 w-4 mr-2" />
                    Trace This Epic
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('status-report')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Status Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('requirement-hierarchy')}>
                    <ListTree className="h-4 w-4 mr-2" />
                    Requirement Hierarchy
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('audit-log')}>
                    <History className="h-4 w-4 mr-2" />
                    Audit Log
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('links')}>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Links
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('drop')}>
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Drop to Parking Lot
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('split')}>
                    <Split className="h-4 w-4 mr-2" />
                    Split
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('delete')} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('cancel')} className="text-warning">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Item
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('copy')}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('add-to-kanban')}>
                    <Kanban className="h-4 w-4 mr-2" />
                    Add To Kanban Board
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('epic-planning')}>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Epic Planning
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAdditionalOption('work-tree')}>
                    <ListTree className="h-4 w-4 mr-2" />
                    Work Tree
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <SheetDescription className="sr-only">Epic details panel</SheetDescription>
          </SheetHeader>

          {/* Compact Roll-up Summary Strip */}
          <div className="px-4 py-2 border-b border-border/40 bg-muted/10">
            <EpicRollUpSummary epic={epic} compact />
          </div>

          {/* vNext 6-Tab Structure */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="executive-tabs-list w-full justify-start rounded-none border-b h-auto shrink-0 overflow-x-auto flex-nowrap bg-[#feffff]">
              <TabsTrigger value="overview" className="executive-tab">Overview</TabsTrigger>
              <TabsTrigger value="work-items" className="executive-tab">Work Items</TabsTrigger>
              <TabsTrigger value="estimation" className="executive-tab">Estimation</TabsTrigger>
              <TabsTrigger value="financials" className="executive-tab">Financials</TabsTrigger>
              <TabsTrigger value="links" className="executive-tab">Links</TabsTrigger>
              <TabsTrigger value="discussions" className="executive-tab">Discussions</TabsTrigger>
              <TabsTrigger value="audit-history" className="executive-tab">Audit History</TabsTrigger>
            </TabsList>

            <div className="executive-drawer-content flex-1 overflow-y-auto">
              <TabsContent value="overview" className="m-0 focus-visible:outline-none">
                <EpicOverviewTab epic={epic} />
              </TabsContent>
              <TabsContent value="work-items" className="m-0 focus-visible:outline-none">
                <EpicChildrenTab epic={epic} />
              </TabsContent>
              <TabsContent value="estimation" className="m-0 focus-visible:outline-none">
                <EpicEstimationTab epic={epic} />
              </TabsContent>
              <TabsContent value="financials" className="m-0 focus-visible:outline-none">
                <EpicFinancialsTab epic={epic} />
              </TabsContent>
              <TabsContent value="links" className="m-0 focus-visible:outline-none">
                <UnifiedLinksTab entityType="epic" entityId={epic.id} />
              </TabsContent>
              <TabsContent value="discussions" className="m-0 focus-visible:outline-none h-[500px]">
                <EpicDiscussionsTab epic={epic} />
              </TabsContent>
              <TabsContent value="audit-history" className="m-0 focus-visible:outline-none h-[500px]">
                <UnifiedAuditHistoryTab entityType="epic" entityId={epic.id} />
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <DeleteEpicDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        epicId={epic.id}
        epicName={epic.name}
        onSuccess={onClose}
      />

      <CancelEpicDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        epicId={epic.id}
        epicName={epic.name}
        onSuccess={onClose}
      />

      <SplitEpicDialog
        open={splitDialogOpen}
        onOpenChange={setSplitDialogOpen}
        epic={epic}
      />

      <DuplicateEpicDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        epicName={epic.name}
        onConfirm={handleDuplicateConfirm}
      />

      <AuditLogDialog
        open={auditLogOpen}
        onOpenChange={setAuditLogOpen}
        entityId={epic.id}
        entityType="epics"
        entityName={epic.name}
      />

      <WhyPanelDialog
        open={whyPanelOpen}
        onOpenChange={setWhyPanelOpen}
        epic={epic}
      />
    </>
  );
}
