import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useExecutionTimer } from '@/hooks/useExecutionTimer';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';

interface EffortTrackerProps {
  executionId: string;
  initialSeconds?: number;
  estimatedMinutes?: number;
  onEffortChange: (minutes: number) => void;
}

export function EffortTracker({
  executionId,
  initialSeconds = 0,
  estimatedMinutes,
  onEffortChange,
}: EffortTrackerProps) {
  const { seconds, isRunning, formattedTime, start, pause, reset } = useExecutionTimer(
    executionId,
    initialSeconds
  );
  const [manualMinutes, setManualMinutes] = useState<string>('');

  const handleManualEntry = (value: string) => {
    setManualMinutes(value);
    const minutes = parseInt(value);
    if (!isNaN(minutes) && minutes >= 0) {
      onEffortChange(minutes);
    }
  };

  const actualMinutes = Math.floor(seconds / 60);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label className="text-sm mb-2 block">Timer</Label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-md font-mono text-lg">
              <Timer className="h-5 w-5 text-muted-foreground" />
              {formattedTime}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={isRunning ? pause : start}
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1">
          <Label className="text-sm mb-2 block">Manual Entry</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Minutes"
              value={manualMinutes}
              onChange={(e) => handleManualEntry(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        </div>
      </div>

      {estimatedMinutes && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Estimated: {estimatedMinutes}m</span>
          <span>|</span>
          <span>Actual: {actualMinutes}m</span>
          {actualMinutes > estimatedMinutes && (
            <span className="text-orange-600">
              ({actualMinutes - estimatedMinutes}m over)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
