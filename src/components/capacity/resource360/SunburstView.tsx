import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { PieChart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SunburstNode, SunburstMetrics } from '@/types/resource360';

interface SunburstViewProps {
  data: SunburstNode;
  metrics: SunburstMetrics;
  resourceName: string;
}

export function SunburstView({ data, metrics, resourceName }: SunburstViewProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Type colors for rings - matching screenshot exactly
  const typeColors: Record<string, string> = {
    Theme: '#4d8b4d',
    Epic: '#2563eb',
    Feature: '#0d9488',
    Story: '#8b7355',
    Defect: '#dc2626',
    Incident: '#d97706',
    Request: '#22c55e',
  };

  // Calculate ring data - each type gets its own concentric ring
  const ringData = useMemo(() => {
    if (!data.children || data.children.length === 0) return [];

    const typeOrder = ['Theme', 'Epic', 'Feature', 'Story', 'Defect', 'Incident', 'Request'];
    
    return data.children
      .filter(child => (child.value || 0) > 0)
      .sort((a, b) => {
        const aIdx = typeOrder.findIndex(t => a.name.toLowerCase().includes(t.toLowerCase()));
        const bIdx = typeOrder.findIndex(t => b.name.toLowerCase().includes(t.toLowerCase()));
        return aIdx - bIdx;
      })
      .map((child, index) => ({
        ...child,
        innerRadius: 80 + index * 30,
        outerRadius: 105 + index * 30,
        color: typeColors[child.name] || '#6b7280',
      }));
  }, [data]);

  // Get initials for center
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const centerX = 200;
  const centerY = 200;
  const maxRadius = 80 + ringData.length * 30;
  const viewBoxSize = Math.max(maxRadius * 2 + 80, 400);

  if (!data.children || data.children.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <PieChart className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">No Data to Visualize</p>
        <p className="text-sm text-muted-foreground">
          Assign work items to see the workload distribution.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6">
        {/* Sunburst Chart Container */}
        <div className="flex justify-center bg-card rounded-lg border border-border p-6">
          <svg
            width="360"
            height="360"
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            className="drop-shadow-sm"
          >
            {/* Concentric Rings for each type - from outer to inner */}
            {ringData.map((ring, ringIndex) => {
              const isHovered = hoveredSegment === ring.name;
              
              return (
                <g key={ring.name}>
                  {/* Full ring for type */}
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={(ring.innerRadius + ring.outerRadius) / 2}
                    fill="none"
                    stroke={ring.color}
                    strokeWidth={ring.outerRadius - ring.innerRadius - 4}
                    opacity={isHovered ? 1 : 0.9}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredSegment(ring.name)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                  
                  {/* Item ID labels positioned around the ring */}
                  {ring.value && ring.value > 0 && Array.from({ length: Math.min(ring.value, 6) }).map((_, i) => {
                    // Spread items around the ring
                    const totalItems = Math.min(ring.value || 1, 6);
                    const angle = -Math.PI / 2 + (i * Math.PI * 2) / totalItems;
                    const labelRadius = (ring.innerRadius + ring.outerRadius) / 2;
                    const x = centerX + labelRadius * Math.cos(angle);
                    const y = centerY + labelRadius * Math.sin(angle);
                    
                    // Generate mock IDs like in screenshot (101, 1002, 1005, 4001, 4002, 401)
                    const baseId = ringIndex === 0 ? 100 : ringIndex === 1 ? 1000 : ringIndex * 1000;
                    const itemId = baseId + i + 1;
                    
                    return (
                      <text
                        key={i}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-[9px] font-medium fill-white pointer-events-none"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                      >
                        {itemId}
                      </text>
                    );
                  })}
                </g>
              );
            })}

            {/* White ring separator between rings */}
            {ringData.map((ring, idx) => idx > 0 && (
              <circle
                key={`sep-${idx}`}
                cx={centerX}
                cy={centerY}
                r={ring.innerRadius - 2}
                fill="none"
                stroke="white"
                strokeWidth="4"
              />
            ))}

            {/* Center Circle - Blue with initials */}
            <circle
              cx={centerX}
              cy={centerY}
              r={70}
              fill="#2563eb"
            />
            
            {/* White inner ring */}
            <circle
              cx={centerX}
              cy={centerY}
              r={65}
              fill="none"
              stroke="white"
              strokeWidth="3"
            />
            
            {/* Center Text */}
            <text
              x={centerX}
              y={centerY - 10}
              textAnchor="middle"
              className="text-2xl font-bold fill-white"
            >
              {getInitials(resourceName)}
            </text>
            <text
              x={centerX}
              y={centerY + 8}
              textAnchor="middle"
              className="text-xs fill-white/90"
            >
              {metrics.totalItems} items
            </text>
            <text
              x={centerX}
              y={centerY + 22}
              textAnchor="middle"
              className="text-xs fill-white/80"
            >
              {metrics.totalStoryPoints} SP
            </text>
          </svg>
        </div>

        {/* Legend - matching screenshot layout */}
        <div className="flex flex-wrap justify-center gap-4 px-4 py-3 bg-muted/30 rounded-lg border border-border">
          {ringData.map(ring => (
            <div
              key={ring.name}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all",
                hoveredSegment === ring.name && "bg-background shadow-sm"
              )}
              onMouseEnter={() => setHoveredSegment(ring.name)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: ring.color }}
              />
              <span className="text-sm text-foreground">
                {ring.name} ({ring.value || 0})
              </span>
            </div>
          ))}
        </div>

        {/* Hover Details */}
        {hoveredSegment && (
          <div className="p-4 bg-card rounded-lg border border-border">
            <h4 className="font-medium text-foreground mb-1">{hoveredSegment}</h4>
            <p className="text-sm text-muted-foreground">
              {metrics.itemsByType[hoveredSegment.toLowerCase()] || 0} items assigned
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
