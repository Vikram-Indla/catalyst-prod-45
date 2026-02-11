/**
 * ReleaseCard — Enterprise Redesign
 * 5-row compressed layout (~148px height)
 * Row 1: Identity + Badge
 * Row 2: Proportional Health Bar + Score
 * Row 3: Status + Date + Days Left + Owner
 * Row 4: Environment Progression
 * Row 5: Gates + Tests + Defects
 */

import { Calendar, User2, Shield, TestTube2, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Release } from '../types';
import { HEALTH_THRESHOLDS, getHealthLevelLabel } from '../utils/healthScore';
import { format, differenceInDays } from 'date-fns';

interface ReleaseCardProps {
  release: Release;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onClick?: () => void;
}

// Derive release type from version string
function inferReleaseType(version: string): 'major' | 'minor' | 'patch' | 'hotfix' {
  const parts = version.replace('v', '').split('.');
  if (parts.length < 3) return 'major';
  const [, minor, patch] = parts.map(Number);
  if (patch > 0 && minor === 0) return 'hotfix';
  if (patch > 0) return 'patch';
  if (minor > 0) return 'minor';
  return 'major';
}

// Derive environment progression from status
function getEnvProgression(status: string): boolean[] {
  switch (status) {
    case 'released': return [true, true, true, true];
    case 'uat': case 'testing': return [true, true, true, false];
    case 'staging': return [true, true, false, false];
    case 'in_progress': case 'active': return [true, false, false, false];
    default: return [false, false, false, false];
  }
}

const TYPE_STYLES: Record<string, string> = {
  major: 'bg-blue-100 text-blue-700',
  minor: 'bg-teal-100 text-teal-700',
  patch: 'bg-slate-100 text-slate-600',
  hotfix: 'bg-red-50 text-red-600',
};

const HEALTH_BADGE_STYLES: Record<string, string> = {
  healthy: 'bg-emerald-100 text-emerald-700',
  attention: 'bg-yellow-100 text-yellow-700',
  at_risk: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  planning: { label: 'Planning', dot: 'bg-slate-400', bg: 'bg-slate-100 text-slate-600' },
  planned: { label: 'Planned', dot: 'bg-slate-400', bg: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', dot: 'bg-blue-500', bg: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', dot: 'bg-blue-500', bg: 'bg-blue-100 text-blue-700' },
  testing: { label: 'Testing', dot: 'bg-purple-500', bg: 'bg-purple-100 text-purple-700' },
  uat: { label: 'UAT', dot: 'bg-purple-500', bg: 'bg-purple-100 text-purple-700' },
  staging: { label: 'Staging', dot: 'bg-amber-500', bg: 'bg-amber-100 text-amber-700' },
  released: { label: 'Released', dot: 'bg-emerald-500', bg: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', dot: 'bg-red-500', bg: 'bg-red-100 text-red-700' },
};

const ENV_LABELS = ['DEV', 'STG', 'UAT', 'PROD'];

export function ReleaseCard({ release, isSelected = false, onSelect, onClick }: ReleaseCardProps) {
  const healthConfig = HEALTH_THRESHOLDS[release.healthLevel];
  const type = inferReleaseType(release.version);
  const envProgress = getEnvProgression(release.status);
  const daysRemaining = differenceInDays(new Date(release.plannedDate), new Date());
  const statusCfg = STATUS_CONFIG[release.status] || STATUS_CONFIG.planning;
  const healthLabel = getHealthLevelLabel(release.healthLevel);

  const handleCheckbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(release.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onClick?.();
    if (e.key === ' ') { e.preventDefault(); onSelect?.(release.id); }
  };

  // Gate color
  const gateRatio = release.metrics.totalGates > 0 ? release.metrics.passingGates / release.metrics.totalGates : 1;
  const gateDotColor = gateRatio < 0.5 ? 'bg-red-500' : gateRatio < 0.8 ? 'bg-yellow-500' : 'bg-emerald-500';

  // Days left badge color
  const daysColor = daysRemaining < 0 ? 'bg-red-100 text-red-700' : daysRemaining <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500';

  return (
    <div
      tabIndex={0}
      role="article"
      aria-label={`Release ${release.version} - ${release.name}, ${healthLabel}, ${release.healthScore}% health`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative rounded-lg border bg-white cursor-pointer transition-all duration-150 group",
        "hover:border-slate-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:-translate-y-px",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        isSelected
          ? "border-blue-600 bg-blue-50/40"
          : "border-slate-200"
      )}
    >
      <div className="p-3 space-y-2">
        {/* Row 1: Identity + Badge */}
        <div className="flex items-center gap-2 h-7">
          {/* Checkbox */}
          <div
            onClick={handleCheckbox}
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-opacity cursor-pointer",
              isSelected
                ? "border-blue-600 bg-blue-600 opacity-100"
                : "border-slate-300 opacity-0 group-hover:opacity-100"
            )}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          
          <span className="text-sm font-bold text-slate-900">{release.version}</span>
          <span className={cn("px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded", TYPE_STYLES[type])}>
            {type}
          </span>
          <span className="text-[13px] text-slate-500 truncate flex-1">{release.name}</span>
          <span className={cn("px-2 py-0.5 text-[11px] font-medium rounded-full flex-shrink-0", HEALTH_BADGE_STYLES[release.healthLevel])}>
            {healthLabel}
          </span>
        </div>

        {/* Row 2: Health Bar */}
        <div className="flex items-center gap-2 h-[22px]">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${release.healthScore}%`, backgroundColor: healthConfig.color }}
            />
          </div>
          <span className="text-xs font-semibold w-7 text-right" style={{ color: healthConfig.color }}>
            {release.healthScore}
          </span>
        </div>

        {/* Row 3: Status + Date + DaysLeft + Owner */}
        <div className="flex items-center gap-2 h-6 text-[11px]">
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium", statusCfg.bg)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
            {statusCfg.label}
          </span>
          <div className="flex items-center gap-1 text-slate-400">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(release.plannedDate), 'MMM d, yyyy')}</span>
          </div>
          {release.status !== 'released' && release.status !== 'cancelled' && (
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", daysColor)}>
              {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d`}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {release.releaseManager ? (
              <>
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600">
                  {release.releaseManager.full_name.charAt(0)}
                </div>
              </>
            ) : (
              <span className="text-[11px] italic text-amber-600">Unassigned</span>
            )}
          </div>
        </div>

        {/* Row 4: Environment Progression */}
        <div className="flex items-center gap-0 h-5">
          {ENV_LABELS.map((label, idx) => {
            const isComplete = envProgress[idx];
            const isCurrent = envProgress[idx] && (idx === ENV_LABELS.length - 1 || !envProgress[idx + 1]);
            return (
              <div key={label} className="flex items-center">
                {idx > 0 && (
                  <div className={cn(
                    "w-3 h-px",
                    envProgress[idx - 1] && envProgress[idx] ? "bg-emerald-500" : "bg-slate-300"
                  )} />
                )}
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full border",
                    isComplete
                      ? isCurrent
                        ? "bg-blue-600 border-blue-600"
                        : "bg-emerald-500 border-emerald-500"
                      : "bg-white border-slate-300"
                  )} />
                  <span className={cn(
                    "text-[10px] font-medium",
                    isComplete
                      ? isCurrent ? "text-blue-600" : "text-emerald-600"
                      : "text-slate-400"
                  )}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 5: Metrics */}
      <div className="border-t border-slate-100 px-3 py-2 grid grid-cols-3 gap-0">
        <div className="text-center border-r border-slate-100">
          <div className="flex items-center justify-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full", gateDotColor)} />
            <span className="text-xs font-semibold text-slate-700">
              {release.metrics.passingGates}/{release.metrics.totalGates}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Shield className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400">Gates</span>
          </div>
        </div>
        
        <div className="text-center border-r border-slate-100">
          <span className={cn(
            "text-xs font-semibold",
            release.metrics.totalTests === 0 ? "text-slate-400" : release.metrics.passRate < 90 ? "text-amber-600" : "text-emerald-600"
          )}>
            {release.metrics.totalTests === 0 ? 'No runs' : `${Math.round(release.metrics.passRate)}%`}
          </span>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <TestTube2 className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400">Tests</span>
          </div>
        </div>
        
        <div className="text-center">
          <span className={cn(
            "text-xs font-semibold",
            release.metrics.openDefects > 0 ? "text-red-600" : "text-slate-600"
          )}>
            {release.metrics.openDefects}
          </span>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Bug className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400">Defects</span>
          </div>
        </div>
      </div>
    </div>
  );
}
