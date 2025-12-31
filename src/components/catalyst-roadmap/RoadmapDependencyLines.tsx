/**
 * Roadmap Dependency Lines - SVG bezier curves between objectives
 */

import React, { useMemo, useEffect, useState, useRef } from 'react';
import type { RoadmapDependency, RoadmapGroup, TimelineConfig } from '@/types/roadmap';
import { LAYOUT } from '@/types/roadmap';

interface RoadmapDependencyLinesProps {
  deps: RoadmapDependency[];
  groups: RoadmapGroup[];
  collapsed: Set<string>;
  timelineConfig: TimelineConfig;
}

interface BarPosition {
  id: string;
  leftPercent: number;
  rightPercent: number;
  topPx: number;
  critical?: boolean;
}

export function RoadmapDependencyLines({
  deps,
  groups,
  collapsed,
  timelineConfig,
}: RoadmapDependencyLinesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Observe container width changes
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const updateWidth = () => {
      const parent = svg.parentElement;
      if (parent) {
        setContainerWidth(parent.scrollWidth);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (svg.parentElement) {
      resizeObserver.observe(svg.parentElement);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate date to percentage position
  const dateToPercent = (dateStr: string): number => {
    const date = new Date(dateStr);
    const total = timelineConfig.end.getTime() - timelineConfig.start.getTime();
    const pos = date.getTime() - timelineConfig.start.getTime();
    return Math.max(0, Math.min(100, (pos / total) * 100));
  };

  // Calculate bar positions for all visible objectives
  const barPositions = useMemo(() => {
    const positions: Map<string, BarPosition> = new Map();
    let currentY = 0;
    
    groups.forEach((group) => {
      currentY += LAYOUT.themeHeight; // Theme header
      const isCollapsed = collapsed.has(group.id);
      
      if (!isCollapsed) {
        group.objs.forEach((obj) => {
          const leftPercent = dateToPercent(obj.start);
          const rightPercent = dateToPercent(obj.end);
          // Center of the row
          const topPx = currentY + LAYOUT.rowHeight / 2;
          
          positions.set(obj.id, {
            id: obj.id,
            leftPercent,
            rightPercent,
            topPx,
            critical: obj.critical,
          });
          currentY += LAYOUT.rowHeight;
        });
      }
    });
    
    return positions;
  }, [groups, collapsed, timelineConfig]);

  // Generate path data for each dependency
  const paths = useMemo(() => {
    if (containerWidth === 0) return [];

    return deps.map((dep) => {
      const from = barPositions.get(dep.from);
      const to = barPositions.get(dep.to);
      
      if (!from || !to) return null;
      
      // Convert percentages to pixels
      const fromLeftPx = (from.leftPercent / 100) * containerWidth;
      const fromRightPx = (from.rightPercent / 100) * containerWidth;
      const toLeftPx = (to.leftPercent / 100) * containerWidth;
      const toRightPx = (to.rightPercent / 100) * containerWidth;
      
      // Determine start and end points based on dependency type
      let startX: number;
      let endX: number;
      
      switch (dep.type) {
        case 'fs': // Finish-to-Start: right edge of source → left edge of target
          startX = fromRightPx;
          endX = toLeftPx;
          break;
        case 'ss': // Start-to-Start: left edge of source → left edge of target
          startX = fromLeftPx;
          endX = toLeftPx;
          break;
        case 'ff': // Finish-to-Finish: right edge of source → right edge of target
          startX = fromRightPx;
          endX = toRightPx;
          break;
        case 'sf': // Start-to-Finish: left edge of source → right edge of target
          startX = fromLeftPx;
          endX = toRightPx;
          break;
        default:
          startX = fromRightPx;
          endX = toLeftPx;
      }
      
      const startY = from.topPx;
      const endY = to.topPx;
      
      // Determine if this is a critical path
      const isCritical = from.critical || to.critical;
      
      // Calculate control points for bezier curve
      const deltaX = endX - startX;
      const deltaY = Math.abs(endY - startY);
      
      // Adjust curve based on relative positions
      let pathD: string;
      
      if (deltaX > 0) {
        // Normal case: end is to the right of start
        const curveOffset = Math.min(Math.abs(deltaX) * 0.4, 60);
        const cx1 = startX + curveOffset;
        const cy1 = startY;
        const cx2 = endX - curveOffset;
        const cy2 = endY;
        pathD = `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
      } else {
        // Wrap-around case: end is to the left of start
        const dropDown = 20;
        const curveOffset = 40;
        
        // Go down, around, and up to the target
        const midY = Math.max(startY, endY) + dropDown + deltaY * 0.2;
        pathD = `M ${startX} ${startY} 
                 C ${startX + curveOffset} ${startY}, ${startX + curveOffset} ${midY}, ${startX} ${midY}
                 L ${endX} ${midY}
                 C ${endX - curveOffset} ${midY}, ${endX - curveOffset} ${endY}, ${endX} ${endY}`;
      }
      
      return {
        key: `${dep.from}-${dep.to}`,
        pathD,
        isCritical,
        startX,
        startY,
        endX,
        endY,
      };
    }).filter(Boolean);
  }, [deps, barPositions, containerWidth]);

  if (deps.length === 0) return null;

  return (
    <svg 
      ref={svgRef}
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ 
        width: '100%', 
        height: '100%',
        zIndex: 15,
      }}
    >
      <defs>
        {/* Arrowhead markers */}
        <marker
          id="dep-arrow-normal"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path 
            d="M 0 0 L 10 5 L 0 10 z" 
            fill="#a1a1aa"
          />
        </marker>
        <marker
          id="dep-arrow-critical"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path 
            d="M 0 0 L 10 5 L 0 10 z" 
            fill="#525252"
          />
        </marker>
      </defs>
      
      {paths.map((path) => path && (
        <g key={path.key}>
          {/* Path line */}
          <path
            d={path.pathD}
            fill="none"
            stroke={path.isCritical ? '#525252' : '#a1a1aa'}
            strokeWidth={path.isCritical ? 2 : 1.5}
            strokeDasharray={path.isCritical ? 'none' : 'none'}
            markerEnd={`url(#dep-arrow-${path.isCritical ? 'critical' : 'normal'})`}
          />
          {/* Start connector dot */}
          <circle
            cx={path.startX}
            cy={path.startY}
            r={path.isCritical ? 4 : 3}
            fill={path.isCritical ? '#525252' : '#a1a1aa'}
          />
        </g>
      ))}
    </svg>
  );
}
