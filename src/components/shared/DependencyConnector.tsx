import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Dependency {
  id: string;
  from_feature_id: string;
  to_feature_id: string;
  type: 'sequential' | 'concurrent';
  status: 'open' | 'in_progress' | 'done';
  risk_level: 'low' | 'med' | 'high';
  from_feature?: { id: string; name: string };
  to_feature?: { id: string; name: string };
}

interface DependencyConnectorProps {
  dependencies: Dependency[];
  containerId: string;
}

interface Connection {
  fromRect: DOMRect;
  toRect: DOMRect;
  dependency: Dependency;
}

export function DependencyConnector({ dependencies, containerId }: DependencyConnectorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    const updateConnections = () => {
      const container = document.getElementById(containerId);
      if (!container || !dependencies) return;

      const newConnections: Connection[] = [];

      dependencies.forEach((dep) => {
        const fromElement = container.querySelector(`[data-feature-id="${dep.from_feature_id}"]`);
        const toElement = container.querySelector(`[data-feature-id="${dep.to_feature_id}"]`);

        if (fromElement && toElement) {
          const containerRect = container.getBoundingClientRect();
          const fromRect = fromElement.getBoundingClientRect();
          const toRect = toElement.getBoundingClientRect();

          // Calculate relative positions
          const relativeFromRect = new DOMRect(
            fromRect.left - containerRect.left,
            fromRect.top - containerRect.top,
            fromRect.width,
            fromRect.height
          );

          const relativeToRect = new DOMRect(
            toRect.left - containerRect.left,
            toRect.top - containerRect.top,
            toRect.width,
            toRect.height
          );

          newConnections.push({
            fromRect: relativeFromRect,
            toRect: relativeToRect,
            dependency: dep,
          });
        }
      });

      setConnections(newConnections);
    };

    updateConnections();

    // Update on window resize or scroll
    window.addEventListener('resize', updateConnections);
    window.addEventListener('scroll', updateConnections, true);

    const resizeObserver = new ResizeObserver(updateConnections);
    const container = document.getElementById(containerId);
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      window.removeEventListener('resize', updateConnections);
      window.removeEventListener('scroll', updateConnections, true);
      resizeObserver.disconnect();
    };
  }, [dependencies, containerId]);

  const getLineColor = (dependency: Dependency) => {
    if (dependency.risk_level === 'high') return 'stroke-destructive';
    if (dependency.risk_level === 'med') return 'stroke-warning';
    return 'stroke-primary';
  };

  const getLineDash = (type: string) => {
    return type === 'concurrent' ? '5,5' : '0';
  };

  const renderArrow = (fromRect: DOMRect, toRect: DOMRect, dependency: Dependency) => {
    // Calculate start and end points
    const fromCenterX = fromRect.left + fromRect.width / 2;
    const fromCenterY = fromRect.top + fromRect.height / 2;
    const toCenterX = toRect.left + toRect.width / 2;
    const toCenterY = toRect.top + toRect.height / 2;

    // Use right edge of 'from' and left edge of 'to' for horizontal connections
    const startX = fromRect.right;
    const startY = fromCenterY;
    const endX = toRect.left;
    const endY = toCenterY;

    // Calculate control points for curve
    const controlOffset = Math.abs(endX - startX) / 3;
    const control1X = startX + controlOffset;
    const control1Y = startY;
    const control2X = endX - controlOffset;
    const control2Y = endY;

    // Create curved path
    const path = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;

    // Calculate arrow head
    const arrowSize = 8;
    const angle = Math.atan2(endY - control2Y, endX - control2X);
    const arrowPoint1X = endX - arrowSize * Math.cos(angle - Math.PI / 6);
    const arrowPoint1Y = endY - arrowSize * Math.sin(angle - Math.PI / 6);
    const arrowPoint2X = endX - arrowSize * Math.cos(angle + Math.PI / 6);
    const arrowPoint2Y = endY - arrowSize * Math.sin(angle + Math.PI / 6);

    const color = getLineColor(dependency);

    return (
      <g key={dependency.id} className="dependency-arrow">
        <Popover>
          <PopoverTrigger asChild>
            <g className="cursor-pointer hover:opacity-80">
              <path
                d={path}
                className={cn(color, 'fill-none stroke-2 transition-all')}
                strokeWidth="2"
                strokeDasharray={getLineDash(dependency.type)}
                markerEnd="url(#arrowhead)"
              />
              <polygon
                points={`${endX},${endY} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
                className={cn(color.replace('stroke', 'fill'))}
              />
              {/* Invisible wider path for easier clicking */}
              <path
                d={path}
                className="fill-none stroke-transparent"
                strokeWidth="20"
              />
            </g>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="center">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Dependency</h4>
                <Badge
                  variant={
                    dependency.risk_level === 'high' ? 'destructive' :
                    dependency.risk_level === 'med' ? 'secondary' :
                    'outline'
                  }
                  className="text-xs"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {dependency.risk_level} risk
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">From:</p>
                    <p className="font-medium">{dependency.from_feature?.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">To:</p>
                    <p className="font-medium">{dependency.to_feature?.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <Badge variant="outline" className="text-xs">
                  {dependency.type === 'sequential' ? 'Sequential' : 'Concurrent'}
                </Badge>
                <Badge
                  variant={
                    dependency.status === 'done' ? 'default' :
                    dependency.status === 'in_progress' ? 'secondary' :
                    'outline'
                  }
                  className="text-xs"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {dependency.status}
                </Badge>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </g>
    );
  };

  if (connections.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none w-full h-full"
      style={{ zIndex: 5 }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="5"
          refY="5"
          orient="auto"
        >
          <polygon points="0 0, 10 5, 0 10" className="fill-current" />
        </marker>
      </defs>
      <g className="pointer-events-auto">
        {connections.map((connection) =>
          renderArrow(connection.fromRect, connection.toRect, connection.dependency)
        )}
      </g>
    </svg>
  );
}
