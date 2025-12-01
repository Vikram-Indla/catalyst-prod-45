import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface CycleProgressProps {
  total: number;
  passed: number;
  failed: number;
  notRun: number;
}

export function CycleProgress({ total, passed, failed, notRun }: CycleProgressProps) {
  const percentage = total > 0 ? (passed / total) * 100 : 0;

  // Color based on pass rate
  const getColorClass = () => {
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Test Execution Progress</span>
        <span className={`font-semibold ${getColorClass()}`}>
          {passed}/{total} passed ({Math.round(percentage)}%)
        </span>
      </div>

      <Progress value={percentage} className="h-3" />

      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="font-medium">{passed}</span> passed
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <XCircle className="h-3.5 w-3.5 text-red-500" />
          <span className="font-medium">{failed}</span> failed
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-medium">{notRun}</span> not run
        </span>
      </div>
    </div>
  );
}
