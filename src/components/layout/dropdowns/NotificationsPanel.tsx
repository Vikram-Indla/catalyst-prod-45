import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from 'lucide-react';

const notifications = [
  {
    title: 'Epic Step Change: Analyzing',
    link: 'Reduce raw material costs by 10% through...',
    changed: 'Jun 2'
  },
  {
    title: 'Epic Step Change: Funnel',
    link: 'Reduce raw material costs by 10% through...',
    changed: 'Jun 2'
  }
];

interface NotificationsPanelProps {
  onClose: () => void;
  onClearAll: () => void;
}

export function NotificationsPanel({ onClose, onClearAll }: NotificationsPanelProps) {
  const handleClearAll = () => {
    onClearAll();
    onClose();
  };

  return (
    <div className="absolute top-full right-0 mt-1 w-96 bg-popover dark:bg-[#1A1A1A] border dark:border-[#2E2E2E] rounded-md shadow-lg z-50">
      <div className="p-3 border-b dark:border-[#2E2E2E]">
        <h3 className="font-semibold dark:text-[#EDEDED]">Notifications</h3>
      </div>
      <ScrollArea className="max-h-96">
        <div className="p-2">
          <p className="text-xs font-semibold text-muted-foreground dark:text-[#878787] px-3 py-2">Action Required</p>
          {notifications.map((notif, idx) => (
            <div key={idx} className="flex gap-3 px-3 py-2 hover:bg-accent dark:hover:bg-[#1F1F1F] rounded">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium dark:text-[#EDEDED]">{notif.title}</p>
                <p className="text-sm text-primary hover:underline cursor-pointer truncate">
                  {notif.link}
                </p>
                <p className="text-xs text-muted-foreground dark:text-[#878787] mt-1">Changed: {notif.changed}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 border-t dark:border-[#2E2E2E]">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="w-full dark:text-[#A1A1A1] dark:hover:text-[#EDEDED] dark:hover:bg-[#2E2E2E]"
        >
          Clear All
        </Button>
      </div>
    </div>
  );
}
