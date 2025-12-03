import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
  LayoutGrid
} from 'lucide-react';
import { EpicDetailsTab } from './tabs/EpicDetailsTab';
import { EpicDesignTab } from './tabs/EpicDesignTab';
import { EpicIntakeTab } from './tabs/EpicIntakeTab';
import { EpicBenefitsTab } from './tabs/EpicBenefitsTab';
import { EpicValueTab } from './tabs/EpicValueTab';
import { EpicMilestonesTab } from './tabs/EpicMilestonesTab';
import { EpicSpendTab } from './tabs/EpicSpendTab';
import { EpicForecastTab } from './tabs/EpicForecastTab';
import { EpicWSJFTab } from './tabs/EpicWSJFTab';
import { EpicLinksTab } from './tabs/EpicLinksTab';
import { EpicChildrenTab } from './tabs/EpicChildrenTab';
import { EpicDiscussionsTab } from './tabs/EpicDiscussionsTab';
import { DeleteEpicDialog } from './dialogs/DeleteEpicDialog';
import { CancelEpicDialog } from './dialogs/CancelEpicDialog';
import { SplitEpicDialog } from './dialogs/SplitEpicDialog';
import { DuplicateEpicDialog } from './dialogs/DuplicateEpicDialog';
import { AuditLogDialog } from './dialogs/AuditLogDialog';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { toast } from 'sonner';

interface EpicDetailsPanelProps {
  epic: any;
  open: boolean;
  onClose: () => void;
}

export function EpicDetailsPanel({ epic, open, onClose }: EpicDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  return (
    <>
      <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:w-[600px] md:w-[700px] lg:w-[800px] sm:max-w-[90vw] p-0 flex flex-col overflow-hidden">
          <SheetHeader className="border-b flex-row items-start justify-between space-y-0 shrink-0 px-[var(--s3)] sm:px-[var(--s4)] md:px-[var(--s6)] py-[var(--s4)]">
            <div className="flex-1 pr-2 sm:pr-4 min-w-0">
              <SheetTitle className="text-base sm:text-lg md:text-xl truncate">{epic.name}</SheetTitle>
              <SheetDescription className="text-xs sm:text-sm mt-1 truncate">
                Epic {epic.epic_key || epic.id?.slice(0, 8)}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-[var(--s2)] flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
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
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none border-b px-[var(--s3)] sm:px-[var(--s4)] md:px-[var(--s6)] shrink-0 overflow-x-auto flex-nowrap">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="children">Children</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="intake">Intake</TabsTrigger>
              <TabsTrigger value="benefits">Benefits</TabsTrigger>
              <TabsTrigger value="value">Value</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="spend">Spend</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="wsjf">WSJF</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="discussions">Discussions</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="details" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
                <EpicDetailsTab epic={epic} />
              </TabsContent>
              <TabsContent value="children" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
                <EpicChildrenTab epic={epic} />
              </TabsContent>
              <TabsContent value="design" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
                <EpicDesignTab epic={epic} />
              </TabsContent>
              <TabsContent value="intake" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
                <EpicIntakeTab epic={epic} />
              </TabsContent>
              <TabsContent value="benefits" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
                <EpicBenefitsTab epic={epic} />
              </TabsContent>
              <TabsContent value="value" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
                <EpicValueTab epic={epic} />
              </TabsContent>
              <TabsContent value="milestones" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
                <EpicMilestonesTab epic={epic} />
              </TabsContent>
              <TabsContent value="spend" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
                <EpicSpendTab epic={epic} />
              </TabsContent>
              <TabsContent value="forecast" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
                <EpicForecastTab epic={epic} />
              </TabsContent>
              <TabsContent value="wsjf" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
                <EpicWSJFTab epic={epic} />
              </TabsContent>
              <TabsContent value="links" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
                <EpicLinksTab epic={epic} />
              </TabsContent>
              <TabsContent value="discussions" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none h-[500px]">
                <EpicDiscussionsTab epic={epic} />
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
    </>
  );
}
