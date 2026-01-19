import { useState, forwardRef } from "react";
import { Bell, Check, Trash2, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NotificationsPanelProps {
  className?: string;
}

export const NotificationsPanel = forwardRef<HTMLDivElement, NotificationsPanelProps>(
  function NotificationsPanel({ className }, ref) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("all");
    
    const { 
      notifications, 
      unreadCount, 
      isLoading,
      markAsRead, 
      markAllAsRead, 
      deleteNotification 
    } = useNotifications();

    // Filter notifications based on active tab
    const filteredNotifications = notifications.filter((n) => {
      if (activeTab === "unread") return !n.is_read;
      if (activeTab === "mentions") return n.type === "mention";
      return true; // "all" tab
    });

    const handleNotificationClick = async (notification: Notification) => {
      // Mark as read when clicked
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      
      // Navigate if there's a link
      if (notification.link) {
        setOpen(false);
        navigate(notification.link);
      }
    };

    const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await markAsRead(id);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await deleteNotification(id);
    };

    const handleMarkAllAsRead = async () => {
      await markAllAsRead();
    };

    const getNotificationIcon = (type: string) => {
      switch (type) {
        case "mention":
          return "text-primary";
        case "assignment":
          return "text-primary";
        case "comment":
          return "text-muted-foreground";
        case "status_change":
          return "text-warning";
        default:
          return "text-muted-foreground";
      }
    };

    return (
      <div ref={ref} className={className}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive rounded-full flex items-center justify-center text-[10px] font-semibold text-destructive-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0 bg-popover z-[300]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-sm">Notifications</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unreadCount > 0 
                    ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` 
                    : 'All caught up!'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="h-8 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setOpen(false);
                    navigate('/admin/settings/notifications');
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 rounded-none border-b bg-transparent h-10">
                <TabsTrigger 
                  value="all" 
                  className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="unread"
                  className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
                >
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
                <TabsTrigger 
                  value="mentions"
                  className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
                >
                  Mentions
                </TabsTrigger>
              </TabsList>

              {/* Notification List */}
              <ScrollArea className="h-[360px]">
                <TabsContent value={activeTab} className="m-0">
                  {isLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-pulse flex flex-col items-center gap-2">
                        <div className="h-10 w-10 bg-muted rounded-full" />
                        <div className="h-4 w-24 bg-muted rounded" />
                      </div>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No notifications</p>
                      <p className="text-xs mt-1">
                        {activeTab === "unread" 
                          ? "You've read all your notifications" 
                          : activeTab === "mentions"
                          ? "No mentions yet"
                          : "You're all caught up!"}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            "p-4 hover:bg-accent/50 transition-colors cursor-pointer",
                            !notification.is_read && "bg-accent/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate">
                                  {notification.title}
                                </h4>
                                {!notification.is_read && (
                                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                                )}
                              </div>
                              {notification.message && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {notification.message}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                                {notification.link && (
                                  <ExternalLink className="h-3 w-3" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => handleMarkAsRead(e, notification.id)}
                                  title="Mark as read"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={(e) => handleDelete(e, notification.id)}
                                title="Delete notification"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

            {/* Footer */}
            {filteredNotifications.length > 0 && (
              <div className="p-3 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => {
                    setOpen(false);
                    navigate('/notifications');
                  }}
                >
                  View all notifications
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
