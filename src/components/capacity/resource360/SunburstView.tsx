import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { PieChart, Info, ChevronDown, ArrowDown } from 'lucide-react';
import type { SunburstNode, SunburstMetrics } from '@/types/resource360';

interface SunburstViewProps {
  data: SunburstNode;
  metrics: SunburstMetrics;
  resourceName: string;
}

// Catalyst category colors
const CategoryColors = {
  enterprise: { bg: '#f0fdf4', border: '#4d8b4d', text: '#166534' },
  program: { bg: '#eff6ff', border: '#2563eb', text: '#1d4ed8' },
  project: { bg: '#fef3e3', border: '#8b7355', text: '#92400e' },
  product: { bg: '#ffffff', border: '#d1d5db', text: '#374151' },
};

// Work item type colors
const WorkItemColors: Record<string, { bg: string; text: string }> = {
  theme: { bg: '#dcfce7', text: '#166534' },
  objective: { bg: '#d1fae5', text: '#047857' },
  key_result: { bg: '#fef3c7', text: '#92400e' },
  epic: { bg: '#dbeafe', text: '#1d4ed8' },
  feature: { bg: '#ccfbf1', text: '#0d9488' },
  story: { bg: '#f5f5f4', text: '#57534e' },
  defect: { bg: '#fee2e2', text: '#dc2626' },
  incident: { bg: '#ffedd5', text: '#ea580c' },
  business_request: { bg: '#f3f4f6', text: '#374151' },
};

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
      {/* Catalyst Work Item Hierarchy - Always Visible */}
      <div className="mb-6 border border-[#e5e5e5] rounded-lg bg-white">
        <div className="px-4 py-3 text-center">
          <h4 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-4">
            Catalyst Work Item Hierarchy
          </h4>
          
          {/* Hierarchy Flow */}
          <div className="flex items-start justify-center gap-2 overflow-x-auto pb-2">
            {/* Enterprise */}
            <div className="flex flex-col items-center min-w-[120px]">
              <div 
                className="px-3 py-2 rounded-lg border-l-4 w-full"
                style={{ 
                  backgroundColor: CategoryColors.enterprise.bg,
                  borderLeftColor: CategoryColors.enterprise.border 
                }}
              >
                <span className="text-xs font-semibold text-[#737373] uppercase">Enterprise</span>
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: WorkItemColors.theme.bg, color: WorkItemColors.theme.text }}
                  >
                    Theme
                  </span>
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: WorkItemColors.objective.bg, color: WorkItemColors.objective.text }}
                  >
                    Objective
                  </span>
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: WorkItemColors.key_result.bg, color: WorkItemColors.key_result.text }}
                  >
                    Key Result
                  </span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center pt-6 text-[#a3a3a3]">
              <ArrowDown className="w-4 h-4 rotate-[-90deg]" />
            </div>

            {/* Program */}
            <div className="flex flex-col items-center min-w-[100px]">
              <div 
                className="px-3 py-2 rounded-lg border-l-4 w-full"
                style={{ 
                  backgroundColor: CategoryColors.program.bg,
                  borderLeftColor: CategoryColors.program.border 
                }}
              >
                <span className="text-xs font-semibold text-[#737373] uppercase">Program</span>
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: WorkItemColors.epic.bg, color: WorkItemColors.epic.text }}
                  >
                    Epic
                  </span>
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: WorkItemColors.feature.bg, color: WorkItemColors.feature.text }}
                  >
                    Feature
                  </span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center pt-6 text-[#a3a3a3]">
              <ArrowDown className="w-4 h-4 rotate-[-90deg]" />
            </div>

            {/* Project */}
            <div className="flex flex-col items-center min-w-[100px]">
              <div 
                className="px-3 py-2 rounded-lg border-l-4 w-full"
                style={{ 
                  backgroundColor: CategoryColors.project.bg,
                  borderLeftColor: CategoryColors.project.border 
                }}
              >
                <span className="text-xs font-semibold text-[#737373] uppercase">Project</span>
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: WorkItemColors.story.bg, color: WorkItemColors.story.text }}
                  >
                    Story
                  </span>
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: WorkItemColors.defect.bg, color: WorkItemColors.defect.text }}
                  >
                    Defect
                  </span>
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: WorkItemColors.incident.bg, color: WorkItemColors.incident.text }}
                  >
                    Incident
                  </span>
                </div>
              </div>
            </div>

            {/* Product */}
            <div className="flex flex-col items-center min-w-[120px]">
              <div 
                className="px-3 py-2 rounded-lg border-l-4 border-dashed w-full"
                style={{ 
                  backgroundColor: CategoryColors.product.bg,
                  borderLeftColor: CategoryColors.product.border 
                }}
              >
                <span className="text-xs font-semibold text-[#737373] uppercase">Product</span>
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full border border-[#d1d5db]"
                    style={{ backgroundColor: WorkItemColors.business_request.bg, color: WorkItemColors.business_request.text }}
                  >
                    Business Request
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#0a0a0a]">{metrics.totalItems}</div>
          <div className="text-xs text-[#737373]">Total Items</div>
        </div>
        <div className="bg-white border border-[#0d9488] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#0a0a0a]">{metrics.itemsByStatus?.completed || 0}</div>
          <div className="text-xs text-[#737373]">Completed</div>
        </div>
        <div className="bg-white border border-[#2563eb] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#0a0a0a]">{metrics.itemsByStatus?.in_progress || 0}</div>
          <div className="text-xs text-[#737373]">In Progress</div>
        </div>
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#0a0a0a]">{metrics.itemsByStatus?.upcoming || 0}</div>
          <div className="text-xs text-[#737373]">Upcoming</div>
        </div>
      </div>

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
