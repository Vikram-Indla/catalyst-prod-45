import { useWorkItemKeyHistory } from '@/hooks/useWorkItemKeyHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
      <Card className="bg-white border border-neutral-200 rounded-xl shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-brand-gold" />
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
      <Card className="bg-white border border-neutral-200 rounded-xl shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-brand-gold" />
            Key History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">
            Current key: <Badge variant="outline" className="ml-1">{currentKey}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">No key changes recorded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-neutral-200 rounded-xl shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <History className="h-4 w-4 text-brand-gold" />
          Key History
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="text-sm text-muted-foreground">
          Current key: <Badge variant="outline" className="ml-1">{currentKey}</Badge>
        </div>
        
        <div className="space-y-2">
          {history.map((entry) => (
            <div 
              key={entry.id} 
              className="flex items-center gap-2 text-xs p-2 bg-muted/30 rounded-md"
            >
              <Badge variant="secondary" className="font-mono text-xs">
                {entry.old_key}
              </Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant="secondary" className="font-mono text-xs">
                {entry.new_key}
              </Badge>
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
