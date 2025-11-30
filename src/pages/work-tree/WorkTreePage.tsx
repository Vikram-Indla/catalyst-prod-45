import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Maximize2, RotateCcw, Info } from 'lucide-react';
import { WorkTreeDashboard } from './components/WorkTreeDashboard';
import { WorkTreeHierarchy } from './components/WorkTreeHierarchy';
import { WorkTreeExtraConfigs } from './components/WorkTreeExtraConfigs';
import { WorkTreeLegend } from './components/WorkTreeLegend';
import { useWorkTreeData } from './hooks/useWorkTreeData';

type WorkTreeView = 'top-down' | 'bottom-up' | 'team' | 'strategy' | 'theme-group';

export function WorkTreePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = (searchParams.get('view') || 'top-down') as WorkTreeView;
  const [configsOpen, setConfigsOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [narrowToProgram, setNarrowToProgram] = useState(false);

  const { data, isLoading } = useWorkTreeData(view);

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
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2">
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
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{getViewTitle()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dashboard - only for top-down, bottom-up, and team views */}
            {hasDashboard && (
              <WorkTreeDashboard view={view} data={data} isLoading={isLoading} />
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
