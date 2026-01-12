/**
 * NotificationsPanel - User notifications for Test Management
 */

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Check, 
  CheckCheck,
  X,
  User,
  Play,
  MessageSquare,
  Calendar,
  AlertCircle,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotificationType = 'assignment' | 'mention' | 'status_change' | 'comment' | 'due_date';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  entityKey?: string;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

interface NotificationsPanelProps {
  notifications: Notification[];
  isLoading?: boolean;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (notificationId: string) => void;
  onNavigate?: (entityType: string, entityId: string) => void;
  onOpenSettings?: () => void;
}

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; label: string }> = {
  assignment: { icon: User, color: 'text-blue-500 bg-blue-500/10', label: 'Assignment' },
  mention: { icon: MessageSquare, color: 'text-purple-500 bg-purple-500/10', label: 'Mention' },
  status_change: { icon: Play, color: 'text-green-500 bg-green-500/10', label: 'Status' },
  comment: { icon: MessageSquare, color: 'text-amber-500 bg-amber-500/10', label: 'Comment' },
  due_date: { icon: Calendar, color: 'text-red-500 bg-red-500/10', label: 'Due Date' },
};

export function NotificationsPanel({
  notifications,
  isLoading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onNavigate,
  onOpenSettings,
}: NotificationsPanelProps) {
  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);
  const unreadCount = unreadNotifications.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenSettings}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="unread" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="unread" className="mt-0">
            {unreadNotifications.length === 0 ? (
              <EmptyState message="You're all caught up!" />
            ) : (
              <NotificationList 
                notifications={unreadNotifications}
                onMarkAsRead={onMarkAsRead}
                onDismiss={onDismiss}
                onNavigate={onNavigate}
              />
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            {notifications.length === 0 ? (
              <EmptyState message="No notifications yet" />
            ) : (
              <NotificationList 
                notifications={notifications}
                onMarkAsRead={onMarkAsRead}
                onDismiss={onDismiss}
                onNavigate={onNavigate}
              />
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>{message}</p>
    </div>
  );
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onNavigate?: (entityType: string, entityId: string) => void;
}

function NotificationList({ 
  notifications, 
  onMarkAsRead, 
  onDismiss,
  onNavigate 
}: NotificationListProps) {
  return (
    <div className="divide-y">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
          onDismiss={onDismiss}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onNavigate?: (entityType: string, entityId: string) => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onNavigate,
}: NotificationItemProps) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead?.(notification.id);
    }
    if (notification.entityType && notification.entityId) {
      onNavigate?.(notification.entityType, notification.entityId);
    }
  };

  return (
    <div 
      className={cn(
        'p-3 hover:bg-muted/50 transition-colors cursor-pointer group relative',
        !notification.isRead && 'bg-primary/5'
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn('p-2 rounded-full shrink-0 h-fit', config.color)}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm line-clamp-2',
                !notification.isRead && 'font-medium'
              )}>
                {notification.title}
              </p>
              {notification.message && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {notification.message}
                </p>
              )}
            </div>
            
            {/* Unread indicator */}
            {!notification.isRead && (
              <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            {notification.actor && (
              <>
                <span>{notification.actor.name}</span>
                <span>•</span>
              </>
            )}
            <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
            {notification.entityKey && (
              <>
                <span>•</span>
                <Badge variant="outline" className="text-[10px] px-1">
                  {notification.entityKey}
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead?.(notification.id);
              }}
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss?.(notification.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
