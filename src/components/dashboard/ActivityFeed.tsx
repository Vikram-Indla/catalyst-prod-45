import React from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  Bug, 
  Sparkles, 
  Package, 
  AlertTriangle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface ActivityItem {
  id: string;
  type: 'test-passed' | 'test-failed' | 'defect-logged' | 'ai-generated' | 'release-created' | 'system-alert';
  actor: string;
  action: string;
  target: { text: string; link: string };
  context?: string;
  timestamp: Date;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
}

const typeConfig = {
  'test-passed': {
    icon: CheckCircle,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  'test-failed': {
    icon: XCircle,
    iconColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  'defect-logged': {
    icon: Bug,
    iconColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  'ai-generated': {
    icon: Sparkles,
    iconColor: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  'release-created': {
    icon: Package,
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  'system-alert': {
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
};

function ActivityItemRow({ item, index }: { item: ActivityItem; index: number }) {
  const config = typeConfig[item.type];
  const IconComponent = config.icon;
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 75);
    return () => clearTimeout(timer);
  }, [index]);

  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true });

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-3 transition-all duration-300',
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2',
        index > 0 && 'border-t border-border/50'
      )}
    >
      {/* Icon */}
      <div className={cn('p-1.5 rounded-md border', config.bgColor, config.borderColor)}>
        <IconComponent className={cn('h-3.5 w-3.5', config.iconColor)} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm leading-snug">
          <span className="font-medium text-foreground">{item.actor}</span>
          <span className="text-muted-foreground"> {item.action} </span>
          <Link 
            to={item.target.link}
            className="font-medium text-primary hover:underline"
          >
            {item.target.text}
          </Link>
          {item.context && (
            <span className="text-muted-foreground"> — {item.context}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {timeAgo}
        </p>
      </div>
    </div>
  );
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className={cn('py-8 text-center', className)}>
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className={cn('divide-y-0', className)}>
      {items.map((item, index) => (
        <ActivityItemRow key={item.id} item={item} index={index} />
      ))}
    </div>
  );
}

export default ActivityFeed;
