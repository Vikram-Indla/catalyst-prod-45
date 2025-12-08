import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CalendarDays, Users } from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface SprintSelectorProps {
  storyId: string;
  currentSprintId?: string | null;
  teamId?: string | null;
  onSprintChange?: (sprintId: string | null) => void;
}

interface Sprint {
  id: string;
  name: string;
  short_name?: string;
  start_date?: string;
  end_date?: string;
  pi_id: string;
  team_id?: string;
  team?: { id: string; name: string } | null;
  program_increment?: { id: string; name: string } | null;
}

export function SprintSelector({ storyId, currentSprintId, teamId, onSprintChange }: SprintSelectorProps) {
  const queryClient = useQueryClient();
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(currentSprintId || null);

  useEffect(() => {
    setSelectedSprintId(currentSprintId || null);
  }, [currentSprintId]);

  // Fetch available sprints, optionally filtered by team
  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ['sprints-for-selector', teamId],
    queryFn: async () => {
      let query = supabase
        .from('iterations')
        .select(`
          id,
          name,
          short_name,
          start_date,
          end_date,
          pi_id,
          team_id,
          teams:team_id(id, name),
          program_increments:pi_id(id, name)
        `)
        .order('start_date', { ascending: false });

      // If team is specified, filter by team
      if (teamId) {
        query = query.or(`team_id.eq.${teamId},team_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(s => ({
        ...s,
        team: Array.isArray(s.teams) ? s.teams[0] : s.teams,
        program_increment: Array.isArray(s.program_increments) ? s.program_increments[0] : s.program_increments,
      })) as Sprint[];
    },
  });

  // Get current sprint details
  const currentSprint = sprints.find(s => s.id === selectedSprintId);

  // Update story sprint
  const updateSprintMutation = useMutation({
    mutationFn: async (sprintId: string | null) => {
      const { error } = await supabase
        .from('stories')
        .update({ sprint_id: sprintId })
        .eq('id', storyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      toast.success('Sprint updated');
      onSprintChange?.(selectedSprintId);
    },
    onError: () => {
      toast.error('Failed to update sprint');
    },
  });

  const handleSprintChange = (value: string) => {
    const newSprintId = value === 'none' ? null : value;
    setSelectedSprintId(newSprintId);
    updateSprintMutation.mutate(newSprintId);
  };

  // Determine sprint status
  const getSprintStatus = (sprint: Sprint): 'past' | 'active' | 'future' | 'unknown' => {
    if (!sprint.start_date || !sprint.end_date) return 'unknown';
    const now = new Date();
    const start = parseISO(sprint.start_date);
    const end = parseISO(sprint.end_date);
    
    if (now < start) return 'future';
    if (now > end) return 'past';
    return 'active';
  };

  // Group sprints by PI
  const sprintsByPI = sprints.reduce((acc, sprint) => {
    const piName = sprint.program_increment?.name || 'Unassigned';
    if (!acc[piName]) acc[piName] = [];
    acc[piName].push(sprint);
    return acc;
  }, {} as Record<string, Sprint[]>);

  return (
    <Card className="bg-white border border-neutral-200 rounded-xl shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand-gold" />
          Sprint Assignment
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Assigned Sprint</Label>
          <Select
            value={selectedSprintId || 'none'}
            onValueChange={handleSprintChange}
            disabled={updateSprintMutation.isPending || isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sprint..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">No Sprint (Backlog)</span>
              </SelectItem>
              {Object.entries(sprintsByPI).map(([piName, piSprints]) => (
                <div key={piName}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {piName}
                  </div>
                  {piSprints.map((sprint) => {
                    const status = getSprintStatus(sprint);
                    return (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        <div className="flex items-center gap-2">
                          <span>{sprint.short_name || sprint.name}</span>
                          {status === 'active' && (
                            <Badge variant="default" className="text-[10px] px-1 py-0 bg-green-500">
                              Active
                            </Badge>
                          )}
                          {status === 'past' && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              Past
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current sprint details */}
        {currentSprint && (
          <div className="p-3 bg-muted/30 rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{currentSprint.name}</span>
              {getSprintStatus(currentSprint) === 'active' && (
                <Badge className="bg-green-500 text-white text-xs">Active</Badge>
              )}
            </div>
            
            {currentSprint.start_date && currentSprint.end_date && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                <span>
                  {format(parseISO(currentSprint.start_date), 'MMM d')} - {format(parseISO(currentSprint.end_date), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            
            {currentSprint.team && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{currentSprint.team.name}</span>
              </div>
            )}
          </div>
        )}

        {!currentSprint && selectedSprintId === null && (
          <p className="text-xs text-muted-foreground">
            This story is in the backlog and not assigned to any sprint.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
