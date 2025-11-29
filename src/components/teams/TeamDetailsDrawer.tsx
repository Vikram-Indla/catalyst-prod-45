import { useTeam } from '@/hooks/useTeams';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Users, Calendar, BarChart3, GitBranch, Target, Settings } from 'lucide-react';
import { TeamDetailsTab } from './TeamDetailsTab';
import { TeamMembersTab } from './TeamMembersTab';
import { TeamSprintsTab } from './TeamSprintsTab';

interface TeamDetailsDrawerProps {
  teamId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamDetailsDrawer({ teamId, open, onOpenChange }: TeamDetailsDrawerProps) {
  const { data: team, isLoading } = useTeam(teamId || undefined);

  if (!teamId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading team details...</div>
          </div>
        ) : !team ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Team not found</div>
          </div>
        ) : (
          <>
            <SheetHeader className="mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <SheetTitle className="text-2xl mb-2">{team.name}</SheetTitle>
                  {team.short_name && (
                    <p className="text-sm text-muted-foreground mb-2">{team.short_name}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant={team.is_active ? 'default' : 'secondary'}>
                      {team.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">
                      {team.team_type === 'AGILE' ? 'Agile' : team.team_type === 'KANBAN' ? 'Kanban' : team.team_type === 'COP' ? 'CoP' : team.team_type}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </SheetHeader>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="details" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="members" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Members
                </TabsTrigger>
                <TabsTrigger value="sprints" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  Sprints
                </TabsTrigger>
                <TabsTrigger value="velocity" className="text-xs">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Velocity
                </TabsTrigger>
                <TabsTrigger value="dependencies" className="text-xs">
                  <GitBranch className="w-3 h-3 mr-1" />
                  Dependencies
                </TabsTrigger>
                <TabsTrigger value="objectives" className="text-xs">
                  <Target className="w-3 h-3 mr-1" />
                  Objectives
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <TeamDetailsTab team={team} />
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <TeamMembersTab teamId={team.id} />
              </TabsContent>

              <TabsContent value="sprints" className="space-y-4">
                <TeamSprintsTab 
                  teamId={team.id} 
                  teamType={team.team_type}
                  teamName={team.name}
                  sprintPrefix={team.sprint_prefix}
                />
              </TabsContent>

              <TabsContent value="velocity" className="space-y-4">
                <div className="text-sm text-muted-foreground">Velocity chart coming soon...</div>
              </TabsContent>

              <TabsContent value="dependencies" className="space-y-4">
                <div className="text-sm text-muted-foreground">Dependencies view coming soon...</div>
              </TabsContent>

              <TabsContent value="objectives" className="space-y-4">
                <div className="text-sm text-muted-foreground">Objectives view coming soon...</div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
