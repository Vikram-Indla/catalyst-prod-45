import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  PriorityToExecute,
  PRIORITY_TO_EXECUTE_COLORS, 
  PRIORITY_TO_EXECUTE_LABELS,
  EpicBalancingEpic,
} from '../types';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

interface EpicBalancingLegendProps {
  hiddenDrivers: Set<PriorityToExecute>;
  onToggleDriver: (driver: PriorityToExecute) => void;
  onReset: () => void;
  scoringStats: {
    complete: number;
    incomplete: number;
  };
  epics?: EpicBalancingEpic[];
  onEpicClick?: (epic: EpicBalancingEpic) => void;
}

const PRIORITIES: PriorityToExecute[] = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW'];

// Mock quarters for dropdown
const QUARTERS = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

export function EpicBalancingLegend({ 
  hiddenDrivers, 
  onToggleDriver, 
  onReset,
  scoringStats,
  epics = [],
  onEpicClick,
}: EpicBalancingLegendProps) {
  const [selectedQuarter, setSelectedQuarter] = useState('Q4 2025');

  // Get top 5 epics by technical score
  const top5Epics = [...epics]
    .filter(e => e.technicalScore !== null)
    .sort((a, b) => (b.technicalScore ?? 0) - (a.technicalScore ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top 5 Epics */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 Epics</h3>
        <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
          <SelectTrigger className="w-full mb-3">
            <SelectValue placeholder="Select Quarter" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border z-50">
            {QUARTERS.map(quarter => (
              <SelectItem key={quarter} value={quarter}>
                {quarter}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="space-y-2">
          {top5Epics.length > 0 ? (
            <TooltipProvider>
              {top5Epics.map((epic, index) => (
                <Tooltip key={epic.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onEpicClick?.(epic)}
                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}.</span>
                      <span className="text-sm text-brand-gold font-medium">{epic.key}</span>
                      <span className="text-xs text-muted-foreground truncate flex-1">{epic.name}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p>{epic.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          ) : (
            <p className="text-xs text-muted-foreground px-2">No scored epics</p>
          )}
        </div>
      </div>

      {/* Scoring Summary */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Scoring Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Scored:</span>
            <span className="font-medium text-secondary-green">{scoringStats.complete}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unscored:</span>
            <span className="font-medium text-destructive">{scoringStats.incomplete}</span>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      {hiddenDrivers.size > 0 && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onReset}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Filters
        </Button>
      )}
    </div>
  );
}