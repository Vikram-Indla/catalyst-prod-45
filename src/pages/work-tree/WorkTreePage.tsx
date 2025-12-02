import { useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Maximize2, Minimize2, RotateCcw, Info, AlertCircle, Eye } from 'lucide-react';
import { WorkTreeDashboard, METRIC_IDS, MetricId } from './components/WorkTreeDashboard';
import { WorkTreeHierarchy } from './components/WorkTreeHierarchy';
import { WorkTreeExtraConfigs } from './components/WorkTreeExtraConfigs';
import { WorkTreeLegend } from './components/WorkTreeLegend';
import { useWorkTreeData } from './hooks/useWorkTreeData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type WorkTreeView = 'top-down' | 'bottom-up' | 'team' | 'strategy' | 'theme-group';

const METRIC_LABELS: Record<MetricId, string> = {
  epic: 'Epic Progress',
  feature: 'Feature Progress',
  story: 'Story Progress',
  task: 'Task Progress',
};

export function WorkTreePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { teamId, programId } = useParams<{ teamId?: string; programId?: string }>();
  
  // Default to 'team' view when accessed from team context
  const defaultView = teamId ? 'team' : 'top-down';
  const view = (searchParams.get('view') || defaultView) as WorkTreeView;
  const [configsOpen, setConfigsOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [narrowToProgram, setNarrowToProgram] = useState(false);
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);
  const [selectedPIId, setSelectedPIId] = useState<string | undefined>(undefined);
  const [isMaximized, setIsMaximized] = useState(false);

  // Fetch available PIs
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments-for-work-tree'],
    queryFn: async () => {
      const { data } = await supabase
        .from('program_increments')
        .select('id, name, start_date, end_date')
        .order('start_date', { ascending: false });
      return data || [];
    },
  });

  // Determine current/selected PI
  const currentPI = selectedPIId 
    ? programIncrements?.find(pi => pi.id === selectedPIId)
    : programIncrements?.find(pi => {
        const today = new Date().toISOString().split('T')[0];
        return pi.start_date <= today && pi.end_date >= today;
      }) || programIncrements?.[0];

  const { data, isLoading } = useWorkTreeData(view, { teamId, programId });

  const handleViewChange = (newView: string) => {
    setSearchParams({ view: newView });
  };

  const handleReset = () => {
    setNarrowToProgram(false);
    setHiddenCards([]);
    setSelectedPIId(undefined);
  };

  const handleHideCard = (cardId: string) => {
    setHiddenCards(prev => [...prev, cardId]);
  };

  const handleToggleCard = (cardId: string, checked: boolean) => {
    if (checked) {
      setHiddenCards(prev => prev.filter(id => id !== cardId));
    } else {
      setHiddenCards(prev => [...prev, cardId]);
    }
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
    <div className={`flex flex-col bg-background overflow-hidden ${isMaximized ? 'fixed inset-0 z-50' : 'h-full w-full'}`}>
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
            
            {/* PI Selector - Available for all views */}
            {programIncrements && programIncrements.length > 0 && (
              <Select 
                value={selectedPIId || currentPI?.id || ''} 
                onValueChange={setSelectedPIId}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select PI" />
                </SelectTrigger>
                <SelectContent>
                  {programIncrements.map(pi => (
                    <SelectItem key={pi.id} value={pi.id}>
                      {pi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-[var(--s2)]">
            {/* Card Visibility Selector - Available for views with dashboard */}
            {hasDashboard && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Show Progress Cards</h4>
                    {METRIC_IDS.map(id => (
                      <div key={id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`show-${id}`}
                          checked={!hiddenCards.includes(id)}
                          onCheckedChange={(checked) => handleToggleCard(id, !!checked)}
                        />
                        <label
                          htmlFor={`show-${id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {METRIC_LABELS[id]}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
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
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsMaximized(!isMaximized)}
              aria-label={isMaximized ? 'Minimize' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
              <WorkTreeDashboard 
                view={view} 
                data={data} 
                isLoading={isLoading} 
                teamId={teamId}
                currentPI={currentPI}
                hiddenCards={hiddenCards}
                onHideCard={handleHideCard}
              />
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
