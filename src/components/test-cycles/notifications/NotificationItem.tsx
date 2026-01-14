import { UserPlus, RefreshCw, CheckCircle, Clock, AtSign, Bug } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/integrations/useNotifications';
import type { Notification, NotificationType } from '@/types/integrations.types';

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
}

const iconMap: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  assignment: UserPlus,
  status_change: RefreshCw,
  cycle_complete: CheckCircle,
  deadline: Clock,
  mention: AtSign,
  defect_linked: Bug,
};

const colorMap: Record<NotificationType, { icon: string; bg: string }> = {
  assignment: { icon: 'text-primary', bg: 'bg-primary/10' },
  status_change: { icon: 'text-teal-600', bg: 'bg-teal-50' },
  cycle_complete: { icon: 'text-teal-600', bg: 'bg-teal-50' },
  deadline: { icon: 'text-amber-600', bg: 'bg-amber-50' },
  mention: { icon: 'text-primary', bg: 'bg-primary/10' },
  defect_linked: { icon: 'text-red-600', bg: 'bg-red-50' },
};

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const { markAsRead } = useNotifications();
  const Icon = iconMap[notification.type];
  const colors = colorMap[notification.type];

  const handleClick = () => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', colors.bg)}>
        <Icon className={cn('h-4 w-4', colors.icon)} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', !notification.is_read && 'font-medium')}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {notification.message}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground/70">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      {!notification.is_read && (
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}
