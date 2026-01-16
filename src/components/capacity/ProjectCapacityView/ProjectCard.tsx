/**
 * Project Card Component - Catalyst View 2
 * Displays a single project with staffing status and resource allocations
 */

import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProjectUtilization } from './types';
import { getStaffingStatusConfig, formatFTE, getProjectColor } from './utils';

interface ProjectCardProps {
  utilization: ProjectUtilization;
  onViewDetails: () => void;
}

export function ProjectCard({ utilization, onViewDetails }: ProjectCardProps) {
  const { project, totalCommitted, totalForecast, totalFTE, requiredFTE, resources, status } = utilization;
  const statusConfig = getStaffingStatusConfig(status);
  const projectColor = getProjectColor(project.name, project.color);
  
  // Calculate bar percentages
  const committedFTE = totalCommitted / 100;
  const forecastFTE = totalForecast / 100;
  const committedWidth = Math.min((committedFTE / requiredFTE) * 100, 100);
  const forecastWidth = Math.min((forecastFTE / requiredFTE) * 100, 100 - committedWidth);
  const overflowWidth = totalFTE > requiredFTE ? ((totalFTE - requiredFTE) / requiredFTE) * 20 : 0;

  return (
    <div 
      className={cn(
        "bg-card rounded-xl border-2 p-4 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer",
        statusConfig.borderClass
      )}
      onClick={onViewDetails}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className="w-3.5 h-3.5 rounded shrink-0"
            style={{ backgroundColor: projectColor }}
          />
          <h3 className="font-semibold text-foreground text-sm truncate">{project.name}</h3>
        </div>
        <span className={cn(
          "text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide shrink-0 ml-2",
          statusConfig.bgClass,
          statusConfig.textClass
        )}>
          {statusConfig.label}
        </span>
      </div>

      {/* FTE Stats Row */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{formatFTE(totalFTE)}</span>
            <span className="text-xs text-muted-foreground">/ {formatFTE(requiredFTE)} FTE</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#2563eb]" />
            <span className="text-muted-foreground">{formatFTE(committedFTE)} committed</span>
          </div>
          {forecastFTE > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#d97706]" />
              <span className="text-muted-foreground">{formatFTE(forecastFTE)} forecast</span>
            </div>
          )}
        </div>
      </div>

      {/* Staffing Progress Bar */}
      <div className="mb-3">
        <div className="h-2.5 bg-muted rounded-full overflow-hidden relative">
          {/* Required line marker */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-foreground/30 z-10"
            style={{ left: '100%' }}
          />
          {/* Committed bar */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-l-full bg-[#2563eb] transition-all"
            style={{ width: `${committedWidth}%` }}
          />
          {/* Forecast bar */}
          {forecastWidth > 0 && (
            <div
              className="absolute top-0 bottom-0 bg-[#d97706] transition-all"
              style={{ 
                left: `${committedWidth}%`,
                width: `${forecastWidth}%` 
              }}
            />
          )}
          {/* Overflow indicator for over-allocation */}
          {overflowWidth > 0 && (
            <div
              className="absolute top-0 bottom-0 right-0 bg-purple-500 opacity-80"
              style={{ width: `${overflowWidth}%` }}
            />
          )}
        </div>
      </div>

      {/* Resource Preview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Resource avatars (max 5) */}
          <div className="flex -space-x-1.5">
            {resources.slice(0, 5).map((resource, idx) => {
              const initials = resource.resource_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
              
              return (
                <div
                  key={resource.resource_id}
                  className="w-6 h-6 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-[9px] font-semibold text-primary"
                  title={resource.resource_name}
                >
                  {initials}
                </div>
              );
            })}
            {resources.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                +{resources.length - 5}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground ml-1">
            {resources.length} resource{resources.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Button>
      </div>
    </div>
  );
}
