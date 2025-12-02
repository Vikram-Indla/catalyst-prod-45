import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AtSign, 
  UserPlus, 
  MessageSquare,
  AlertCircle,
  Info,
  CheckCircle
} from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  mention: { icon: AtSign, color: 'text-blue-500' },
  assignment: { icon: UserPlus, color: 'text-brand-gold' },
  comment: { icon: MessageSquare, color: 'text-green-500' },
  alert: { icon: AlertCircle, color: 'text-red-500' },
  info: { icon: Info, color: 'text-muted-foreground' },
  success: { icon: CheckCircle, color: 'text-green-500' }
};

export function NotificationCenter() {
  const { 
    notifications, 
    isLoading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications?.filter(n => 
    filter === 'all' || !n.read
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-brand-gold" />
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} unread</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-50" />
              <p>No {filter === 'unread' ? 'unread ' : ''}notifications</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredNotifications.map((notification) => {
                  const typeConfig = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;
                  const TypeIcon = typeConfig.icon;

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        notification.read 
                          ? 'bg-background' 
                          : 'bg-brand-gold/5 border-brand-gold/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${typeConfig.color}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">{notification.title}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {notification.message}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-brand-gold flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            
                            <div className="flex items-center gap-1 ml-auto">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <CheckCheck className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-destructive hover:text-destructive"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
