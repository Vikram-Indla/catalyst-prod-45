import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { KPIWidgetCard } from '@/components/shared/KPIWidgetCard';
import { LayoutGrid, ListTodo, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
        .eq('sprint_id', selectedSprintId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSprintId,
  });

  const { data: features } = useQuery({
    queryKey: ['team-features', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data: teamStories } = await supabase
        .from('stories')
        .select('feature_id')
        .eq('team_id', selectedTeamId);
      
      if (!teamStories || teamStories.length === 0) return [];
      
      const featureIds = [...new Set(teamStories.map(s => s.feature_id))];
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .in('id', featureIds);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTeamId,
  });

  const storiesByStatus = {
    todo: stories?.filter(s => s.status === 'todo').length || 0,
    in_progress: stories?.filter(s => s.status === 'in_progress').length || 0,
    done: stories?.filter(s => s.status === 'done').length || 0,
  };

  const totalPoints = stories?.reduce((sum, s) => sum + (s.estimate_points || 0), 0) || 0;
  const completedPoints = stories
    ?.filter(s => s.status === 'done')
    .reduce((sum, s) => sum + (s.estimate_points || 0), 0) || 0;
  const completionPct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  const featuresByStatus = {
    implementing: features?.filter(f => f.status === 'implementing').length || 0,
    done: features?.filter(f => f.status === 'done').length || 0,
    total: features?.length || 0,
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Room</h1>
          <p className="text-muted-foreground">Team delivery dashboard</p>
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
          <div className="grid grid-cols-4 gap-4">
            <KPIWidgetCard
              title="Sprint Completion"
              value={`${completionPct}%`}
              subtitle={`${completedPoints} / ${totalPoints} points`}
              icon={Target}
            />
            <KPIWidgetCard
              title="Stories In Progress"
              value={storiesByStatus.in_progress}
              subtitle={`${storiesByStatus.done} done, ${storiesByStatus.todo} todo`}
              icon={TrendingUp}
            />
            <KPIWidgetCard
              title="Features Implementing"
              value={featuresByStatus.implementing}
              subtitle={`${featuresByStatus.done} done of ${featuresByStatus.total}`}
              icon={LayoutGrid}
            />
            <KPIWidgetCard
              title="Team Velocity"
              value={teams?.find(t => t.id === selectedTeamId)?.velocity_baseline || 0}
              subtitle="Points per sprint"
              icon={TrendingUp}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sprint Burndown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chart: Remaining points over sprint days
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Story Acceptance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chart: Stories completed per day
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {features?.slice(0, 5).map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{feature.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {feature.estimate_points} points • {feature.progress_pct}% complete
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">{feature.status}</div>
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
