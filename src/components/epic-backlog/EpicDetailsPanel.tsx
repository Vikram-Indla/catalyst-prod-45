import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FileText, Gem, ClipboardList, TrendingUp, ThumbsUp, Milestone, DollarSign, BarChart3, Link as LinkIcon, MessageSquare, Star, Bell, Grid3x3, FileStack, Grid2x2, CheckSquare, ClipboardCheck, Package } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { DetailsTabExtended } from '@/components/backlog/DetailPanel/tabs/DetailsTabExtended';
import { DesignTab } from '@/components/backlog/DetailPanel/tabs/DesignTab';
import { IntakeTab } from '@/components/backlog/DetailPanel/tabs/IntakeTab';
import { BenefitsTab } from '@/components/backlog/DetailPanel/tabs/BenefitsTab';
import { ValueTab } from '@/components/backlog/DetailPanel/tabs/ValueTab';
import { MilestonesTab } from '@/components/backlog/DetailPanel/tabs/MilestonesTab';
import { SpendTab } from '@/components/backlog/DetailPanel/tabs/SpendTab';
import { EpicForecastTab } from './EpicForecastTab';
import { LinksTab } from '@/components/backlog/DetailPanel/tabs/LinksTab';
import { QuickActionsPanel } from './QuickActionsPanel';

interface EpicDetailsPanelProps {
  epicId: string;
  onClose: () => void;
  onRefetch: () => void;
}

export function EpicDetailsPanel({ epicId, onClose, onRefetch }: EpicDetailsPanelProps) {
  const { data: epic } = useQuery({
    queryKey: ['epic-details', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .eq('id', epicId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (!epic) return null;

  // Use actual epic data from database - empty arrays for related data
  const epicDetail = {
    id: epicId,
    numericId: parseInt(epic.epic_key?.replace(/\D/g, '') || '0'),
    title: epic.name || '',
    description: epic.description || '',
    status: (epic.status || 'not_started') as 'not_started' | 'in_progress' | 'accepted' | 'done' | 'blocked',
    processStep: (epic.process_step_id || 'Funnel') as 'Funnel' | 'Analyzing' | 'Implementing' | 'Done',
    type: (epic.epic_type || 'Business') as 'Business' | 'Enabler' | 'Compliance',
    mvp: epic.mvp || false,
    points: epic.points_estimate || 0,
    labels: [] as any[],
    hasChildren: false,
    rank: epic.global_rank || 0,
    containedIn: null as { id: string; name: string; type: string } | null,
    primaryProgram: null as { id: string; name: string } | null,
    additionalPrograms: [] as { id: string; name: string }[],
    owner: epic.owner_name ? { id: epic.owner_id || '', name: epic.owner_name } : null,
    state: { id: 0, name: epic.state || '', color: '#666' },
    theme: null as { id: string; name: string } | null,
    level1: [] as any[],
    programIncrements: [] as { id: string; name: string; startDate: string; endDate: string }[],
    wsjfScores: [] as { piId: string; piName: string; businessValue: number; timeValue: number; rroeValue: number; jobSize: number; score: number }[],
    initialEstimate: epic.estimate,
    piEstimates: [] as { piId: string; piName: string; points: number }[],
    totalEstimate: epic.estimate || 0,
    features: [] as any[],
    storyPointsAccepted: 0,
    storyPointsTotal: 0,
    featuresAccepted: 0,
    featuresInDelivery: 0,
    featuresDelivered: 0,
    featuresTotal: 0,
    intakeFields: [] as { id: string; number: number; label: string; value: string; required: boolean }[],
    valueFields: [] as { id: string; number: number; label: string; value: string; score: number; options: string[] }[],
    valueScore: 0,
    valueScoreAverage: 0,
    valueScoreComparison: 0,
    milestones: [] as { id: string; name: string; startDate: string | null; dueDate: string | null; description: string; state: 'Pending' | 'In Progress' | 'Complete' | 'Blocked'; category: string | null }[],
    budget: 0,
    acceptedSpend: 0,
    forecastedSpend: 0,
    estimatedSpend: 0,
    remaining: 0,
    acceptedStories: [] as any[],
    forecastData: {
      selectedPI: '',
      totalPts: 0,
      programs: [] as any[]
    },
    discussionCount: 0,
    createdAt: epic.created_at || new Date().toISOString(),
    updatedAt: epic.updated_at || new Date().toISOString()
  };

  // Empty arrays - populated from database
  const programs: { id: string; name: string }[] = [];
  const users: { id: string; name: string }[] = [];
  const themes: { id: string; name: string }[] = [];


  return (
    <Sheet open={!!epicId} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s4)] border-b bg-card">
          <div className="flex items-start justify-between mb-[var(--s4)]">
            <div className="flex items-center gap-[var(--s3)]">
              <CheckSquare className="h-5 w-5 text-primary" />
              <div>
                <div className="flex items-center gap-[var(--s2)]">
                  <span className="text-sm text-muted-foreground">Epic 1168</span>
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mt-1">AI for Improved Call Center Interactions</h2>
              </div>
            </div>
            <div className="flex items-center gap-[var(--s2)]">
              <Button variant="ghost" size="sm">Why?</Button>
              <Button variant="default" size="sm">Save</Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-[var(--s4)] sm:px-[var(--s6)] bg-card overflow-x-auto flex-shrink-0">
            <TabsList className="h-12 bg-transparent justify-start gap-[var(--s1)] inline-flex w-auto min-w-full">
              <TabsTrigger value="details" className="gap-[var(--s2)] whitespace-nowrap flex-shrink-0">
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-2 whitespace-nowrap flex-shrink-0">
                <Gem className="h-4 w-4" />
                Design
              </TabsTrigger>
              <TabsTrigger value="intake" className="gap-[var(--s2)] whitespace-nowrap flex-shrink-0">
                <ClipboardList className="h-4 w-4" />
                Intake
              </TabsTrigger>
              <TabsTrigger value="benefits" className="gap-[var(--s2)] whitespace-nowrap flex-shrink-0">
                <TrendingUp className="h-4 w-4" />
                Benefits
              </TabsTrigger>
              <TabsTrigger value="value" className="gap-[var(--s2)] whitespace-nowrap flex-shrink-0">
                <ThumbsUp className="h-4 w-4" />
                Value
              </TabsTrigger>
              <TabsTrigger value="milestones" className="gap-[var(--s2)] whitespace-nowrap flex-shrink-0">
                <Milestone className="h-4 w-4" />
                Milestones
              </TabsTrigger>
              <TabsTrigger value="spend" className="gap-[var(--s2)] whitespace-nowrap flex-shrink-0">
                <DollarSign className="h-4 w-4" />
                Spend
              </TabsTrigger>
              <TabsTrigger value="forecast" className="gap-[var(--s2)] whitespace-nowrap flex-shrink-0">
                <BarChart3 className="h-4 w-4" />
                Forecast
              </TabsTrigger>
              <TabsTrigger value="links" className="gap-[var(--s2)] whitespace-nowrap flex-shrink-0">
                <LinkIcon className="h-4 w-4" />
                Links
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="details" className="m-0">
              <DetailsTabExtended 
                epic={epicDetail}
                programs={programs}
                users={users}
                themes={themes}
                onUpdate={() => {}}
              />
            </TabsContent>

            <TabsContent value="design" className="m-0">
              <DesignTab />
            </TabsContent>

            <TabsContent value="intake" className="m-0">
              <IntakeTab 
                fields={epicDetail.intakeFields}
                onFieldChange={() => {}}
              />
            </TabsContent>

            <TabsContent value="benefits" className="m-0">
              <BenefitsTab />
            </TabsContent>

            <TabsContent value="value" className="m-0">
              <ValueTab
                fields={epicDetail.valueFields}
                valueScore={epicDetail.valueScore}
                valueScoreAverage={epicDetail.valueScoreAverage}
                valueScoreComparison={epicDetail.valueScoreComparison}
                onFieldChange={() => {}}
              />
            </TabsContent>

            <TabsContent value="milestones" className="m-0">
              <MilestonesTab
                milestones={epicDetail.milestones}
                onAddMilestone={() => {}}
                onUpdateMilestone={() => {}}
              />
            </TabsContent>

            <TabsContent value="spend" className="m-0">
              <SpendTab
                budget={epicDetail.budget}
                acceptedSpend={epicDetail.acceptedSpend}
                forecastedSpend={epicDetail.forecastedSpend}
                estimatedSpend={epicDetail.estimatedSpend}
                remaining={epicDetail.remaining}
                acceptedStories={epicDetail.acceptedStories || []}
              />
            </TabsContent>

            <TabsContent value="forecast" className="m-0">
              <EpicForecastTab epicId={epicId} />
            </TabsContent>

            <TabsContent value="links" className="m-0">
              <LinksTab />
            </TabsContent>
          </div>
        </Tabs>

        {/* Quick Actions Panel */}
        <QuickActionsPanel 
          epicId={epicId} 
          epicName={epicDetail.title}
          onUpdate={() => {}}
        />
      </SheetContent>
    </Sheet>
  );
}
