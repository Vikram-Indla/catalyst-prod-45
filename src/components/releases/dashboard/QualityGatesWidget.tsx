import { QualityGate } from '@/types/release-dashboard';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QualityGatesWidgetProps {
  gates: QualityGate[];
}

const statusConfig = {
  passed: { icon: CheckCircle, color: 'text-teal-600' },
  failed: { icon: XCircle, color: 'text-destructive' },
  pending: { icon: Clock, color: 'text-amber-600' },
};

export function QualityGatesWidget({ gates }: QualityGatesWidgetProps) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-3.5 py-2.5 border-b border-border">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Quality Gates</h3>
      </div>
      <div className="divide-y divide-border">
        {gates.map((gate) => {
          const { icon: Icon, color } = statusConfig[gate.status];
          return (
            <div key={gate.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <Icon className={cn("w-4 h-4 shrink-0", color)} />
              <span className="flex-1 text-xs font-medium text-foreground">{gate.name}</span>
              <span className={cn("text-xs font-semibold", color)}>
                {gate.currentValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
