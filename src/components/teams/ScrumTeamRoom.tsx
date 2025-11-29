import { useState } from 'react';
import { Team } from '@/types/team.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Target, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ScrumTeamRoomProps {
  team: Team;
}

export function ScrumTeamRoom({ team }: ScrumTeamRoomProps) {
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  // Mock data - will be replaced with actual data
  const sprints = [
    { id: 'sprint-1', name: 'Sprint 23', status: 'active' },
    { id: 'sprint-2', name: 'Sprint 22', status: 'completed' },
  ];

  const metrics = {
    velocity: 45,
    commitment: 52,
    completed: 38,
    inProgress: 8,
    todo: 6,
    burndownTrend: 73,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Sprint Selector */}
      <div className="flex items-center justify-between">
        <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Sprint" />
          </SelectTrigger>
          <SelectContent>
            {sprints.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id}>
                {sprint.name} {sprint.status === 'active' && '(Active)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button>Sprint Planning</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Team Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metrics.velocity}</div>
            <p className="text-xs text-muted-foreground mt-1">story points avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Sprint Commitment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metrics.commitment}</div>
            <p className="text-xs text-muted-foreground mt-1">story points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{metrics.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">story points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Sprint Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metrics.burndownTrend}%</div>
            <p className="text-xs text-success mt-1">On Track</p>
          </CardContent>
        </Card>
      </div>

      {/* Sprint Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sprint Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Overall Progress</span>
                <span className="text-sm font-medium text-foreground">
                  {metrics.completed} / {metrics.commitment} points
                </span>
              </div>
              <Progress value={(metrics.completed / metrics.commitment) * 100} />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{metrics.todo}</div>
                <div className="text-xs text-muted-foreground">To Do</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{metrics.inProgress}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{metrics.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Burndown Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Burndown chart coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Stories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Stories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>No active stories in this sprint</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
