import { GadgetConfig } from '@/types/dashboard.types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FileText, CheckSquare, AlertCircle } from 'lucide-react';

interface TestCoverageGadgetProps {
  config: GadgetConfig;
}

export function TestCoverageGadget({ config }: TestCoverageGadgetProps) {
  // Sample data
  const data = {
    totalItems: 120,
    coveredItems: 92,
    uncoveredItems: 28,
    coveragePct: 77,
    features: { total: 45, covered: 38 },
    stories: { total: 75, covered: 54 },
    totalTestCases: 256
  };

  const pieData = [
    { name: 'Covered', value: data.coveredItems, color: 'hsl(var(--brand-gold))' },
    { name: 'Uncovered', value: data.uncoveredItems, color: 'hsl(var(--muted))' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="relative">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-gold">{data.coveragePct}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>Features</span>
          </div>
          <span className="font-medium">{data.features.covered}/{data.features.total}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <span>Stories</span>
          </div>
          <span className="font-medium">{data.stories.covered}/{data.stories.total}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span>Test Cases</span>
          </div>
          <span className="font-medium">{data.totalTestCases}</span>
        </div>
      </div>
    </div>
  );
}
