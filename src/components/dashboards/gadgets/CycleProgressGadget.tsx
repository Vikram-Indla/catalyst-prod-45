import { GadgetConfig } from '@/types/dashboard.types';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface CycleProgressGadgetProps {
  config: GadgetConfig;
}

export function CycleProgressGadget({ config }: CycleProgressGadgetProps) {
  // Sample data
  const data = {
    name: 'Sprint 24 Test Cycle',
    total: 150,
    passed: 98,
    failed: 22,
    blocked: 10,
    notRun: 20,
    executed: 130,
    progressPct: 87,
    passRate: 75,
    startDate: '2024-01-15',
    endDate: '2024-01-29'
  };

  const metrics = [
    { label: 'Passed', value: data.passed, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Failed', value: data.failed, icon: XCircle, color: 'text-red-500' },
    { label: 'Blocked', value: data.blocked, icon: AlertTriangle, color: 'text-yellow-500' },
    { label: 'Not Run', value: data.notRun, icon: Clock, color: 'text-muted-foreground' }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-medium truncate">{data.name}</h4>
        <p className="text-xs text-muted-foreground">
          {data.startDate} - {data.endDate}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span className="font-medium">{data.progressPct}%</span>
        </div>
        <Progress value={data.progressPct} className="h-2" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Pass Rate</span>
          <span className="font-medium text-brand-gold">{data.passRate}%</span>
        </div>
        <Progress value={data.passRate} className="h-2 bg-muted [&>div]:bg-brand-gold" />
      </div>

      <div className="grid grid-cols-4 gap-2 pt-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="text-center">
            <metric.icon className={`h-4 w-4 mx-auto ${metric.color}`} />
            <div className="text-lg font-bold">{metric.value}</div>
            <div className="text-[10px] text-muted-foreground">{metric.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
