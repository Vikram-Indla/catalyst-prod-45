import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CommentsSection } from '@/components/shared/CommentsSection';
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

            <TabsContent value="intake" className="m-0 p-6">
              <p className="text-sm text-muted-foreground">Intake form customization available</p>
            </TabsContent>

            <TabsContent value="benefits" className="m-0 p-6">
              <p className="text-sm text-muted-foreground">Benefits tracking and analysis</p>
            </TabsContent>

            <TabsContent value="value" className="m-0 p-6">
              <p className="text-sm text-muted-foreground">Value scorecard and analysis</p>
            </TabsContent>

            <TabsContent value="milestones" className="m-0 p-6">
              <p className="text-sm text-muted-foreground">Milestone tracking (up to 30 per epic)</p>
            </TabsContent>

            <TabsContent value="spend" className="m-0 p-6">
              <p className="text-sm text-muted-foreground">Budget and spend tracking</p>
            </TabsContent>

            <TabsContent value="forecast" className="m-0 p-6">
              <p className="text-sm text-muted-foreground">PI-by-PI forecasting</p>
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
