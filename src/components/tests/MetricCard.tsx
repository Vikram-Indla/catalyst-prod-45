import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
  isLoading?: boolean;
}

export function MetricCard({ 
  title, 
  count, 
  icon: Icon, 
  color, 
  onClick,
  isLoading 
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "p-6 transition-all duration-200 cursor-pointer",
        "hover:shadow-lg hover:-translate-y-1",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-2">{title}</p>
          {isLoading ? (
            <div className="h-12 w-24 bg-muted animate-pulse rounded" />
          ) : (
            <p className="text-4xl font-bold" style={{ color }}>
              {count}
            </p>
          )}
        </div>
        <div className="ml-4">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
        </div>
      </div>
    </Card>
  );
}
