/**
 * Test Detail Drawer
 * Slide-out panel showing test case details
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Play, Edit, Link, Check, X, AlertTriangle } from 'lucide-react';
import { useRepositoryStore } from '@/stores/repositoryStore';
import { mockTestCases } from '@/data/mockTestRepositoryData';
import { PRIORITY_CONFIG, STATUS_CONFIG, RUN_RESULT_CONFIG } from '@/types/test-repository';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function TestDetailDrawer() {
  const { isDrawerOpen, closeDrawer, activeTestId } = useRepositoryStore();

  const test = activeTestId ? mockTestCases.find(t => t.id === activeTestId) : null;

  if (!test) {
    return (
      <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent className="w-[520px] sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle>Test not found</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const priorityConfig = PRIORITY_CONFIG[test.priority];
  const statusConfig = STATUS_CONFIG[test.status];
  const runResultConfig = test.lastRunResult ? RUN_RESULT_CONFIG[test.lastRunResult] : null;

  return (
    <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent className="w-[520px] sm:max-w-[520px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-medium text-primary">{test.id}</span>
            <Badge className={cn("text-[10px] font-semibold capitalize", priorityConfig.bgClass, priorityConfig.textClass)}>
              {test.priority}
            </Badge>
            <Badge className={cn("text-[10px] font-semibold", statusConfig.bgClass, statusConfig.textClass)}>
              {statusConfig.label}
            </Badge>
          </div>
          <SheetTitle className="text-base font-bold text-foreground">{test.name}</SheetTitle>
          {test.lastRunDate && (
            <p className="text-xs text-muted-foreground">
              Last run: {format(new Date(test.lastRunDate), 'MMM d, yyyy h:mm a')}
              {runResultConfig && (
                <Badge className={cn("ml-2 text-[10px]", runResultConfig.bgClass, runResultConfig.textClass)}>
                  {runResultConfig.label}
                </Badge>
              )}
            </p>
          )}
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Description */}
          {test.description && (
            <div className="px-5 py-4 border-b border-border">
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Description</h4>
              <p className="text-sm text-foreground">{test.description}</p>
            </div>
          )}

          {/* Preconditions */}
          {test.preconditions && (
            <div className="px-5 py-4 border-b border-border">
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Preconditions</h4>
              <p className="text-sm text-foreground">{test.preconditions}</p>
            </div>
          )}

          {/* Linked Requirements */}
          {test.linkedRequirements.length > 0 && (
            <div className="px-5 py-4 border-b border-border">
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Linked Requirements</h4>
              <div className="flex flex-wrap gap-2">
                {test.linkedRequirements.map(req => (
                  <Badge
                    key={req}
                    variant="outline"
                    className="text-xs font-medium cursor-pointer hover:bg-muted"
                  >
                    <Link className="w-3 h-3 mr-1.5" />
                    {req}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Test Steps */}
          <div className="px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Test Steps</h4>
            <div className="space-y-3">
              {test.steps.map((step) => (
                <div
                  key={step.order}
                  className="p-3 rounded-md border border-border bg-muted/30"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5">
                      {step.order}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground mb-1">{step.action}</p>
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-medium">Expected:</span> {step.expectedResult}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <Separator />
        <div className="px-5 py-4 flex items-center gap-3">
          <Button variant="outline" className="flex-1">
            <Edit className="w-4 h-4 mr-2" />
            Edit Test
          </Button>
          <Button className="flex-1 bg-primary hover:bg-primary/90">
            <Play className="w-4 h-4 mr-2" />
            Execute Test
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
