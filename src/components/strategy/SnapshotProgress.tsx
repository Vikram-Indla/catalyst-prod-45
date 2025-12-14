import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SnapshotProgressProps {
  snapshotId?: string;
}

interface StatusCounts {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
}

interface ProgressData {
  themes: StatusCounts;
  epics: StatusCounts;
  features: StatusCounts;
  stories: StatusCounts;
  dependencies: { total: number; resolved: number };
}

// Status mapping helpers
const isNotStarted = (status: string | null) => {
  const s = (status || '').toLowerCase();
  return ['not_started', 'proposed', 'funnel', 'backlog', 'new', ''].includes(s) || !status;
};

const isCompleted = (status: string | null) => {
  const s = (status || '').toLowerCase();
  return ['done', 'completed', 'accepted', 'closed', 'released'].includes(s);
};

const isInProgress = (status: string | null) => {
  return !isNotStarted(status) && !isCompleted(status);
};

export function SnapshotProgress({ snapshotId }: SnapshotProgressProps) {
  const navigate = useNavigate();

  const { data: progressData, isLoading } = useQuery({
    queryKey: ['snapshot-progress-jiraalign', snapshotId],
    queryFn: async (): Promise<ProgressData | null> => {
      if (!snapshotId) return null;

      // Fetch themes tied to this snapshot
      const { data: themes } = await supabase
        .from('strategic_themes')
        .select('status')
        .eq('snapshot_id', snapshotId);

      // Fetch epics (all active)
      const { data: epics } = await supabase
        .from('epics')
        .select('status, state')
        .is('deleted_at', null);

      // Fetch features (all active)
      const { data: features } = await supabase
        .from('features')
        .select('status')
        .is('deleted_at', null);

      // Fetch stories (all active)
      const { data: stories } = await supabase
        .from('stories')
        .select('status, state')
        .is('deleted_at', null);

      // Fetch dependencies
      const { data: dependencies } = await supabase
        .from('dependencies')
        .select('status, delivered_at');

      // Calculate status counts for each type
      const calcCounts = (items: { status?: string | null; state?: string | null }[] | null): StatusCounts => {
        const list = items || [];
        return {
          total: list.length,
          notStarted: list.filter(i => isNotStarted(i.status || i.state)).length,
          inProgress: list.filter(i => isInProgress(i.status || i.state)).length,
          completed: list.filter(i => isCompleted(i.status || i.state)).length,
        };
      };

      const depList = dependencies || [];
      const resolvedDeps = depList.filter(d => 
        d.delivered_at || ['delivered', 'resolved', 'done', 'completed'].includes((d.status || '').toLowerCase())
      ).length;

      return {
        themes: calcCounts(themes),
        epics: calcCounts(epics),
        features: calcCounts(features),
        stories: calcCounts(stories),
        dependencies: { total: depList.length, resolved: resolvedDeps },
      };
    },
    enabled: !!snapshotId,
  });

  // Donut chart component matching Jira Align style
  const DonutDial = ({ 
    label, 
    data, 
    onClick 
  }: { 
    label: string; 
    data: StatusCounts; 
    onClick?: () => void;
  }) => {
    const { total, notStarted, inProgress, completed } = data;
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate segment percentages for the ring
    const notStartedPct = total > 0 ? (notStarted / total) * 100 : 100;
    const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;
    const completedPct = total > 0 ? (completed / total) * 100 : 0;

    // SVG parameters
    const size = 100;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate stroke offsets for each segment
    const completedOffset = 0;
    const inProgressOffset = (completedPct / 100) * circumference;
    const notStartedOffset = ((completedPct + inProgressPct) / 100) * circumference;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="flex flex-col items-center cursor-pointer group"
              onClick={onClick}
            >
              <span className="text-sm font-medium text-secondary-green mb-2 group-hover:text-foreground transition-colors">
                {label}
              </span>
              <div className="relative" style={{ width: size, height: size }}>
                <svg 
                  width={size} 
                  height={size} 
                  className="transform -rotate-90"
                >
                  {/* Background ring (gray for empty/no data) */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth={strokeWidth}
                  />
                  
                  {total > 0 && (
                    <>
                      {/* Not Started segment (secondary-grey) */}
                      {notStartedPct > 0 && (
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="none"
                          stroke="hsl(var(--secondary-grey))"
                          strokeWidth={strokeWidth}
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference - (notStartedPct / 100) * circumference}
                          style={{ transform: `rotate(${(completedPct + inProgressPct) * 3.6}deg)`, transformOrigin: 'center' }}
                        />
                      )}
                      
                      {/* In Progress segment (brand-gold) */}
                      {inProgressPct > 0 && (
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="none"
                          stroke="hsl(var(--brand-gold))"
                          strokeWidth={strokeWidth}
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference - (inProgressPct / 100) * circumference}
                          style={{ transform: `rotate(${completedPct * 3.6}deg)`, transformOrigin: 'center' }}
                        />
                      )}
                      
                      {/* Completed segment (secondary-green) */}
                      {completedPct > 0 && (
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="none"
                          stroke="hsl(var(--secondary-green))"
                          strokeWidth={strokeWidth}
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference - (completedPct / 100) * circumference}
                        />
                      )}
                    </>
                  )}
                </svg>
                
                {/* Center percentage */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-semibold text-muted-foreground">
                    {completedPercent}%
                  </span>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary-green" />
                <span>Completed: {completed} ({completedPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-gold" />
                <span>In Progress: {inProgress} ({inProgressPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary-grey" />
                <span>Not Started: {notStarted} ({notStartedPct.toFixed(0)}%)</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Progress bar row matching Jira Align style
  const ProgressRow = ({ 
    label, 
    accepted, 
    total, 
    onClick 
  }: { 
    label: string; 
    accepted: number; 
    total: number; 
    onClick?: () => void;
  }) => {
    const percent = total > 0 ? (accepted / total) * 100 : 0;
    
    return (
      <div 
        className="flex items-center gap-4 py-3 cursor-pointer hover:bg-muted/30 px-2 -mx-2 rounded transition-colors"
        onClick={onClick}
      >
        <span className="text-sm text-secondary-green min-w-[100px] hover:text-foreground hover:underline">
          {label}
        </span>
        <span className="text-sm text-brand-gold min-w-[60px] text-right font-medium">
          {accepted}/{total}
        </span>
        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-secondary-green rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  // Navigation handlers
  const handleThemesClick = () => navigate('/enterprise/strategic-backlog?tab=themes');
  const handleEpicsClick = () => navigate('/items/epics');
  const handleFeaturesClick = () => navigate('/items/features');
  const handleStoriesClick = () => navigate('/items/stories');
  const handleDependenciesClick = () => navigate('/dependencies');

  return (
    <Card 
      style={{ 
        borderLeft: '3px solid var(--accent-color)',
        backgroundColor: 'var(--surface-2)',
      }}
    >
      <CardHeader className="pb-4" style={{ backgroundColor: 'var(--surface-3)', borderRadius: '8px 8px 0 0' }}>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base flex items-center gap-2" style={{ color: 'var(--text-1)' }}>Snapshot Progress</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-brand-gold transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm">
                  Shows progress of work items tied to the strategic snapshot. 
                  Dials show completion status breakdown. 
                  Click any item type to manage in its grid.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Loading progress data...
          </div>
        ) : !progressData ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Select a snapshot to view progress
          </div>
        ) : (
          <>
            {/* Four Donut Dials - Themes, Epics, Features (no Capabilities) */}
            <div className="grid grid-cols-3 gap-4 justify-items-center pb-4 border-b">
              <DonutDial 
                label="Themes" 
                data={progressData.themes} 
                onClick={handleThemesClick}
              />
              <DonutDial 
                label="Epics" 
                data={progressData.epics} 
                onClick={handleEpicsClick}
              />
              <DonutDial 
                label="Features" 
                data={progressData.features} 
                onClick={handleFeaturesClick}
              />
            </div>

            {/* Progress Bars - Themes, Epics, Features, Stories, Dependencies */}
            <div className="space-y-1">
              <ProgressRow 
                label="Themes" 
                accepted={progressData.themes.completed} 
                total={progressData.themes.total}
                onClick={handleThemesClick}
              />
              <ProgressRow 
                label="Epics" 
                accepted={progressData.epics.completed} 
                total={progressData.epics.total}
                onClick={handleEpicsClick}
              />
              <ProgressRow 
                label="Features" 
                accepted={progressData.features.completed} 
                total={progressData.features.total}
                onClick={handleFeaturesClick}
              />
              <ProgressRow 
                label="Stories" 
                accepted={progressData.stories.completed} 
                total={progressData.stories.total}
                onClick={handleStoriesClick}
              />
              <ProgressRow 
                label="Dependencies" 
                accepted={progressData.dependencies.resolved} 
                total={progressData.dependencies.total}
                onClick={handleDependenciesClick}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
