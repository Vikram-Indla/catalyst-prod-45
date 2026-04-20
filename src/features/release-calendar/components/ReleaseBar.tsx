/**
 * Release Bar Component
 * Horizontal bar showing release timeline with health coloring
 * Catalyst V5 Color Compliant
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CalendarRelease, HEALTH_COLORS, MILESTONE_COLORS } from '../types';
import { BarPosition } from '../utils/calendarUtils';
import { format } from 'date-fns';
import { Tooltip } from '@/components/ads';

interface ReleaseBarProps {
  release: CalendarRelease;
  position: BarPosition;
  onClick?: () => void;
}

export function ReleaseBar({ release, position, onClick }: ReleaseBarProps) {
  const healthKey = release.status === 'released' ? 'released' : release.healthLevel;
  const colors = HEALTH_COLORS[healthKey];

  const healthLabel = {
    healthy: 'Healthy',
    attention: 'Attention',
    at_risk: 'At Risk',
    critical: 'Critical',
  }[release.healthLevel];

  return (
    <Tooltip
      position="top"
      content={
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">{release.version}</span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: colors.badge, color: colors.badgeText }}
            >
              {healthLabel}
            </span>
          </div>
          <p className="text-sm text-slate-600">{release.name}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500">Start:</span>
              <span className="ml-1 text-slate-700">{format(new Date(release.startDate), 'MMM d, yyyy')}</span>
            </div>
            <div>
              <span className="text-slate-500">Target:</span>
              <span className="ml-1 text-slate-700">{format(new Date(release.targetDate), 'MMM d, yyyy')}</span>
            </div>
            <div>
              <span className="text-slate-500">Progress:</span>
              <span className="ml-1 text-slate-700">{release.progress}%</span>
            </div>
            <div>
              <span className="text-slate-500">Health:</span>
              <span className="ml-1 text-slate-700">{release.healthScore}%</span>
            </div>
          </div>
          {release.milestones.length > 0 && (
            <div className="border-t border-slate-100 pt-2">
              <p className="text-xs font-medium text-slate-700 mb-1">Milestones</p>
              {release.milestones.map(m => (
                <div key={m.id} className="flex items-center gap-2 text-xs">
                  <span style={{ color: MILESTONE_COLORS[m.type].color }}>
                    {MILESTONE_COLORS[m.type].icon}
                  </span>
                  <span className="text-slate-600">{m.name}</span>
                  <span className="text-slate-400">{format(new Date(m.date), 'MMM d')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      }
    >
      <div
        className="absolute h-14 cursor-pointer transition-all hover:scale-[1.02] hover:z-10"
        style={{
          left: position.left,
          width: position.width,
          top: '4px',
        }}
        onClick={onClick}
      >
        {/* Main Bar */}
        <div
          className={cn(
            "relative h-10 rounded-lg overflow-hidden shadow-sm",
            position.extendsLeft && "rounded-l-none",
            position.extendsRight && "rounded-r-none"
          )}
          style={{ backgroundColor: colors.bar }}
        >
          {/* Progress Fill */}
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${release.progress}%`,
              backgroundColor: colors.progress,
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex items-center justify-between h-full px-3">
            <div className="flex items-center gap-2 min-w-0">
              {position.extendsLeft && (
                <span className="text-white/80 text-xs">◀</span>
              )}
              <span className="font-semibold text-white text-sm truncate">
                {release.version}
              </span>
              <span className="text-white/80 text-xs truncate hidden sm:block">
                {release.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Milestones */}
              {release.milestones.slice(0, 3).map((milestone) => {
                const mConfig = MILESTONE_COLORS[milestone.type];
                return (
                  <span
                    key={milestone.id}
                    className="text-white text-sm"
                    title={`${milestone.name}: ${format(new Date(milestone.date), 'MMM d')}`}
                  >
                    {mConfig.icon}
                  </span>
                );
              })}

              {position.extendsRight && (
                <span className="text-white/80 text-xs">▶</span>
              )}
            </div>
          </div>
        </div>

        {/* Label below bar */}
        <div className="flex items-center justify-between mt-1 px-1">
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: colors.badge,
              color: colors.badgeText
            }}
          >
            {release.healthScore}% {healthLabel}
          </span>
          <span className="text-xs text-slate-500">
            {format(new Date(release.targetDate), 'MMM d')}
          </span>
        </div>
      </div>
    </Tooltip>
  );
}
