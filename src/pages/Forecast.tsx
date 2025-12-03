import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings, Filter, ArrowUpDown, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ForecastGrid } from '@/components/forecast/ForecastGrid';
import { ForecastFiltersDialog } from '@/components/forecast/ForecastFiltersDialog';
import { ForecastColumnsDialog } from '@/components/forecast/ForecastColumnsDialog';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export default function Forecast() {
  const { portfolioId } = useParams();
  const [searchParams] = useSearchParams();
  const piParam = searchParams.get('pi');
  
  const queryClient = useQueryClient();
  const [viewLevel, setViewLevel] = useState<'team' | 'program'>('program');
  const [workItemLevel, setWorkItemLevel] = useState<'epics' | 'features'>('epics');
  const [estimateUnit, setEstimateUnit] = useState<'points' | 'team_weeks' | 'member_weeks'>('points');
  const [selectedPIs, setSelectedPIs] = useState<string[]>(piParam ? [piParam] : []);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [expandedPIs, setExpandedPIs] = useState<Set<string>>(new Set());
  const [piSelectorOpen, setPiSelectorOpen] = useState(false);

  // Feature flags
  const weeksUnitEnabled = useFeatureFlag('forecast_weeks_unit');
  const exportEnabled = useFeatureFlag('forecast_export');

  // Fetch program increments
  const { data: pis = [] } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch forecast data based on selected filters
  const { data: forecastData, isLoading } = useQuery({
    queryKey: ['forecast-data', selectedPIs, viewLevel, workItemLevel],
    queryFn: async () => {
      // TODO (needs confirmation): Exact API structure for forecast grid data
      // For now, returning mock structure based on screenshots
      return {
        workItems: [],
        capacities: [],
        forecasts: [],
      };
    },
    enabled: selectedPIs.length > 0,
  });

  const togglePI = (piId: string) => {
    setExpandedPIs(prev => {
      const next = new Set(prev);
      if (next.has(piId)) {
        next.delete(piId);
      } else {
        next.add(piId);
      }
      return next;
    });
  };

  const togglePISelection = (piId: string) => {
    setSelectedPIs(prev => 
      prev.includes(piId) 
        ? prev.filter(id => id !== piId)
        : [...prev, piId]
    );
  };

  const applyPISelection = () => {
    setPiSelectorOpen(false);
    // Expand all selected PIs by default
    setExpandedPIs(new Set(selectedPIs));
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Forecast</h1>
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 sm:h-9 text-xs sm:text-sm"
            onClick={() => setPiSelectorOpen(!piSelectorOpen)}
          >
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Select PIs ({selectedPIs.length})</span>
            <span className="sm:hidden ml-1">PIs ({selectedPIs.length})</span>
          </Button>
        </div>
        
        {/* Filters Bar */}
        <div className="px-3 sm:px-6 py-2 sm:py-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* View Level Filter */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">View:</span>
              <Select value={viewLevel} onValueChange={(val) => setViewLevel(val as 'team' | 'program')}>
                <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="program">Program</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Work Item Level Filter */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">Level:</span>
              <Select value={workItemLevel} onValueChange={(val) => setWorkItemLevel(val as any)}>
                <SelectTrigger className="w-24 sm:w-40 h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="epics">Epics</SelectItem>
                  <SelectItem value="features">Features</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={() => setFiltersOpen(true)}>
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={() => setColumnsOpen(true)}>
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Columns</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={() => {
              toast.info('Apply Backlog Rank resets ordering based on program/portfolio/global rank');
            }}>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Apply Backlog Rank
            </Button>
            
            {/* Estimate Unit Selector - Feature Flagged */}
            {weeksUnitEnabled && (
              <Select value={estimateUnit} onValueChange={(value: any) => setEstimateUnit(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Points</SelectItem>
                  <SelectItem value="team_weeks">Team Weeks</SelectItem>
                  <SelectItem value="member_weeks">Member Weeks</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {/* Export Button - Feature Flagged */}
            {exportEnabled && (
              <Button variant="outline" size="sm" onClick={() => {
                toast.info('CSV export functionality coming soon');
              }}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* PI Selector Panel */}
      {piSelectorOpen && (
        <div className="border-b bg-card">
          <Card className="m-4">
            <div className="p-4 space-y-4">
              <h3 className="font-semibold">Select Program Increments</h3>
              <div className="grid grid-cols-2 gap-4">
                {pis.map(pi => (
                  <div key={pi.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={pi.id}
                      checked={selectedPIs.includes(pi.id)}
                      onCheckedChange={() => togglePISelection(pi.id)}
                    />
                    <label
                      htmlFor={pi.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {pi.name} ({new Date(pi.start_date).toLocaleDateString()} - {new Date(pi.end_date).toLocaleDateString()})
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedPIs([])}>Clear</Button>
                <Button onClick={applyPISelection}>Apply</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {selectedPIs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">Select one or more Program Increments to view forecast</p>
              <p className="text-sm text-muted-foreground">Use the "Select PIs" button above</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {selectedPIs.map(piId => {
              const pi = pis.find(p => p.id === piId);
              if (!pi) return null;
              
              const isExpanded = expandedPIs.has(piId);
              
              return (
                <Collapsible
                  key={piId}
                  open={isExpanded}
                  onOpenChange={() => togglePI(piId)}
                >
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          <h3 className="text-lg font-semibold">{pi.name}</h3>
                          <span className="text-sm text-muted-foreground">
                            {new Date(pi.start_date).toLocaleDateString()} - {new Date(pi.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {/* TODO: Show PI-level capacity summary */}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="border-t">
                        <ForecastGrid
                          piId={piId}
                          viewLevel={viewLevel}
                          workItemLevel={workItemLevel}
                        />
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ForecastFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
      />
      
      <ForecastColumnsDialog
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
      />
    </div>
  );
}
