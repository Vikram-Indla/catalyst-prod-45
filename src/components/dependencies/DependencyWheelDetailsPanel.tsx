import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, AlertCircle, CheckCircle2, XCircle, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
          <Badge className="text-xs bg-brand-gold text-white">
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'text-success';
      case 'COMMITTED': return 'text-brand-gold';
      case 'NOT_COMMITTED': return 'text-destructive';
      case 'BLOCKED': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE': return <Circle className="h-3 w-3 fill-success text-success" />;
      case 'COMMITTED': return <Circle className="h-3 w-3 fill-brand-gold text-brand-gold" />;
      case 'NOT_COMMITTED': return <Circle className="h-3 w-3 fill-destructive text-destructive" />;
      case 'BLOCKED': return <Circle className="h-3 w-3 fill-warning text-warning" />;
      default: return <Circle className="h-3 w-3 fill-gray-400 text-gray-400" />;
    }
  };

  const renderDependencyList = (linkSet: WheelLink[], title: string, metrics: any) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center p-2 border rounded-sm">
            <div className="text-xs text-red-600 font-medium mb-1">NOT COMMITTED</div>
            <div className="text-2xl font-bold text-red-600">{metrics.notCommitted}</div>
          </div>
          <div className="text-center p-2 border rounded-sm">
            <div className="text-xs text-gray-600 font-medium mb-1">COMMITTED</div>
            <div className="text-2xl font-bold text-gray-900">{metrics.committedPct}%</div>
          </div>
          <div className="text-center p-2 border rounded-sm">
            <div className="text-xs text-green-600 font-medium mb-1">DONE</div>
            <div className="text-2xl font-bold text-green-600">{metrics.donePct}%</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3">
        <ScrollArea className="h-[280px] pr-3">
          <div className="space-y-1">
            {linkSet.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No dependencies</p>
            ) : (
              linkSet.map((link) => (
                <div
                  key={link.id}
                  onClick={() => onDependencyClick(link.dependencyId)}
                  className="cursor-pointer hover:bg-accent/50 rounded transition-colors"
                >
                  {/* Epic/Feature level with icon */}
                  <div className="flex items-center gap-2 py-2 px-2">
                    {getStatusIcon(link.status)}
                    <span className="text-sm font-medium flex-1 truncate">
                      {link.fromFeature?.display_id || 'F-'} {link.fromFeature?.name || 'Feature'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        TRA
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        S23
                      </Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        BAL
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        S23
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Nested work items (if available) */}
                  {link.dependency?.description && (
                    <div className="pl-8 pr-2 pb-2">
                      <div className="flex items-start gap-2 py-1">
                        <Circle className="h-2.5 w-2.5 fill-workitem-theme text-workitem-theme mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground truncate">
                            {link.toFeature?.display_id || 'F-'}: {link.toFeature?.name || 'Related Feature'}
                          </p>
                        </div>
                      </div>
                      {/* Additional nested story level */}
                      <div className="flex items-start gap-2 py-1 pl-4">
                        <Circle className="h-2 w-2 fill-teal-500 text-teal-500 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground truncate">
                            Story: {link.dependency.description?.substring(0, 50) || 'Related story item'}
                          </p>
                          <p className="text-xs text-muted-foreground/60">
                            Sprint: {link.dependency?.needed_by_sprint?.name || 'Baltimore CDR_S13'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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
      <Card className="border-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/20 transition-all">
        <CardHeader>
          <CardTitle className="text-base font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
            {selectedNode.name}
          </CardTitle>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span className="font-semibold">{selectedNode.inboundCount} Incoming</span>
            <span>•</span>
            <span className="font-semibold">{selectedNode.outboundCount} Outgoing</span>
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
