import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Target, Eye, Heart, Flag, Palette, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import type { StrategicTheme, StrategyMission, StrategyVision, StrategyValue, SnapshotStrategyLinks } from '@/types/strategicBacklog';

interface OverviewTabProps {
  missions: StrategyMission[];
  visions: StrategyVision[];
  values: StrategyValue[];
  goals: any[]; // Legacy - kept for backward compatibility
  themes: StrategicTheme[];
  links: SnapshotStrategyLinks | null;
  isArchived: boolean;
  snapshotId?: string;
}

export function OverviewTab({ missions, visions, values, themes, links, isArchived, snapshotId }: OverviewTabProps) {
  const navigate = useNavigate();
  
  // Fetch OKR v2 metrics for objectives
  const { data: okrMetrics, isLoading: metricsLoading } = useOKRv2StrategyMetrics(snapshotId);

  const linkedMissionCount = links?.mission_ids?.length || 0;
  const linkedVisionCount = links?.vision_ids?.length || 0;
  const linkedValueCount = links?.value_ids?.length || 0;
  const linkedThemeCount = themes.length;
  
  // Use OKR v2 objective count
  const linkedObjectiveCount = okrMetrics?.count || 0;

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
      label: 'Objectives', 
      count: linkedObjectiveCount, 
      total: linkedObjectiveCount,
      icon: Flag,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      clickable: true,
      onClick: () => navigate('/enterprise/okr-hub'),
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

  const handleOpenOKRHub = () => {
    navigate('/enterprise/okr-hub');
  };

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
            <Card 
              key={card.label} 
              className={`p-4 border-border ${card.clickable ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''}`}
              onClick={card.onClick}
            >
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
                    {card.clickable && (
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
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

      {/* Quick Stats - OKR v2 Objectives */}
      <Card className="p-6 border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Strategy Overview</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenOKRHub}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            OKR Hub
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Objectives</p>
            <p className="text-xl font-semibold text-foreground mt-1">
              {linkedObjectiveCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Linked to Snapshot</p>
            <p className="text-xl font-semibold text-foreground mt-1">
              {linkedObjectiveCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Objectives by Health</p>
            <div className="flex items-center gap-2 mt-1">
              {metricsLoading ? (
                <span className="text-xs text-muted-foreground">Loading...</span>
              ) : (
                <>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                    {okrMetrics?.byHealth.good || 0}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                    {okrMetrics?.byHealth.fair || 0}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                    {okrMetrics?.byHealth.poor || 0}
                  </span>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Objective Progress</p>
            <p className="text-xl font-semibold text-foreground mt-1">
              {metricsLoading ? '...' : `${okrMetrics?.avgProgress || 0}%`}
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
