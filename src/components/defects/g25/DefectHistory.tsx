import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDefectHistoryG25 } from '@/hooks/useDefectsG25';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function DefectHistory({ defectId }: { defectId: string }) {
  const { data: history, isLoading } = useDefectHistoryG25(defectId);

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  if (!history?.length) return <p className="text-sm text-muted-foreground py-4 text-center">No history yet</p>;

  const formatField = (f: string) => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="space-y-3">
      {history.map(h => (
        <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <Avatar className="h-7 w-7">
            <AvatarImage src={h.changer?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{h.changer?.full_name?.slice(0, 2).toUpperCase() || 'SY'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{h.changer?.full_name || 'System'}</span>
              {' changed '}<span className="font-medium">{formatField(h.field_changed)}</span>
              {h.old_value && <> from <span className="text-muted-foreground line-through">{h.old_value}</span></>}
              {' to '}<span className="font-medium">{h.new_value || '(empty)'}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(h.changed_at), { addSuffix: true })}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
