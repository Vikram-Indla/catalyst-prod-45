// =====================================================
// DEPENDENCY LINES COMPONENT
// SVG curved arrows between timeline items
// =====================================================

import React, { useMemo } from 'react';
import { TimelineDependency, TimelineRelease, TimelineFeature } from '@/services/timelineService';

interface DependencyLinesProps {
  dependencies: TimelineDependency[];
  releases: TimelineRelease[];
  pixelsPerDay: number;
  dateRangeStart: Date;
  rowHeight: number;
  headerHeight: number;
}

interface FeaturePosition {
  left: number;
  right: number;
  top: number;
  featureId: string;
}

export function DependencyLines({
  dependencies,
  releases,
  pixelsPerDay,
  dateRangeStart,
  rowHeight,
  headerHeight
}: DependencyLinesProps) {
  // Build feature position map
  const featurePositions = useMemo(() => {
    const positions = new Map<string, FeaturePosition>();
    let currentRow = 0;

    for (const release of releases) {
      currentRow++; // Release header row
      
      if (!release.isCollapsed) {
        for (const feature of release.features) {
          const startMs = feature.start_date.getTime();
          const endMs = feature.end_date.getTime();
          const rangeStartMs = dateRangeStart.getTime();
          
          const daysFromStart = (startMs - rangeStartMs) / (1000 * 60 * 60 * 24);
          const duration = (endMs - startMs) / (1000 * 60 * 60 * 24);
          
          const left = daysFromStart * pixelsPerDay;
          const width = Math.max(duration * pixelsPerDay, 50);
          
          positions.set(feature.id, {
            left,
            right: left + width,
            top: headerHeight + currentRow * rowHeight + rowHeight / 2,
            featureId: feature.id
          });
          
          currentRow++;
        }
      }
    }

    return positions;
  }, [releases, pixelsPerDay, dateRangeStart, rowHeight, headerHeight]);

  // Generate SVG paths for dependencies
  const paths = useMemo(() => {
    const result: Array<{
      id: string;
      path: string;
      isResolved: boolean;
    }> = [];

    for (const dep of dependencies) {
      // Only show feature-to-feature dependencies for now
      if (dep.from_type !== 'feature' || dep.to_type !== 'feature') continue;
      
      const fromPos = featurePositions.get(dep.from_id);
      const toPos = featurePositions.get(dep.to_id);
      
      if (!fromPos || !toPos) continue;

      // Create curved path from blocker (from) to dependent (to)
      const startX = fromPos.right;
      const startY = fromPos.top;
      const endX = toPos.left;
      const endY = toPos.top;

      // Bezier curve control points
      const controlX = (startX + endX) / 2;
      const path = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;

      result.push({
        id: dep.from_id + '-' + dep.to_id,
        path,
        isResolved: dep.is_resolved
      });
    }

    return result;
  }, [dependencies, featurePositions]);

  if (paths.length === 0) return null;

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }}
    >
      <defs>
        <marker
          id="timeline-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="var(--ds-text-warning, var(--ds-text-warning, #f59e0b))" />
        </marker>
        <marker
          id="timeline-arrow-resolved"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#0d9488" />
        </marker>
      </defs>
      {paths.map((p) => (
        <path
          key={p.id}
          d={p.path}
          fill="none"
          stroke={p.isResolved ? '#0d9488' : 'var(--ds-text-warning, var(--ds-text-warning, #f59e0b))'}
          strokeWidth={2}
          strokeDasharray={p.isResolved ? '4 2' : 'none'}
          markerEnd={p.isResolved ? 'url(#timeline-arrow-resolved)' : 'url(#timeline-arrow)'}
        />
      ))}
    </svg>
  );
}
