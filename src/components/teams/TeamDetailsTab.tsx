import { Team } from '@/types/team.types';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface TeamDetailsTabProps {
  team: Team;
}

export function TeamDetailsTab({ team }: TeamDetailsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label className="text-muted-foreground">Team Name</Label>
            <p className="font-medium text-foreground">{team.name}</p>
          </div>

          {team.short_name && (
            <div>
              <Label className="text-muted-foreground">Short Name</Label>
              <p className="font-medium text-foreground">{team.short_name}</p>
            </div>
          )}

          <div>
            <Label className="text-muted-foreground">Team Type</Label>
            <p className="font-medium text-foreground capitalize">
              {team.team_type === 'AGILE' ? 'Agile' : team.team_type === 'KANBAN' ? 'Kanban' : team.team_type === 'COP' ? 'CoP' : team.team_type}
            </p>
          </div>

          {team.programs && (
            <div>
              <Label className="text-muted-foreground">Program</Label>
              <p className="font-medium text-foreground">{team.programs.name}</p>
            </div>
          )}

          {team.burn_hours !== null && (
            <div>
              <Label className="text-muted-foreground">Burn Hours</Label>
              <p className="font-medium text-foreground">{team.burn_hours}</p>
            </div>
          )}

          {team.kanban_throughput !== null && (
            <div>
              <Label className="text-muted-foreground">Kanban Throughput</Label>
              <p className="font-medium text-foreground">{team.kanban_throughput}</p>
            </div>
          )}

          {team.track_by && (
            <div>
              <Label className="text-muted-foreground">Track By</Label>
              <p className="font-medium text-foreground capitalize">{team.track_by}</p>
            </div>
          )}

          {team.sprint_prefix && (
            <div>
              <Label className="text-muted-foreground">Sprint Prefix</Label>
              <p className="font-medium text-foreground">{team.sprint_prefix}</p>
            </div>
          )}

          <div>
            <Label className="text-muted-foreground">Status</Label>
            <p className="font-medium text-foreground">{team.is_active ? 'Active' : 'Inactive'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
