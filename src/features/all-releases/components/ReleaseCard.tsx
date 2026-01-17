/**
 * Release Card Component
 * Individual release card with health score and metrics
 */

import React from 'react';
import { Calendar, User2, ChevronRight, Bug, TestTube2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Release } from '../types';
import { HEALTH_THRESHOLDS, getHealthLevelLabel } from '../utils/healthScore';
import { format, differenceInDays } from 'date-fns';

interface ReleaseCardProps {
  release: Release;
  onClick?: () => void;
}

function HealthProgressBar({ score, level }: { score: number; level: Release['healthLevel'] }) {
  const config = HEALTH_THRESHOLDS[level];
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Health Score</span>
        <span className="font-semibold" style={{ color: config.color }}>{score}/100</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all"
          style={{ 
            width: `${score}%`,
            backgroundColor: config.color,
          }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Release['status'] }) {
  const config: Record<string, { label: string; className: string; icon: string }> = {
    planning: { label: 'Planning', className: 'bg-slate-100 text-slate-600', icon: '○' },
    planned: { label: 'Planned', className: 'bg-slate-100 text-slate-600', icon: '○' },
    in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700', icon: '●' },
    active: { label: 'Active', className: 'bg-blue-100 text-blue-700', icon: '●' },
    testing: { label: 'Testing', className: 'bg-purple-100 text-purple-700', icon: '●' },
    uat: { label: 'UAT', className: 'bg-purple-100 text-purple-700', icon: '●' },
    staging: { label: 'Staging', className: 'bg-amber-100 text-amber-700', icon: '●' },
    released: { label: 'Released', className: 'bg-green-100 text-green-700', icon: '✓' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700', icon: '✕' },
  };
  
  const statusConfig = config[status] || { label: status, className: 'bg-slate-100 text-slate-600', icon: '○' };
  const { label, className, icon } = statusConfig;
  
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", className)}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

function HealthBadge({ level }: { level: Release['healthLevel'] }) {
  const config = HEALTH_THRESHOLDS[level];
  const label = getHealthLevelLabel(level);
  
  const bgClass = {
    healthy: 'bg-green-100 text-green-700',
    attention: 'bg-yellow-100 text-yellow-700',
    at_risk: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  }[level];
  
  return (
    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", bgClass)}>
      {label}
    </span>
  );
}

export function ReleaseCard({ release, onClick }: ReleaseCardProps) {
  const config = HEALTH_THRESHOLDS[release.healthLevel];
  const daysRemaining = differenceInDays(new Date(release.plannedDate), new Date());
  
  return (
    <div
      className={cn(
        "relative rounded-xl border-l-4 border shadow-sm transition-all hover:shadow-lg cursor-pointer",
        config.borderColor,
        config.bgColor,
        "border-slate-200"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{release.version}</h3>
            <p className="text-sm text-slate-500">{release.name}</p>
          </div>
          <HealthBadge level={release.healthLevel} />
        </div>
        
        {/* Health Bar */}
        <div className="mt-4">
          <HealthProgressBar score={release.healthScore} level={release.healthLevel} />
        </div>
        
        {/* Status & Date */}
        <div className="flex items-center justify-between mt-4">
          <StatusBadge status={release.status} />
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{format(new Date(release.plannedDate), 'MMM d, yyyy')}</span>
            {daysRemaining > 0 && release.status !== 'released' && (
              <span className="text-slate-400">({daysRemaining}d left)</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Metrics */}
      <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
            <Shield className="w-3 h-3" />
            <span>Gates</span>
          </div>
          <span className={cn(
            "text-sm font-semibold",
            release.metrics.failingGates > 0 ? "text-red-600" : "text-green-600"
          )}>
            {release.metrics.passingGates}/{release.metrics.totalGates} ✓
          </span>
        </div>
        
        <div className="text-center border-x border-slate-100">
          <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
            <TestTube2 className="w-3 h-3" />
            <span>Tests</span>
          </div>
          <span className={cn(
            "text-sm font-semibold",
            release.metrics.passRate < 90 ? "text-amber-600" : "text-green-600"
          )}>
            {Math.round(release.metrics.passRate)}% pass
          </span>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
            <Bug className="w-3 h-3" />
            <span>Defects</span>
          </div>
          <span className={cn(
            "text-sm font-semibold",
            release.metrics.blockerDefects > 0 ? "text-red-600" : 
            release.metrics.openDefects > 0 ? "text-amber-600" : "text-slate-600"
          )}>
            {release.metrics.blockerDefects > 0 ? (
              <>{release.metrics.blockerDefects} 🔴</>
            ) : (
              release.metrics.openDefects
            )}
          </span>
        </div>
      </div>
      
      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between">
        {release.releaseManager ? (
          <div className="flex items-center gap-2">
            <User2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500">{release.releaseManager.full_name}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">No owner</span>
        )}
        <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 p-0 h-auto">
          View Details <ChevronRight className="w-3 h-3 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}
