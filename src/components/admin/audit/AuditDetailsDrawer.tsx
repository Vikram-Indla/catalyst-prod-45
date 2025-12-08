import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { Json } from '@/integrations/supabase/types';
import { 
  Download, 
  ExternalLink,
  Clock,
  User,
  Database,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'text-green-600 bg-green-50';
      case 'UPDATE': return 'text-blue-600 bg-blue-50';
      case 'DELETE': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
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
            <Badge className={cn('text-xs', getActionColor(event.action))}>
              {event.action}
            </Badge>
            <SheetTitle className="text-base">{event.entity_type}</SheetTitle>
          </div>
          <SheetDescription className="font-mono text-xs">
            {event.entity_id}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {/* Metadata */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Event Details</h3>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Timestamp</span>
            </div>
            <div className="font-medium">
              {event.created_at 
                ? format(parseISO(event.created_at), 'MMM d, yyyy HH:mm:ss') 
                : '-'}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Actor</span>
            </div>
            <div className="font-mono text-xs">
              {event.actor_id || 'System'}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>Entity Type</span>
            </div>
            <div className="font-medium">{event.entity_type}</div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Event ID</span>
            </div>
            <div className="font-mono text-xs truncate">{event.id}</div>
          </div>
        </div>

        <Separator className="my-4" />

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

        <Separator className="my-4" />

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export event
          </Button>
          {/* Placeholder for "Open entity" link */}
          <Button variant="ghost" size="sm" className="gap-2" disabled>
            <ExternalLink className="h-4 w-4" />
            Open entity
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
