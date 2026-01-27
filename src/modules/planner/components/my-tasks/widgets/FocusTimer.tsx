// ============================================================
// FOCUS TIMER WIDGET
// Planner V9: Pomodoro-style focus timer for productivity
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Play, Pause, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FocusTimerProps {
  className?: string;
  onSessionComplete?: () => void;
}

const DEFAULT_DURATION = 25 * 60; // 25 minutes in seconds

export function FocusTimer({ className, onSessionComplete }: FocusTimerProps) {
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionLabel, setSessionLabel] = useState('Deep Work Session');

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle timer countdown
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          toast.success('Focus session complete! Great work! 🎉');
          onSessionComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onSessionComplete]);

  const handlePlayPause = () => {
    if (timeLeft === 0) {
      setTimeLeft(DEFAULT_DURATION);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(DEFAULT_DURATION);
  };

  const handleSkip = () => {
    setIsRunning(false);
    setTimeLeft(0);
    toast.info('Session skipped');
  };

  const progress = ((DEFAULT_DURATION - timeLeft) / DEFAULT_DURATION) * 100;

  return (
    <div className={cn('rounded-xl p-4', className)} style={{ 
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    }}>
      {/* Header */}
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 text-center">
        Focus Timer
      </h3>

      {/* Timer Display */}
      <div className="relative flex items-center justify-center mb-3">
        {/* Progress Ring Background */}
        <svg className="absolute w-32 h-32 -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="58"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
          />
          <circle
            cx="64"
            cy="64"
            r="58"
            fill="none"
            stroke="#f97316"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 58}`}
            strokeDashoffset={`${2 * Math.PI * 58 * (1 - progress / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>
        
        {/* Time Text */}
        <span className="text-4xl font-bold text-white font-mono tracking-wider">
          {formatTime(timeLeft)}
        </span>
      </div>

      {/* Session Label */}
      <p className="text-xs text-slate-400 text-center mb-4">
        {sessionLabel}
      </p>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlayPause}
          className={cn(
            'h-12 w-12 rounded-full text-white',
            isRunning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
          )}
        >
          {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkip}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
