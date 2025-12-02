import { GadgetConfig } from '@/types/dashboard.types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface TesterWorkloadGadgetProps {
  config: GadgetConfig;
}

export function TesterWorkloadGadget({ config }: TesterWorkloadGadgetProps) {
  // Sample data
  const testers = [
    { name: 'John D.', total: 45, completed: 38, completionPct: 84, passRate: 92 },
    { name: 'Sarah M.', total: 52, completed: 41, completionPct: 79, passRate: 88 },
    { name: 'Mike R.', total: 38, completed: 35, completionPct: 92, passRate: 94 },
    { name: 'Lisa K.', total: 30, completed: 22, completionPct: 73, passRate: 85 },
    { name: 'Tom W.', total: 28, completed: 28, completionPct: 100, passRate: 89 }
  ];

  const chartData = testers.map(t => ({
    name: t.name,
    Completed: t.completed,
    Remaining: t.total - t.completed
  }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
          <Tooltip />
          <Bar dataKey="Completed" stackId="a" fill="hsl(var(--brand-gold))" />
          <Bar dataKey="Remaining" stackId="a" fill="hsl(var(--muted))" />
        </BarChart>
      </ResponsiveContainer>

      <div className="space-y-2 max-h-[100px] overflow-y-auto">
        {testers.slice(0, 4).map((tester) => (
          <div key={tester.name} className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-brand-gold/20 text-brand-gold">
                {tester.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs">
                <span className="truncate">{tester.name}</span>
                <span className="text-muted-foreground">{tester.completionPct}%</span>
              </div>
              <Progress value={tester.completionPct} className="h-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
