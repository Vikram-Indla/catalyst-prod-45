import { GadgetConfig } from '@/types/dashboard.types';
import { 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Edit, 
  Trash2, 
  Plus,
  RefreshCw
} from 'lucide-react';

interface ActivityFeedGadgetProps {
  config: GadgetConfig;
}

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  execution_completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed execution' },
  execution_started: { icon: PlayCircle, color: 'text-blue-500', label: 'Started execution' },
  execution_failed: { icon: XCircle, color: 'text-red-500', label: 'Execution failed' },
  case_created: { icon: Plus, color: 'text-brand-gold', label: 'Created test case' },
  case_updated: { icon: Edit, color: 'text-muted-foreground', label: 'Updated test case' },
  case_deleted: { icon: Trash2, color: 'text-red-500', label: 'Deleted test case' },
  cycle_created: { icon: RefreshCw, color: 'text-brand-gold', label: 'Created cycle' },
  cycle_started: { icon: PlayCircle, color: 'text-blue-500', label: 'Started cycle' },
  default: { icon: FileText, color: 'text-muted-foreground', label: 'Activity' }
};

export function ActivityFeedGadget({ config }: ActivityFeedGadgetProps) {
  // Sample data
  const activities = [
    { id: '1', action: 'execution_completed', entityName: 'Login Flow Test', actor: 'john.doe', timestamp: '2 min ago' },
    { id: '2', action: 'execution_failed', entityName: 'Checkout Process', actor: 'sarah.m', timestamp: '5 min ago' },
    { id: '3', action: 'case_created', entityName: 'New API Integration Test', actor: 'mike.r', timestamp: '15 min ago' },
    { id: '4', action: 'cycle_started', entityName: 'Sprint 24 Regression', actor: 'lisa.k', timestamp: '1 hour ago' },
    { id: '5', action: 'execution_completed', entityName: 'User Profile Update', actor: 'tom.w', timestamp: '1 hour ago' },
    { id: '6', action: 'case_updated', entityName: 'Payment Gateway Test', actor: 'john.doe', timestamp: '2 hours ago' },
    { id: '7', action: 'execution_completed', entityName: 'Search Functionality', actor: 'sarah.m', timestamp: '3 hours ago' }
  ];

  return (
    <div className="space-y-1 max-h-[300px] overflow-y-auto">
      {activities.map((activity) => {
        const actionConfig = ACTION_CONFIG[activity.action] || ACTION_CONFIG.default;
        const ActionIcon = actionConfig.icon;

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className={`mt-0.5 ${actionConfig.color}`}>
              <ActionIcon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{activity.actor}</span>
                {' '}{actionConfig.label.toLowerCase()}{' '}
                <span className="text-brand-gold">{activity.entityName}</span>
              </p>
              <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
