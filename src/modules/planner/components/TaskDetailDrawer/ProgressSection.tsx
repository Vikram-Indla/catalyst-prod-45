// ============================================================
// PROGRESS SECTION - LINEAR-INSPIRED
// Horizontal progress bar with percentage and update button
// ============================================================

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface ProgressSectionProps {
  task: any;
  onUpdate: (updates: { progress: number }) => void;
}

export function ProgressSection({ task, onUpdate }: ProgressSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localProgress, setLocalProgress] = useState(task.progress || 0);
  
  const progress = task.progress || 0;
  const workstreamName = task.workstream?.name || '';
  const wsColors = getWorkstreamColor(workstreamName);

  const handleSave = () => {
    onUpdate({ progress: localProgress });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalProgress(progress);
    setIsEditing(false);
  };

  const getProgressColor = (value: number) => {
    if (value >= 100) return '#10b981'; // emerald
    if (value >= 75) return '#10b981'; // emerald
    if (value >= 40) return wsColors.hex; // workstream color
    return '#f59e0b'; // amber
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Progress
        </span>
        <span 
          className={cn(
            "text-sm font-bold",
            progress >= 75 ? 'text-emerald-600' :
            progress >= 40 ? 'text-foreground' : 'text-amber-600'
          )}
        >
          {progress}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${progress}%`,
            backgroundColor: getProgressColor(progress)
          }}
        />
      </div>

      {/* Edit Mode */}
      {isEditing ? (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <Slider
            value={[localProgress]}
            onValueChange={(vals) => setLocalProgress(vals[0])}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{localProgress}%</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Update Progress
        </button>
      )}
    </div>
  );
}
