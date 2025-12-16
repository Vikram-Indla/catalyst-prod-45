import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { KR_LEGEND_ITEMS } from '@/constants/krStatusStyles';

interface ObjectiveRoadmapLegendProps {
  isVisible: boolean;
}

export function ObjectiveRoadmapLegend({ isVisible }: ObjectiveRoadmapLegendProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isVisible) return null;
  
  return (
    <div className="absolute bottom-4 right-4 z-40 print:hidden">
      <div className="w-56 bg-card rounded-lg shadow-lg border border-border overflow-hidden">
        {/* Header with toggle */}
        <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Legend
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  aria-expanded={isExpanded}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <Info className="h-4 w-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {isExpanded ? 'Hide legend' : 'Show legend'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                      style={{ width: '60%', backgroundColor: '#c69c6d' }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Progress Bar
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-14 flex items-center justify-center">
                    <div 
                      className="w-0.5 h-5 rounded-full"
                      style={{ backgroundColor: '#8b7355' }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Today Line
                  </span>
                </div>
              </div>
            </div>

            {/* Key Results Section */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
                KEY RESULTS
              </div>
              <div className="space-y-2.5">
                {KR_LEGEND_ITEMS.map((status) => (
                  <div key={status.key} className="flex items-center gap-3">
                    {/* Diamond shape */}
                    <div className="w-[18px] h-[18px] flex items-center justify-center">
                      <div 
                        className="w-3 h-3 rotate-45 border-2"
                        style={{ 
                          backgroundColor: status.filled ? status.color : '#ffffff',
                          borderColor: status.color
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {status.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
