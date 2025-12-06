import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const notificationCount = 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-popover z-50">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {notificationCount} new notifications
          </p>
        </div>
        <div className="p-6 text-center">
          <div className="text-muted-foreground text-sm">
            <p>No notifications</p>
            <p className="text-xs mt-2">You're all caught up!</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
