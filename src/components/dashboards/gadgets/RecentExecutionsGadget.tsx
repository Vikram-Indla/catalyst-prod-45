import { GadgetConfig } from '@/types/dashboard.types';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Clock, PlayCircle } from 'lucide-react';

interface RecentExecutionsGadgetProps {
  config: GadgetConfig;
}

const STATUS_CONFIG = {
  passed: { icon: CheckCircle, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  failed: { icon: XCircle, color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  blocked: { icon: AlertTriangle, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  not_run: { icon: Clock, color: 'bg-muted text-muted-foreground border-muted' },
  in_progress: { icon: PlayCircle, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' }
};

export function RecentExecutionsGadget({ config }: RecentExecutionsGadgetProps) {
  // Sample data
  const executions = [
    { id: '1', title: 'Login Flow Validation', status: 'passed', time: '2 min ago' },
    { id: '2', title: 'Checkout Process Test', status: 'failed', time: '5 min ago' },
    { id: '3', title: 'User Profile Update', status: 'passed', time: '12 min ago' },
    { id: '4', title: 'API Integration Check', status: 'blocked', time: '25 min ago' },
    { id: '5', title: 'Search Functionality', status: 'passed', time: '1 hour ago' },
    { id: '6', title: 'Payment Gateway Test', status: 'in_progress', time: '1 hour ago' },
    { id: '7', title: 'Email Notification Test', status: 'passed', time: '2 hours ago' },
    { id: '8', title: 'Data Export Validation', status: 'failed', time: '3 hours ago' }
  ];

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {executions.map((execution) => {
        const statusConfig = STATUS_CONFIG[execution.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_run;
        const StatusIcon = statusConfig.icon;

        return (
          <div
            key={execution.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusConfig.color.split(' ')[1]}`} />
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{execution.title}</p>
              <p className="text-xs text-muted-foreground">{execution.time}</p>
            </div>

            <Badge variant="outline" className={`text-[10px] ${statusConfig.color}`}>
              {execution.status.replace('_', ' ')}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
