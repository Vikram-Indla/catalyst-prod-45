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

  // Mock data matching screenshots exactly - complete EpicDetail type
  const epicDetail = {
    id: epicId,
    numericId: 1168,
    title: 'AI for Improved Call Center Interactions',
    description: 'Use natural language processing to perform in-call voice analysis and deliver real-time guidance to agents and new insight to managers.',
    status: 'in_progress' as const,
    processStep: 'Implementing' as const,
    type: 'Business' as const,
    mvp: false,
    points: 0,
    labels: [],
    hasChildren: true,
    rank: 2,
    containedIn: { id: '1', name: 'User Experience', type: 'theme' },
    primaryProgram: { id: 'mobile', name: 'Mobile' },
    additionalPrograms: [{ id: 'ai', name: 'AI' }],
    owner: { id: 'sean', name: 'Sean Duffy' },
    state: { id: 2, name: '2 - In Progress', color: '#FF8B00' },
    theme: { id: 'ux', name: 'User Experience' },
    level1: [],
    programIncrements: [
      { id: 'pi-5', name: 'PI-5', startDate: '2024-01-01', endDate: '2024-03-31' },
      { id: 'pi-6', name: 'PI-6', startDate: '2024-04-01', endDate: '2024-06-30' },
      { id: 'pi-7', name: 'PI-7', startDate: '2024-07-01', endDate: '2024-09-30' }
    ],
    wsjfScores: [
      { piId: 'pi-5', piName: 'PI-5', businessValue: 8, timeValue: 5, rroeValue: 3, jobSize: 3, score: 10 },
      { piId: 'pi-6', piName: 'PI-6', businessValue: 3, timeValue: 2, rroeValue: 1, jobSize: 5, score: 2.5 },
      { piId: 'pi-7', piName: 'PI-7', businessValue: 0, timeValue: 0, rroeValue: 0, jobSize: 1, score: 0 }
    ],
    initialEstimate: null,
    piEstimates: [
      { piId: 'pi-5', piName: 'PI-5', points: 475 },
      { piId: 'pi-6', piName: 'PI-6', points: 1440 },
      { piId: 'pi-7', piName: 'PI-7', points: 960 }
    ],
    totalEstimate: 2875,
    features: [
      { id: '5556', numericId: 5556, externalId: '', title: 'Feature 9', status: 'on_track', processStep: '2 - In Progress', progressPercent: 0, storyPointsAccepted: 0, storyPointsTotal: 8, storiesAccepted: 0, storiesTotal: 3, storiesDelivered: 0, scopeEstimate: 50, scopeActual: 15 },
      { id: '5551', numericId: 5551, externalId: '', title: 'Feature 4', status: 'on_track', processStep: '2 - In Progress', progressPercent: 0, storyPointsAccepted: 0, storyPointsTotal: 8, storiesAccepted: 0, storiesTotal: 3, storiesDelivered: 0, scopeEstimate: 50, scopeActual: 15 },
      { id: '5548', numericId: 5548, externalId: '', title: 'Feature 1', status: 'on_track', processStep: '2 - In Progress', progressPercent: 0, storyPointsAccepted: 0, storyPointsTotal: 8, storiesAccepted: 0, storiesTotal: 3, storiesDelivered: 0, scopeEstimate: 50, scopeActual: 15 },
      { id: '5426', numericId: 5426, externalId: '', title: 'Implement Live call monitoring', status: 'on_track', processStep: '2 - In Progress', progressPercent: 100, storyPointsAccepted: 8, storyPointsTotal: 11, storiesAccepted: 2, storiesTotal: 3, storiesDelivered: 0, scopeEstimate: 85, scopeActual: 11 },
      { id: '5425', numericId: 5425, externalId: '', title: 'Implement In-call speaking guidance', status: 'on_track', processStep: '2 - In Progress', progressPercent: 50, storyPointsAccepted: 5, storyPointsTotal: 10, storiesAccepted: 1, storiesTotal: 4, storiesDelivered: 1, scopeEstimate: 60, scopeActual: 25 },
      { id: '5396', numericId: 5396, externalId: '', title: 'Confirm the performance of Kivox with different codecs', status: 'on_track', processStep: '2 - In Progress', progressPercent: 60, storyPointsAccepted: 6, storyPointsTotal: 10, storiesAccepted: 2, storiesTotal: 4, storiesDelivered: 1, scopeEstimate: 70, scopeActual: 30 },
      { id: '5395', numericId: 5395, externalId: '', title: 'Easy Access call archiving functionality', status: 'at_risk', processStep: '3 - Testing', progressPercent: 80, storyPointsAccepted: 8, storyPointsTotal: 10, storiesAccepted: 3, storiesTotal: 4, storiesDelivered: 2, scopeEstimate: 75, scopeActual: 50 },
      { id: '5394', numericId: 5394, externalId: '', title: 'Ensure alert testing through to end client', status: 'on_track', processStep: '4 - Delivered', progressPercent: 90, storyPointsAccepted: 9, storyPointsTotal: 10, storiesAccepted: 4, storiesTotal: 4, storiesDelivered: 3, scopeEstimate: 80, scopeActual: 70 },
      { id: '5389', numericId: 5389, externalId: '', title: 'Large Data Set Collection & Testing', status: 'on_track', processStep: '2 - In Progress', progressPercent: 75, storyPointsAccepted: 7, storyPointsTotal: 9, storiesAccepted: 3, storiesTotal: 4, storiesDelivered: 2, scopeEstimate: 65, scopeActual: 45 },
      { id: '4237', numericId: 4237, externalId: '', title: 'V2.1 L1 Package B P&S Tests', status: 'on_track', processStep: '2 - In Progress', progressPercent: 55, storyPointsAccepted: 6, storyPointsTotal: 11, storiesAccepted: 2, storiesTotal: 5, storiesDelivered: 1, scopeEstimate: 90, scopeActual: 35 }
    ],
    storyPointsAccepted: 75,
    storyPointsTotal: 95,
    featuresAccepted: 3,
    featuresInDelivery: 0,
    featuresDelivered: 0,
    featuresTotal: 15,
    intakeFields: [
      { id: '1', number: 1, label: 'Justification', value: '', required: false },
      { id: '2', number: 2, label: 'Department', value: '', required: false },
      { id: '3', number: 3, label: 'Requestor', value: '', required: false },
      { id: '4', number: 4, label: 'Reviewer', value: '', required: false }
    ],
    valueFields: [
      { id: '1', number: 1, label: 'Cost', value: 'Low', score: 100, options: ['Low', 'Medium', 'High'] },
      { id: '2', number: 2, label: 'Profit Potential', value: 'Medium', score: 66, options: ['Low', 'Medium', 'High'] },
      { id: '3', number: 3, label: 'Time to Market', value: 'Low', score: 100, options: ['Low', 'Medium', 'High'] },
      { id: '4', number: 4, label: 'Development Risks', value: 'Low', score: 100, options: ['Low', 'Medium', 'High'] }
    ],
    valueScore: 91.5,
    valueScoreAverage: 91.6,
    valueScoreComparison: 49,
    milestones: [
      { id: 'ms-1', name: 'pivot/persevere', startDate: null, dueDate: null, description: 'pivot/persevere', state: 'In Progress' as const, category: null },
      { id: 'ms-2', name: 'Retro', startDate: null, dueDate: null, description: 'Retro', state: 'Complete' as const, category: null }
    ],
    budget: 1000000,
    acceptedSpend: 280902,
    forecastedSpend: 444156,
    estimatedSpend: 12687290,
    remaining: 719098,
    acceptedStories: [
      { id: '16613', numericId: 16613, title: 'UI: QA - Transcript Export Tool From TRS', team: 'None', spend: 1207, teamSprintName: 'Washington - Washington PI 5 Sprint 1', teamSpendPerPoint: 302, storyEstimate: 4 },
      { id: '21186', numericId: 21186, title: 'G12: Document V2.1 Transcript Export Tool', team: 'None', spend: 0, teamSprintName: null, teamSpendPerPoint: 0, storyEstimate: 0 },
      { id: '22388', numericId: 22388, title: 'G12: Transcript Export API- Feature level testing (Split Part 2)', team: 'None', spend: 0, teamSprintName: null, teamSpendPerPoint: 0, storyEstimate: 0 },
      { id: '22715', numericId: 22715, title: 'MMA_OPS_JAVA - Upgrade from 8.5 Sp1 (L3)', team: 'None', spend: 0, teamSprintName: null, teamSpendPerPoint: 0, storyEstimate: 0 },
      { id: '22773', numericId: 22773, title: 'RFS - 8.5.5 Forecasting & Planning Guide Update - SP23', team: 'None', spend: 0, teamSprintName: null, teamSpendPerPoint: 0, storyEstimate: 0 },
      { id: '22774', numericId: 22774, title: 'RFS - 8.5.5 Scheduling Users Guide - SP23', team: 'None', spend: 0, teamSprintName: null, teamSpendPerPoint: 0, storyEstimate: 0 },
      { id: '24004', numericId: 24004, title: 'MMA_GOAL L1 2.0sp1 Upgrade', team: 'Cloud', spend: 75300, teamSprintName: 'Cloud - Cloud PI 5 Sprint 2', teamSpendPerPoint: 250, storyEstimate: 301 },
      { id: '24005', numericId: 24005, title: 'MMA_GOAL L3 2.0sp1 Upgrade', team: 'None', spend: 75300, teamSprintName: 'Cloud - Cloud PI 5 Sprint 3', teamSpendPerPoint: 250, storyEstimate: 301 }
    ],
    forecastData: {
      selectedPI: 'pi-5',
      totalPts: 475,
      programs: [
        {
          programId: 'ai',
          programName: 'AI',
          totalPts: 245,
          isExpanded: true,
          teams: [
            { teamId: 'alpha', teamName: 'Alpha', pts: 10 },
            { teamId: 'angry-birds', teamName: 'Angry Birds', pts: 50 },
            { teamId: 'beta', teamName: 'Beta', pts: 75 },
            { teamId: 'bush', teamName: 'Bush', pts: 50 },
            { teamId: 'cloud', teamName: 'Cloud', pts: 60 }
          ]
        },
        {
          programId: 'mobile',
          programName: 'Mobile',
          totalPts: 230,
          isExpanded: false,
          teams: []
        }
      ]
    },
    discussionCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockPrograms = [
    { id: 'mobile', name: 'Mobile' },
    { id: 'web', name: 'Web' },
    { id: 'ai', name: 'AI' }
  ];

  const mockUsers = [
    { id: 'sean', name: 'Sean Duffy' },
    { id: 'jane', name: 'Jane Doe' }
  ];

  const mockThemes = [
    { id: 'ux', name: 'User Experience' },
    { id: 'platform', name: 'Platform' }
  ];


  return (
    <Sheet open={!!epicId} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Epic 1168</span>
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mt-1">AI for Improved Call Center Interactions</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">Why?</Button>
              <Button variant="default" size="sm">Save</Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-6 bg-card">
            <TabsList className="h-12 bg-transparent justify-start gap-1">
              <TabsTrigger value="details" className="gap-2">
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-2">
                <Gem className="h-4 w-4" />
                Design
              </TabsTrigger>
              <TabsTrigger value="intake" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Intake
              </TabsTrigger>
              <TabsTrigger value="benefits" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Benefits
              </TabsTrigger>
              <TabsTrigger value="value" className="gap-2">
                <ThumbsUp className="h-4 w-4" />
                Value
              </TabsTrigger>
              <TabsTrigger value="milestones" className="gap-2">
                <Milestone className="h-4 w-4" />
                Milestones
              </TabsTrigger>
              <TabsTrigger value="spend" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Spend
              </TabsTrigger>
              <TabsTrigger value="forecast" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Forecast
              </TabsTrigger>
              <TabsTrigger value="links" className="gap-2">
                <LinkIcon className="h-4 w-4" />
                Links
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="details" className="m-0">
              <DetailsTabExtended 
                epic={epicDetail}
                programs={mockPrograms}
                users={mockUsers}
                themes={mockThemes}
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
