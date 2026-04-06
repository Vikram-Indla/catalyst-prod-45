import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  useSyncConnection,
  useSyncStatusMap,
  useSyncHealth,
  useRecentSyncEvents,
  useUpdateStatusMapping,
  useUpdateSyncDirection,
  usePendingEventCount,
} from '@/hooks/useSyncSettings';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { RefreshCw, Wifi, WifiOff, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

const CATALYST_STATUSES = [
  { value: 'To Do', color: 'grey' },
  { value: 'In Progress', color: 'blue' },
  { value: 'In Review', color: 'blue' },
  { value: 'Done', color: 'green' },
  { value: 'Backlog', color: 'grey' },
  { value: 'On Hold', color: 'grey' },
];

function ConnectionStatusCard({ projectId }: { projectId: string }) {
  const { data: connection, isLoading } = useSyncConnection(projectId);

  if (isLoading) {
    return (
      <Card className="border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E]">
        <CardContent className="p-6">
          <div className="animate-pulse h-16 rounded" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = !!connection;

  return (
    <Card className="border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] bg-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
          Jira Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[#059669]' : 'bg-[#94A3B8]'}`} />
          {isConnected ? (
            <Wifi className="w-4 h-4 text-[#059669]" />
          ) : (
            <WifiOff className="w-4 h-4 text-[#94A3B8]" />
          )}
          <span className="text-sm font-medium text-foreground">
            {isConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
        {connection && (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><span className="font-medium">Base URL:</span> {connection.jira_base_url}</p>
            <p><span className="font-medium">Project:</span> {connection.jira_project_key}</p>
            <p><span className="font-medium">Direction:</span> {connection.sync_direction}</p>
          </div>
        )}
        {!isConnected && (
          <p className="text-xs text-muted-foreground">
            No active Jira connection for this project. Configure one to enable sync.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusMappingTable({ projectId }: { projectId: string }) {
  const { data: mappings = [], isLoading } = useSyncStatusMap(projectId);
  const updateMapping = useUpdateStatusMapping();

  return (
    <Card className="border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] bg-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
          Status Mapping
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse h-32 rounded" />
        ) : mappings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No Jira statuses mapped yet. Statuses will appear after the first sync.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="h-9 border-b border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E]">
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground bg-[#F8FAFC] dark:bg-[#1A1A1A]">
                  Jira Status
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground bg-[#F8FAFC] dark:bg-[#1A1A1A]">
                  Catalyst Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m) => (
                <TableRow
                  key={m.id}
                  className="h-9 border-b border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E]"
                  style={{ maxHeight: 36 }}
                >
                  <TableCell className="py-2 px-3 text-[13px] text-foreground">
                    {m.jira_status_name}
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      ({m.jira_status_category})
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <Select
                      value={m.catalyst_status}
                      onValueChange={(val) => {
                        const match = CATALYST_STATUSES.find((s) => s.value === val);
                        updateMapping.mutate({
                          id: m.id,
                          catalyst_status: val,
                          catalyst_lozenge_color: match?.color || 'grey',
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATALYST_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">
                            {s.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function SyncDirectionSelector({ projectId }: { projectId: string }) {
  const { data: connection } = useSyncConnection(projectId);
  const updateDirection = useUpdateSyncDirection();

  if (!connection) return null;

  return (
    <Card className="border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] bg-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
          Sync Direction
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={connection.sync_direction}
          onValueChange={(val) =>
            updateDirection.mutate({ connectionId: connection.id, sync_direction: val })
          }
          className="space-y-2"
        >
          {[
            { value: 'bi', label: 'Bi-directional', desc: 'Changes flow both ways' },
            { value: 'catalyst_to_jira', label: 'Catalyst → Jira', desc: 'Push changes to Jira only' },
            { value: 'jira_to_catalyst', label: 'Jira → Catalyst', desc: 'Pull changes from Jira only' },
          ].map((opt) => (
            <div key={opt.value} className="flex items-start gap-2">
              <RadioGroupItem value={opt.value} id={`dir-${opt.value}`} className="mt-0.5" />
              <Label htmlFor={`dir-${opt.value}`} className="cursor-pointer">
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

function SyncHealthCard({ projectId }: { projectId: string }) {
  const { data: health, isLoading } = useSyncHealth(projectId);
  const { data: pendingCount = 0 } = usePendingEventCount(projectId);
  const { toast } = useToast();

  const processQueue = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('process_sync_events', { batch_size: 50 });
      if (error) throw error;
      return data as { processed: number; failed: number; skipped: number };
    },
    onSuccess: (data) => {
      toast({
        title: 'Queue processed',
        description: `Processed: ${data.processed}, Failed: ${data.failed}, Skipped: ${data.skipped}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Processing failed', description: err.message, variant: 'destructive' });
    },
  });

  const getHealthColor = (status?: string) => {
    if (!status) return '#94A3B8';
    if (status === 'healthy') return '#059669';
    if (status === 'degraded') return '#D97706';
    return '#DC2626';
  };

  const getHealthIcon = (status?: string) => {
    if (!status) return <Activity className="w-4 h-4 text-[#94A3B8]" />;
    if (status === 'healthy') return <CheckCircle2 className="w-4 h-4 text-[#059669]" />;
    if (status === 'degraded') return <AlertTriangle className="w-4 h-4 text-[#D97706]" />;
    return <AlertTriangle className="w-4 h-4 text-[#DC2626]" />;
  };

  const isQueueBackedUp = pendingCount > 10;

  return (
    <Card className="border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] bg-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
            Sync Health
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => processQueue.mutate()}
            disabled={processQueue.isPending}
            className="h-7 text-xs"
          >
            {processQueue.isPending ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : null}
            Manual process
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse h-20 rounded" />
        ) : !health ? (
          <div className="flex items-center gap-2 py-4">
            <Activity className="w-4 h-4 text-[#94A3B8]" />
            <span className="text-xs text-muted-foreground">No health data yet</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: isQueueBackedUp ? '#D97706' : getHealthColor(health.status) }}
              />
              {isQueueBackedUp ? (
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
              ) : (
                getHealthIcon(health.status)
              )}
              <span className="text-sm font-medium text-foreground capitalize">
                {isQueueBackedUp ? 'Queue backing up' : health.status}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Queue Depth', value: pendingCount },
                { label: 'Received', value: health.events_received },
                { label: 'Processed', value: health.events_processed },
                { label: 'Failed', value: health.events_failed },
                { label: 'Avg Latency', value: health.avg_latency_ms ? `${health.avg_latency_ms}ms` : '—' },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <p className="text-lg font-semibold font-mono text-foreground">{m.value ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentEventsTable({ projectId }: { projectId: string }) {
  const { data: events = [], isLoading } = useRecentSyncEvents(projectId);

  const getStatusBadge = (status: string) => {
    if (status === 'processed' || status === 'completed') {
      return <Badge className="bg-[#E3FCEF] text-[#006644] text-[11px] font-bold uppercase">{status}</Badge>;
    }
    if (status === 'pending') {
      return <Badge className="bg-[#DEEBFF] text-[#0747A6] text-[11px] font-bold uppercase">{status}</Badge>;
    }
    return <Badge className="bg-[#DFE1E6] text-[#253858] text-[11px] font-bold uppercase">{status}</Badge>;
  };

  return (
    <Card className="border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] bg-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
            Recent Sync Events
          </CardTitle>
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse h-48 rounded" />
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No sync events recorded yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="h-9 border-b border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E]">
                {['Time', 'Event', 'Entity', 'Status'].map((h) => (
                  <TableHead
                    key={h}
                    className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground bg-[#F8FAFC] dark:bg-[#1A1A1A] px-3 py-2.5"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((evt) => (
                <TableRow
                  key={evt.id}
                  className="h-9 border-b border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#1F1F1F]"
                  style={{ maxHeight: 36 }}
                >
                  <TableCell className="py-2 px-3 text-[12px] font-mono text-muted-foreground">
                    {new Date(evt.created_at).toLocaleString('en-US', {
                      month: 'short', day: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="py-2 px-3 text-[13px] text-foreground">
                    {evt.event_type}
                  </TableCell>
                  <TableCell className="py-2 px-3 text-[12px] font-mono text-muted-foreground">
                    {evt.entity_type}:{evt.entity_id}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    {getStatusBadge(evt.status || 'pending')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function SyncSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return <div className="p-6 text-muted-foreground">No project selected.</div>;
  }

  return (
    <div className="p-6 max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground font-[Sora]">Sync Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Configure Jira bi-directional synchronization for this project.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConnectionStatusCard projectId={projectId} />
        <SyncHealthCard projectId={projectId} />
      </div>

      <SyncDirectionSelector projectId={projectId} />
      <StatusMappingTable projectId={projectId} />
      <RecentEventsTable projectId={projectId} />
    </div>
  );
}
