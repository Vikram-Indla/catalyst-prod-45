import { useWorkItemKeyHistory } from '@/hooks/useWorkItemKeyHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lozenge } from '@/components/ads';
import { History, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface KeyHistorySectionProps {
  workItemId: string;
  workItemType: 'epic' | 'feature' | 'story' | 'defect' | 'theme';
  currentKey: string;
}

export function KeyHistorySection({ workItemId, workItemType, currentKey }: KeyHistorySectionProps) {
  const { history, isLoading } = useWorkItemKeyHistory(workItemId, workItemType);

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-neutral-200 dark:border-[var(--ds-border,#2E2E2E)] rounded-xl shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-brand-primary" />
            Key History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-neutral-200 dark:border-[var(--ds-border,#2E2E2E)] rounded-xl shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-brand-primary" />
            Key History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            Current key: <Lozenge appearance="inprogress">{currentKey}</Lozenge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">No key changes recorded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-neutral-200 dark:border-[var(--ds-border,#2E2E2E)] rounded-xl shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <History className="h-4 w-4 text-brand-primary" />
          Key History
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          Current key: <Lozenge appearance="inprogress">{currentKey}</Lozenge>
        </div>

        <div className="space-y-2">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 text-xs p-2 bg-muted/30 rounded-md"
            >
              <Lozenge appearance="default">{entry.old_key}</Lozenge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Lozenge appearance="default">{entry.new_key}</Lozenge>
              <span className="text-muted-foreground ml-auto">
                {format(new Date(entry.changed_at), 'MMM d, yyyy')}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Historical keys can be used to find this item via search.
        </p>
      </CardContent>
    </Card>
  );
}
