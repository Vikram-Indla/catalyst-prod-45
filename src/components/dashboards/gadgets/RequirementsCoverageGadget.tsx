import { GadgetConfig } from '@/types/dashboard.types';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LabelList } from 'recharts';
import { CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface RequirementsCoverageGadgetProps {
  config: GadgetConfig;
}

export function RequirementsCoverageGadget({ config }: RequirementsCoverageGadgetProps) {
  // Sample data
  const data = {
    byType: [
      { type: 'Epics', total: 24, covered: 22, pct: 92 },
      { type: 'Features', total: 86, covered: 71, pct: 83 },
      { type: 'Stories', total: 234, covered: 178, pct: 76 }
    ],
    totalItems: 344,
    totalCovered: 271,
    overallPct: 79,
    uncovered: 73
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-gold" />
          <div>
            <div className="text-2xl font-bold">{data.overallPct}%</div>
            <div className="text-xs text-muted-foreground">Overall Coverage</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-green-500">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">{data.totalCovered}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">{data.uncovered}</span>
          </div>
        </div>
      </div>

      <Progress value={data.overallPct} className="h-3" />

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data.byType} layout="vertical" margin={{ left: 60, right: 40 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
          <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={60} />
          <Tooltip 
            formatter={(value: number, name: string, props: any) => [
              `${props.payload.covered}/${props.payload.total} (${value}%)`,
              'Coverage'
            ]}
          />
          <Bar dataKey="pct" fill="hsl(var(--brand-gold))" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-2 text-center">
        {data.byType.map(item => (
          <div key={item.type} className="p-2 rounded bg-muted/50">
            <div className="text-xs text-muted-foreground">{item.type}</div>
            <div className="text-sm font-medium">{item.covered}/{item.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
