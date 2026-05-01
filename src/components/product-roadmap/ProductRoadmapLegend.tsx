import React, { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import { TODAY_LINE_COLOR, PROGRESS_BAR_COLOR, KR_LEGEND_ITEMS } from '@/constants/krStatusStyles';
import { Tooltip } from '@/components/ads';
import { useProcessSteps } from '@/modules/kanban/hooks/useProcessSteps';

// Catalyst Brand Colors ONLY for status display
// Maps process steps to brand-aligned colors in order of workflow progression
const CATALYST_STATUS_COLORS: Record<string, string> = {
  new_demand: 'var(--process-new-demand)',        // Olive
  in_review: 'var(--process-in-review)',          // Gold
  ea_review: 'var(--process-ea-review)',          // Bronze
  analyse: 'var(--process-analyse)',              // Gold
  approved: 'var(--process-approved)',            // Olive Dark
  ready_to_implement: 'var(--process-ready-to-implement)', // Olive
  implement: 'var(--process-implement)',          // Olive Darker
  closed: 'var(--process-closed)',                // Olive Light
  rejected: 'var(--process-rejected)',            // Gray
  on_hold: 'var(--process-on-hold)',              // Champagne
};

// Fallback colors for any unmapped statuses - cycles through brand palette
const BRAND_FALLBACK_COLORS = [
  '#0d9488', // Teal
  'var(--ds-text-brand, #2563eb)', // Blue
  '#6b7280', // Gray
  '#0f766e', // Teal Dark
  'var(--ds-text-brand, #60a5fa)', // Blue Light
  'var(--ds-background-brand-bold-hovered, #1d4ed8)', // Blue Dark
  '#4b5563', // Gray Dark
  '#9ca3af', // Gray Light
];

function getStatusColor(statusKey: string, index: number): string {
  const normalized = statusKey.toLowerCase().replace(/[\s-]/g, '_');
  return CATALYST_STATUS_COLORS[normalized] || BRAND_FALLBACK_COLORS[index % BRAND_FALLBACK_COLORS.length];
}

interface ProductRoadmapLegendProps {
  isVisible: boolean;
  showMilestones: boolean;
}

export function ProductRoadmapLegend({ isVisible, showMilestones }: ProductRoadmapLegendProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: processSteps = [] } = useProcessSteps();
  
  // Create dynamic status config from process steps using Catalyst brand colors
  const statusConfig = useMemo(() => 
    processSteps.map((step, index) => ({
      key: step.value,
      label: step.label,
      color: getStatusColor(step.value, index),
    })),
    [processSteps]
  );
  
  if (!isVisible) return null;
  
  return (
    <div className="absolute bottom-4 right-4 z-40 print:hidden">
      <div className="w-56 bg-card rounded-lg shadow-lg border border-border overflow-hidden">
        {/* Header with toggle */}
        <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Legend</h3>
          <Tooltip content={isExpanded ? 'Hide legend' : 'Show legend'} position="left">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Info className="h-4 w-4 text-muted-foreground" />
            </button>
          </Tooltip>
        </div>

        {isExpanded && (
          <div className="p-4 space-y-5">
            {/* Timeline Section */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
                TIMELINE
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-5 rounded-full overflow-hidden bg-muted relative">
                    <div 
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: '60%', backgroundColor: PROGRESS_BAR_COLOR }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">Progress Bar</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-14 flex items-center justify-center">
                    <div 
                      className="w-0.5 h-5 rounded-full"
                      style={{ backgroundColor: TODAY_LINE_COLOR }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">Today Line</span>
                </div>
              </div>
            </div>

            {/* Status Section - Dynamic from database */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
                STATUS
              </div>
              <div className="space-y-2">
                {statusConfig.map((status) => (
                  <div key={status.key} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-xs text-muted-foreground">{status.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones Section (only if enabled) */}
            {showMilestones && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
                  MILESTONES
                </div>
                <div className="space-y-2.5">
                  {KR_LEGEND_ITEMS.map((item) => (
                    <div key={item.key} className="flex items-center gap-3">
                      <div className="w-[18px] h-[18px] flex items-center justify-center">
                        <div 
                          className="w-3 h-3 rotate-45 border-2"
                          style={{ 
                            backgroundColor: item.filled ? item.color : ('fillColor' in item ? item.fillColor : 'var(--ds-surface, #ffffff)'),
                            borderColor: item.color
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
