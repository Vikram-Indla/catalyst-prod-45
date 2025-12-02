import { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, Maximize2, X, GripVertical } from 'lucide-react';
import { GadgetType, GADGET_DEFINITIONS } from '@/types/dashboard.types';
import { cn } from '@/lib/utils';

interface GadgetContainerProps {
  gadgetType: GadgetType;
  children: ReactNode;
  onConfigure?: () => void;
  onRefresh?: () => void;
  onExpand?: () => void;
  onRemove?: () => void;
  isLoading?: boolean;
  className?: string;
  dragHandleProps?: Record<string, unknown>;
}

export function GadgetContainer({
  gadgetType,
  children,
  onConfigure,
  onRefresh,
  onExpand,
  onRemove,
  isLoading,
  className,
  dragHandleProps,
}: GadgetContainerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const definition = GADGET_DEFINITIONS[gadgetType];

  return (
    <Card 
      className={cn('h-full flex flex-col overflow-hidden transition-shadow', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          {dragHandleProps && (
            <div {...dragHandleProps} className="cursor-grab hover:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <CardTitle className="text-sm font-medium">{definition.name}</CardTitle>
        </div>
        <div className={cn('flex items-center gap-1 transition-opacity', isHovered ? 'opacity-100' : 'opacity-0')}>
          {onConfigure && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onConfigure}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
          {onRefresh && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            </Button>
          )}
          {onExpand && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onExpand}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onRemove && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onRemove}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-auto">
        {children}
      </CardContent>
    </Card>
  );
}
