import React from 'react';

interface ObjectiveRoadmapLegendProps {
  isVisible: boolean;
}

// KR Status colors - using Catalyst brand tokens
const KR_STATUS_ITEMS = [
  { key: 'complete', label: 'Complete', color: 'hsl(var(--secondary-green))', filled: true },
  { key: 'in-progress', label: 'Current', color: 'hsl(var(--brand-gold))', filled: false },
  { key: 'not-started', label: 'Pending', color: 'hsl(var(--muted-foreground))', filled: false },
  { key: 'overdue', label: 'Overdue', color: 'hsl(var(--destructive))', filled: true },
];

export function ObjectiveRoadmapLegend({ isVisible }: ObjectiveRoadmapLegendProps) {
  if (!isVisible) return null;
  
  return (
    <div className="absolute bottom-4 right-4 z-40 print:hidden">
      <div className="w-56 bg-card rounded-lg shadow-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-muted/50">
          <h3 className="text-sm font-semibold text-foreground">
            Legend
          </h3>
        </div>

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
                    className="absolute inset-y-0 left-0 rounded-full bg-brand-gold"
                    style={{ width: '60%' }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  Progress Bar
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 flex items-center justify-center">
                  <div className="w-0.5 h-5 rounded-full bg-brand-gold" />
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
              {KR_STATUS_ITEMS.map((status) => (
                <div key={status.key} className="flex items-center gap-3">
                  {/* Diamond shape */}
                  <div className="w-[18px] h-[18px] flex items-center justify-center">
                    <div 
                      className="w-3 h-3 rotate-45 border-2"
                      style={{ 
                        backgroundColor: status.filled ? status.color : 'transparent',
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
      </div>
    </div>
  );
}