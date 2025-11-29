import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { toast } from '@/hooks/use-toast';

interface SubscribeButtonProps {
  entityType: string;
  entityId: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

export function SubscribeButton({
  entityType,
  entityId,
  variant = 'outline',
  size = 'sm',
  showText = true,
}: SubscribeButtonProps) {
  const { isSubscribed, subscribe, unsubscribe } = useSubscriptions(entityType, entityId);
  const subscribed = isSubscribed(entityType, entityId);

  const handleToggle = () => {
    if (subscribed) {
      unsubscribe({ entityType, entityId });
      toast({
        title: 'Unsubscribed',
        description: 'You will no longer receive notifications for this item',
      });
    } else {
      subscribe({ entityType, entityId });
      toast({
        title: 'Subscribed',
        description: 'You will receive notifications for updates to this item',
      });
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleToggle}>
      {subscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          {showText && <span className="ml-2">Unsubscribe</span>}
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          {showText && <span className="ml-2">Subscribe</span>}
        </>
      )}
    </Button>
  );
}
