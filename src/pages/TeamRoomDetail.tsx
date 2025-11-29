import { useParams, useNavigate } from 'react-router-dom';
import { useTeam } from '@/hooks/useTeams';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ScrumTeamRoom } from '@/components/teams/ScrumTeamRoom';
import { KanbanTeamRoom } from '@/components/teams/KanbanTeamRoom';

export default function TeamRoomDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { data: team, isLoading } = useTeam(teamId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading team...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-muted-foreground">Team not found</div>
        <Button onClick={() => navigate('/teams')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/teams')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{team.name}</h1>
            <p className="text-sm text-muted-foreground">
              {team.team_type === 'AGILE' ? 'Agile / Scrum Team' : team.team_type === 'KANBAN' ? 'Kanban Team' : 'Team'} Room
            </p>
          </div>
        </div>
      </div>

      {/* Team Room Content */}
      <div className="flex-1 overflow-auto">
        {team.team_type === 'KANBAN' ? (
          <KanbanTeamRoom team={team} />
        ) : (
          <ScrumTeamRoom team={team} />
        )}
      </div>
    </div>
  );
}
