import { useState } from 'react';
import { Bell, Check, Trash2, X, Settings, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPreferencesDialog } from '@/components/notifications/NotificationPreferencesDialog';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0 dark:bg-[#1A1A1A] dark:border-[#2E2E2E]" align="end">
          <div className="flex items-center justify-between p-4 border-b dark:border-[#2E2E2E]">
            <h3 className="font-semibold dark:text-[#EDEDED]">Notifications</h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreferencesOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  className="h-8 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <Tabs value={filter} onValueChange={setFilter} className="w-full">
            <TabsList className="w-full grid grid-cols-4 rounded-none border-b dark:border-[#2E2E2E] dark:bg-[#0A0A0A]">
              <TabsTrigger value="all" className="dark:text-[#A1A1A1] dark:data-[state=active]:text-[#EDEDED]">All</TabsTrigger>
              <TabsTrigger value="unread" className="dark:text-[#A1A1A1] dark:data-[state=active]:text-[#EDEDED]">Unread</TabsTrigger>
              <TabsTrigger value="assignment" className="dark:text-[#A1A1A1] dark:data-[state=active]:text-[#EDEDED]">Assigned</TabsTrigger>
              <TabsTrigger value="mention" className="dark:text-[#A1A1A1] dark:data-[state=active]:text-[#EDEDED]">Mentions</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px]">
              <TabsContent value={filter} className="m-0">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground dark:text-[#878787]">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="dark:text-[#A1A1A1]">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y dark:divide-[#2E2E2E]">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-accent/50 dark:hover:bg-[#1F1F1F] transition-colors ${
                          !notification.is_read ? 'bg-accent/20 dark:bg-[#1F1F1F]' : 'dark:bg-[#0A0A0A]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm dark:text-[#EDEDED]">{notification.title}</h4>
                              {!notification.is_read && (
                                <div className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>
                            {notification.message && (
                              <p className="text-sm text-muted-foreground dark:text-[#A1A1A1] line-clamp-2">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground dark:text-[#878787]">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 dark:text-[#A1A1A1] dark:hover:text-[#EDEDED] dark:hover:bg-[#2E2E2E]"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 dark:text-[#878787] dark:hover:text-destructive dark:hover:bg-[#2E2E2E]"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </PopoverContent>
      </Popover>

      <NotificationPreferencesDialog 
        open={preferencesOpen} 
        onOpenChange={setPreferencesOpen} 
      />
    </>
  );
}
