import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lozenge } from '@/components/ads';

interface SlaRecord {
  id: string;
  response_due_at: string;
  resolution_due_at: string;
  responded_at?: string;
  resolved_at?: string;
  response_breached: boolean;
  resolution_breached: boolean;
}

interface SlaStatusCardProps {
  slaRecord?: SlaRecord | null;
  createdAt: string;
}

function formatTimeRemaining(targetDate: Date, now: Date): string {
  const diff = targetDate.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diff < 0) {
    return `${hours}h ${minutes}m overdue`;
  }
  return `${hours}h ${minutes}m remaining`;
}

function getProgressPercentage(start: Date, due: Date, now: Date): number {
  const total = due.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export function SlaStatusCard({ slaRecord, createdAt }: SlaStatusCardProps) {
  if (!slaRecord) {
    return (
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">No SLA configured for this severity</span>
        </div>
      </div>
    );
  }

  const now = new Date();
  const responseDue = new Date(slaRecord.response_due_at);
  const resolutionDue = new Date(slaRecord.resolution_due_at);
  const created = new Date(createdAt);

  const responseProgress = getProgressPercentage(created, responseDue, now);
  const resolutionProgress = getProgressPercentage(created, resolutionDue, now);

  const responseStatus = slaRecord.responded_at 
    ? 'met' 
    : slaRecord.response_breached || now > responseDue 
      ? 'breached' 
      : 'pending';
  
  const resolutionStatus = slaRecord.resolved_at 
    ? 'met' 
    : slaRecord.resolution_breached || now > resolutionDue 
      ? 'breached' 
      : 'pending';

  return (
    <div className="space-y-4">
      {/* Response SLA */}
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Response SLA</span>
          </div>
          <SlaStatusBadge status={responseStatus} />
        </div>
        
        {responseStatus === 'pending' && (
          <>
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
              <div 
                className={cn(
                  "h-full transition-all",
                  responseProgress > 80 ? "bg-destructive" : 
                  responseProgress > 50 ? "bg-yellow-500" : "bg-brand-primary"
                )}
                style={{ width: `${responseProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTimeRemaining(responseDue, now)}
            </p>
          </>
        )}
        
        {responseStatus === 'met' && (
          <p className="text-xs text-muted-foreground">
            Responded at {new Date(slaRecord.responded_at!).toLocaleString()}
          </p>
        )}
        
        {responseStatus === 'breached' && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {formatTimeRemaining(responseDue, now)}
          </p>
        )}
      </div>

      {/* Resolution SLA */}
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Resolution SLA</span>
          </div>
          <SlaStatusBadge status={resolutionStatus} />
        </div>
        
        {resolutionStatus === 'pending' && (
          <>
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
              <div 
                className={cn(
                  "h-full transition-all",
                  resolutionProgress > 80 ? "bg-destructive" : 
                  resolutionProgress > 50 ? "bg-yellow-500" : "bg-brand-primary"
                )}
                style={{ width: `${resolutionProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTimeRemaining(resolutionDue, now)}
            </p>
          </>
        )}
        
        {resolutionStatus === 'met' && (
          <p className="text-xs text-muted-foreground">
            Resolved at {new Date(slaRecord.resolved_at!).toLocaleString()}
          </p>
        )}
        
        {resolutionStatus === 'breached' && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {formatTimeRemaining(resolutionDue, now)}
          </p>
        )}
      </div>
    </div>
  );
}

function SlaStatusBadge({ status }: { status: 'pending' | 'met' | 'breached' }) {
  if (status === 'met') {
    return (
      <Lozenge appearance="success">
        Met
      </Lozenge>
    );
  }

  if (status === 'breached') {
    return (
      <Lozenge appearance="removed">
        Breached
      </Lozenge>
    );
  }

  return (
    <Lozenge appearance="moved">
      Pending
    </Lozenge>
  );
}
