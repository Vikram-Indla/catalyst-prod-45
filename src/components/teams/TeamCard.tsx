import { Team } from '@/types/team.types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamCardProps {
  team: Team;
  variant?: 'grid' | 'list';
  onClick?: () => void;
}

export function TeamCard({ team, variant = 'grid', onClick }: TeamCardProps) {
  const teamTypeLabel = team.team_type === 'AGILE' ? 'Agile' : team.team_type === 'KANBAN' ? 'Kanban' : team.team_type === 'COP' ? 'CoP' : team.team_type;
  const isActive = team.is_active;

  if (variant === 'list') {
    return (
      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{team.name}</h3>
                  {team.short_name && (
                    <span className="text-sm text-muted-foreground">({team.short_name})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {teamTypeLabel}
                  </Badge>
                  {team.programs && (
                    <span>• {team.programs.name}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="font-semibold text-foreground mb-1">{team.name}</h3>
        {team.short_name && (
          <p className="text-sm text-muted-foreground mb-3">{team.short_name}</p>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <Badge variant="secondary" className="text-xs">
              {teamTypeLabel}
            </Badge>
          </div>
          
          {team.programs && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Program</span>
              <span className="font-medium text-foreground">{team.programs.name}</span>
            </div>
          )}
          
          {team.burn_hours && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Burn Hours
              </span>
              <span className="font-medium text-foreground">{team.burn_hours}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
