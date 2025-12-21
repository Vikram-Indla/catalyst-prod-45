/**
 * FeatureDetailPage — Enterprise-Grade Feature Work Item
 * 
 * Route: /projects/:projectId/features/:featureId
 * Matches Catalyst Design System + Atlassian-grade UX
 * 
 * Features:
 * - Header with Feature Key (JetBrains Mono), title, status, health
 * - KPI strip: Progress %, Target Release, Stories, Blockers
 * - Tabbed content: Overview, Delivery, Links, Activity, Audit/Governance
 * - Collapsible right rail with Details, Planning, Classification sections
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  ChevronDown,
  Share2, 
  Link2, 
  MoreHorizontal, 
  UserPlus,
  Plus,
  Eye,
  Calendar,
  FileText,
  Ban,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  Target,
  Layers
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Sub-components
import { FeatureOverviewTab } from './feature-detail/FeatureOverviewTab';
import { FeatureDeliveryTab } from './feature-detail/FeatureDeliveryTab';
import { FeatureLinksTab } from './feature-detail/FeatureLinksTab';
import { FeatureActivityTab } from './feature-detail/FeatureActivityTab';
import { FeatureAuditTab } from './feature-detail/FeatureAuditTab';
import { FeatureRightRail } from './feature-detail/FeatureRightRail';
import { AssignModal } from '@/components/features/AssignModal';
import { CreateStoryModal } from '@/components/stories/CreateStoryModal';
import { Contributor } from '@/hooks/useFeatureAssignments';

// Types
type FeatureStatus = 'funnel' | 'analyzing' | 'backlog' | 'implementing' | 'done';

interface FeatureData {
  id: string;
  display_id: string | null;
  name: string;
  description: string | null;
  acceptance_criteria: string | null;
  status: FeatureStatus | null;
  health: string | null;
  blocked: boolean | null;
  blocked_reason: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  owner_id: string | null;
  epic_id: string;
  project_id: string;
  progress_pct: number | null;
  updated_at: string | null;
  change_number_id: string | null;
  owner?: { id: string; full_name: string; email?: string; avatar_url?: string; role?: string } | null;
  epic?: { id: string; epic_key: string; name: string; primary_program_id?: string | null } | null;
  project?: { id: string; name: string } | null;
  contributors?: Contributor[];
  change_number?: { id: string; number: string; description?: string | null } | null;
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

export default function FeatureDetailPage() {
  const { projectId, featureId } = useParams<{ projectId: string; featureId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);

  // Fetch feature with relations
  const { data: feature, isLoading, error } = useQuery({
    queryKey: ['feature-detail', featureId],
    queryFn: async (): Promise<FeatureData | null> => {
      if (!featureId) return null;

      const { data, error } = await supabase
        .from('features')
        .select(`
          id, display_id, name, description, acceptance_criteria, status, health,
          blocked, blocked_reason, planned_start_date, planned_end_date,
          owner_id, epic_id, project_id, progress_pct, updated_at, change_number_id
        `)
        .eq('id', featureId)
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
          .eq('feature_id', featureId),
        data.change_number_id
          ? supabase.from('change_numbers').select('id, number, description').eq('id', data.change_number_id).single()
          : { data: null },
      ]);

      return {
        ...data,
        status: data.status as FeatureStatus,
        owner: ownerResult.data,
        epic: epicResult.data,
        project: projectResult.data,
        contributors: contributorsResult.data || [],
        change_number: changeNumberResult.data,
      };
    },
    enabled: !!featureId,
  });

  // Fetch story counts
  const { data: storyStats } = useQuery({
    queryKey: ['feature-story-stats', featureId],
    queryFn: async () => {
      if (!featureId) return { total: 0, done: 0, blocked: 0 };

      const { data, error } = await supabase
        .from('stories')
        .select('id, status, state')
        .eq('feature_id', featureId);

      if (error) {
        console.error('Failed to fetch stories:', error);
        return { total: 0, done: 0, blocked: 0 };
      }

      const stories = data || [];
      return {
        total: stories.length,
        done: stories.filter(s => s.status === 'done' || s.state === 'done').length,
        blocked: stories.filter(s => (s.status as string) === 'blocked' || (s.state as string) === 'blocked').length,
      };
    },
    enabled: !!featureId,
  });

  // Update feature mutation
  const updateFeature = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from('features')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', featureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-detail', featureId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
    onError: (error: any) => {
      toast.error('Failed to update feature', { description: error.message });
    },
  });

  const handleStatusChange = (newStatus: FeatureStatus) => {
    updateFeature.mutate({ status: newStatus } as any, {
      onSuccess: () => toast.success('Status updated'),
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full bg-background">
        <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-1">
          <div className="flex-1 p-6">
            <Skeleton className="h-8 w-96 mb-4" />
            <Skeleton className="h-6 w-64 mb-6" />
            <div className="flex gap-4 mb-6">
              <Skeleton className="h-16 w-32" />
              <Skeleton className="h-16 w-32" />
              <Skeleton className="h-16 w-32" />
            </div>
          </div>
          <div className="w-[300px] border-l p-6">
            <Skeleton className="h-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !feature) {
    return (
      <div className="flex flex-col min-h-full bg-background">
        <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30">
          <Link to={`/projects/${projectId}/features`} className="text-sm text-muted-foreground hover:text-primary">
            Features
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-status-warning mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Feature not found</h2>
            <Link to={`/projects/${projectId}/features`} className="text-primary hover:underline">
              ← Back to Features
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[feature.status || 'funnel'] || STATUS_CONFIG.funnel;
  const healthConfig = HEALTH_CONFIG[feature.health || 'green'] || HEALTH_CONFIG.green;
  const progressPct = feature.progress_pct || 0;
  const featureKey = feature.display_id || `FEAT-${feature.id.slice(0, 4).toUpperCase()}`;

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30 text-sm">
        <Link to="/projects" className="text-muted-foreground hover:text-primary">
          Projects
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <Link to={`/projects/${projectId}`} className="text-muted-foreground hover:text-primary">
          {feature.project?.name || 'Project'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <Link to={`/projects/${projectId}/features`} className="text-muted-foreground hover:text-primary">
          Features
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-primary font-mono font-medium">{featureKey}</span>
      </div>

      {/* Page Header */}
      <div className="px-6 py-5 border-b">
        {/* Top row: Key + Actions */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            {/* Feature Key */}
            <span className="font-mono text-sm text-muted-foreground mb-1 block">
              {featureKey}
            </span>
            {/* Title */}
            <h1 className="text-xl font-semibold text-foreground leading-tight">
              {feature.name}
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Transition Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-brand-primary hover:bg-brand-primary-hover text-white">
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

            <Button variant="outline" size="sm" onClick={() => setIsAssignModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Assign
            </Button>
            <Button variant="outline" size="sm">
              <Link2 className="h-4 w-4 mr-1" />
              Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsCreateStoryOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Story
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCopyLink} title="Watch">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCopyLink} title="Share">
              <Share2 className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Clone</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status + Health Pills */}
        <div className="flex items-center gap-2 mb-5">
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
          {feature.blocked && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-status-danger/10 text-status-danger flex items-center gap-1">
              <Ban className="h-3 w-3" />
              Blocked
            </span>
          )}
        </div>

        {/* KPI Strip */}
        <div className="flex items-center gap-8">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-foreground">{progressPct}%</div>
            <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-status-success rounded-full transition-all" 
                style={{ width: `${progressPct}%` }} 
              />
            </div>
            <span className="text-xs text-muted-foreground">Progress</span>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Target Release */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Target Release</div>
              <div className="font-mono text-sm font-medium text-gold-link hover:text-gold-link-hover cursor-pointer hover:underline transition-colors">
                {feature.planned_end_date 
                  ? `REL-${format(new Date(feature.planned_end_date), 'yyyy')}-Q${Math.ceil((new Date(feature.planned_end_date).getMonth() + 1) / 3)}`
                  : 'Not set'
                }
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Stories */}
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Stories</div>
              <div className="text-lg font-bold text-foreground">{storyStats?.total || 0}</div>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Blockers */}
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-status-danger" />
            <div>
              <div className="text-xs text-muted-foreground">Blockers</div>
              <div className="text-lg font-bold text-foreground">{storyStats?.blocked || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Tabbed Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="border-b px-6 h-auto bg-transparent rounded-none justify-start gap-0">
              <TabsTrigger 
                value="overview" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="delivery"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
              >
                Delivery
              </TabsTrigger>
              <TabsTrigger 
                value="links"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
              >
                Links
              </TabsTrigger>
              <TabsTrigger 
                value="activity"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
              >
                Activity
              </TabsTrigger>
              <TabsTrigger 
                value="audit"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
              >
                Audit / Governance
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="overview" className="m-0 p-6">
                <FeatureOverviewTab feature={feature} />
              </TabsContent>
              <TabsContent value="delivery" className="m-0 p-6">
                <FeatureDeliveryTab featureId={feature.id} projectId={projectId || ''} />
              </TabsContent>
              <TabsContent value="links" className="m-0 p-6">
                <FeatureLinksTab feature={feature} />
              </TabsContent>
              <TabsContent value="activity" className="m-0 p-6">
                <FeatureActivityTab featureId={feature.id} />
              </TabsContent>
              <TabsContent value="audit" className="m-0 p-6">
                <FeatureAuditTab featureId={feature.id} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Rail */}
        <FeatureRightRail 
          feature={feature}
          collapsed={rightRailCollapsed}
          onToggleCollapse={() => setRightRailCollapsed(!rightRailCollapsed)}
          onUpdate={(data) => updateFeature.mutate(data as any)}
        />
      </div>

      {/* Assign Modal */}
      <AssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        featureId={feature.id}
        featureKey={featureKey}
        featureTitle={feature.name}
        currentOwner={feature.owner || null}
        currentContributors={feature.contributors || []}
        projectId={feature.project_id}
      />

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        parentFeature={{
          id: feature.id,
          key: featureKey,
          title: feature.name,
          program_id: feature.epic?.primary_program_id || undefined,
          epic_id: feature.epic_id,
          epic_key: feature.epic?.epic_key,
        }}
      />
    </div>
  );
}
