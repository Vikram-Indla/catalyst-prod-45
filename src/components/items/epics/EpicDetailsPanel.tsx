/**
 * =====================================================
 * CANONICAL Epic Details Panel for Catalyst Epics vNext
 * =====================================================
 * 
 * Uses the CanonicalDrawerShell for unified drawer structure.
 * Module-specific content: Roll-up summary, Why button, epic-specific tabs
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
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
} from 'lucide-react';
import { CanonicalDrawerShell, DrawerTab, KebabMenuItem } from '@/components/shared/CanonicalDrawerShell';
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
  const [hasChanges, setHasChanges] = useState(false);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // Update child process steps mutation
  const updateChildStepsMutation = useMutation({
    mutationFn: async () => {
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

  // Subscribe functionality
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
      toast.success('Epic name updated');
    },
    onError: () => {
      toast.error('Failed to update epic name');
    }
  });

  const handleTitleChange = (newName: string) => {
    saveNameMutation.mutate(newName);
  };

  // Save handlers
  const handleSave = () => {
    toast.success('Epic saved');
    setHasChanges(false);
  };

  const handleSaveAndClose = () => {
    handleSave();
    onClose();
  };

  const handleDuplicateConfirm = (newName: string, options: any) => {
    duplicateMutation.mutate({ newName, options });
  };

  // Build kebab menu items
  const kebabMenuItems: KebabMenuItem[] = [
    {
      label: 'Discussions',
      icon: <MessageSquare className="h-4 w-4 mr-2" />,
      onClick: () => setActiveTab('discussions'),
    },
    {
      label: subscribed ? 'Unsubscribe' : 'Subscribe',
      icon: subscribed ? <BellOff className="h-4 w-4 mr-2" /> : <Bell className="h-4 w-4 mr-2" />,
      onClick: handleSubscribe,
    },
    {
      label: 'Update Child Process Steps',
      icon: <RefreshCw className="h-4 w-4 mr-2" />,
      onClick: () => updateChildStepsMutation.mutate(),
      separator: true,
    },
    {
      label: 'Responsibility Matrix',
      icon: <Users className="h-4 w-4 mr-2" />,
      onClick: () => navigate(`/items/epics/${epic.id}/responsibility-matrix`),
    },
    {
      label: 'Trace This Epic',
      icon: <GitBranch className="h-4 w-4 mr-2" />,
      onClick: () => navigate(`/items/epics/${epic.id}/trace`),
    },
    {
      label: 'Status Report',
      icon: <FileText className="h-4 w-4 mr-2" />,
      onClick: () => navigate(`/items/epics/${epic.id}/status-report`),
    },
    {
      label: 'Requirement Hierarchy',
      icon: <ListTree className="h-4 w-4 mr-2" />,
      onClick: () => navigate(`/items/epics/${epic.id}/requirement-hierarchy`),
    },
    {
      label: 'Audit Log',
      icon: <History className="h-4 w-4 mr-2" />,
      onClick: () => setAuditLogOpen(true),
    },
    {
      label: 'Links',
      icon: <LinkIcon className="h-4 w-4 mr-2" />,
      onClick: () => setActiveTab('links'),
    },
    {
      label: 'Drop to Parking Lot',
      icon: <ArrowDown className="h-4 w-4 mr-2" />,
      onClick: () => dropMutation.mutate(),
      separator: true,
    },
    {
      label: 'Split',
      icon: <Split className="h-4 w-4 mr-2" />,
      onClick: () => setSplitDialogOpen(true),
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      onClick: () => setDeleteDialogOpen(true),
      variant: 'destructive',
    },
    {
      label: 'Cancel Item',
      icon: <XCircle className="h-4 w-4 mr-2" />,
      onClick: () => setCancelDialogOpen(true),
      variant: 'warning',
    },
    {
      label: 'Copy',
      icon: <Copy className="h-4 w-4 mr-2" />,
      onClick: () => setDuplicateDialogOpen(true),
      separator: true,
    },
    {
      label: 'Add To Kanban Board',
      icon: <Kanban className="h-4 w-4 mr-2" />,
      onClick: () => navigate(`/kanban-boards?add=${epic.id}`),
    },
    {
      label: 'Epic Planning',
      icon: <LayoutGrid className="h-4 w-4 mr-2" />,
      onClick: () => navigate(`/items/epics/${epic.id}/planning`),
    },
    {
      label: 'Work Tree',
      icon: <ListTree className="h-4 w-4 mr-2" />,
      onClick: () => navigate(`/work-tree?epic=${epic.id}`),
    },
  ];

  // Build tabs
  const tabs: DrawerTab[] = [
    {
      value: 'overview',
      label: 'Overview',
      content: (
        <div className="p-4 md:p-5 pb-6">
          <EpicOverviewTab epic={epic} />
        </div>
      ),
    },
    {
      value: 'work-items',
      label: 'Work Items',
      content: (
        <div className="p-4 md:p-5 pb-6">
          <EpicChildrenTab epic={epic} />
        </div>
      ),
    },
    {
      value: 'estimation',
      label: 'Estimation',
      content: (
        <div className="p-4 md:p-5 pb-6">
          <EpicEstimationTab epic={epic} />
        </div>
      ),
    },
    {
      value: 'financials',
      label: 'Financials',
      content: (
        <div className="p-4 md:p-5 pb-6">
          <EpicFinancialsTab epic={epic} />
        </div>
      ),
    },
    {
      value: 'links',
      label: 'Links',
      content: <UnifiedLinksTab entityType="epic" entityId={epic.id} />,
    },
    {
      value: 'discussions',
      label: 'Discussions',
      content: (
        <div className="h-[500px]">
          <EpicDiscussionsTab epic={epic} />
        </div>
      ),
    },
    {
      value: 'audit-history',
      label: 'Audit History',
      content: (
        <div className="h-[500px]">
          <UnifiedAuditHistoryTab entityType="epic" entityId={epic.id} />
        </div>
      ),
    },
  ];

  // Secondary header row with roll-up summary
  const secondaryHeaderRow = <EpicRollUpSummary epic={epic} compact />;

  return (
    <>
      <CanonicalDrawerShell
        open={open}
        onClose={onClose}
        entityId={epic.id}
        entityKey={epic.epic_key || `E-${epic.id?.slice(0, 4)}`}
        entityTitle={epic.name}
        entityType="items/epics"
        onTitleChange={handleTitleChange}
        isTitleEditable={true}
        onSave={handleSave}
        onSaveAndClose={handleSaveAndClose}
        hasChanges={hasChanges}
        isSaving={saveNameMutation.isPending}
        secondaryHeaderRow={secondaryHeaderRow}
        tabs={tabs}
        defaultTab="overview"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kebabMenuItems={kebabMenuItems}
        description="Epic details panel"
      />

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
