import { Team } from '@/types/team.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Clock, BarChart3, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface KanbanTeamRoomProps {
  team: Team;
}

export function KanbanTeamRoom({ team }: KanbanTeamRoomProps) {
  // Mock data - will be replaced with actual data
  const metrics = {
    throughput: team.kanban_throughput || 12,
    cycleTime: 4.2,
    wip: 8,
    wipLimit: team.kanban_wip_limit || 10,
    leadTime: 6.5,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Kanban Flow Metrics</h2>
          <p className="text-sm text-muted-foreground">Continuous delivery performance</p>
        </div>
        <Button>View Board</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Throughput
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metrics.throughput}</div>
            <p className="text-xs text-muted-foreground mt-1">items per week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Cycle Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metrics.cycleTime}</div>
            <p className="text-xs text-muted-foreground mt-1">days average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Work in Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{metrics.wip}</span>
              <span className="text-lg text-muted-foreground">/ {metrics.wipLimit}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.wip <= metrics.wipLimit ? (
                <span className="text-green-600">Within limit</span>
              ) : (
                <span className="text-red-600">Over limit</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Lead Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metrics.leadTime}</div>
            <p className="text-xs text-muted-foreground mt-1">days average</p>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cumulative Flow Diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Cumulative flow diagram coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Throughput Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Throughput Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Throughput trend chart coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cycle Time Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Cycle time distribution coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Settings */}
      {team.kanban_auto_populate_estimate && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Auto-populate Estimate Enabled</Badge>
              <p className="text-sm text-muted-foreground">
                Story estimates are automatically populated based on team patterns
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
