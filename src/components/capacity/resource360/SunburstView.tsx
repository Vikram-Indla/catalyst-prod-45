import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { PieChart } from 'lucide-react';
import type { SunburstNode, SunburstMetrics } from '@/types/resource360';

interface SunburstViewProps {
  data: SunburstNode;
  metrics: SunburstMetrics;
  resourceName: string;
}

export function SunburstView({ data, metrics, resourceName }: SunburstViewProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Type colors for rings
  const typeColors: Record<string, string> = {
    Theme: '#4d8b4d',
    Epic: '#2563eb',
    Feature: '#0d9488',
    Story: '#8b7355',
    Defect: '#dc2626',
    Incident: '#d97706',
    'Business Request': '#22c55e',
  };

  // Calculate ring data - each type gets its own ring at a fixed radius
  const ringData = useMemo(() => {
    if (!data.children || data.children.length === 0) return [];

    const typeOrder = ['Theme', 'Epic', 'Feature', 'Story', 'Defect', 'Incident', 'Request'];
    
    return data.children
      .sort((a, b) => {
        const aIdx = typeOrder.findIndex(t => a.name.toLowerCase().includes(t.toLowerCase()));
        const bIdx = typeOrder.findIndex(t => b.name.toLowerCase().includes(t.toLowerCase()));
        return aIdx - bIdx;
      })
      .map((child, index) => ({
        ...child,
        innerRadius: 80 + index * 35,
        outerRadius: 110 + index * 35,
        color: typeColors[child.name] || '#6b7280',
      }));
  }, [data]);

  // Get initials for center
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const centerX = 200;
  const centerY = 200;
  const maxRadius = 80 + ringData.length * 35;
  const viewBoxSize = maxRadius * 2 + 60;

  if (!data.children || data.children.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f5f5f4] flex items-center justify-center mb-4">
          <PieChart className="w-8 h-8 text-[#a3a3a3]" />
        </div>
        <p className="text-lg font-medium text-[#0a0a0a] mb-1">No Data to Visualize</p>
        <p className="text-sm text-[#737373]">
          Assign work items to see the workload distribution.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-6 py-4">
      {/* Sunburst Chart */}
      <div className="flex justify-center mb-6">
        <svg
          width="400"
          height="400"
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="drop-shadow-sm"
        >
          {/* Concentric Rings for each type */}
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
                  strokeWidth={ring.outerRadius - ring.innerRadius - 2}
                  opacity={isHovered ? 1 : 0.85}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(ring.name)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
                
                {/* Labels on the ring - show count with item IDs */}
                {ring.value && ring.value > 0 && (
                  <g>
                    {/* Position labels around the ring */}
                    {Array.from({ length: Math.min(ring.value, 4) }).map((_, i) => {
                      const angle = -Math.PI / 2 + (i * Math.PI * 2) / (ring.value || 1);
                      const labelRadius = (ring.innerRadius + ring.outerRadius) / 2;
                      const x = centerX + labelRadius * Math.cos(angle);
                      const y = centerY + labelRadius * Math.sin(angle);
                      
                      return (
                        <text
                          key={i}
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[10px] font-medium fill-white pointer-events-none"
                        >
                          {1000 + ringIndex * 100 + i + 1}
                        </text>
                      );
                    })}
                  </g>
                )}
              </g>
            );
          })}

          {/* Center Circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={70}
            fill="#2563eb"
          />
          
          {/* Center Text */}
          <text
            x={centerX}
            y={centerY - 12}
            textAnchor="middle"
            className="text-2xl font-bold fill-white"
          >
            {getInitials(resourceName)}
          </text>
          <text
            x={centerX}
            y={centerY + 8}
            textAnchor="middle"
            className="text-xs fill-white/80"
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

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 px-4 py-3 bg-[#fafafa] rounded-lg">
        {ringData.map(ring => (
          <div
            key={ring.name}
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-all",
              hoveredSegment === ring.name && "bg-white shadow-sm"
            )}
            onMouseEnter={() => setHoveredSegment(ring.name)}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: ring.color }}
            />
            <span className="text-xs text-[#0a0a0a]">
              {ring.name} ({ring.value || 0})
            </span>
          </div>
        ))}
      </div>

      {/* Hover Tooltip */}
      {hoveredSegment && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-[#e5e5e5] shadow-sm">
          <h4 className="font-medium text-[#0a0a0a] mb-1">{hoveredSegment}</h4>
          <p className="text-sm text-[#737373]">
            {metrics.itemsByType[hoveredSegment.toLowerCase()] || 0} items assigned
          </p>
        </div>
      )}
    </div>
  );
}
