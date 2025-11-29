import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DependencyWheelMapProps {
  piId?: string;
  selectedProgram?: string;
}

export function DependencyWheelMap({ piId, selectedProgram }: DependencyWheelMapProps) {
  const [showFeatures, setShowFeatures] = useState(true);
  const [showEpics, setShowEpics] = useState(true);
  const [showCapabilities, setShowCapabilities] = useState(true);
  const [showOnlyAssociated, setShowOnlyAssociated] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

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

  if (!programs || programs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No programs found. Create programs to view wheel map.</p>
      </Card>
    );
  }

  const width = 800;
  const height = 800;
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = 350;
  const innerRadius = 120;
  
  // Calculate segment angles
  const segmentAngle = (2 * Math.PI) / programs.length;
  
  // Alternating colors for segments (cyan/teal shades)
  const colors = ['#06b6d4', '#0891b2', '#0e7490', '#155e75'];
  
  // Create segments for each program
  const segments = programs.map((prog, index) => {
    const startAngle = index * segmentAngle - Math.PI / 2;
    const endAngle = (index + 1) * segmentAngle - Math.PI / 2;
    
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
    
    // Calculate label position (on outer edge)
    const labelAngle = startAngle + segmentAngle / 2;
    const labelRadius = outerRadius + 30;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);
    
    // Calculate text rotation
    let textAngle = (labelAngle * 180 / Math.PI) + 90;
    if (textAngle > 90 && textAngle < 270) {
      textAngle += 180;
    }
    
    return {
      id: prog.id,
      name: prog.name,
      path,
      labelX,
      labelY,
      textAngle,
      color: colors[index % colors.length],
      midAngle: startAngle + segmentAngle / 2,
    };
  });
  
  // Create curved dependency lines using Bezier curves
  const dependencyLines = dependencies?.map((dep: any) => {
    // Use requesting_program_id and depends_on_program_id for cross-program dependencies
    const fromSegment = segments.find((s) => s.id === dep.requesting_program_id);
    const toSegment = segments.find((s) => s.id === dep.depends_on_program_id);
    
    if (!fromSegment || !toSegment) return null;
    
    // Skip if same program (internal dependencies not shown in wheel map)
    if (fromSegment.id === toSegment.id) return null;
    
    // Calculate connection points on inner circle
    const fromX = centerX + (innerRadius - 10) * Math.cos(fromSegment.midAngle);
    const fromY = centerY + (innerRadius - 10) * Math.sin(fromSegment.midAngle);
    const toX = centerX + (innerRadius - 10) * Math.cos(toSegment.midAngle);
    const toY = centerY + (innerRadius - 10) * Math.sin(toSegment.midAngle);
    
    // Create curved path using quadratic Bezier curve through center
    const path = `M ${fromX} ${fromY} Q ${centerX} ${centerY} ${toX} ${toY}`;
    
    // Color based on status and risk
    let color = '#22c55e'; // green for completed
    let opacity = 0.6;
    
    if (dep.risk_level === 'high') {
      color = '#ef4444'; // red
      opacity = 0.8;
    } else if (dep.risk_level === 'med') {
      color = '#f59e0b'; // yellow
      opacity = 0.7;
    } else if (dep.status === 'open' || dep.status === 'pending_commit') {
      color = '#22c55e'; // green
      opacity = 0.5;
    }
    
    return {
      id: dep.id,
      path,
      color,
      opacity,
    };
  }).filter(Boolean) || [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-6">
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
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto"
        >
          {/* Radial segments */}
          {segments.map((segment) => (
            <g key={segment.id}>
              <path
                d={segment.path}
                fill={segment.color}
                opacity="0.8"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
              />
              {/* Program label on outer edge */}
              <text
                x={segment.labelX}
                y={segment.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${segment.textAngle} ${segment.labelX} ${segment.labelY})`}
                className="text-xs font-medium fill-white"
                style={{ fontSize: '11px' }}
              >
                {segment.name}
              </text>
            </g>
          ))}
          
          {/* Center white circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerRadius}
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
              strokeWidth="2"
              opacity={line.opacity}
              strokeLinecap="round"
            />
          ))}
        </svg>
      </Card>
    </div>
  );
}
