import { useParams, useNavigate } from 'react-router-dom';
import { useTeam } from '@/hooks/useTeams';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { JiraAlignTeamRoom } from '@/components/teams/JiraAlignTeamRoom';

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

  // Conditional rendering based on team type
  if (team.team_type === 'KANBAN') {
    const { KanbanTeamRoom } = require('@/components/teams/KanbanTeamRoom');
    return <KanbanTeamRoom team={team} />;
  }

  return <JiraAlignTeamRoom team={team} />;
}
