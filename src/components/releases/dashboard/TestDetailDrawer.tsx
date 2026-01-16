import { TestCase } from '@/types/release-dashboard';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, X, SkipForward, Play, Bug, ArrowRight, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TestDetailDrawerProps {
  test: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusStyles: Record<string, string> = {
  passed: 'bg-teal-100 text-teal-700',
  failed: 'bg-destructive/10 text-destructive',
  blocked: 'bg-amber-100 text-amber-700',
  'not-run': 'bg-muted text-muted-foreground',
  'in-progress': 'bg-primary/10 text-primary',
};

const stepStatusIcon = {
  passed: <Check className="w-3.5 h-3.5 text-teal-600" />,
  failed: <X className="w-3.5 h-3.5 text-destructive" />,
  skipped: <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />,
};

export function TestDetailDrawer({ test, open, onOpenChange }: TestDetailDrawerProps) {
  if (!test) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary">{test.id}</span>
            <Badge className={cn("text-[10px] font-semibold capitalize", statusStyles[test.status])}>
              {test.status.replace('-', ' ')}
            </Badge>
          </div>
          <SheetTitle className="text-base font-bold text-foreground mt-1">{test.title}</SheetTitle>
          {test.executedAt && (
            <p className="text-xs text-muted-foreground">
              Last executed: {format(new Date(test.executedAt), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Test Information */}
          <div className="px-5 py-4 border-b border-border">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Test Information</h4>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div>
                <span className="text-muted-foreground">Priority:</span>
                <span className="ml-2 font-medium capitalize">{test.priority}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Assignee:</span>
                <span className="ml-2 font-medium">{test.assigneeId || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <span className="ml-2 font-medium">
                  {test.duration ? `${Math.floor(test.duration / 60)}m ${test.duration % 60}s` : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Environment:</span>
                <span className="ml-2 font-medium">Staging</span>
              </div>
            </div>
          </div>

          {/* Traceability Chain */}
          {test.requirementId && (
            <div className="px-5 py-4 border-b border-border">
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Linked Items</h4>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border border-l-[3px] border-l-purple-500 border-border rounded text-[11px] font-medium">
                  {test.requirementId}
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border border-l-[3px] border-l-primary border-border rounded text-[11px] font-medium">
                  {test.id}
                </div>
                {test.defectIds.length > 0 && (
                  <>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border border-l-[3px] border-l-destructive border-border rounded text-[11px] font-medium">
                      {test.defectIds[0]}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Test Steps */}
          <div className="px-5 py-4 border-b border-border">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Test Steps</h4>
            <div className="space-y-2">
              {test.steps.map((step) => (
                <div
                  key={step.number}
                  className={cn(
                    "p-3 rounded-md border",
                    step.status === 'failed' ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30 border-border',
                    step.status === 'skipped' && 'opacity-60'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{step.action}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Expected: {step.expectedResult}</p>
                      {step.actualResult && (
                        <p className="text-[11px] text-destructive mt-1">Actual: {step.actualResult}</p>
                      )}
                    </div>
                    <div className="shrink-0">{stepStatusIcon[step.status]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Failure Details */}
          {test.status === 'failed' && (
            <div className="px-5 py-4 border-b border-border bg-destructive/5">
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-destructive mb-3">Failure Details</h4>
              <div className="bg-slate-900 text-slate-100 rounded-md p-3 text-xs font-mono overflow-x-auto">
                <code>AssertionError: Expected token to be valid but got null</code>
              </div>
            </div>
          )}

          {/* Attachments */}
          <div className="px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Attachments</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border cursor-pointer hover:bg-muted transition-colors">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs truncate">screenshot_001.png</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border cursor-pointer hover:bg-muted transition-colors">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs truncate">console_log.txt</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />
        <div className="px-5 py-4 flex items-center gap-3">
          <Button variant="outline" className="flex-1">
            <Play className="w-4 h-4 mr-2" />
            Rerun Test
          </Button>
          <Button variant="destructive" className="flex-1">
            <Bug className="w-4 h-4 mr-2" />
            Log Defect
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
