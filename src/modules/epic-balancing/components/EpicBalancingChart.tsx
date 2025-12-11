import { useMemo, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, ReferenceArea } from 'recharts';
import { 
  EpicBalancingEpic, 
  EpicBalancingStats, 
  PRIORITY_TO_EXECUTE_COLORS,
  PRIORITY_TO_EXECUTE_LABELS,
  ABILITY_TO_EXECUTE_STROKE 
} from '../types';

interface EpicBalancingChartProps {
  epics: EpicBalancingEpic[];
  stats: EpicBalancingStats;
  onEpicClick: (epic: EpicBalancingEpic) => void;
}

interface ChartDataPoint {
  x: number;
  y: number;
  z: number;
  epic: EpicBalancingEpic;
  rank: number | null;
}

// Custom shape to render dot with rank label for top 5
function RankedDot(props: any) {
  const { cx, cy, payload, fill, stroke, strokeWidth, fillOpacity, onClick, onMouseEnter, onMouseLeave } = props;
  const rank = payload?.rank;
  const r = payload?.z ?? 12;
  const isTop5 = rank && rank <= 5;

  return (
    <g 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {isTop5 && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={10}
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          {rank}
        </text>
      )}
    </g>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]?.payload?.epic) return null;

  const epic = payload[0].payload.epic as EpicBalancingEpic;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-xs z-50">
      <div className="font-semibold text-foreground mb-2">
        <span className="text-brand-gold">{epic.key}</span> - {epic.name}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-muted-foreground">Job Size:</div>
        <div className="font-medium">{epic.jobSize ?? 'N/A'}</div>
        
        <div className="text-muted-foreground">Business Alignment:</div>
        <div className="font-medium">{epic.businessAlignment ?? 'N/A'}</div>
        
        <div className="text-muted-foreground">Time Criticality:</div>
        <div className="font-medium">{epic.timeCriticality ?? 'N/A'}</div>
        
        <div className="text-muted-foreground">Investor Enablement:</div>
        <div className="font-medium">{epic.investorEnablement ?? 'N/A'}</div>
        
        <div className="text-muted-foreground">Cost of Delay:</div>
        <div className="font-medium">{epic.costOfDelay ?? 'N/A'}</div>
        
        <div className="text-muted-foreground">Technical Score:</div>
        <div className="font-medium text-brand-gold">
          {epic.technicalScore !== null ? epic.technicalScore.toFixed(2) : 'N/A'}
        </div>
        
        <div className="text-muted-foreground">Priority to Execute:</div>
        <div className="font-medium">{PRIORITY_TO_EXECUTE_LABELS[epic.priorityToExecute]}</div>
        
        <div className="text-muted-foreground">Ability to Execute:</div>
        <div className="font-medium">{epic.abilityToExecute}</div>
      </div>
    </div>
  );
}

export function EpicBalancingChart({ epics, stats, onEpicClick }: EpicBalancingChartProps) {
  const [hoveredEpic, setHoveredEpic] = useState<string | null>(null);

  // Calculate technical rankings (1 = highest score)
  const rankedEpics = useMemo(() => {
    return [...epics]
      .filter(e => e.technicalScore !== null)
      .sort((a, b) => (b.technicalScore ?? 0) - (a.technicalScore ?? 0))
      .reduce((acc, epic, index) => {
        acc[epic.id] = index + 1; // Rank 1 to N
        return acc;
      }, {} as Record<string, number>);
  }, [epics]);

  const chartData: ChartDataPoint[] = useMemo(() => {
    // Filter epics with valid data
    const validEpics = epics.filter(e => e.jobSize !== null && e.costOfDelay !== null);
    
    // Calculate min/max technical score for radius normalization
    const scores = validEpics
      .map(e => e.technicalScore)
      .filter((s): s is number => s !== null);
    
    const minScore = Math.min(...scores, 0);
    const maxScore = Math.max(...scores, 1);
    const scoreRange = maxScore - minScore || 1;

    const minRadius = 3;
    const maxRadius = 10;

    return validEpics.map(epic => ({
      x: epic.jobSize!,
      y: epic.costOfDelay!,
      z: epic.technicalScore !== null 
        ? minRadius + ((epic.technicalScore - minScore) / scoreRange) * (maxRadius - minRadius)
        : minRadius,
      epic,
      rank: rankedEpics[epic.id] ?? null,
    }));
  }, [epics, rankedEpics]);

  const { maxX, maxY } = useMemo(() => {
    const xValues = chartData.map(d => d.x);
    const yValues = chartData.map(d => d.y);
    return {
      maxX: Math.max(...xValues, 20) * 1.1,
      maxY: Math.max(...yValues, 50) * 1.1,
    };
  }, [chartData]);

  if (epics.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">No epics match the current filters</p>
          <p className="text-sm mt-1">Adjust filters or score epics in the Program backlog.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Job Size" 
            domain={[0, maxX]}
            tickFormatter={(value) => Math.round(value).toString()}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            label={{ 
              value: 'Job Size (relative effort / duration)', 
              position: 'bottom', 
              offset: 40,
              style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
            }}
          />
          
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Cost of Delay" 
            domain={[0, maxY]}
            tickFormatter={(value) => Math.round(value).toString()}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            label={{ 
              value: 'Cost of Delay (BA + TC + IE)', 
              angle: -90, 
              position: 'left', 
              offset: 40,
              style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
            }}
          />

          {/* Quadrant labels */}
          <ReferenceArea
            x1={0}
            x2={stats.medianJobSize}
            y1={stats.medianCostOfDelay}
            y2={maxY}
            fill="transparent"
            label={{ value: 'Urgent', position: 'center', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontWeight: 600 } }}
          />
          <ReferenceArea
            x1={stats.medianJobSize}
            x2={maxX}
            y1={stats.medianCostOfDelay}
            y2={maxY}
            fill="transparent"
            label={{ value: 'High', position: 'center', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontWeight: 600 } }}
          />
          <ReferenceArea
            x1={0}
            x2={stats.medianJobSize}
            y1={0}
            y2={stats.medianCostOfDelay}
            fill="transparent"
            label={{ value: 'Medium', position: 'center', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontWeight: 600 } }}
          />
          <ReferenceArea
            x1={stats.medianJobSize}
            x2={maxX}
            y1={0}
            y2={stats.medianCostOfDelay}
            fill="transparent"
            label={{ value: 'Low', position: 'center', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontWeight: 600 } }}
          />

          {/* Median reference lines */}
          <ReferenceLine 
            x={stats.medianJobSize} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="5 5"
          />
          <ReferenceLine 
            y={stats.medianCostOfDelay} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="5 5"
          />

          <Tooltip content={<CustomTooltip />} />

          <Scatter
            data={chartData}
            shape={(props: any) => (
              <RankedDot
                {...props}
                fill={PRIORITY_TO_EXECUTE_COLORS[props.payload.epic.priorityToExecute]}
                fillOpacity={hoveredEpic === props.payload.epic.id ? 0.9 : 0.7}
                stroke={PRIORITY_TO_EXECUTE_COLORS[props.payload.epic.priorityToExecute]}
                strokeWidth={ABILITY_TO_EXECUTE_STROKE[props.payload.epic.abilityToExecute]}
                onClick={() => onEpicClick(props.payload.epic)}
                onMouseEnter={() => setHoveredEpic(props.payload.epic.id)}
                onMouseLeave={() => setHoveredEpic(null)}
              />
            )}
          />
        </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      {/* Bottom Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 pb-2">
        <span className="text-sm font-medium text-foreground">Priority to Execute:</span>
        {(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW'] as const).map((priority) => (
          <div key={priority} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: PRIORITY_TO_EXECUTE_COLORS[priority] }}
            />
            <span className="text-sm text-secondary-green">{PRIORITY_TO_EXECUTE_LABELS[priority]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}