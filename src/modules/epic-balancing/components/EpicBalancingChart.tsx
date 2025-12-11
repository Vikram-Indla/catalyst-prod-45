import { useMemo, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { 
  EpicBalancingEpic, 
  EpicBalancingStats, 
  STRATEGIC_DRIVER_COLORS,
  STRATEGIC_DRIVER_LABELS,
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
        
        <div className="text-muted-foreground">Business Value:</div>
        <div className="font-medium">{epic.businessValue ?? 'N/A'}</div>
        
        <div className="text-muted-foreground">Time Criticality:</div>
        <div className="font-medium">{epic.timeCriticality ?? 'N/A'}</div>
        
        <div className="text-muted-foreground">Opportunity:</div>
        <div className="font-medium">{epic.opportunityEnablement ?? 'N/A'}</div>
        
        <div className="text-muted-foreground">Cost of Delay:</div>
        <div className="font-medium">{epic.costOfDelay ?? 'N/A'}</div>
        
        <div className="text-muted-foreground">Technical Score:</div>
        <div className="font-medium text-brand-gold">
          {epic.technicalScore !== null ? epic.technicalScore.toFixed(2) : 'N/A'}
        </div>
        
        <div className="text-muted-foreground">Strategic Driver:</div>
        <div className="font-medium">{STRATEGIC_DRIVER_LABELS[epic.strategicDriver]}</div>
        
        <div className="text-muted-foreground">Ability to Execute:</div>
        <div className="font-medium">{epic.abilityToExecute}</div>
      </div>
    </div>
  );
}

export function EpicBalancingChart({ epics, stats, onEpicClick }: EpicBalancingChartProps) {
  const [hoveredEpic, setHoveredEpic] = useState<string | null>(null);

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

    const minRadius = 12;
    const maxRadius = 40;

    return validEpics.map(epic => ({
      x: epic.jobSize!,
      y: epic.costOfDelay!,
      z: epic.technicalScore !== null 
        ? minRadius + ((epic.technicalScore - minScore) / scoreRange) * (maxRadius - minRadius)
        : minRadius,
      epic,
    }));
  }, [epics]);

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
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Job Size" 
            domain={[0, maxX]}
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
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            label={{ 
              value: 'Cost of Delay (BV + TC + Opportunity)', 
              angle: -90, 
              position: 'left', 
              offset: 40,
              style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
            }}
          />

          {/* Median reference lines */}
          <ReferenceLine 
            x={stats.medianJobSize} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="5 5"
            label={{ 
              value: 'Effort', 
              position: 'top',
              style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
            }}
          />
          <ReferenceLine 
            y={stats.medianCostOfDelay} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="5 5"
            label={{ 
              value: 'Value', 
              position: 'right',
              style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Scatter
            data={chartData}
            onClick={(data) => onEpicClick(data.epic)}
            onMouseEnter={(data) => setHoveredEpic(data.epic.id)}
            onMouseLeave={() => setHoveredEpic(null)}
            cursor="pointer"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={STRATEGIC_DRIVER_COLORS[entry.epic.strategicDriver]}
                fillOpacity={hoveredEpic === entry.epic.id ? 0.9 : 0.7}
                stroke={STRATEGIC_DRIVER_COLORS[entry.epic.strategicDriver]}
                strokeWidth={ABILITY_TO_EXECUTE_STROKE[entry.epic.abilityToExecute]}
                r={entry.z}
                aria-label={`Epic ${entry.epic.key} – ${entry.epic.name}: Job Size ${entry.epic.jobSize}, Cost of Delay ${entry.epic.costOfDelay}, Technical Score ${entry.epic.technicalScore?.toFixed(2) ?? 'N/A'}, Strategic Driver ${STRATEGIC_DRIVER_LABELS[entry.epic.strategicDriver]}, Ability to Execute ${entry.epic.abilityToExecute}.`}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
