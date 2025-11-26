import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CommentsSection } from '@/components/shared/CommentsSection';
import { ForecastTab } from '@/components/forecast/ForecastTab';
import { Calendar, DollarSign, Target, TrendingUp, AlertCircle, CheckCircle2, X } from 'lucide-react';

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
        .select(`
          *,
          strategic_themes(name),
          programs(name),
          epic_program_increments(program_increments(name))
        `)
        .eq('id', epicId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: children } = useQuery({
    queryKey: ['epic-children-details', epicId],
    queryFn: async () => {
      const [features, capabilities] = await Promise.all([
        supabase
          .from('features')
          .select('*')
          .eq('epic_id', epicId)
          .order('rank_within_epic'),
        supabase
          .from('capabilities')
          .select('*')
          .eq('epic_id', epicId)
          .order('rank_within_epic'),
      ]);
      
      return {
        features: features.data || [],
        capabilities: capabilities.data || [],
      };
    },
  });

  if (!epic) return null;

  const getStateColor = (state: string) => {
    switch (state) {
      case 'not_started': return 'secondary';
      case 'in_progress': return 'default';
      case 'accepted': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Sheet open={!!epicId} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>{epic.name}</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={getStateColor(epic.state)}>{epic.state.replace('_', ' ')}</Badge>
            {epic.mvp && <Badge variant="default">MVP</Badge>}
            <span className="text-sm text-muted-foreground">
              {epic.epic_key || epic.id.slice(0, 8)}
            </span>
          </div>
        </SheetHeader>

        {/* Contains In (Hierarchy) */}
        <div className="px-6 py-4 border-b bg-muted/30">
          <div className="text-sm font-medium mb-2">Contains In</div>
          <div className="flex items-center gap-2 text-sm">
            {epic.strategic_themes && (
              <span className="text-muted-foreground">
                Theme: <span className="text-foreground font-medium">{epic.strategic_themes.name}</span>
              </span>
            )}
            {epic.programs && (
              <span className="text-muted-foreground ml-4">
                Program: <span className="text-foreground font-medium">{epic.programs.name}</span>
              </span>
            )}
          </div>
        </div>

        <Tabs defaultValue="full-details" className="flex-1 flex flex-col">
          <div className="border-b px-6">
            <TabsList className="h-12">
              <TabsTrigger value="full-details">Full Details</TabsTrigger>
              <TabsTrigger value="children">Children</TabsTrigger>
              <TabsTrigger value="intake">Intake</TabsTrigger>
              <TabsTrigger value="benefits">Benefits</TabsTrigger>
              <TabsTrigger value="value">Value</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="spend">Spend</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="full-details" className="m-0 p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1 text-sm">{epic.description || 'No description'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Owner</label>
                  <p className="mt-1 text-sm">{epic.owner_id || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Points Estimate</label>
                  <p className="mt-1 text-sm">{epic.points_estimate || '-'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Program Increments</label>
                <div className="mt-1 flex gap-2 flex-wrap">
                  {epic.epic_program_increments?.length > 0 ? (
                    epic.epic_program_increments.map((epi: any, i: number) => (
                      <Badge key={i} variant="outline">{epi.program_increments.name}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="children" className="m-0 p-6 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Capabilities ({children?.capabilities.length || 0})</h3>
                <div className="space-y-2">
                  {children?.capabilities.map((cap: any) => (
                    <div key={cap.id} className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">{cap.name}</div>
                      <div className="text-xs text-muted-foreground">{cap.capability_key || cap.id.slice(0, 8)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Features ({children?.features.length || 0})</h3>
                <div className="space-y-2">
                  {children?.features.map((feat: any) => (
                    <div key={feat.id} className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">{feat.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {feat.estimate_points && `${feat.estimate_points} points`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="intake" className="m-0 p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Intake Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Business Case</label>
                    <Textarea 
                      placeholder="Describe the business case..." 
                      className="mt-1"
                      rows={3}
                      defaultValue={epic.description || ''}
                      disabled
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Requested By</label>
                      <Input className="mt-1" placeholder="Stakeholder name" disabled />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Request Date</label>
                      <Input type="date" className="mt-1" disabled />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Strategic Alignment</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {epic.strategic_themes && (
                        <Badge variant="outline">{epic.strategic_themes.name}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="benefits" className="m-0 p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Expected Benefits
                </h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Revenue Impact</span>
                      <Badge variant="outline">$0</Badge>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Cost Savings</span>
                      <Badge variant="outline">$0</Badge>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Efficiency Gains</span>
                      <Badge variant="outline">0%</Badge>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Qualitative Benefits</label>
                    <Textarea 
                      placeholder="Describe non-quantifiable benefits..." 
                      className="mt-1"
                      rows={3}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="value" className="m-0 p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Value Scorecard
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Business Value</label>
                      <div className="text-2xl font-bold mt-2">-</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Risk Reduction</label>
                      <div className="text-2xl font-bold mt-2">-</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Time Criticality</label>
                      <div className="text-2xl font-bold mt-2">-</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Job Size</label>
                      <div className="text-2xl font-bold mt-2">{epic.points_estimate || '-'}</div>
                    </div>
                  </div>
                  <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">WSJF Score</span>
                      <div className="text-3xl font-bold text-primary">-</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      (Business Value + Risk Reduction + Time Criticality) / Job Size
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="milestones" className="m-0 p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Milestones
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Epic Approval</div>
                      <div className="text-xs text-muted-foreground">
                        {epic.start_date || 'Not set'}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-success">Complete</Badge>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">PI Planning</div>
                      <div className="text-xs text-muted-foreground">
                        {epic.epic_program_increments?.[0]?.program_increments?.name || 'Unassigned'}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-warning">In Progress</Badge>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg opacity-50">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Epic Complete</div>
                      <div className="text-xs text-muted-foreground">
                        {epic.end_date || 'Not set'}
                      </div>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="spend" className="m-0 p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget & Spend
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Budget</label>
                      <div className="text-xl font-bold mt-2">$0</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Actual Spend</label>
                      <div className="text-xl font-bold mt-2">$0</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Remaining</label>
                      <div className="text-xl font-bold mt-2">$0</div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Burn Rate</span>
                      <span className="text-sm text-muted-foreground">0% utilized</span>
                    </div>
                    <Progress value={0} className="h-3" />
                  </div>
                  <div className="mt-6">
                    <label className="text-sm font-medium">Cost Breakdown</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between p-2 border-b">
                        <span className="text-sm">Labor</span>
                        <span className="text-sm font-medium">$0</span>
                      </div>
                      <div className="flex items-center justify-between p-2 border-b">
                        <span className="text-sm">Infrastructure</span>
                        <span className="text-sm font-medium">$0</span>
                      </div>
                      <div className="flex items-center justify-between p-2 border-b">
                        <span className="text-sm">Other</span>
                        <span className="text-sm font-medium">$0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="forecast" className="m-0">
              <ForecastTab workItemId={epicId} workItemType="epic" />
            </TabsContent>

            <TabsContent value="comments" className="m-0 p-6">
              <CommentsSection entityId={epicId} entityType="epic" />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
