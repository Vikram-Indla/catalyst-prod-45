import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigation } from '@/contexts/NavigationContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { WSJFBadge } from '@/components/shared/WSJFBadge';
import { PISelector } from '@/components/shared/PISelector';
import { DependencyConnector } from '@/components/shared/DependencyConnector';
import FeaturePIObjectiveLinkDialog from '@/components/forms/FeaturePIObjectiveLinkDialog';
import { AlertCircle, AlertTriangle, Calendar, Users, TrendingUp, Target } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * Program Board for PI Planning
 * Source: https://help.jiraalign.com/hc/en-us/articles/115005049268-Program-board
 * Source: https://scaledagileframework.com/program-board/
 * 
 * Displays features organized by iterations (columns) and teams (optional swimlanes)
 * Supports drag-drop for feature planning, dependency visualization, and risk flagging
 */

export default function ProgramBoard() {
  const queryClient = useQueryClient();
  const { selectedProgramId, setSelectedProgramId, selectedPIIds, setSelectedPIIds } = useNavigation();
  
  // Local state for board configuration
  const [swimlaneByTeam, setSwimlaneByTeam] = useState(true);
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [linkingFeatureId, setLinkingFeatureId] = useState<string | null>(null);

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
  
  // Initialize from navigation context
  useEffect(() => {
    if (!selectedProgramId && programs?.[0]) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId, setSelectedProgramId]);

  const { data: iterations } = useQuery({
    queryKey: ['iterations', selectedPIIds],
    queryFn: async () => {
      if (!selectedPIIds.length) return [];
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .in('pi_id', selectedPIIds)
        .order('start_date');
      if (error) throw error;
      return data;
    },
    enabled: selectedPIIds.length > 0,
  });

  const { data: teams } = useQuery({
    queryKey: ['teams', selectedProgramId],
    queryFn: async () => {
      if (!selectedProgramId) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('program_id', selectedProgramId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgramId,
  });

  const { data: features } = useQuery({
    queryKey: ['features', selectedProgramId, selectedPIIds],
    queryFn: async () => {
      if (!selectedProgramId || !selectedPIIds.length) return [];
      const { data, error } = await supabase
        .from('features')
        .select('*, epics(name), teams(name)')
        .eq('program_id', selectedProgramId)
        .in('pi_id', selectedPIIds);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgramId && selectedPIIds.length > 0,
  });

  const { data: dependencies } = useQuery({
    queryKey: ['dependencies', selectedProgramId],
    queryFn: async () => {
      if (!selectedProgramId) return [];
      const { data, error } = await supabase
        .from('dependencies')
        .select('*, from_feature:features!dependencies_from_feature_id_fkey(id, name), to_feature:features!dependencies_to_feature_id_fkey(id, name)')
        .eq('from_feature.program_id', selectedProgramId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgramId,
  });

  // Mutation for updating feature iteration assignment
  const updateFeatureMutation = useMutation({
    mutationFn: async ({ featureId, iterationId }: { featureId: string; iterationId: string }) => {
      const { error } = await supabase
        .from('features')
        .update({ iteration_id: iterationId })
        .eq('id', featureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Feature moved successfully');
    },
    onError: () => {
      toast.error('Failed to move feature');
    },
  });
  
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const featureId = result.draggableId;
    const newIterationId = result.destination.droppableId === 'unassigned' 
      ? null 
      : result.destination.droppableId;

    updateFeatureMutation.mutate({ 
      featureId, 
      iterationId: newIterationId as string 
    });
  };

  const getFeaturesByIteration = (iterationId: string | null, teamId?: string) => {
    return features?.filter(f => {
      const matchesIteration = iterationId === null 
        ? !f.iteration_id 
        : f.iteration_id === iterationId;
      
      if (!swimlaneByTeam || !teamId) return matchesIteration;
      
      return matchesIteration && f.team_id === teamId;
    }) || [];
  };
  
  // Calculate iteration metrics
  const getIterationMetrics = (iterationId: string) => {
    const iterationFeatures = getFeaturesByIteration(iterationId);
    const totalPoints = iterationFeatures.reduce((sum, f) => sum + (f.estimate_points || 0), 0);
    const blocked = iterationFeatures.filter(f => f.blocked).length;
    const risks = iterationFeatures.filter(f => f.health === 'red').length;
    
    return { totalPoints, blocked, risks, count: iterationFeatures.length };
  };

  return (
    <div className="px-[var(--s3)] sm:px-[var(--s4)] md:px-[var(--s6)] lg:px-[var(--s8)] py-[var(--s3)] sm:py-[var(--s4)] md:py-[var(--s6)] space-y-[var(--s4)] sm:space-y-[var(--s6)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[var(--s3)] sm:gap-[var(--s4)]">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">Program Board</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Plan features across iterations</p>
        </div>
        <div className="flex items-center gap-[var(--s2)] sm:gap-[var(--s4)] flex-shrink-0">
          <div className="flex items-center gap-[var(--s2)]">
            <Switch
              id="swimlane-mode"
              checked={swimlaneByTeam}
              onCheckedChange={setSwimlaneByTeam}
            />
            <Label htmlFor="swimlane-mode" className="text-xs sm:text-sm whitespace-nowrap">Team Swimlanes</Label>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-[var(--s3)] sm:gap-[var(--s4)]">
        <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Select Program" />
          </SelectTrigger>
          <SelectContent>
            {programs?.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <PISelector value={selectedPIIds} onChange={setSelectedPIIds} />
        
        <div className="flex items-center gap-[var(--s2)] flex-shrink-0">
          <Switch
            id="show-unassigned"
            checked={showUnassigned}
            onCheckedChange={setShowUnassigned}
          />
          <Label htmlFor="show-unassigned" className="text-xs sm:text-sm whitespace-nowrap">Show Unassigned</Label>
        </div>
      </div>

      {selectedProgramId && selectedPIIds.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div id="program-board-container" className="space-y-[var(--s4)] sm:space-y-[var(--s6)] relative">
            <div className="overflow-x-auto -mx-[var(--s3)] sm:mx-0 px-[var(--s3)] sm:px-0">
            {swimlaneByTeam ? (
              <div className="min-w-[800px]">
              {teams?.map((team) => (
                <div key={team.id} className="space-y-[var(--s2)] mb-[var(--s6)]">
                  <h3 className="text-base sm:text-lg font-semibold">{team.name}</h3>
                  <div className="grid gap-[var(--s3)] sm:gap-[var(--s4)]" style={{ gridTemplateColumns: `repeat(${iterations?.length || 1}, minmax(240px, 1fr))` }}>
                    {iterations?.map((iteration) => (
                      <Droppable key={iteration.id} droppableId={iteration.id}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="p-[var(--s3)] sm:p-[var(--s4)] min-h-[200px] border-2"
                          >
                            <div className="space-y-[var(--s2)] mb-[var(--s3)]">
                              <div className="flex items-center justify-between gap-[var(--s2)]">
                                <h4 className="text-sm sm:text-base font-medium truncate">{iteration.name}</h4>
                                {iteration.start_date && (
                                  <Badge variant="outline" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {format(new Date(iteration.start_date), 'MMM d')}
                                  </Badge>
                                )}
                              </div>
                              {(() => {
                                const metrics = getIterationMetrics(iteration.id);
                                return (
                                  <div className="flex items-center gap-[var(--s2)] text-xs text-muted-foreground flex-wrap">
                                    <span>{metrics.count} features</span>
                                    <span>•</span>
                                    <span>{metrics.totalPoints} pts</span>
                                    {metrics.blocked > 0 && (
                                      <>
                                        <span>•</span>
                                        <Badge variant="destructive" className="h-4 px-1">
                                          {metrics.blocked} blocked
                                        </Badge>
                                      </>
                                    )}
                                    {metrics.risks > 0 && (
                                      <>
                                        <span>•</span>
                                        <Badge variant="destructive" className="h-4 px-1">
                                          {metrics.risks} at risk
                                        </Badge>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="space-y-[var(--s2)]">
                              {getFeaturesByIteration(iteration.id, team.id).map((feature, index) => (
                                <Draggable key={feature.id} draggableId={feature.id} index={index}>
                                  {(provided) => (
                                     <div
                                       ref={provided.innerRef}
                                       {...provided.draggableProps}
                                       {...provided.dragHandleProps}
                                       data-feature-id={feature.id}
                                       className={`p-[var(--s2)] sm:p-[var(--s3)] bg-card border rounded-lg space-y-[var(--s2)] hover:shadow-md transition-shadow cursor-move ${
                                         feature.blocked ? 'border-destructive border-2' : ''
                                       }`}
                                     >
                                       <div className="flex items-start justify-between gap-[var(--s2)]">
                                         <span className="text-xs sm:text-sm font-medium line-clamp-2 flex-1">{feature.name}</span>
                                         <div className="flex items-center gap-1 flex-shrink-0">
                                           {feature.blocked && (
                                             <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                                           )}
                                           <HealthBadge health={feature.health} />
                                         </div>
                                       </div>
                                       <div className="flex items-center gap-[var(--s2)] flex-wrap">
                                         <Badge variant="outline" className="text-xs">
                                           {feature.epics?.name}
                                         </Badge>
                                         {feature.estimate_points && (
                                           <Badge variant="secondary" className="text-xs">
                                             {feature.estimate_points} pts
                                           </Badge>
                                         )}
                                         {feature.wsjf_score && (
                                           <WSJFBadge 
                                             score={feature.wsjf_score}
                                             businessValue={feature.business_value}
                                             timeCriticality={feature.time_criticality}
                                             riskReduction={feature.risk_reduction}
                                             jobSize={feature.job_size}
                                           />
                                         )}
                                       </div>
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         className="w-full h-7 text-xs"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setLinkingFeatureId(feature.id);
                                         }}
                                       >
                                         <Target className="h-3 w-3 mr-1" />
                                         Link to Objectives
                                       </Button>
                                     </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          </Card>
                        )}
                      </Droppable>
                  ))}
                </div>
              </div>
              ))}
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${iterations?.length || 1}, 1fr)` }}>
                {iterations?.map((iteration) => (
                  <Droppable key={iteration.id} droppableId={iteration.id}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="p-4 min-h-[400px] border-2"
                      >
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{iteration.name}</h4>
                            {iteration.start_date && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(iteration.start_date), 'MMM d')}
                              </Badge>
                            )}
                          </div>
                          {(() => {
                            const metrics = getIterationMetrics(iteration.id);
                            return (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{metrics.count} features</span>
                                <span>•</span>
                                <span>{metrics.totalPoints} pts</span>
                                {metrics.blocked > 0 && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="destructive" className="h-4 px-1">
                                      {metrics.blocked} blocked
                                    </Badge>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="space-y-2">
                          {getFeaturesByIteration(iteration.id).map((feature, index) => (
                            <Draggable key={feature.id} draggableId={feature.id} index={index}>
                              {(provided) => (
                                <div
                                 ref={provided.innerRef}
                                 {...provided.draggableProps}
                                 {...provided.dragHandleProps}
                                 data-feature-id={feature.id}
                                 className={`p-3 bg-card border rounded-lg space-y-2 hover:shadow-md transition-shadow cursor-move ${
                                   feature.blocked ? 'border-destructive border-2' : ''
                                 }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-medium line-clamp-2 flex-1">{feature.name}</span>
                                    <div className="flex items-center gap-1">
                                      {feature.blocked && (
                                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                                      )}
                                      <HealthBadge health={feature.health} />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-xs">
                                      {feature.epics?.name}
                                    </Badge>
                                    {feature.teams && (
                                      <Badge variant="secondary" className="text-xs gap-1">
                                        <Users className="h-3 w-3" />
                                        {feature.teams.name}
                                      </Badge>
                                    )}
                                    {feature.estimate_points && (
                                      <Badge variant="secondary" className="text-xs">
                                        {feature.estimate_points} pts
                                      </Badge>
                                    )}
                                    {feature.wsjf_score && (
                                      <WSJFBadge 
                                        score={feature.wsjf_score}
                                        businessValue={feature.business_value}
                                        timeCriticality={feature.time_criticality}
                                        riskReduction={feature.risk_reduction}
                                        jobSize={feature.job_size}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </Card>
                    )}
                  </Droppable>
                ))}
              </div>
            )}
            </div>
            
            {/* Unassigned Features Column */}
            {showUnassigned && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Unassigned Features</h3>
                <Droppable droppableId="unassigned">
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="p-4 min-h-[200px] border-dashed border-2"
                    >
                      <div className="space-y-2">
                        {getFeaturesByIteration(null).map((feature, index) => (
                          <Draggable key={feature.id} draggableId={feature.id} index={index}>
                            {(provided) => (
                              <div
                               ref={provided.innerRef}
                               {...provided.draggableProps}
                               {...provided.dragHandleProps}
                               data-feature-id={feature.id}
                               className={`p-3 bg-card border rounded-lg space-y-2 hover:shadow-md transition-shadow cursor-move ${
                                 feature.blocked ? 'border-destructive border-2' : ''
                               }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-sm font-medium line-clamp-2 flex-1">{feature.name}</span>
                                  <div className="flex items-center gap-1">
                                    {feature.blocked && (
                                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                                    )}
                                    <HealthBadge health={feature.health} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {feature.epics?.name}
                                  </Badge>
                                  {feature.estimate_points && (
                                    <Badge variant="secondary" className="text-xs">
                                      {feature.estimate_points} pts
                                    </Badge>
                                  )}
                                  {feature.wsjf_score && (
                                    <WSJFBadge 
                                      score={feature.wsjf_score}
                                      businessValue={feature.business_value}
                                      timeCriticality={feature.time_criticality}
                                      riskReduction={feature.risk_reduction}
                                      jobSize={feature.job_size}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </Card>
                  )}
                </Droppable>
              </div>
            )}

            {/* Visual Dependency Connectors */}
            {dependencies && dependencies.length > 0 && (
              <DependencyConnector 
                dependencies={dependencies} 
                containerId="program-board-container" 
              />
            )}

            {/* Dependencies Legend */}
            {dependencies && dependencies.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Dependencies ({dependencies.length})</h4>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-px bg-primary" />
                      <span>Sequential</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-px border-t-2 border-dashed border-primary" />
                      <span>Concurrent</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {dependencies.slice(0, 6).map((dep) => (
                    <div key={dep.id} className="text-xs flex items-center gap-2 p-2 rounded bg-muted/50">
                      <Badge 
                        variant={
                          dep.risk_level === 'high' ? 'destructive' :
                          dep.risk_level === 'med' ? 'secondary' : 
                          'outline'
                        }
                        className="h-5 px-1.5"
                      >
                        {dep.risk_level}
                      </Badge>
                      <span className="truncate text-muted-foreground">
                        {dep.from_feature?.name?.slice(0, 12)}... → {dep.to_feature?.name?.slice(0, 12)}...
                      </span>
                    </div>
                  ))}
                  {dependencies.length > 6 && (
                    <div className="text-xs flex items-center justify-center p-2 rounded bg-muted/50 text-muted-foreground">
                      +{dependencies.length - 6} more
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </DragDropContext>
      )}

      {linkingFeatureId && selectedProgramId && selectedPIIds?.[0] && (
        <FeaturePIObjectiveLinkDialog
          featureId={linkingFeatureId}
          programId={selectedProgramId}
          piId={selectedPIIds[0]}
          open={!!linkingFeatureId}
          onOpenChange={() => setLinkingFeatureId(null)}
        />
      )}
    </div>
  );
}
