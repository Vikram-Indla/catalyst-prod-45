/**
 * Roadmap Dependency Lines - SVG bezier curves between objectives
 */

import React, { useMemo } from 'react';
import type { RoadmapDependency, RoadmapGroup, TimelineConfig } from '@/types/roadmap';
import { dateToPosition } from '@/lib/roadmap-utils';
import { LAYOUT } from '@/types/roadmap';

interface RoadmapDependencyLinesProps {
  deps: RoadmapDependency[];
  groups: RoadmapGroup[];
  collapsed: Set<string>;
  timelineConfig: TimelineConfig;
}

interface BarPosition {
  id: string;
  left: number;
  right: number;
  centerY: number;
  critical?: boolean;
}

export function RoadmapDependencyLines({
  deps,
  groups,
  collapsed,
  timelineConfig,
}: RoadmapDependencyLinesProps) {
  // Calculate bar positions for all visible objectives
  const barPositions = useMemo(() => {
    const positions: Map<string, BarPosition> = new Map();
    let rowIndex = 0;
    
    groups.forEach((group) => {
      const isCollapsed = collapsed.has(group.id);
      // Skip theme header height
      rowIndex++; // Account for theme header
      
      if (!isCollapsed) {
        group.objs.forEach((obj) => {
          const left = dateToPosition(obj.start, timelineConfig);
          const right = dateToPosition(obj.end, timelineConfig);
          // Calculate Y position: theme header + row center
          const baseY = (rowIndex - 1) * LAYOUT.rowHeight + LAYOUT.themeHeight;
          const centerY = baseY + LAYOUT.rowHeight / 2;
          
          positions.set(obj.id, {
            id: obj.id,
            left,
            right,
            centerY,
            critical: obj.critical,
          });
          rowIndex++;
        });
      }
    });
    
    // Reset and recalculate properly
    positions.clear();
    let currentY = 0;
    
    groups.forEach((group) => {
      currentY += LAYOUT.themeHeight; // Theme header
      const isCollapsed = collapsed.has(group.id);
      
      if (!isCollapsed) {
        group.objs.forEach((obj) => {
          const left = dateToPosition(obj.start, timelineConfig);
          const right = dateToPosition(obj.end, timelineConfig);
          const centerY = currentY + LAYOUT.rowHeight / 2;
          
          positions.set(obj.id, {
            id: obj.id,
            left,
            right,
            centerY,
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
    return deps.map((dep) => {
      const from = barPositions.get(dep.from);
      const to = barPositions.get(dep.to);
      
      if (!from || !to) return null;
      
      // Determine start and end points based on dependency type
      let startX: number;
      let endX: number;
      
      switch (dep.type) {
        case 'fs': // Finish-to-Start: right edge of source → left edge of target
          startX = from.right;
          endX = to.left;
          break;
        case 'ss': // Start-to-Start: left edge of source → left edge of target
          startX = from.left;
          endX = to.left;
          break;
        case 'ff': // Finish-to-Finish: right edge of source → right edge of target
          startX = from.right;
          endX = to.right;
          break;
        case 'sf': // Start-to-Finish: left edge of source → right edge of target
          startX = from.left;
          endX = to.right;
          break;
        default:
          startX = from.right;
          endX = to.left;
      }
      
      const startY = from.centerY;
      const endY = to.centerY;
      
      // Determine if this is a critical path
      const isCritical = from.critical || to.critical;
      
      // Calculate control points for bezier curve
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const curveOffset = Math.max(Math.abs(deltaX) * 0.3, 30);
      
      // Create smooth bezier curve
      const cx1 = startX + curveOffset;
      const cy1 = startY;
      const cx2 = endX - curveOffset;
      const cy2 = endY;
      
      // SVG path with cubic bezier
      const pathD = `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
      
      // Arrowhead points (small triangle at end)
      const arrowSize = 6;
      const angle = Math.atan2(endY - cy2, endX - cx2);
      const arrowPoints = [
        [endX, endY],
        [endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6)],
        [endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6)],
      ].map(([x, y]) => `${x},${y}`).join(' ');
      
      return {
        key: `${dep.from}-${dep.to}`,
        pathD,
        arrowPoints,
        isCritical,
        startX,
        startY,
        endX,
        endY,
      };
    }).filter(Boolean);
  }, [deps, barPositions]);

  if (paths.length === 0) return null;

  return (
    <svg 
      className="absolute inset-0 pointer-events-none z-10 overflow-visible"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* Arrowhead markers */}
        <marker
          id="arrowhead-normal"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <polygon 
            points="0,1 8,4 0,7" 
            fill="#d4d4d4"
          />
        </marker>
        <marker
          id="arrowhead-critical"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <polygon 
            points="0,1 8,4 0,7" 
            fill="#737373"
          />
        </marker>
      </defs>
      
      {paths.map((path) => path && (
        <g key={path.key}>
          <path
            d={path.pathD}
            fill="none"
            stroke={path.isCritical ? '#737373' : '#d4d4d4'}
            strokeWidth={path.isCritical ? 2.5 : 1.5}
            markerEnd={`url(#arrowhead-${path.isCritical ? 'critical' : 'normal'})`}
          />
          {/* Start dot */}
          <circle
            cx={path.startX}
            cy={path.startY}
            r={path.isCritical ? 4 : 3}
            fill={path.isCritical ? '#737373' : '#d4d4d4'}
          />
        </g>
      ))}
    </svg>
  );
}
