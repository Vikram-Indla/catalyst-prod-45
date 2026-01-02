import React from 'react';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTestNotifications, TestNotification } from '../../hooks/useTestNotifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  onSettingsClick?: () => void;
}

export function NotificationCenter({ onSettingsClick }: NotificationCenterProps) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useTestNotifications();
  
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'assignment': return '👤';
      case 'mention': return '@';
      case 'execution_update': return '▶️';
      case 'cycle_complete': return '✅';
      case 'defect_linked': return '🐛';
      default: return '📢';
    }
  };
  
  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'assignment': return 'bg-blue-500/10 text-blue-500';
      case 'mention': return 'bg-purple-500/10 text-purple-500';
      case 'execution_update': return 'bg-green-500/10 text-green-500';
      case 'cycle_complete': return 'bg-emerald-500/10 text-emerald-500';
      case 'defect_linked': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-sm">Notifications</h3>
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} className="text-xs">
                <CheckCheck className="h-3 w-3 mr-1" />Mark all read
              </Button>
            )}
            {onSettingsClick && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSettingsClick}>
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                    !notification.is_read && 'bg-primary/5'
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                      getEventColor(notification.event_type)
                    )}>
                      <span className="text-sm">{getEventIcon(notification.event_type)}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm line-clamp-1', !notification.is_read && 'font-medium')}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
                      
                      <div className="flex items-center gap-2 mt-1.5">
                        {notification.entity_key && (
                          <Badge variant="outline" className="text-xs h-5">{notification.entity_key}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {notification.created_at && formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
