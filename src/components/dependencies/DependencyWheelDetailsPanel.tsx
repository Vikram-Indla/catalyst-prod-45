import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface WheelNode {
  id: string;
  name: string;
  inboundCount: number;
  outboundCount: number;
}

interface WheelLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  dependencyId: string;
  workItemType: 'FEATURE' | 'EPIC' | 'CAPABILITY';
  status: 'NOT_COMMITTED' | 'COMMITTED' | 'DONE' | 'BLOCKED' | 'NO_WORK_REQUIRED' | 'REJECTED';
  fromFeature?: any;
  toFeature?: any;
  dependency?: any;
}

interface DependencyWheelDetailsPanelProps {
  selectedNode: WheelNode | null;
  links: WheelLink[];
  onDependencyClick: (depId: string) => void;
}

export function DependencyWheelDetailsPanel({
  selectedNode,
  links,
  onDependencyClick,
}: DependencyWheelDetailsPanelProps) {
  if (!selectedNode) {
    return (
      <Card className="w-[400px] flex-shrink-0">
        <CardContent className="p-6 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Select a program or team segment to view dependency details</p>
        </CardContent>
      </Card>
    );
  }

  // Filter incoming (work that others need from selected node)
  const incoming = links.filter((l) => l.toNodeId === selectedNode.id);

  // Filter outgoing (work that selected node needs from others)
  const outgoing = links.filter((l) => l.fromNodeId === selectedNode.id);

  // Calculate metrics
  const calculateMetrics = (linkSet: WheelLink[]) => {
    const notCommitted = linkSet.filter((l) => l.status === 'NOT_COMMITTED').length;
    const committed = linkSet.filter((l) => l.status === 'COMMITTED').length;
    const done = linkSet.filter((l) => l.status === 'DONE').length;
    const total = linkSet.length;

    return {
      notCommitted,
      committedPct: total > 0 ? Math.round((committed / total) * 100) : 0,
      donePct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  };

  const incomingMetrics = calculateMetrics(incoming);
  const outgoingMetrics = calculateMetrics(outgoing);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOT_COMMITTED':
        return (
          <Badge variant="outline" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Not Committed
          </Badge>
        );
      case 'COMMITTED':
        return (
          <Badge className="text-xs bg-blue-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Committed
          </Badge>
        );
      case 'DONE':
        return (
          <Badge className="text-xs bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Done
          </Badge>
        );
      case 'BLOCKED':
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Blocked
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const renderDependencyList = (linkSet: WheelLink[], title: string, metrics: any) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            NOT COMMITTED: {metrics.notCommitted}
          </Badge>
          <Badge variant="outline" className="text-xs">
            COMMITTED: {metrics.committedPct}%
          </Badge>
          <Badge variant="outline" className="text-xs">
            DONE: {metrics.donePct}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {linkSet.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dependencies</p>
            ) : (
              linkSet.map((link) => (
                <div
                  key={link.id}
                  onClick={() => onDependencyClick(link.dependencyId)}
                  className="p-2 border rounded hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {link.fromFeature?.name || 'Feature'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        → {link.toFeature?.name || 'Feature'}
                      </p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {link.workItemType}
                        </Badge>
                        {getStatusBadge(link.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-[400px] flex-shrink-0 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedNode.name}
          </CardTitle>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>{selectedNode.inboundCount} Incoming</span>
            <span>•</span>
            <span>{selectedNode.outboundCount} Outgoing</span>
          </div>
        </CardHeader>
      </Card>

      {renderDependencyList(
        incoming,
        `Work That Others Need From ${selectedNode.name}`,
        incomingMetrics
      )}

      {renderDependencyList(
        outgoing,
        `Work That ${selectedNode.name} Needs From Others`,
        outgoingMetrics
      )}
    </div>
  );
}
