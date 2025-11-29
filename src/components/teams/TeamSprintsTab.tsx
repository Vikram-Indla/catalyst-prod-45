import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar } from 'lucide-react';
import { CreateSprintDialog } from './CreateSprintDialog';
import { format } from 'date-fns';

interface TeamSprintsTabProps {
  teamId: string;
  teamType: 'AGILE' | 'KANBAN' | 'COP' | 'PROGRAM' | 'PORTFOLIO' | 'SOLUTION' | 'PROCESS_FLOW';
  teamName: string;
  sprintPrefix?: string;
}

export function TeamSprintsTab({ teamId, teamType, teamName, sprintPrefix }: TeamSprintsTabProps) {
  const [createSprintOpen, setCreateSprintOpen] = useState(false);

  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ['sprints', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .eq('team_id', teamId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (teamType === 'KANBAN') {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Kanban teams use continuous flow and don't track sprints</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-foreground">Sprints ({sprints.length})</h3>
        <Button size="sm" onClick={() => setCreateSprintOpen(true)}>
          <Plus className="w-3 h-3 mr-1" />
          Create Sprint
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>Loading sprints...</p>
          </CardContent>
        </Card>
      ) : sprints.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="mb-2">No sprints yet</p>
            <Button variant="link" size="sm" onClick={() => setCreateSprintOpen(true)}>
              Create your first sprint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sprints.map((sprint) => (
            <Card key={sprint.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">{sprint.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(sprint.start_date), 'MMM d')} - {format(new Date(sprint.end_date), 'MMM d, yyyy')}
                    </p>
                    {sprint.goal && (
                      <p className="text-sm text-muted-foreground mt-1">{sprint.goal}</p>
                    )}
                  </div>
                  <Badge variant="default">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateSprintDialog
        teamId={teamId}
        teamName={teamName}
        sprintPrefix={sprintPrefix}
        open={createSprintOpen}
        onOpenChange={setCreateSprintOpen}
      />
    </div>
  );
}
