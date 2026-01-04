/**
 * Time-lapse Player - Playback controls for monthly animation
 * Catalyst V5 compliant
 */

import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useHeatmapStore } from '@/stores/capacity-heatmap-store';
import { formatMonth } from '@/lib/capacity-heatmap/utils';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';

interface TimeLapsePlayerProps {
  months: Date[];
  className?: string;
}

export const TimeLapsePlayer = memo(function TimeLapsePlayer({
  months,
  className
}: TimeLapsePlayerProps) {
  const {
    isTimeLapsePlaying,
    startTimeLapse,
    stopTimeLapse,
    timeLapseMonth,
    setTimeLapseMonth,
    timeLapseSpeed,
    setTimeLapseSpeed,
  } = useHeatmapStore();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-play effect
  useEffect(() => {
    if (isTimeLapsePlaying) {
      intervalRef.current = setInterval(() => {
        setTimeLapseMonth((timeLapseMonth + 1) % months.length);
      }, timeLapseSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTimeLapsePlaying, timeLapseMonth, timeLapseSpeed, months.length, setTimeLapseMonth]);
  
  const handlePrevious = () => {
    setTimeLapseMonth(timeLapseMonth === 0 ? months.length - 1 : timeLapseMonth - 1);
  };
  
  const handleNext = () => {
    setTimeLapseMonth((timeLapseMonth + 1) % months.length);
  };
  
  const handleReset = () => {
    stopTimeLapse();
    setTimeLapseMonth(0);
  };
  
  const currentMonth = months[timeLapseMonth];
  
  return (
    <motion.div
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg",
        "bg-card border border-border",
        isTimeLapsePlaying && "ring-2 ring-primary",
        className
      )}
      style={isTimeLapsePlaying ? { 
        backgroundColor: `${CATALYST_COLORS.primary}05`
      } : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleReset}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handlePrevious}
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-10 w-10",
            isTimeLapsePlaying && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={isTimeLapsePlaying ? stopTimeLapse : startTimeLapse}
        >
          {isTimeLapsePlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleNext}
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Current month display */}
      <div className="min-w-[100px] text-center">
        <motion.div
          key={timeLapseMonth}
          className="text-lg font-semibold"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {currentMonth ? formatMonth(currentMonth, 'long') : ''}
        </motion.div>
        <div className="text-xs text-muted-foreground">
          {timeLapseMonth + 1} of {months.length}
        </div>
      </div>
      
      {/* Timeline slider */}
      <div className="flex-1 px-2">
        <Slider
          value={[timeLapseMonth]}
          min={0}
          max={months.length - 1}
          step={1}
          onValueChange={([value]) => setTimeLapseMonth(value)}
          className="w-full"
        />
        <div className="flex justify-between mt-1">
          {months.filter((_, i) => i % 3 === 0).map((month, i) => (
            <span key={i} className="text-[10px] text-muted-foreground">
              {formatMonth(month)}
            </span>
          ))}
        </div>
      </div>
      
      {/* Speed control */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Speed:</span>
        <select
          value={timeLapseSpeed}
          onChange={(e) => setTimeLapseSpeed(Number(e.target.value))}
          className="h-8 px-2 text-xs rounded border border-border bg-background"
        >
          <option value={2000}>0.5x</option>
          <option value={1000}>1x</option>
          <option value={500}>2x</option>
          <option value={250}>4x</option>
        </select>
      </div>
    </motion.div>
  );
});
