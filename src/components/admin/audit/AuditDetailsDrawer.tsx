import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import Button from '@atlaskit/button/new';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { format, parseISO } from 'date-fns';
import { Json } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import ClockIcon from '@atlaskit/icon/core/clock';
import DatabaseIcon from '@atlaskit/icon/core/database';
import DownloadIcon from '@atlaskit/icon/core/download';
import FileIcon from '@atlaskit/icon/core/file';
import LinkExternalIcon from '@atlaskit/icon/core/link-external';
import PersonIcon from '@atlaskit/icon/core/person';

interface ActivityEvent {
  id: string;
  created_at: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: Json | null;
  after_json: Json | null;
}

interface AuditDetailsDrawerProps {
  event: ActivityEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditDetailsDrawer({ event, open, onOpenChange }: AuditDetailsDrawerProps) {
  if (!event) return null;

  const getActionAppearance = (action: string): LozengeAppearance => {
    switch (action) {
      case 'INSERT': return 'success';
      case 'UPDATE': return 'inprogress';
      case 'DELETE': return 'removed';
      default: return 'default';
    }
  };

  // Helper to safely get object from Json
  const toRecord = (json: Json | null): Record<string, unknown> => {
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      return json as Record<string, unknown>;
    }
    return {};
  };

  // Compute field-level diff
  const computeDiff = () => {
    const changes: { field: string; before: unknown; after: unknown }[] = [];
    
    if (event.action === 'INSERT' && event.after_json) {
      const afterObj = toRecord(event.after_json);
      Object.entries(afterObj).forEach(([key, value]) => {
        changes.push({ field: key, before: null, after: value });
      });
    } else if (event.action === 'DELETE' && event.before_json) {
      const beforeObj = toRecord(event.before_json);
      Object.entries(beforeObj).forEach(([key, value]) => {
        changes.push({ field: key, before: value, after: null });
      });
    } else if (event.action === 'UPDATE') {
      const before = toRecord(event.before_json);
      const after = toRecord(event.after_json);
      const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
      
      allKeys.forEach(key => {
        const beforeVal = before[key];
        const afterVal = after[key];
        if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
          changes.push({ field: key, before: beforeVal, after: afterVal });
        }
      });
    }
    
    return changes;
  };

  const diff = computeDiff();

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const handleExport = () => {
    const data = JSON.stringify(event, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-event-${event.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Lozenge appearance={getActionAppearance(event.action)}>
              {event.action}
            </Lozenge>
            <SheetTitle className="text-base">{event.entity_type}</SheetTitle>
          </div>
          <SheetDescription className="font-mono text-xs">
            {event.entity_id}
          </SheetDescription>
        </SheetHeader>

        <hr style={{ margin: '16px 0', border: 'none', borderTop: '0 solid var(--ds-border-layout, #EBECF0)' }} />

        {/* Metadata */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Event Details</h3>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClockIcon label="" size="small" />
              <span>Timestamp</span>
            </div>
            <div className="font-medium">
              {event.created_at 
                ? format(parseISO(event.created_at), 'MMM d, yyyy HH:mm:ss') 
                : '-'}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <PersonIcon label="" size="small" />
              <span>Actor</span>
            </div>
            <div className="font-mono text-xs">
              {event.actor_id || 'System'}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <DatabaseIcon label="" size="small" />
              <span>Entity Type</span>
            </div>
            <div className="font-medium">{event.entity_type}</div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <FileIcon label="" size="small" />
              <span>Event ID</span>
            </div>
            <div className="font-mono text-xs truncate">{event.id}</div>
          </div>
        </div>

        <hr style={{ margin: '16px 0', border: 'none', borderTop: '0 solid var(--ds-border-layout, #EBECF0)' }} />

        {/* Field-level Diff */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Changes</h3>
          
          {diff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No field changes recorded</p>
          ) : (
            <div className="space-y-3">
              {diff.slice(0, 20).map((change, idx) => (
                <div key={idx} className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {change.field}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-1">Before</span>
                      <pre className="bg-red-50 text-red-800 p-2 rounded text-xs overflow-x-auto max-h-20">
                        {formatValue(change.before)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">After</span>
                      <pre className="bg-green-50 text-green-800 p-2 rounded text-xs overflow-x-auto max-h-20">
                        {formatValue(change.after)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
              {diff.length > 20 && (
                <p className="text-xs text-muted-foreground">
                  + {diff.length - 20} more fields
                </p>
              )}
            </div>
          )}
        </div>

        <hr style={{ margin: '16px 0', border: 'none', borderTop: '0 solid var(--ds-border-layout, #EBECF0)' }} />

        {/* Actions */}
        <div className="flex gap-2">
          <Button appearance="default" iconBefore={DownloadIcon} onClick={handleExport}>
            Export event
          </Button>
          {/* Placeholder for "Open entity" link */}
          <Button appearance="subtle" iconBefore={LinkExternalIcon} isDisabled>
            Open entity
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
