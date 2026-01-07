import React from 'react';
import { X, Clock, Hash, Cpu, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AuditEvent {
  id: string;
  event_type: string;
  created_at: string;
  payload_json?: Record<string, unknown> | null;
}

interface RunDetails {
  id: string;
  run_number: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  canonical_text_hash: string | null;
  model_id: string;
  temperature: number;
  top_p: number;
  prompt_pack_version: string | null;
  sources_pack_version: string | null;
}

interface RunDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  latestRun: RunDetails | null | undefined;
  auditEvents: AuditEvent[];
  isAuditLoading: boolean;
}

export function RunDetailsDrawer({
  open,
  onClose,
  latestRun,
  auditEvents,
  isAuditLoading
}: RunDetailsDrawerProps) {
  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTime = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/30';
      case 'running': return 'bg-primary/10 text-primary border-primary/30';
      case 'failed': return 'bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))] border-[hsl(var(--danger))]/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/30 z-40 transition-opacity duration-200",
          open ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 w-[360px] bg-card border-l border-border z-50 flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold">Run Details</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {latestRun ? (
            <>
              {/* Run info section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Run Status</span>
                  <Badge variant="outline" className={cn("capitalize", getStatusColor(latestRun.status))}>
                    {latestRun.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {latestRun.status === 'running' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                    {latestRun.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {latestRun.status}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Run Number</span>
                    <span className="text-sm font-medium font-mono">#{latestRun.run_number}</span>
                  </div>

                  {latestRun.started_at && (
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Started</span>
                      <span className="text-sm font-medium">{formatTime(latestRun.started_at)}</span>
                    </div>
                  )}

                  {latestRun.canonical_text_hash && (
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5" />
                        Document Hash
                      </span>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {latestRun.canonical_text_hash.substring(0, 8)}...
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* Model config section */}
              <div className="space-y-4">
                <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5" />
                  AI Configuration
                </span>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Model</span>
                    <span className="text-sm font-medium font-mono">{latestRun.model_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Temperature</span>
                    <span className="text-sm font-medium font-mono">{latestRun.temperature}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Top P</span>
                    <span className="text-sm font-medium font-mono">{latestRun.top_p}</span>
                  </div>
                  {latestRun.prompt_pack_version && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Prompt Pack</span>
                      <span className="text-sm font-medium font-mono">{latestRun.prompt_pack_version}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Cpu className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No run available</p>
              <p className="text-xs mt-1">Start an AI analysis to see run details</p>
            </div>
          )}

          {/* Audit timeline */}
          <div className="space-y-4">
            <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Audit Timeline
            </span>

            {isAuditLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : auditEvents.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditEvents.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex gap-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{formatEventType(event.event_type)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(event.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                <p className="text-sm">No audit events yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
