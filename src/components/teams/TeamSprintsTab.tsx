import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar } from 'lucide-react';

interface TeamSprintsTabProps {
  teamId: string;
  teamType: 'AGILE' | 'KANBAN' | 'COP' | 'PROGRAM' | 'PORTFOLIO' | 'SOLUTION' | 'PROCESS_FLOW';
}

export function TeamSprintsTab({ teamId, teamType }: TeamSprintsTabProps) {
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
        <h3 className="text-sm font-medium text-foreground">Sprints</h3>
        <Button size="sm">
          <Plus className="w-3 h-3 mr-1" />
          Create Sprint
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <p>No sprints yet</p>
          <Button variant="link" size="sm">
            Create your first sprint
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
