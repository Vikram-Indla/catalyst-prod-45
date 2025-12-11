import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
            top5Epics.map((epic, index) => (
              <button
                key={epic.id}
                onClick={() => onEpicClick?.(epic)}
                className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
              >
                <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}.</span>
                <span className="text-sm text-brand-gold font-medium">{epic.key}</span>
                <span className="text-xs text-muted-foreground truncate flex-1">{epic.name}</span>
              </button>
            ))
          ) : (
            <p className="text-xs text-muted-foreground px-2">No scored epics</p>
          )}
        </div>
      </div>

      {/* Priority to Execute Legend */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Priority to Execute</h3>
        <div className="space-y-2">
          {PRIORITIES.map(priority => (
            <button
              key={priority}
              onClick={() => onToggleDriver(priority)}
              className={cn(
                "flex items-center gap-3 w-full text-left px-2 py-1.5 rounded-md transition-colors",
                "hover:bg-accent/50",
                hiddenDrivers.has(priority) && "opacity-40"
              )}
              aria-pressed={!hiddenDrivers.has(priority)}
            >
              <div 
                className="w-5 h-5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: PRIORITY_TO_EXECUTE_COLORS[priority] }}
              />
              <span className="text-sm text-foreground">
                {PRIORITY_TO_EXECUTE_LABELS[priority]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Scoring Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Complete scoring:</span>
            <span className="font-medium text-secondary-green">{scoringStats.complete}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Missing scores:</span>
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