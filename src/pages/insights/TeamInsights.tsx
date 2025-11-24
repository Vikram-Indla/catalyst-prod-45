import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KPIWidgetCard } from '@/components/shared/KPIWidgetCard';
import { Target, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export default function TeamInsights() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: stories } = useQuery({
    queryKey: ['team-stories', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('team_id', selectedTeamId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTeamId,
  });

  const { data: sprints } = useQuery({
    queryKey: ['team-sprints', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .eq('team_id', selectedTeamId)
        .order('start_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTeamId,
  });

  const getStoryMetrics = () => {
    const total = stories?.length || 0;
    const done = stories?.filter(s => s.status === 'done').length || 0;
    const inProgress = stories?.filter(s => s.status === 'in_progress').length || 0;
    const totalPoints = stories?.reduce((sum, s) => sum + (s.estimate_points || 0), 0) || 0;
    const completedPoints = stories
      ?.filter(s => s.status === 'done')
      .reduce((sum, s) => sum + (s.estimate_points || 0), 0) || 0;
    
    return { total, done, inProgress, totalPoints, completedPoints };
  };

  const metrics = getStoryMetrics();
  const selectedTeam = teams?.find(t => t.id === selectedTeamId);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Insights</h1>
        <p className="text-muted-foreground">Team-level delivery metrics and trends</p>
      </div>

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

      {selectedTeamId && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <KPIWidgetCard
              title="Total Stories"
              value={metrics.total}
              subtitle={`${metrics.done} completed`}
              icon={Target}
            />
            <KPIWidgetCard
              title="In Progress"
              value={metrics.inProgress}
              subtitle="Active work items"
              icon={Clock}
            />
            <KPIWidgetCard
              title="Completed Points"
              value={metrics.completedPoints}
              subtitle={`of ${metrics.totalPoints} total`}
              icon={CheckCircle}
            />
            <KPIWidgetCard
              title="Team Velocity"
              value={selectedTeam?.velocity_baseline || 0}
              subtitle="Points per sprint"
              icon={TrendingUp}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Story Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['todo', 'in_progress', 'done'].map((status) => {
                    const count = stories?.filter(s => s.status === status).length || 0;
                    const percentage = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                          <span className="text-sm font-medium">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Points Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">{metrics.completedPoints}</div>
                    <div className="text-sm text-muted-foreground">Points Completed</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">
                        {metrics.totalPoints > 0 
                          ? `${Math.round((metrics.completedPoints / metrics.totalPoints) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-success h-3 rounded-full transition-all"
                        style={{ 
                          width: `${metrics.totalPoints > 0 
                            ? (metrics.completedPoints / metrics.totalPoints) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-2xl font-bold">{metrics.totalPoints}</div>
                      <div className="text-xs text-muted-foreground">Total Points</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{selectedTeam?.velocity_baseline || 0}</div>
                      <div className="text-xs text-muted-foreground">Baseline Velocity</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Sprints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sprints?.map((sprint) => (
                  <div key={sprint.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{sprint.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {sprint.start_date} - {sprint.end_date}
                      </div>
                    </div>
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
