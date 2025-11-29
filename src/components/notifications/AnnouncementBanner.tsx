import { X, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { cn } from '@/lib/utils';

export function AnnouncementBanner() {
  const { announcements, dismiss } = useAnnouncements();

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2">
      {announcements.map((announcement) => {
        const Icon = announcement.type === 'critical' 
          ? AlertCircle 
          : announcement.type === 'warning' 
          ? AlertTriangle 
          : Info;

        const bgColor = announcement.type === 'critical'
          ? 'bg-destructive/10 border-destructive'
          : announcement.type === 'warning'
          ? 'bg-warning/10 border-warning'
          : 'bg-info/10 border-info';

        return (
          <div
            key={announcement.id}
            className={cn(
              'flex items-start gap-3 p-4 border rounded-lg',
              bgColor
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-sm">{announcement.title}</h4>
              <p className="text-sm text-muted-foreground">{announcement.message}</p>
            </div>
            {announcement.is_dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => dismiss(announcement.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
