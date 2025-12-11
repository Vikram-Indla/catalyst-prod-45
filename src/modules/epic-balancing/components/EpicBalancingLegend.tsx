import { Button } from '@/components/ui/button';
import { 
  PriorityToExecute,
  PRIORITY_TO_EXECUTE_COLORS, 
  PRIORITY_TO_EXECUTE_LABELS,
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
}

const PRIORITIES: PriorityToExecute[] = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW'];

export function EpicBalancingLegend({ 
  hiddenDrivers, 
  onToggleDriver, 
  onReset,
  scoringStats 
}: EpicBalancingLegendProps) {
  return (
    <div className="space-y-6">
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