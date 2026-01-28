// ============================================================
// PROGRESS SECTION - MATCHES REFERENCE SCREENSHOT
// Bar chart icon + Progress label, percentage, slider + input
// ============================================================

import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

interface ProgressSectionProps {
  task: any;
  onUpdate: (updates: { progress: number }) => void;
}

export function ProgressSection({ task, onUpdate }: ProgressSectionProps) {
  const progress = task.progress || 0;
  const [localProgress, setLocalProgress] = useState(progress);
  const [inputValue, setInputValue] = useState(String(progress));

  // Sync with external changes
  useEffect(() => {
    setLocalProgress(progress);
    setInputValue(String(progress));
  }, [progress]);

  const handleSliderChange = (values: number[]) => {
    const newValue = values[0];
    setLocalProgress(newValue);
    setInputValue(String(newValue));
    onUpdate({ progress: newValue });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setLocalProgress(num);
    }
  };

  const handleInputBlur = () => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      onUpdate({ progress: num });
    } else {
      setInputValue(String(localProgress));
    }
  };

  const getProgressColor = (value: number) => {
    if (value >= 75) return 'bg-emerald-500';
    if (value >= 40) return 'bg-amber-500';
    return 'bg-amber-400';
  };

  const getTextColor = (value: number) => {
    if (value === 0) return 'text-red-500';
    if (value >= 75) return 'text-emerald-600';
    return 'text-amber-600';
  };

  return (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Progress</span>
      </div>

      {/* Single Slider with Input (no duplicate progress bar) */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Slider
            value={[localProgress]}
            onValueChange={handleSliderChange}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="w-14 h-8 text-center text-sm font-medium"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
    </div>
  );
}
