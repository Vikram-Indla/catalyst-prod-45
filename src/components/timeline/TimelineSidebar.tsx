// =====================================================
// TIMELINE SIDEBAR COMPONENT
// Left sidebar with release groups
// =====================================================

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { TimelineRelease } from '@/services/timelineService';
import { PRIORITY_CONFIG } from '@/types/views';
import { cn } from '@/lib/utils';

interface TimelineSidebarProps {
  releases: TimelineRelease[];
  onToggleRelease: (releaseId: string) => void;
  onFeatureClick?: (featureId: string) => void;
}

export function TimelineSidebar({ 
  releases, 
  onToggleRelease,
  onFeatureClick 
}: TimelineSidebarProps) {
  return (
    <div className="w-[300px] flex-shrink-0 border-r bg-white overflow-y-auto">
      {/* Header */}
      <div className="h-[52px] border-b flex items-center px-3 bg-white sticky top-0 z-10">
        <span className="text-xs font-semibold text-gray-500">WORK ITEMS</span>
      </div>

      {/* Releases */}
      {releases.map((release) => (
        <div key={release.id}>
          {/* Release Header */}
          <div
            onClick={() => onToggleRelease(release.id)}
            className="h-9 flex items-center px-3 bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
          >
            <ChevronDown
              className={cn(
                'w-4 h-4 mr-2 transition-transform',
                release.isCollapsed && '-rotate-90'
              )}
            />
            <span
              className="px-2 py-0.5 rounded text-[10px] mr-2"
              style={{
                background: release.id === 'unassigned' 
                  ? 'rgba(200, 204, 208, 0.15)'
                  : 'rgba(34, 197, 94, 0.1)',
                color: release.id === 'unassigned' ? '#737373' : '#15803d'
              }}
            >
              {release.version}
            </span>
            <span className="text-xs font-semibold text-gray-600 truncate">
              {release.name}
            </span>
            <span className="ml-auto text-xs text-gray-400">
              {release.features.length}
            </span>
          </div>

          {/* Features */}
          {!release.isCollapsed && release.features.map((feature) => {
            const priorityConfig = PRIORITY_CONFIG[feature.priority];
            
            return (
              <div
                key={feature.id}
                onClick={() => onFeatureClick?.(feature.id)}
                className="h-12 flex items-center px-3 border-b hover:bg-[rgba(37,99,235,0.08)] cursor-pointer"
              >
                <div
                  className="w-1 h-6 rounded mr-3"
                  style={{ background: priorityConfig?.color || 'var(--fg-4)' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--ds-text-brand,#2563eb)]">
                      {feature.feature_id}
                    </span>
                    <span
                      className="px-1 rounded text-[10px]"
                      style={{
                        background: priorityConfig?.bgColor,
                        color: priorityConfig?.color
                      }}
                    >
                      {priorityConfig?.label}
                    </span>
                  </div>
                  <p className="text-sm truncate">{feature.title}</p>
                </div>
                {feature.assignee && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] flex-shrink-0 bg-blue-600"
                    title={feature.assignee.full_name}
                  >
                    {feature.assignee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
