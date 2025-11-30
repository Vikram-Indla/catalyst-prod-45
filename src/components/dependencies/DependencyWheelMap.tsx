import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { useState, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DependencyWheelDetailsPanel } from './DependencyWheelDetailsPanel';

interface DependencyWheelMapProps {
  piId?: string;
  selectedProgram?: string;
  onDependencyClick?: (depId: string) => void;
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
  workItemType: 'FEATURE' | 'EPIC' | 'CAPABILITY';
  status: 'NOT_COMMITTED' | 'COMMITTED' | 'DONE' | 'BLOCKED' | 'NO_WORK_REQUIRED' | 'REJECTED';
  fromFeature?: any;
  toFeature?: any;
  dependency?: any;
}

export function DependencyWheelMap({ piId, selectedProgram, onDependencyClick }: DependencyWheelMapProps) {
  const [showFeatures, setShowFeatures] = useState(true);
  const [showEpics, setShowEpics] = useState(true);
  const [showCapabilities, setShowCapabilities] = useState(true);
  const [showOnlyAssociated, setShowOnlyAssociated] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
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

  const { data: dependencies } = useQuery({
    queryKey: ['dependencies-wheel', piId, selectedProgram],
    queryFn: async () => {
      let query = supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, program_id),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, program_id)
        `);
      
      if (piId) query = query.eq('pi_id', piId);
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (selectedProgram) {
        return data.filter(
          (dep: any) =>
            dep.from_feature?.program_id === selectedProgram ||
            dep.to_feature?.program_id === selectedProgram
        );
      }
      
      return data;
    },
  });

  // Build nodes and links data structure
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

    // Create links and update counts
    const linkList: WheelLink[] = [];
    dependencies.forEach((dep: any) => {
      const fromNodeId = dep.requesting_program_id || dep.from_feature?.program_id;
      const toNodeId = dep.depends_on_program_id || dep.to_feature?.program_id;

      if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
      if (!nodeMap.has(fromNodeId) || !nodeMap.has(toNodeId)) return;

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
        workItemType: 'FEATURE', // TODO: derive from actual work item type
        status,
        fromFeature: dep.from_feature,
        toFeature: dep.to_feature,
        dependency: dep,
      });

      // Update counts
      const fromNode = nodeMap.get(fromNodeId)!;
      const toNode = nodeMap.get(toNodeId)!;
      fromNode.outboundCount++;
      toNode.inboundCount++;
    });

    return { nodes: Array.from(nodeMap.values()), links: linkList };
  }, [programs, dependencies]);

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
  const segmentAngle = (2 * Math.PI) / nodes.length;
  
  // Catalyst theme colors - teal/blue-gray palette matching brand aesthetic
  const colors = [
    'hsl(195, 52%, 62%)', // Light teal #68bbd4
    'hsl(195, 45%, 58%)', // Medium teal #5dadc4
    'hsl(195, 38%, 54%)', // Muted teal #5a9fb0
    'hsl(195, 32%, 50%)', // Deep teal #568a9b
    'hsl(195, 48%, 60%)', // Bright teal #66b5cc
    'hsl(195, 40%, 56%)', // Mid teal #5da4b5
    'hsl(195, 35%, 52%)', // Steel teal #588f9f
    'hsl(195, 42%, 58%)', // Soft teal #5faabb
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
      color: colors[index % colors.length],
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
  
  // Status color mapping using Catalyst theme colors
  const statusColor = (status: WheelLink['status']) => {
    switch (status) {
      case 'NOT_COMMITTED': return 'hsl(0, 72%, 51%)'; // Catalyst destructive red
      case 'COMMITTED': return 'hsl(142, 71%, 50%)'; // Catalyst success green
      case 'DONE': return 'hsl(217, 10%, 65%)'; // Catalyst neutral gray
      case 'BLOCKED': return 'hsl(38, 92%, 50%)'; // Catalyst warning orange
      case 'NO_WORK_REQUIRED': return 'hsl(217, 10%, 65%)'; // Catalyst muted
      case 'REJECTED': return 'hsl(0, 84%, 60%)'; // Catalyst red variant
      default: return 'hsl(217, 10%, 65%)'; // Catalyst neutral
    }
  };
  
  // Create curved dependency lines
  const dependencyLines = links.map((link) => {
    const fromAngle = nodeAngles.get(link.fromNodeId);
    const toAngle = nodeAngles.get(link.toNodeId);
    
    if (fromAngle === undefined || toAngle === undefined) return null;
    
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
    
    // Determine visibility and emphasis
    const isRelatedToSelected = selectedNodeId 
      ? (link.fromNodeId === selectedNodeId || link.toNodeId === selectedNodeId)
      : true;
    
    const isHovered = hoveredLinkId === link.id;
    
    let opacity = isRelatedToSelected ? 0.7 : 0.15;
    let strokeWidth = isHovered ? 3 : 2;
    
    if (!isRelatedToSelected && !isHovered) {
      opacity = 0.1;
    }
    
    return {
      ...link,
      path,
      color: statusColor(link.status),
      opacity,
      strokeWidth,
      isRelatedToSelected,
    };
  }).filter(Boolean) as any[];

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) || null : null;

  const handleNodeClick = (nodeId: string, segmentMidAngle: number) => {
    if (nodeId === selectedNodeId) {
      setSelectedNodeId(null);
      setWheelRotation(0);
    } else {
      setSelectedNodeId(nodeId);
      // Calculate rotation needed to position this segment at 0 radians (pointing right, 3 o'clock)
      const targetAngle = 0; // 0 radians = pointing right
      const rotationNeeded = (targetAngle - segmentMidAngle) * (180 / Math.PI);
      setWheelRotation(rotationNeeded);
    }
  };

  const handleLinkClick = (depId: string) => {
    if (onDependencyClick) {
      onDependencyClick(depId);
    }
  };

  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-4">
        {/* Controls */}
        <Card className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                id="features"
                checked={showFeatures}
                onCheckedChange={setShowFeatures}
              />
              <Label htmlFor="features" className="cursor-pointer">Feature</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="epics"
                checked={showEpics}
                onCheckedChange={setShowEpics}
              />
              <Label htmlFor="epics" className="cursor-pointer">Epic</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="capabilities"
                checked={showCapabilities}
                onCheckedChange={setShowCapabilities}
              />
              <Label htmlFor="capabilities" className="cursor-pointer">Capability</Label>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Switch
                id="associated"
                checked={showOnlyAssociated}
                onCheckedChange={setShowOnlyAssociated}
              />
              <Label htmlFor="associated" className="cursor-pointer">Show Only Associated</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="inactive" className="cursor-pointer">Show Inactive</Label>
            </div>
          </div>
        </Card>

        {/* Wheel Map */}
        <Card className="p-4 bg-background overflow-hidden">
          <div className="w-full h-full flex items-center justify-center">
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              className="mx-auto"
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
              // Calculate label position INSIDE the segment (middle of the radial span)
              const labelRadius = (outerRadius + innerRadius) / 2;
              const labelX = centerX + labelRadius * Math.cos(segment.midAngle);
              const labelY = centerY + labelRadius * Math.sin(segment.midAngle);
              
              // Text should be RADIAL - reading from center outward along the segment
              // Calculate the EFFECTIVE angle after wheel rotation
              let effectiveAngle = (segment.midAngle * 180 / Math.PI) + wheelRotation;
              
              // Normalize to 0-360 range
              effectiveAngle = ((effectiveAngle % 360) + 360) % 360;
              
              // Start with the segment's base angle for text rotation
              let textAngle = (segment.midAngle * 180 / Math.PI);
              
              // For segments in left half AFTER rotation (90° to 270°), flip text 180°
              // so it reads from center outward instead of outside inward
              if (effectiveAngle > 90 && effectiveAngle <= 270) {
                textAngle += 180;
              }
              
              return (
                <g key={segment.id}>
                  <path
                    d={segment.path}
                    fill={segment.color}
                    opacity={segment.isSelected ? 1 : segment.isHovered ? 0.95 : 0.85}
                    stroke={segment.isSelected ? 'hsl(35, 46%, 60%)' : 'white'}
                    strokeWidth={segment.isSelected ? 4 : 2}
                    className="cursor-pointer"
                    style={{
                      filter: segment.isSelected ? 'drop-shadow(0 0 12px hsla(35, 46%, 60%, 0.6))' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={() => setHoveredNodeId(segment.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => handleNodeClick(segment.id, segment.midAngle)}
                  />
                  {/* Program label - RADIAL direction (following segment from center outward) */}
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
              fill="white"
              stroke="rgba(0,0,0,0.1)"
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
                <title>{`${line.fromFeature?.name || 'Feature'} → ${line.toFeature?.name || 'Feature'} (${line.status})`}</title>
              </path>
              ))}
            
              {/* Small inner circle */}
              <circle
                cx={centerX}
                cy={centerY}
                r={hubInnerRadius}
                fill="white"
                stroke="rgba(0,0,0,0.05)"
                strokeWidth="1"
              />
              </g>
            </svg>
          </div>
        </Card>
      </div>

      {/* Details Panel */}
      <DependencyWheelDetailsPanel
        selectedNode={selectedNode}
        links={links}
        onDependencyClick={handleLinkClick}
      />
    </div>
  );
}
