/**
 * FeatureDetailsPanel — Enterprise-Grade Feature Drawer
 * 
 * Redesigned to match FeatureDetailPage layout:
 * - Header with Feature Key, title, status/health pills
 * - KPI strip: Progress %, Stories, Blockers
 * - Tabbed content: Overview, Delivery, Links, Activity
 * - Collapsible right rail with Details, Planning, Classification
 */

import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  MoreHorizontal, 
  UserPlus,
  Plus,
  FileText,
  Ban,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFeatureProgress } from '@/hooks/useFeatureProgress';
import { useProjects } from '@/hooks/useProjects';
import { WorkItemPresence } from '@/components/work-items/WorkItemPresence';
import { WorkItemWatchers } from '@/components/work-items/WorkItemWatchers';
import { AssignModal } from '@/components/features/AssignModal';
import { CreateStoryModal } from '@/components/stories/CreateStoryModal';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { Feature, FeatureStatus } from '@/types/feature.types';
import { WorkItemStarButton } from '@/components/shared/WorkItemStarButton';

// Import sub-tabs from feature-detail
import { FeatureOverviewTab } from '@/pages/project/feature-detail/FeatureOverviewTab';
import { FeatureDeliveryTab } from '@/pages/project/feature-detail/FeatureDeliveryTab';
import { FeatureLinksTab } from '@/pages/project/feature-detail/FeatureLinksTab';
import { FeatureActivityTab } from '@/pages/project/feature-detail/FeatureActivityTab';
import { FeatureRightRail } from './FeatureRightRail';

interface FeatureDetailsPanelProps {
  feature?: Feature;
  open: boolean;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  funnel: { label: 'Draft', class: 'bg-muted text-muted-foreground' },
  analyzing: { label: 'In Analysis', class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  backlog: { label: 'Backlog', class: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
  implementing: { label: 'In Progress', class: 'bg-brand-primary/10 text-brand-primary' },
  done: { label: 'Done', class: 'bg-status-success/10 text-status-success' },
};

const HEALTH_CONFIG: Record<string, { label: string; class: string }> = {
  green: { label: 'On Track', class: 'bg-status-success/10 text-status-success' },
  on_track: { label: 'On Track', class: 'bg-status-success/10 text-status-success' },
  yellow: { label: 'At Risk', class: 'bg-status-warning/10 text-status-warning' },
  amber: { label: 'At Risk', class: 'bg-status-warning/10 text-status-warning' },
  at_risk: { label: 'At Risk', class: 'bg-status-warning/10 text-status-warning' },
  red: { label: 'Off Track', class: 'bg-status-danger/10 text-status-danger' },
  off_track: { label: 'Off Track', class: 'bg-status-danger/10 text-status-danger' },
};

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm text-foreground">
        {children}
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function FeatureDetailsPanel({ feature, open, onClose }: FeatureDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showRightRail, setShowRightRail] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: projects } = useProjects();

  // Fetch full feature data with relations
  const { data: featureData } = useQuery({
    queryKey: ['feature-detail-panel', feature?.id],
    queryFn: async () => {
      if (!feature?.id) return null;

      const { data, error } = await supabase
        .from('features')
        .select(`
          id, display_id, name, description, acceptance_criteria, status, health,
          blocked, blocked_reason, planned_start_date, planned_end_date,
          owner_id, epic_id, project_id, progress_pct, updated_at, change_number_id,
          priority, release_id, assignee_id, program_id,
          department_id, product_id, business_owner_id, risk, environment, labels, components
        `)
        .eq('id', feature.id)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Fetch relations in parallel
      const [ownerResult, epicResult, projectResult, contributorsResult, changeNumberResult] = await Promise.all([
        data.owner_id 
          ? supabase.from('profiles').select('id, full_name, email, avatar_url, role').eq('id', data.owner_id).single()
          : { data: null },
        data.epic_id
          ? supabase.from('epics').select('id, epic_key, name, primary_program_id').eq('id', data.epic_id).single()
          : { data: null },
        data.project_id
          ? supabase.from('projects').select('id, name').eq('id', data.project_id).single()
          : { data: null },
        supabase
          .from('feature_contributors')
          .select('id, user_id, user:profiles!feature_contributors_user_id_fkey(id, full_name, email, avatar_url, role)')
          .eq('feature_id', feature.id),
        data.change_number_id
          ? supabase.from('change_numbers').select('id, number, description').eq('id', data.change_number_id).single()
          : { data: null },
      ]);

      return {
        ...data,
        owner: ownerResult.data,
        epic: epicResult.data,
        project: projectResult.data,
        contributors: contributorsResult.data || [],
        change_number: changeNumberResult.data,
      };
    },
    enabled: !!feature?.id && open,
  });

  // Story-driven progress
  const { data: progress } = useFeatureProgress(feature?.id);

  // Fetch story counts
  const { data: storyStats } = useQuery({
    queryKey: ['feature-story-stats', feature?.id],
    queryFn: async () => {
      if (!feature?.id) return { total: 0, done: 0, blocked: 0 };

      const { data, error } = await supabase
        .from('stories')
        .select('id, status, state')
        .eq('feature_id', feature.id);

      if (error) return { total: 0, done: 0, blocked: 0 };

      const stories = data || [];
      return {
        total: stories.length,
        done: stories.filter(s => s.status === 'done' || s.state === 'done').length,
        blocked: stories.filter(s => (s.status as string) === 'blocked' || (s.state as string) === 'blocked').length,
      };
    },
    enabled: !!feature?.id && open,
  });

  // Update feature mutation
  const updateFeature = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!feature?.id) throw new Error('No feature ID');
      const { error } = await supabase
        .from('features')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', feature.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-detail-panel', feature?.id] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['features-backlog'] });
    },
    onError: (error: any) => {
      toast.error('Failed to update feature', { description: error.message });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      if (!feature?.id) return;
      const { error } = await supabase
        .from('features')
        .update({ project_id: projectId } as any)
        .eq('id', feature.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-detail-panel', feature?.id] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Project updated');
    },
    onError: () => {
      toast.error('Failed to update project');
    },
  });

  const handleStatusChange = (newStatus: FeatureStatus) => {
    updateFeature.mutate({ status: newStatus }, {
      onSuccess: () => toast.success('Status updated'),
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const handleOpenFullPage = () => {
    if (featureData?.project_id && feature?.id) {
      navigate(`/projects/${featureData.project_id}/features/${feature.id}`);
      onClose();
    }
  };

  if (!feature) return null;

  const statusConfig = STATUS_CONFIG[(featureData?.status as string) || 'funnel'] || STATUS_CONFIG.funnel;
  const healthConfig = HEALTH_CONFIG[(featureData?.health as string) || 'green'] || HEALTH_CONFIG.green;
  const progressPct = featureData?.progress_pct || progress?.completionPercent || 0;
  const featureKey = featureData?.display_id || feature.display_id || `F-${feature.id.slice(0, 6)}`;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] sm:max-w-[1200px] p-0 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-card">
          <div className="px-4 md:px-6 py-4">
            {/* Top row: Key + Actions */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                {/* Feature Key */}
                <span className="font-mono text-sm text-muted-foreground mb-1 block">
                  {featureKey}
                </span>
                {/* Title */}
                <h1 className="text-lg md:text-xl font-semibold text-foreground leading-tight line-clamp-2">
                  {featureData?.name || feature.name}
                </h1>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                {feature?.id && <WorkItemStarButton itemId={feature.id} itemType="feature" size="md" />}
                {feature?.id && <WorkItemPresence workItemType="features" workItemId={feature.id} />}
                {feature?.id && <WorkItemWatchers workItemType="feature" workItemId={feature.id} />}
                
                {/* Transition Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="bg-brand-primary hover:bg-brand-primary-hover text-white hidden sm:flex">
                      <ChevronRight className="h-4 w-4 mr-1" />
                      Transition
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStatusChange('analyzing')}>
                      Move to Analysis
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('backlog')}>
                      Move to Backlog
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('implementing')}>
                      Start Progress
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleStatusChange('done')}>
                      Mark Done
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="outline" size="sm" onClick={() => setIsAssignModalOpen(true)} className="hidden md:flex">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assign
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsCreateStoryOpen(true)} className="hidden md:flex">
                  <Plus className="h-4 w-4 mr-1" />
                  Story
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsAssignModalOpen(true)} className="md:hidden">
                      Assign
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsCreateStoryOpen(true)} className="md:hidden">
                      Create Story
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="md:hidden" />
                    <DropdownMenuItem onClick={handleCopyLink}>Copy Link</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenFullPage}>Open Full Page</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Status + Health Pills */}
            <div className="flex items-center gap-2 mb-4">
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold",
                statusConfig.class
              )}>
                {statusConfig.label}
              </span>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold",
                healthConfig.class
              )}>
                {healthConfig.label}
              </span>
              {(featureData?.blocked || feature.blocked) && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-status-danger/10 text-status-danger flex items-center gap-1">
                  <Ban className="h-3 w-3" />
                  Blocked
                </span>
              )}
            </div>

            {/* KPI Strip */}
            <div className="flex items-center gap-4 md:gap-8 flex-wrap">
              {/* Progress */}
              <div className="flex items-center gap-2 md:gap-3">
                <div className="text-xl md:text-2xl font-bold text-foreground">{progressPct}%</div>
                <div className="w-16 md:w-20 h-1.5 bg-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-status-success rounded-full transition-all" 
                    style={{ width: `${progressPct}%` }} 
                  />
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline">Progress</span>
              </div>

              <div className="h-6 w-px bg-border hidden sm:block" />

              {/* Stories */}
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Stories</div>
                  <div className="text-base md:text-lg font-bold text-foreground">{storyStats?.total || 0}</div>
                </div>
              </div>

              <div className="h-6 w-px bg-border hidden sm:block" />

              {/* Blockers */}
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-status-danger" />
                <div>
                  <div className="text-xs text-muted-foreground">Blockers</div>
                  <div className="text-base md:text-lg font-bold text-foreground">{storyStats?.blocked || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Tabbed Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="border-b px-4 md:px-6 h-auto bg-transparent rounded-none justify-start gap-0 flex-shrink-0 overflow-x-auto">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 md:px-4 py-3 text-sm"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="delivery"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 md:px-4 py-3 text-sm"
                >
                  Delivery
                </TabsTrigger>
                <TabsTrigger 
                  value="links"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 md:px-4 py-3 text-sm"
                >
                  Links
                </TabsTrigger>
                <TabsTrigger 
                  value="activity"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 md:px-4 py-3 text-sm"
                >
                  Activity
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="overview" className="m-0 p-4 md:p-6">
                  {featureData && (
                    <FeatureOverviewTab feature={{
                      id: featureData.id,
                      description: featureData.description,
                      acceptance_criteria: featureData.acceptance_criteria,
                      updated_at: featureData.updated_at,
                      owner: featureData.owner,
                    }} />
                  )}
                </TabsContent>
                <TabsContent value="delivery" className="m-0 p-4 md:p-6">
                  <FeatureDeliveryTab featureId={feature.id} projectId={featureData?.project_id || ''} />
                </TabsContent>
                <TabsContent value="links" className="m-0 p-4 md:p-6">
                  {featureData && <FeatureLinksTab feature={featureData as any} />}
                </TabsContent>
                <TabsContent value="activity" className="m-0 p-4 md:p-6">
                  <FeatureActivityTab featureId={feature.id} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right Rail - Fully Editable */}
          {showRightRail && featureData && (
            <FeatureRightRail 
              featureId={feature.id}
              featureData={featureData}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['feature-detail-panel', feature.id] })}
            />
          )}
        </div>

        {/* Assign Modal */}
        {featureData && (
          <AssignModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            featureId={feature.id}
            featureKey={featureKey}
            featureTitle={featureData.name}
            currentOwner={featureData.owner || null}
            currentContributors={featureData.contributors || []}
            projectId={featureData.project_id || undefined}
          />
        )}

        {/* Create Story Modal */}
        {featureData && (
          <CreateStoryModal
            isOpen={isCreateStoryOpen}
            onClose={() => setIsCreateStoryOpen(false)}
            parentFeature={{
              id: feature.id,
              key: featureKey,
              title: featureData.name,
              program_id: featureData.epic?.primary_program_id || undefined,
              epic_id: featureData.epic_id,
              epic_key: featureData.epic?.epic_key,
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
