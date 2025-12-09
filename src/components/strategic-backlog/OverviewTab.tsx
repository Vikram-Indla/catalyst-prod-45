import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Target, Eye, Heart, Flag, Palette } from 'lucide-react';
import type { StrategicTheme, StrategicGoal, StrategyMission, StrategyVision, StrategyValue, SnapshotStrategyLinks } from '@/types/strategicBacklog';

interface OverviewTabProps {
  missions: StrategyMission[];
  visions: StrategyVision[];
  values: StrategyValue[];
  goals: StrategicGoal[];
  themes: StrategicTheme[];
  links: SnapshotStrategyLinks | null;
  isArchived: boolean;
}

export function OverviewTab({ missions, visions, values, goals, themes, links, isArchived }: OverviewTabProps) {
  const linkedMissionCount = links?.mission_ids?.length || 0;
  const linkedVisionCount = links?.vision_ids?.length || 0;
  const linkedValueCount = links?.value_ids?.length || 0;
  const linkedGoalCount = links?.goal_ids?.length || 0;
  const linkedThemeCount = themes.length;

  const summaryCards = [
    { 
      label: 'Missions', 
      count: linkedMissionCount, 
      total: missions.length,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    { 
      label: 'Visions', 
      count: linkedVisionCount, 
      total: visions.length,
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    { 
      label: 'Values', 
      count: linkedValueCount, 
      total: values.length,
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    { 
      label: 'Goals', 
      count: linkedGoalCount, 
      total: goals.length,
      icon: Flag,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    { 
      label: 'Themes', 
      count: linkedThemeCount, 
      total: linkedThemeCount,
      icon: Palette,
      color: 'text-brand-gold',
      bgColor: 'bg-brand-gold/10',
      required: true,
    },
  ];

  const showThemeWarning = linkedThemeCount === 0 && !isArchived;

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      {showThemeWarning && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Theme Required for Activation</p>
            <p className="text-sm text-amber-700 mt-1">
              This snapshot cannot be activated until at least 1 Theme is linked. Go to the Themes tab to create or link a theme.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4 border-border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-semibold text-foreground">{card.count}</span>
                    {card.required && card.count === 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {card.label} linked
                    {card.total > card.count && ` (${card.total} available)`}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card className="p-6 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">Strategy Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Objects</p>
            <p className="text-xl font-semibold text-foreground mt-1">
              {missions.length + visions.length + values.length + goals.length + themes.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Linked to Snapshot</p>
            <p className="text-xl font-semibold text-foreground mt-1">
              {linkedMissionCount + linkedVisionCount + linkedValueCount + linkedGoalCount + linkedThemeCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Goals by Health</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                {goals.filter(g => g.health_status === 'GREEN').length}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                {goals.filter(g => g.health_status === 'AMBER').length}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                {goals.filter(g => g.health_status === 'RED').length}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Goal Progress</p>
            <p className="text-xl font-semibold text-foreground mt-1">
              {goals.length > 0 
                ? Math.round(goals.reduce((sum, g) => sum + (g.complete_percent || 0), 0) / goals.length)
                : 0}%
            </p>
          </div>
        </div>
      </Card>

      {/* Read-only notice */}
      {isArchived && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            This snapshot is archived. All content is read-only.
          </p>
        </div>
      )}
    </div>
  );
}
