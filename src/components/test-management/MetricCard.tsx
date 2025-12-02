import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'gold' | 'red';
  onClick?: () => void;
  isLoading?: boolean;
  infoTooltip?: React.ReactNode;
}

const colorClasses = {
  blue: 'border-blue-500/20 hover:border-blue-500/40 hover:shadow-blue-500/10',
  green: 'border-green-500/20 hover:border-green-500/40 hover:shadow-green-500/10',
  gold: 'border-brand-gold/20 hover:border-brand-gold/40 hover:shadow-brand-gold/10',
  red: 'border-red-500/20 hover:border-red-500/40 hover:shadow-red-500/10',
};

const iconColorClasses = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  gold: 'text-brand-gold',
  red: 'text-red-500',
};

export function MetricCard({
  title,
  count,
  icon: Icon,
  color,
  onClick,
  isLoading,
  infoTooltip,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className="border-2">
        <CardContent className="p-6">
          <Skeleton className="h-8 w-8 mb-4" />
          <Skeleton className="h-12 w-20 mb-2" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'border-2 transition-all duration-200 hover:shadow-lg cursor-pointer',
        colorClasses[color],
        onClick && 'hover:scale-105'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Icon className={cn('h-8 w-8', iconColorClasses[color])} />
          {infoTooltip && (
            <div className="text-muted-foreground">
              {infoTooltip}
            </div>
          )}
        </div>
        
        <div className="text-5xl font-bold mb-2 text-foreground">
          {count.toLocaleString()}
        </div>
        
        <div className="text-sm font-medium text-muted-foreground">
          {title}
        </div>
      </CardContent>
    </Card>
  );
}
