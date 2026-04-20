import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lozenge } from '@/components/ads';
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
      <Card className="w-full max-w-[400px] flex-shrink-0">
        <CardContent className="p-4 sm:p-6 text-center text-muted-foreground">
          <FileText className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Select a program or team segment to view dependency details</p>
        </CardContent>
      </Card>
    );
  }

  // Filter incoming (work that others need from selected node)
  const incoming = links.filter(
    (l) => l.toNodeId === selectedNode.id && l.fromNodeId !== selectedNode.id
  );

  // Filter outgoing (work that selected node needs from others)
  // Includes self-dependencies
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
        return <Lozenge appearance="default">Not Committed</Lozenge>;
      case 'COMMITTED':
        return <Lozenge appearance="inprogress">Committed</Lozenge>;
      case 'DONE':
        return <Lozenge appearance="success">Done</Lozenge>;
      case 'BLOCKED':
        return <Lozenge appearance="removed">Blocked</Lozenge>;
      default:
        return <Lozenge appearance="default">{status}</Lozenge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'text-success';
      case 'COMMITTED': return 'text-brand-primary';
      case 'NOT_COMMITTED': return 'text-destructive';
      case 'BLOCKED': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE': return <Circle className="h-3 w-3 fill-success text-success" />;
      case 'COMMITTED': return <Circle className="h-3 w-3 fill-brand-primary text-brand-primary" />;
      case 'NOT_COMMITTED': return <Circle className="h-3 w-3 fill-destructive text-destructive" />;
      case 'BLOCKED': return <Circle className="h-3 w-3 fill-warning text-warning" />;
      default: return <Circle className="h-3 w-3 fill-muted text-muted" />;
    }
  };

  const renderDependencyList = (linkSet: WheelLink[], title: string, metrics: any) => (
    <Card className="mb-4">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide break-words">
          {title}
        </CardTitle>
        <div className="grid grid-cols-3 gap-1 sm:gap-2 mt-3">
          <div className="text-center p-1.5 sm:p-2 border rounded-sm">
            <div className="text-[10px] sm:text-xs text-destructive font-medium mb-1 truncate">NOT COMMITTED</div>
            <div className="text-lg sm:text-2xl font-bold text-destructive">{metrics.notCommitted}</div>
          </div>
          <div className="text-center p-1.5 sm:p-2 border rounded-sm">
            <div className="text-[10px] sm:text-xs text-muted-foreground font-medium mb-1 truncate">COMMITTED</div>
            <div className="text-lg sm:text-2xl font-bold text-foreground">{metrics.committedPct}%</div>
          </div>
          <div className="text-center p-1.5 sm:p-2 border rounded-sm">
            <div className="text-[10px] sm:text-xs text-success font-medium mb-1 truncate">DONE</div>
            <div className="text-lg sm:text-2xl font-bold text-success">{metrics.donePct}%</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-2 sm:px-3">
        <ScrollArea className="h-[200px] sm:h-[280px] pr-2 sm:pr-3">
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
                    <span className="text-xs sm:text-sm font-medium flex-1 truncate min-w-0">
                      {link.fromFeature?.display_id || 'F-'} {link.fromFeature?.name || 'Feature'}
                    </span>
                    <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                      <Lozenge appearance="default">TRA</Lozenge>
                      <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                      <Lozenge appearance="default">BAL</Lozenge>
                    </div>
                  </div>
                  
                  {/* Nested work items (if available) */}
                  {link.dependency?.description && (
                    <div className="pl-6 sm:pl-8 pr-2 pb-2">
                      <div className="flex items-start gap-2 py-1">
                        <Circle className="h-2 w-2 sm:h-2.5 sm:w-2.5 fill-workitem-theme text-workitem-theme mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {link.toFeature?.display_id || 'F-'}: {link.toFeature?.name || 'Related Feature'}
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
    <div className="w-full max-w-[400px] flex-shrink-0 space-y-4 overflow-hidden">
      <Card className="border-2 border-warning bg-warning/10 dark:bg-warning/5 shadow-lg shadow-warning/20 dark:shadow-warning/10 transition-all">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-base font-bold text-warning-foreground flex items-center gap-2 truncate">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-warning animate-pulse flex-shrink-0" />
            <span className="truncate">{selectedNode.name}</span>
          </CardTitle>
          <div className="flex gap-2 text-xs sm:text-sm text-muted-foreground">
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
