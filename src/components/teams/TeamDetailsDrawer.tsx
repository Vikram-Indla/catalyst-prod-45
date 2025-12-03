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
      <SheetContent side="right" className="executive-drawer w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden">
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
            <SheetHeader className="executive-drawer-header flex-row items-start justify-between space-y-0 shrink-0">
              <div className="flex-1 min-w-0">
                <SheetTitle className="executive-drawer-title truncate">{team.name}</SheetTitle>
                {team.short_name && (
                  <p className="executive-drawer-subtitle mt-1">{team.short_name}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
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
            </SheetHeader>

            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
              <div className="executive-drawer-tabs overflow-x-auto flex-shrink-0">
                <TabsList className="w-full justify-start rounded-none flex-nowrap bg-transparent">
                  <TabsTrigger value="details" className="executive-drawer-tab">
                    <Settings className="w-3 h-3 mr-1" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="members" className="executive-drawer-tab">
                    <Users className="w-3 h-3 mr-1" />
                    Members
                  </TabsTrigger>
                  <TabsTrigger value="sprints" className="executive-drawer-tab">
                    <Calendar className="w-3 h-3 mr-1" />
                    Sprints
                  </TabsTrigger>
                  <TabsTrigger value="velocity" className="executive-drawer-tab">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Velocity
                  </TabsTrigger>
                  <TabsTrigger value="dependencies" className="executive-drawer-tab">
                    <GitBranch className="w-3 h-3 mr-1" />
                    Dependencies
                  </TabsTrigger>
                  <TabsTrigger value="objectives" className="executive-drawer-tab">
                    <Target className="w-3 h-3 mr-1" />
                    Objectives
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="executive-drawer-content flex-1 overflow-y-auto">
                <TabsContent value="details" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
                  <TeamDetailsTab team={team} />
                </TabsContent>

                <TabsContent value="members" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
                  <TeamMembersTab teamId={team.id} />
                </TabsContent>

                <TabsContent value="sprints" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
                  <TeamSprintsTab 
                    teamId={team.id} 
                    teamType={team.team_type}
                    teamName={team.name}
                    sprintPrefix={team.sprint_prefix}
                  />
                </TabsContent>

                <TabsContent value="velocity" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
                  <div className="text-sm text-muted-foreground">Velocity chart coming soon...</div>
                </TabsContent>

                <TabsContent value="dependencies" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
                  <div className="text-sm text-muted-foreground">Dependencies view coming soon...</div>
                </TabsContent>

                <TabsContent value="objectives" className="mt-0 p-[var(--s4)] sm:p-[var(--s6)]">
                  <div className="text-sm text-muted-foreground">Objectives view coming soon...</div>
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
