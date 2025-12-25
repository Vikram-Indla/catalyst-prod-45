/**
 * DependencyWheelMap - Program dependency wheel visualization
 * 
 * Uses Epic container logic for Program-level dependencies.
 * All colors use CSS variables from index.css - no hardcoded HSL values.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { useState, useMemo, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DependencyWheelDetailsPanel } from './DependencyWheelDetailsPanel';
import { buildWorkItemMaps, extractProgramIdsFromDep, resolveDependencyWorkItems } from '@/lib/dependencies/resolveWorkItem';

interface DependencyWheelMapProps {
  quarter?: string;
  selectedProgram?: string;
  onDependencyClick?: (depId: string) => void;
  selectedProgramId?: string | null;
  onProgramSelect?: (programId: string | null, programName?: string) => void;
}

interface WheelNode {
  id: string;
  name: string;
  inboundCount: number;
  outboundCount: number;
}

interface WheelLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  dependencyId: string;
  workItemType: 'FEATURE' | 'EPIC';
  status: 'NOT_COMMITTED' | 'COMMITTED' | 'DONE' | 'BLOCKED' | 'NO_WORK_REQUIRED' | 'REJECTED';
  sourceName?: string;
  targetName?: string;
  dependency?: any;
}

export function DependencyWheelMap({ quarter, selectedProgram, onDependencyClick, selectedProgramId, onProgramSelect }: DependencyWheelMapProps) {
  const queryClient = useQueryClient();
  const [showFeatures, setShowFeatures] = useState(false);
  const [showEpics, setShowEpics] = useState(true);
  const [showOnlyAssociated, setShowOnlyAssociated] = useState(false);
  // Use controlled selection if provided, otherwise internal state
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null);
  const selectedNodeId = selectedProgramId !== undefined ? selectedProgramId : internalSelectedNodeId;
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch epics for container resolution - use primary_program_id
  const { data: epics } = useQuery({
    queryKey: ['epics-for-wheel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key, primary_program_id')
        .is('deleted_at', null);
      if (error) throw error;
      // Map primary_program_id to program_id for buildWorkItemMaps compatibility
      return (data || []).map(e => ({
        ...e,
        program_id: e.primary_program_id
      }));
    },
  });

  // Fetch features for legacy resolution
  const { data: features } = useQuery({
    queryKey: ['features-for-wheel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, display_id, project_id');
      if (error) throw error;
      return data;
    },
  });

  const { data: dependencies } = useQuery({
    queryKey: ['dependencies-wheel', quarter, selectedProgram],
    queryFn: async () => {
      let query = supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, display_id, epic_id),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, display_id, epic_id)
        `);
      
      if (quarter && quarter !== 'all') query = query.eq('quarter', quarter);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data;
    },
  });

  // Real-time subscription for dependencies and epics
  useEffect(() => {
    const depsChannel = supabase
      .channel('wheel-deps-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dependencies',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dependencies-wheel'] });
        }
      )
      .subscribe();

    const epicsChannel = supabase
      .channel('wheel-epics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'epics',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['epics-for-wheel'] });
        }
      )
      .subscribe();

    const featuresChannel = supabase
      .channel('wheel-features-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'features',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['features-for-wheel'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(depsChannel);
      supabase.removeChannel(epicsChannel);
      supabase.removeChannel(featuresChannel);
    };
  }, [queryClient]);

  // Build work item maps
  const workItemMaps = useMemo(() => {
    return buildWorkItemMaps(epics, features);
  }, [epics, features]);

  // Build nodes and links data structure using Epic container logic
  const { nodes, links } = useMemo(() => {
    if (!programs || !dependencies) {
      return { nodes: [], links: [] };
    }

    // Create nodes with dependency counts
    const nodeMap = new Map<string, WheelNode>();
    programs.forEach((prog) => {
      nodeMap.set(prog.id, {
        id: prog.id,
        name: prog.name,
        inboundCount: 0,
        outboundCount: 0,
      });
    });

    // Create links using Epic container logic
    const linkList: WheelLink[] = [];
    dependencies.forEach((dep: any) => {
      // Use container extraction for Epic dependencies
      const { sourceProgramId, targetProgramId } = extractProgramIdsFromDep(dep, workItemMaps);
      const { source, target } = resolveDependencyWorkItems(dep, workItemMaps);

      const fromNodeId = sourceProgramId;
      const toNodeId = targetProgramId;

      if (!fromNodeId || !toNodeId) return;
      if (!nodeMap.has(fromNodeId) || !nodeMap.has(toNodeId)) return;

      // Filter by selected program if specified
      if (selectedProgram && fromNodeId !== selectedProgram && toNodeId !== selectedProgram) {
        return;
      }

      // Filter by work item type toggles
      const sourceType = source?.type || 'feature';
      if (sourceType === 'epic' && !showEpics) return;
      if (sourceType === 'feature' && !showFeatures) return;

      // Map status to simplified enum
      let status: WheelLink['status'] = 'NOT_COMMITTED';
      if (dep.status === 'done' || dep.status === 'delivered') status = 'DONE';
      else if (dep.status === 'committed') status = 'COMMITTED';
      else if (dep.status === 'blocked') status = 'BLOCKED';
      else if (dep.status === 'rejected') status = 'REJECTED';

      linkList.push({
        id: dep.id,
        fromNodeId,
        toNodeId,
        dependencyId: dep.id,
        workItemType: sourceType === 'epic' ? 'EPIC' : 'FEATURE',
        status,
        sourceName: source?.name,
        targetName: target?.name,
        dependency: dep,
      });

      // Update counts
      const fromNode = nodeMap.get(fromNodeId)!;
      const toNode = nodeMap.get(toNodeId)!;
      fromNode.outboundCount++;
      toNode.inboundCount++;
    });

    // Filter nodes if showOnlyAssociated is true
    let filteredNodes = Array.from(nodeMap.values());
    if (showOnlyAssociated) {
      const connectedIds = new Set<string>();
      linkList.forEach(link => {
        connectedIds.add(link.fromNodeId);
        connectedIds.add(link.toNodeId);
      });
      filteredNodes = filteredNodes.filter(n => connectedIds.has(n.id));
    }

    return { nodes: filteredNodes, links: linkList };
  }, [programs, dependencies, workItemMaps, selectedProgram, showEpics, showFeatures, showOnlyAssociated]);

  if (!programs || programs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No programs found. Create programs to view wheel map.</p>
      </Card>
    );
  }

  const width = 900;
  const height = 900;
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = 380;
  const innerRadius = 140;
  const hubOuterRadius = 120;
  const hubInnerRadius = 60;
  
  // Calculate segment angles
  const segmentAngle = nodes.length > 0 ? (2 * Math.PI) / nodes.length : 0;
  
  // Use CSS variable-compatible colors (these are from the design system)
  const segmentColors = [
    'var(--brand-primary)',
    'var(--brand-primary-hover)',
    'var(--secondary-bronze)',
    'var(--brand-gold)',
    'var(--brand-primary-light)',
    'var(--text-muted)',
  ];
  
  // Create segments for each node
  const segments = nodes.map((node, index) => {
    const startAngle = index * segmentAngle - Math.PI / 2;
    const endAngle = (index + 1) * segmentAngle - Math.PI / 2;
    const midAngle = startAngle + segmentAngle / 2;
    
    // Calculate path for segment
    const x1 = centerX + innerRadius * Math.cos(startAngle);
    const y1 = centerY + innerRadius * Math.sin(startAngle);
    const x2 = centerX + outerRadius * Math.cos(startAngle);
    const y2 = centerY + outerRadius * Math.sin(startAngle);
    const x3 = centerX + outerRadius * Math.cos(endAngle);
    const y3 = centerY + outerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(endAngle);
    const y4 = centerY + innerRadius * Math.sin(endAngle);
    
    const largeArcFlag = segmentAngle > Math.PI ? 1 : 0;
    
    const path = `
      M ${x1} ${y1}
      L ${x2} ${y2}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}
      L ${x4} ${y4}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}
      Z
    `;
    
    const isSelected = selectedNodeId === node.id;
    const isHovered = hoveredNodeId === node.id;
    
    return {
      ...node,
      path,
      colorIndex: index % segmentColors.length,
      midAngle,
      isSelected,
      isHovered,
    };
  });
  
  // Map node IDs to angles for link drawing
  const nodeAngles = new Map<string, number>();
  segments.forEach((seg) => {
    nodeAngles.set(seg.id, seg.midAngle);
  });
  
  // Status color mapping using CSS variables
  const getStatusColor = (status: WheelLink['status']) => {
    switch (status) {
      case 'NOT_COMMITTED': return 'var(--status-danger)';
      case 'COMMITTED': return 'var(--status-success)';
      case 'DONE': return 'var(--text-muted)';
      case 'BLOCKED': return 'var(--status-warning)';
      case 'NO_WORK_REQUIRED': return 'var(--text-muted)';
      case 'REJECTED': return 'var(--status-danger)';
      default: return 'var(--text-muted)';
    }
  };
  
  // Create curved dependency lines
  const dependencyLines = links
    .filter((link) => link.fromNodeId !== link.toNodeId) // Skip self-dependencies (internal) - they don't render as chords
    .map((link) => {
      const fromAngle = nodeAngles.get(link.fromNodeId);
      const toAngle = nodeAngles.get(link.toNodeId);

      if (fromAngle === undefined || toAngle === undefined) return null;

      // Determine visibility and emphasis
      const isRelatedToSelected = selectedNodeId
        ? link.fromNodeId === selectedNodeId || link.toNodeId === selectedNodeId
        : true;

      const isHovered = hoveredLinkId === link.id;

      let opacity = isRelatedToSelected ? 0.7 : 0.15;
      let strokeWidth = isHovered ? 3 : 2;

      if (!isRelatedToSelected && !isHovered) {
        opacity = 0.1;
      }

      // Calculate connection points on hub outer radius
      const fromX = centerX + hubOuterRadius * Math.cos(fromAngle);
      const fromY = centerY + hubOuterRadius * Math.sin(fromAngle);
      const toX = centerX + hubOuterRadius * Math.cos(toAngle);
      const toY = centerY + hubOuterRadius * Math.sin(toAngle);

      // Create cubic Bezier curve with control points pulled toward center
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;
      const c1X = (fromX + midX) / 2;
      const c1Y = (fromY + midY) / 2;
      const c2X = (toX + midX) / 2;
      const c2Y = (toY + midY) / 2;

      const path = `M ${fromX} ${fromY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${toX} ${toY}`;

      return {
        ...link,
        path,
        color: getStatusColor(link.status),
        opacity,
        strokeWidth,
        isRelatedToSelected,
      };
    })
    .filter(Boolean) as any[];

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) || null : null;

  const handleNodeClick = (nodeId: string, segmentMidAngle: number) => {
    const node = nodes.find(n => n.id === nodeId);
    
    if (nodeId === selectedNodeId) {
      // Deselect
      if (onProgramSelect) {
        onProgramSelect(null);
      } else {
        setInternalSelectedNodeId(null);
      }
      setWheelRotation(0);
      return;
    }

    // Select and rotate
    if (onProgramSelect) {
      onProgramSelect(nodeId, node?.name);
    } else {
      setInternalSelectedNodeId(nodeId);
    }
    
    const targetAngle = 0;
    const rotationNeeded = (targetAngle - segmentMidAngle) * (180 / Math.PI);
    setWheelRotation(rotationNeeded);
  };

  const handleLinkClick = (depId: string) => {
    if (onDependencyClick) {
      onDependencyClick(depId);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 overflow-auto max-h-full">
      <div className="flex-1 space-y-4 min-w-0 overflow-visible">
        {/* Controls */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                id="epics"
                checked={showEpics}
                onCheckedChange={setShowEpics}
              />
              <Label htmlFor="epics" className="cursor-pointer text-xs sm:text-sm">Epic Dependencies</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="features"
                checked={showFeatures}
                onCheckedChange={setShowFeatures}
              />
              <Label htmlFor="features" className="cursor-pointer text-xs sm:text-sm">Feature Dependencies</Label>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Switch
                id="associated"
                checked={showOnlyAssociated}
                onCheckedChange={setShowOnlyAssociated}
              />
              <Label htmlFor="associated" className="cursor-pointer text-xs sm:text-sm">Show Only Connected</Label>
            </div>
          </div>
        </Card>

        {/* Wheel Map */}
        <Card className="p-2 sm:p-4 bg-background overflow-hidden">
          <div className="w-full flex items-center justify-center">
            <svg
              viewBox="0 0 900 900"
              className="w-full h-auto max-w-full"
              style={{ maxHeight: '80vh' }}
            >
              {/* Group for rotating the entire wheel around its center */}
              <g
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transformOrigin: `${centerX}px ${centerY}px`,
                  transition: 'transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)'
                }}
              >
                {/* Radial segments */}
                {segments.map((segment) => {
                  const labelRadius = (outerRadius + innerRadius) / 2;
                  const labelX = centerX + labelRadius * Math.cos(segment.midAngle);
                  const labelY = centerY + labelRadius * Math.sin(segment.midAngle);
                  
                  let effectiveAngle = (segment.midAngle * 180 / Math.PI) + wheelRotation;
                  effectiveAngle = ((effectiveAngle % 360) + 360) % 360;
                  
                  let textAngle = (segment.midAngle * 180 / Math.PI);
                  if (effectiveAngle > 90 && effectiveAngle <= 270) {
                    textAngle += 180;
                  }
                  
                  return (
                    <g key={segment.id}>
                      <path
                        d={segment.path}
                        fill={segmentColors[segment.colorIndex]}
                        opacity={segment.isSelected ? 1 : segment.isHovered ? 0.95 : 0.85}
                        stroke="white"
                        strokeWidth={segment.isSelected ? 3 : 2}
                        className="cursor-pointer"
                        style={{
                          transition: 'all 0.3s ease',
                          filter: segment.isSelected ? 'brightness(1.1)' : undefined
                        }}
                        onMouseEnter={() => setHoveredNodeId(segment.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        onClick={() => handleNodeClick(segment.id, segment.midAngle)}
                      />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textAngle} ${labelX} ${labelY})`}
                        className="font-semibold pointer-events-none select-none"
                        style={{ 
                          fontSize: segment.isSelected ? '14px' : '13px',
                          fill: 'white',
                          fontWeight: 700,
                          letterSpacing: '0.03em',
                          textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                        }}
                      >
                        {segment.name}
                      </text>
                    </g>
                  );
                })}
            
                {/* Center white circle (hub) */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={hubOuterRadius}
                  fill="var(--background)"
                  stroke="var(--border-default)"
                  strokeWidth="1"
                />
            
                {/* Curved dependency lines */}
                {dependencyLines.map((line: any) => (
                  <path
                    key={line.id}
                    d={line.path}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={line.strokeWidth}
                    opacity={line.opacity}
                    strokeLinecap="round"
                    className="cursor-pointer transition-all hover:opacity-100"
                    onMouseEnter={() => setHoveredLinkId(line.id)}
                    onMouseLeave={() => setHoveredLinkId(null)}
                    onClick={() => handleLinkClick(line.dependencyId)}
                  >
                    <title>{`${line.sourceName || 'Work Item'} → ${line.targetName || 'Work Item'} (${line.status})`}</title>
                  </path>
                ))}
            
                {/* Small inner circle */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={hubInnerRadius}
                  fill="var(--background)"
                  stroke="var(--border-subtle)"
                  strokeWidth="1"
                />
              </g>
            </svg>
          </div>
        </Card>
      </div>

      {/* Details Panel - Only show if analytics drawer is NOT being used (controlled mode) */}
      {/* When onProgramSelect is passed, the parent controls selection and shows AnalyticsDrawer instead */}
      {!onProgramSelect && (
        <>
          {/* Details Panel - Hidden on mobile, shown on lg+ */}
          <div className="hidden lg:block">
            <DependencyWheelDetailsPanel
              selectedNode={selectedNode}
              links={links}
              onDependencyClick={handleLinkClick}
            />
          </div>
          
          {/* Mobile Details - Show below wheel on mobile */}
          {selectedNode && (
            <div className="lg:hidden">
              <DependencyWheelDetailsPanel
                selectedNode={selectedNode}
                links={links}
                onDependencyClick={handleLinkClick}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
