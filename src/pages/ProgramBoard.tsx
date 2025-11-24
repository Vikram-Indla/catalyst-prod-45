import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { PISelector } from '@/components/shared/PISelector';
import { AlertCircle } from 'lucide-react';

export default function ProgramBoard() {
  const [selectedPIId, setSelectedPIId] = useState<string[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [swimlaneByTeam, setSwimlaneByTeam] = useState(true);

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: iterations } = useQuery({
    queryKey: ['iterations', selectedPIId],
    queryFn: async () => {
      if (!selectedPIId.length) return [];
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .in('pi_id', selectedPIId)
        .order('start_date');
      if (error) throw error;
      return data;
    },
    enabled: selectedPIId.length > 0,
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
    queryKey: ['features', selectedProgramId, selectedPIId],
    queryFn: async () => {
      if (!selectedProgramId || !selectedPIId.length) return [];
      const { data, error } = await supabase
        .from('features')
        .select('*, epics(name)')
        .eq('program_id', selectedProgramId)
        .in('pi_id', selectedPIId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgramId && selectedPIId.length > 0,
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

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const featureId = result.draggableId;
    const newIterationId = result.destination.droppableId;

    await supabase
      .from('features')
      .update({ iteration_id: newIterationId })
      .eq('id', featureId);
  };

  const getFeaturesByIteration = (iterationId: string, teamId?: string) => {
    return features?.filter(f => {
      const matchesIteration = f.iteration_id === iterationId;
      if (!swimlaneByTeam || !teamId) return matchesIteration;
      // In real scenario, features would have team_id
      return matchesIteration;
    }) || [];
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Program Board</h1>
          <p className="text-muted-foreground">Plan features across iterations</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="swimlane-mode"
              checked={swimlaneByTeam}
              onCheckedChange={setSwimlaneByTeam}
            />
            <Label htmlFor="swimlane-mode">Team Swimlanes</Label>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
          <SelectTrigger className="w-[240px]">
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

        <PISelector value={selectedPIId} onChange={setSelectedPIId} />
      </div>

      {selectedProgramId && selectedPIId.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {swimlaneByTeam ? (
              teams?.map((team) => (
                <div key={team.id} className="space-y-2">
                  <h3 className="text-lg font-semibold">{team.name}</h3>
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${iterations?.length || 1}, 1fr)` }}>
                    {iterations?.map((iteration) => (
                      <Droppable key={iteration.id} droppableId={iteration.id}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="p-4 min-h-[200px]"
                          >
                            <h4 className="font-medium mb-2">{iteration.name}</h4>
                            <div className="space-y-2">
                              {getFeaturesByIteration(iteration.id, team.id).map((feature, index) => (
                                <Draggable key={feature.id} draggableId={feature.id} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="p-3 bg-card border rounded-lg space-y-1"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="text-sm font-medium line-clamp-2">{feature.name}</span>
                                        <HealthBadge health={feature.health} />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {feature.epics?.name}
                                        </Badge>
                                        {feature.estimate_points && (
                                          <span className="text-xs text-muted-foreground">
                                            {feature.estimate_points} pts
                                          </span>
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
                </div>
              ))
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${iterations?.length || 1}, 1fr)` }}>
                {iterations?.map((iteration) => (
                  <Droppable key={iteration.id} droppableId={iteration.id}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="p-4 min-h-[400px]"
                      >
                        <h4 className="font-medium mb-4">{iteration.name}</h4>
                        <div className="space-y-2">
                          {getFeaturesByIteration(iteration.id).map((feature, index) => (
                            <Draggable key={feature.id} draggableId={feature.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="p-3 bg-card border rounded-lg space-y-1"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-medium line-clamp-2">{feature.name}</span>
                                    <HealthBadge health={feature.health} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {feature.epics?.name}
                                    </Badge>
                                    {feature.estimate_points && (
                                      <span className="text-xs text-muted-foreground">
                                        {feature.estimate_points} pts
                                      </span>
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

            {dependencies && dependencies.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <h4 className="font-medium">Dependencies</h4>
                </div>
                <div className="space-y-2">
                  {dependencies.map((dep) => (
                    <div key={dep.id} className="text-sm flex items-center gap-2">
                      <Badge variant="outline">{dep.from_feature?.name}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline">{dep.to_feature?.name}</Badge>
                      <Badge className={`ml-auto ${
                        dep.risk_level === 'high' ? 'bg-destructive' :
                        dep.risk_level === 'med' ? 'bg-warning' : 'bg-success'
                      }`}>
                        {dep.risk_level}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
