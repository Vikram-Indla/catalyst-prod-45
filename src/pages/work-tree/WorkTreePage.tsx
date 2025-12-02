import { useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Maximize2, RotateCcw, Info, AlertCircle } from 'lucide-react';
import { WorkTreeDashboard } from './components/WorkTreeDashboard';
import { WorkTreeHierarchy } from './components/WorkTreeHierarchy';
import { WorkTreeExtraConfigs } from './components/WorkTreeExtraConfigs';
import { WorkTreeLegend } from './components/WorkTreeLegend';
import { useWorkTreeData } from './hooks/useWorkTreeData';

type WorkTreeView = 'top-down' | 'bottom-up' | 'team' | 'strategy' | 'theme-group';

export function WorkTreePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { teamId, programId } = useParams<{ teamId?: string; programId?: string }>();
  
  // Default to 'team' view when accessed from team context
  const defaultView = teamId ? 'team' : 'top-down';
  const view = (searchParams.get('view') || defaultView) as WorkTreeView;
  const [configsOpen, setConfigsOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [narrowToProgram, setNarrowToProgram] = useState(false);

  const { data, isLoading } = useWorkTreeData(view, { teamId, programId });

  const handleViewChange = (newView: string) => {
    setSearchParams({ view: newView });
  };

  const handleReset = () => {
    setNarrowToProgram(false);
    // Reset filters and configs
  };

  const getViewTitle = () => {
    switch (view) {
      case 'top-down': return 'Top-Down View from Epic';
      case 'bottom-up': return 'Bottom-Up View from Story';
      case 'team': return 'Team View';
      case 'strategy': return 'Strategy View';
      case 'theme-group': return 'Theme Group View';
      default: return 'Work Tree';
    }
  };

  const hasDashboard = view === 'top-down' || view === 'bottom-up' || view === 'team';

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-[var(--s4)] sm:px-[var(--s6)] h-14 gap-[var(--s3)]">
          <div className="flex items-center gap-[var(--s3)]">
            <h1 className="text-lg font-semibold">Work Tree</h1>
            <Select value={view} onValueChange={handleViewChange}>
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top-down">Top-Down View from Epic</SelectItem>
                <SelectItem value="bottom-up">Bottom-Up View from Story</SelectItem>
                <SelectItem value="team">Team View</SelectItem>
                <SelectItem value="strategy">Strategy View</SelectItem>
                <SelectItem value="theme-group">Theme Group View</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-[var(--s2)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfigsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLegendOpen(true)}
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s6)] space-y-[var(--s6)]">
        {/* Team View Info Banner */}
        {view === 'team' && teamId && (
          <Alert className="bg-brand-gold/10 dark:bg-brand-gold/5 border-brand-gold/30">
            <AlertCircle className="h-4 w-4 text-brand-gold" />
            <AlertDescription className="text-foreground">
              Team view: Showing your work filtered by selected teams in Configuration bar. This report starts with stories, then builds the hierarchy up.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{getViewTitle()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-[var(--s6)]">
            {/* Dashboard - only for top-down, bottom-up, and team views */}
            {hasDashboard && (
              <WorkTreeDashboard view={view} data={data} isLoading={isLoading} teamId={teamId} />
            )}

            {/* Tree Hierarchy */}
            <WorkTreeHierarchy
              view={view}
              data={data}
              isLoading={isLoading}
              narrowToProgram={narrowToProgram}
            />
          </CardContent>
        </Card>
      </div>

      {/* Extra Configs Drawer */}
      <WorkTreeExtraConfigs
        open={configsOpen}
        onClose={() => setConfigsOpen(false)}
        view={view}
      />

      {/* Legend Dialog */}
      <WorkTreeLegend
        open={legendOpen}
        onClose={() => setLegendOpen(false)}
      />
    </div>
  );
}
