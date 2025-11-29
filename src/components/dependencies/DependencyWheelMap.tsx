import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DependencyWheelMapProps {
  piId?: string;
  selectedProgram?: string;
}

export function DependencyWheelMap({ piId, selectedProgram }: DependencyWheelMapProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

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
      
      // Filter by selected program if provided
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

  const centerX = 300;
  const centerY = 300;
  const radius = 200;
  const nodeRadius = 40;

  const programPositions = programs.map((prog, index) => {
    const angle = (index / programs.length) * 2 * Math.PI - Math.PI / 2;
    return {
      id: prog.id,
      name: prog.name,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const getDependencyLines = () => {
    if (!dependencies) return [];
    
    return dependencies.map((dep: any) => {
      const fromPos = programPositions.find((p) => p.id === dep.from_feature?.program_id);
      const toPos = programPositions.find((p) => p.id === dep.to_feature?.program_id);
      
      if (!fromPos || !toPos) return null;
      
      return {
        id: dep.id,
        from: fromPos,
        to: toPos,
        status: dep.status,
        riskLevel: dep.risk_level,
      };
    }).filter(Boolean);
  };

  const lines = getDependencyLines();

  const getLineColor = (status: string, riskLevel: string) => {
    if (riskLevel === 'high') return '#ef4444';
    if (riskLevel === 'med') return '#f59e0b';
    if (status === 'done' || status === 'delivered') return '#22c55e';
    return '#6b7280';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Dependency Wheel Map</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-green-500" />
            <span className="text-muted-foreground">Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-yellow-500" />
            <span className="text-muted-foreground">Medium Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-red-500" />
            <span className="text-muted-foreground">High Risk</span>
          </div>
        </div>
      </div>

      <Card className="p-8 bg-muted/30">
        <svg width="600" height="600" className="mx-auto">
          {/* Dependency lines */}
          {lines.map((line: any) => (
            <line
              key={line.id}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
              stroke={getLineColor(line.status, line.riskLevel)}
              strokeWidth="2"
              opacity="0.6"
            />
          ))}

          {/* Program nodes */}
          {programPositions.map((prog) => {
            const depCount = dependencies?.filter(
              (dep: any) =>
                dep.from_feature?.program_id === prog.id ||
                dep.to_feature?.program_id === prog.id
            ).length || 0;

            return (
              <TooltipProvider key={prog.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <g
                      onMouseEnter={() => setHoveredNode(prog.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={prog.x}
                        cy={prog.y}
                        r={nodeRadius}
                        fill={hoveredNode === prog.id ? 'hsl(var(--primary))' : 'hsl(var(--background))'}
                        stroke="hsl(var(--border))"
                        strokeWidth="2"
                      />
                      <text
                        x={prog.x}
                        y={prog.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-medium fill-foreground pointer-events-none"
                        style={{ maxWidth: nodeRadius * 1.5 }}
                      >
                        {prog.name.length > 8 ? prog.name.substring(0, 8) + '...' : prog.name}
                      </text>
                      {depCount > 0 && (
                        <circle
                          cx={prog.x + nodeRadius - 10}
                          cy={prog.y - nodeRadius + 10}
                          r="12"
                          fill="hsl(var(--primary))"
                        />
                      )}
                      {depCount > 0 && (
                        <text
                          x={prog.x + nodeRadius - 10}
                          y={prog.y - nodeRadius + 10}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-xs font-bold fill-primary-foreground pointer-events-none"
                        >
                          {depCount}
                        </text>
                      )}
                    </g>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{prog.name}</p>
                    <p className="text-xs text-muted-foreground">{depCount} dependencies</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </svg>
      </Card>
    </div>
  );
}
