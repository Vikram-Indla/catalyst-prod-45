/**
 * Execution Header - Command bar with cycle info, progress, timer, navigation
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import type { TestCycle, TestRun } from '../../../api/types';

interface ExecutionHeaderProps {
  cycle?: TestCycle | null;
  currentIndex: number;
  totalCases: number;
  timer: {
    formattedTime: string;
    isRunning: boolean;
    toggleTimer: () => void;
  };
  run?: TestRun | null;
  onBack: () => void;
  onPreviousCase: () => void;
  onNextCase: () => void;
  onCompleteRun: () => void;
  isUpdating: boolean;
}

export function ExecutionHeader({
  cycle,
  currentIndex,
  totalCases,
  timer,
  run,
  onBack,
  onPreviousCase,
  onNextCase,
  onCompleteRun,
  isUpdating,
}: ExecutionHeaderProps) {
  // Calculate progress
  const completedCases = cycle?.statistics?.passed_count ?? 0;
  const failedCases = cycle?.statistics?.failed_count ?? 0;
  const blockedCases = cycle?.statistics?.blocked_count ?? 0;
  const totalDone = completedCases + failedCases + blockedCases;
  const progressPercentage = totalCases > 0 ? Math.round((totalDone / totalCases) * 100) : 0;
  
  // SVG progress ring calculations
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-gradient-to-b from-background to-muted/30 border-b flex-shrink-0 animate-fade-in">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Cycle Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl">
          <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-br from-primary to-primary/80 rounded-lg">
            <RefreshCw className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-primary font-mono">
              {cycle?.cycle_key || 'CYC-000'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {cycle?.title || 'Loading...'}
            </span>
          </div>
        </div>

        <Separator orientation="vertical" className="h-7" />

        {/* Progress Block */}
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border rounded-xl">
          {/* Progress Ring */}
          <div className="relative w-9 h-9">
            <svg className="w-9 h-9 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r={radius}
                fill="none"
                strokeWidth="3"
                className="stroke-muted-foreground/20"
              />
              <circle
                cx="18"
                cy="18"
                r={radius}
                fill="none"
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="stroke-teal-500 transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-teal-600">
              {progressPercentage}%
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">Cycle Progress</span>
            <span className="text-[13px] font-semibold">
              {totalDone} / {totalCases} cases
            </span>
          </div>
        </div>
      </div>

      {/* Center Section */}
      <div className="flex items-center gap-4">
        {/* Timer Block */}
        <div className={cn(
          "flex items-center gap-2.5 px-3.5 py-2 border rounded-xl transition-all",
          timer.isRunning 
            ? "bg-primary/5 border-primary/20 animate-pulse" 
            : "bg-muted/50 border-border"
        )}>
          <Clock className={cn(
            "h-4 w-4",
            timer.isRunning ? "text-primary" : "text-muted-foreground"
          )} />
          <span className={cn(
            "text-lg font-bold font-mono tracking-wider min-w-[60px]",
            timer.isRunning ? "text-primary" : "text-muted-foreground"
          )}>
            {timer.formattedTime}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={timer.toggleTimer}
            >
              {timer.isRunning ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Case Navigator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border rounded-xl">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={onPreviousCase}
            disabled={currentIndex <= 0 || isUpdating}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            <strong className="text-foreground">{currentIndex + 1}</strong>
            {' '}of{' '}
            <strong className="text-foreground">{totalCases}</strong>
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={onNextCase}
            disabled={currentIndex >= totalCases - 1 || isUpdating}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4 mr-1.5" />
          View Case
        </Button>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-1.5" />
          Export Run
        </Button>
        <Button
          size="sm"
          onClick={onCompleteRun}
          disabled={isUpdating}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          Complete Run
        </Button>
      </div>
    </header>
  );
}
