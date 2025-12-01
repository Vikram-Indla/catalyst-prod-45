import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

export default function ProgramForecast() {
  const { programId } = useParams();
  const [viewLevel, setViewLevel] = useState<'team' | 'program'>('team');
  const [workItemLevel, setWorkItemLevel] = useState<'epics' | 'features'>('epics');
  const [selectedPIs, setSelectedPIs] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [expandedPIs, setExpandedPIs] = useState<Set<string>>(new Set());
  const [piSelectorOpen, setPiSelectorOpen] = useState(false);

  // Fetch program details
  const { data: program } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

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
    setExpandedPIs(new Set(selectedPIs));
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Program Forecast</h1>
            {program && <p className="text-sm text-muted-foreground mt-1">{program.name}</p>}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPiSelectorOpen(!piSelectorOpen)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Select PIs ({selectedPIs.length})
          </Button>
        </div>
        
        {/* Filters Bar */}
        <div className="px-6 py-3 border-t flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">View:</span>
              <Select value={viewLevel} onValueChange={(val) => setViewLevel(val as 'team' | 'program')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="program">Program</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Level:</span>
              <Select value={workItemLevel} onValueChange={(val) => setWorkItemLevel(val as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="epics">Epics</SelectItem>
                  <SelectItem value="features">Features</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm" onClick={() => setColumnsOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Columns
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info('Apply Backlog Rank')}>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Apply Rank
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info('Export CSV')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
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
                    <label htmlFor={pi.id} className="text-sm font-medium cursor-pointer">
                      {pi.name}
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
              <p className="text-lg text-muted-foreground mb-4">Select Program Increments to view forecast</p>
              <p className="text-sm text-muted-foreground">Use "Select PIs" button above</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {selectedPIs.map(piId => {
              const pi = pis.find(p => p.id === piId);
              if (!pi) return null;
              
              return (
                <Collapsible
                  key={piId}
                  open={expandedPIs.has(piId)}
                  onOpenChange={() => togglePI(piId)}
                >
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <ChevronDown className={`h-5 w-5 transition-transform ${expandedPIs.has(piId) ? '' : '-rotate-90'}`} />
                          <h3 className="text-lg font-semibold">{pi.name}</h3>
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

      <ForecastFiltersDialog open={filtersOpen} onOpenChange={setFiltersOpen} />
      <ForecastColumnsDialog open={columnsOpen} onOpenChange={setColumnsOpen} />
    </div>
  );
}