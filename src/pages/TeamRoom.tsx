import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { KPIWidgetCard } from '@/components/shared/KPIWidgetCard';
import { LayoutGrid, ListTodo, Target, AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';

export default function TeamRoom() {
  const navigate = useNavigate();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: sprints } = useQuery({
    queryKey: ['sprints', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .eq('team_id', selectedTeamId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTeamId,
  });

  const { data: stories } = useQuery({
    queryKey: ['stories', selectedSprintId],
    queryFn: async () => {
      if (!selectedSprintId) return [];
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('sprint_id', selectedSprintId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSprintId,
  });

  const { data: features } = useQuery({
    queryKey: ['team-features', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('team_id', selectedTeamId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTeamId,
  });

  const { data: historicalSprints } = useQuery({
    queryKey: ['historical-sprints', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data: sprints } = await supabase
        .from('iterations')
        .select('*')
        .eq('team_id', selectedTeamId)
        .order('start_date', { ascending: false })
        .limit(6);

      if (!sprints) return [];

      const sprintData = await Promise.all(
        sprints.map(async (sprint) => {
          const { data: stories } = await supabase
            .from('stories')
            .select('estimate_points, status')
            .eq('sprint_id', sprint.id);

          const totalPoints = stories?.reduce((sum, s) => sum + (s.estimate_points || 0), 0) || 0;
          const completedPoints = stories
            ?.filter(s => s.status === 'done')
            .reduce((sum, s) => sum + (s.estimate_points || 0), 0) || 0;

          return {
            name: sprint.name,
            totalPoints,
            completedPoints,
            velocity: completedPoints,
          };
        })
      );

      return sprintData;
    },
    enabled: !!selectedTeamId,
  });

  const currentSprint = sprints?.find(s => s.id === selectedSprintId);
  const sprintDaysElapsed = currentSprint 
    ? Math.max(0, differenceInDays(new Date(), new Date(currentSprint.start_date)))
    : 0;
  const sprintTotalDays = currentSprint 
    ? differenceInDays(new Date(currentSprint.end_date), new Date(currentSprint.start_date))
    : 1;

  const storiesByStatus = {
    todo: stories?.filter(s => s.status === 'todo').length || 0,
    in_progress: stories?.filter(s => s.status === 'in_progress').length || 0,
    done: stories?.filter(s => s.status === 'done').length || 0,
  };

  const totalPoints = stories?.reduce((sum, s) => sum + (s.estimate_points || 0), 0) || 0;
  const completedPoints = stories
    ?.filter(s => s.status === 'done')
    .reduce((sum, s) => sum + (s.estimate_points || 0), 0) || 0;
  const remainingPoints = totalPoints - completedPoints;
  const completionPct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  // Burndown calculation
  const idealBurnRate = totalPoints / sprintTotalDays;
  const idealRemaining = Math.max(0, totalPoints - (idealBurnRate * sprintDaysElapsed));
  const isOnTrack = remainingPoints <= idealRemaining * 1.1; // 10% buffer

  // Velocity metrics
  const avgVelocity = historicalSprints?.length 
    ? Math.round(historicalSprints.reduce((sum, s) => sum + s.velocity, 0) / historicalSprints.length)
    : 0;
  const velocityTrend = historicalSprints && historicalSprints.length >= 2
    ? historicalSprints[0].velocity - historicalSprints[1].velocity
    : 0;

  // Acceptance metrics
  const acceptanceRate = stories?.length 
    ? Math.round((storiesByStatus.done / stories.length) * 100)
    : 0;

  const featuresByStatus = {
    implementing: features?.filter(f => f.status === 'implementing').length || 0,
    done: features?.filter(f => f.status === 'done').length || 0,
    total: features?.length || 0,
    blocked: features?.filter(f => f.blocked).length || 0,
  };

  // Team health score
  const healthScore = Math.round(
    ((completionPct + acceptanceRate + (isOnTrack ? 100 : 50)) / 3)
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Room</h1>
          <p className="text-muted-foreground">Team delivery dashboard with real-time metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/backlog')}>
            <ListTodo className="h-4 w-4 mr-2" />
            Backlog
          </Button>
          <Button onClick={() => navigate('/sprint-board')}>
            <LayoutGrid className="h-4 w-4 mr-2" />
            Sprint Board
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Team" />
          </SelectTrigger>
          <SelectContent>
            {teams?.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSprintId} onValueChange={setSelectedSprintId} disabled={!selectedTeamId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Sprint" />
          </SelectTrigger>
          <SelectContent>
            {sprints?.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id}>
                {sprint.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTeamId && selectedSprintId && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KPIWidgetCard
              title="Sprint Progress"
              value={`${completionPct}%`}
              subtitle={`${completedPoints} / ${totalPoints} points`}
              icon={Target}
            />
            <KPIWidgetCard
              title="Team Health"
              value={`${healthScore}%`}
              subtitle={healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : "At Risk"}
              icon={Activity}
            />
            <KPIWidgetCard
              title="Avg Velocity"
              value={avgVelocity}
              subtitle={`${velocityTrend > 0 ? "+" : ""}${velocityTrend} pts trend`}
              icon={TrendingUp}
            />
            <KPIWidgetCard
              title="Acceptance Rate"
              value={`${acceptanceRate}%`}
              subtitle={`${storiesByStatus.done} of ${stories?.length || 0} done`}
              icon={Target}
            />
            <KPIWidgetCard
              title="Blocked Features"
              value={featuresByStatus.blocked}
              subtitle={featuresByStatus.blocked > 0 ? "Needs attention" : "All clear"}
              icon={AlertTriangle}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sprint Burndown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining Points</span>
                      <span className="font-bold">{remainingPoints}</span>
                    </div>
                    <Progress value={completionPct} className="h-3" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{totalPoints}</div>
                      <div className="text-xs text-muted-foreground">Planned</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-success">{completedPoints}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-warning">{remainingPoints}</div>
                      <div className="text-xs text-muted-foreground">Remaining</div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Sprint Status</span>
                      <Badge className={isOnTrack ? "bg-success" : "bg-warning"}>
                        {isOnTrack ? "On Track" : "At Risk"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Day {sprintDaysElapsed} of {sprintTotalDays} • {Math.round((sprintDaysElapsed / sprintTotalDays) * 100)}% elapsed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Velocity Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historicalSprints?.map((sprint, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{sprint.name}</span>
                        <span className="text-muted-foreground">{sprint.velocity} pts</span>
                      </div>
                      <Progress 
                        value={(sprint.velocity / Math.max(...historicalSprints.map(s => s.velocity))) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Average Velocity</span>
                      <span className="text-2xl font-bold">{avgVelocity} pts</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Story Acceptance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-4xl font-bold text-success">{storiesByStatus.done}</div>
                  <div className="text-sm text-muted-foreground mt-2">Done</div>
                  <Progress value={(storiesByStatus.done / (stories?.length || 1)) * 100} className="mt-3" />
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-4xl font-bold text-primary">{storiesByStatus.in_progress}</div>
                  <div className="text-sm text-muted-foreground mt-2">In Progress</div>
                  <Progress value={(storiesByStatus.in_progress / (stories?.length || 1)) * 100} className="mt-3" />
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-4xl font-bold text-muted-foreground">{storiesByStatus.todo}</div>
                  <div className="text-sm text-muted-foreground mt-2">To Do</div>
                  <Progress value={(storiesByStatus.todo / (stories?.length || 1)) * 100} className="mt-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Features by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {features?.slice(0, 8).map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{feature.name}</div>
                        {feature.blocked && (
                          <Badge variant="destructive" className="text-xs">Blocked</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {feature.estimate_points} points • {feature.progress_pct}% complete
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {feature.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}