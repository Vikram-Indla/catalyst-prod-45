import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; value: string; isPositive?: boolean };
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function KPICard({ title, value, subtitle, trend, icon, onClick }: KPICardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend?.isPositive === undefined
    ? (trend?.direction === 'up' ? 'text-green-600' : trend?.direction === 'down' ? 'text-red-600' : 'text-muted-foreground')
    : (trend?.isPositive ? 'text-green-600' : 'text-red-600');

  return (
    <Card className={cn("transition-shadow", onClick && "cursor-pointer hover:shadow-md")} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {icon && <div className="p-2 rounded-lg bg-muted">{icon}</div>}
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 mt-2 text-sm", trendColor)}>
            <TrendIcon className="h-4 w-4" />
            <span>{trend.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
