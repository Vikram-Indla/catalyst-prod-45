import { Button } from '@/components/ui/button';
import { 
  StrategicDriver,
  STRATEGIC_DRIVER_COLORS, 
  STRATEGIC_DRIVER_LABELS,
  AbilityToExecute,
  ABILITY_TO_EXECUTE_STROKE
} from '../types';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

interface EpicBalancingLegendProps {
  hiddenDrivers: Set<StrategicDriver>;
  onToggleDriver: (driver: StrategicDriver) => void;
  onReset: () => void;
  scoringStats: {
    complete: number;
    incomplete: number;
  };
}

const DRIVERS: StrategicDriver[] = [
  'EXPAND', 'SUSTAIN', 'INNOVATE', 'CONTAIN', 'EXIT', 'UNKNOWN', 'NOT_SET'
];

const ABILITIES: AbilityToExecute[] = ['HIGH', 'MEDIUM', 'LOW'];

export function EpicBalancingLegend({ 
  hiddenDrivers, 
  onToggleDriver, 
  onReset,
  scoringStats 
}: EpicBalancingLegendProps) {
  return (
    <div className="space-y-6">
      {/* Strategic Driver Legend */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Strategic Driver</h3>
        <div className="space-y-2">
          {DRIVERS.map(driver => (
            <button
              key={driver}
              onClick={() => onToggleDriver(driver)}
              className={cn(
                "flex items-center gap-3 w-full text-left px-2 py-1.5 rounded-md transition-colors",
                "hover:bg-accent/50",
                hiddenDrivers.has(driver) && "opacity-40"
              )}
              aria-pressed={!hiddenDrivers.has(driver)}
            >
              <div 
                className="w-5 h-5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: STRATEGIC_DRIVER_COLORS[driver] }}
              />
              <span className="text-sm text-foreground">
                {STRATEGIC_DRIVER_LABELS[driver]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Ability to Execute Legend */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Ability to Execute</h3>
        <div className="space-y-3">
          {ABILITIES.map(ability => (
            <div key={ability} className="flex items-center gap-3 px-2">
              <div 
                className="w-8 h-8 rounded-full border-2 flex-shrink-0 bg-transparent"
                style={{ 
                  borderWidth: ABILITY_TO_EXECUTE_STROKE[ability] * 2,
                  borderColor: 'hsl(var(--foreground))'
                }}
              />
              <span className="text-sm text-foreground">{ability}</span>
            </div>
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
