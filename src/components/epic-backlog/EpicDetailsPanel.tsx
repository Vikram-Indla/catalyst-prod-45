import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CommentsSection } from '@/components/shared/CommentsSection';
import { ForecastTab } from '@/components/forecast/ForecastTab';
import { X } from 'lucide-react';

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
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col z-[100]">
        <SheetHeader className="px-6 py-3 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SheetTitle className="text-lg">{epic.name}</SheetTitle>
              <span className="text-sm text-muted-foreground">
                {epic.epic_key || `E-${epic.id.slice(0, 6)}`}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={getStateColor(epic.state)} className="text-xs">
              {epic.state.replace('_', ' ').toUpperCase()}
            </Badge>
            {epic.mvp && <Badge variant="default" className="text-xs">MVP</Badge>}
            {epic.health && (
              <Badge variant="outline" className="text-xs">
                Health: {epic.health}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Contains In (Hierarchy) - Simplified */}
        <div className="px-6 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-4 text-sm">
            {epic.strategic_themes && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Theme:</span>
                <Badge variant="secondary" className="text-xs">
                  {epic.strategic_themes.name}
                </Badge>
              </div>
            )}
            {epic.programs && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Program:</span>
                <Badge variant="secondary" className="text-xs">
                  {epic.programs.name}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-6 bg-card sticky top-[72px] z-10">
            <TabsList className="h-10 bg-transparent">
              <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              <TabsTrigger value="children" className="text-xs">Children</TabsTrigger>
              <TabsTrigger value="dependencies" className="text-xs">Dependencies</TabsTrigger>
              <TabsTrigger value="risks" className="text-xs">Risks</TabsTrigger>
              <TabsTrigger value="forecast" className="text-xs">Forecast</TabsTrigger>
              <TabsTrigger value="comments" className="text-xs">Comments</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="details" className="m-0 p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
                  <p className="mt-2 text-sm leading-relaxed">{epic.description || 'No description provided'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Owner</label>
                    <p className="mt-1 text-sm">{epic.owner_id || 'Unassigned'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Points</label>
                    <p className="mt-1 text-sm font-medium">{epic.points_estimate || '0'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">State</label>
                    <Badge variant={getStateColor(epic.state)} className="mt-1 text-xs">
                      {epic.state.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">MVP</label>
                    <p className="mt-1 text-sm">{epic.mvp ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Program Increments</label>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {epic.epic_program_increments?.length > 0 ? (
                      epic.epic_program_increments.map((epi: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {epi.program_increments.name}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary" className="text-xs">Unassigned</Badge>
                    )}
                  </div>
                </div>

                {(epic.start_date || epic.end_date) && (
                  <div className="pt-4 border-t">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Timeline</label>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      {epic.start_date && (
                        <div>
                          <span className="text-xs text-muted-foreground">Start:</span>
                          <p className="text-sm">{new Date(epic.start_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {epic.end_date && (
                        <div>
                          <span className="text-xs text-muted-foreground">End:</span>
                          <p className="text-sm">{new Date(epic.end_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="children" className="m-0 p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                    Capabilities ({children?.capabilities.length || 0})
                  </h3>
                </div>
                {children?.capabilities && children.capabilities.length > 0 ? (
                  <div className="space-y-2">
                    {children.capabilities.map((cap: any) => (
                      <div key={cap.id} className="p-3 border rounded hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{cap.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {cap.capability_key || `C-${cap.id.slice(0, 6)}`}
                            </div>
                          </div>
                          {cap.state && (
                            <Badge variant="secondary" className="text-xs">
                              {cap.state}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No capabilities</p>
                )}
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                    Features ({children?.features.length || 0})
                  </h3>
                </div>
                {children?.features && children.features.length > 0 ? (
                  <div className="space-y-2">
                    {children.features.map((feat: any) => (
                      <div key={feat.id} className="p-3 border rounded hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{feat.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {feat.estimate_points ? `${feat.estimate_points} pts` : 'Not estimated'}
                            </div>
                          </div>
                          {feat.status && (
                            <Badge variant="secondary" className="text-xs">
                              {feat.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No features</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="dependencies" className="m-0 p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
                  Dependencies
                </h3>
                <p className="text-sm text-muted-foreground italic">
                  No dependencies configured
                </p>
              </div>
            </TabsContent>

            <TabsContent value="risks" className="m-0 p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
                  Risks & Impediments
                </h3>
                <p className="text-sm text-muted-foreground italic">
                  No risks identified
                </p>
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
