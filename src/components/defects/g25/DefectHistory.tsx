import { Avatar } from '@/components/ads';
import { useDefectHistoryG25 } from '@/hooks/useDefectsG25';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const resultColors: Record<string, string> = {
  passed: 'text-[#006644]',
  failed: 'text-[#DE350B]',
  blocked: 'text-[#FF8B00]',
  skipped: 'text-muted-foreground',
};

export function DefectHistory({ defectId }: { defectId: string }) {
  const { data: history, isLoading } = useDefectHistoryG25(defectId);

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  if (!history?.length) return <p className="text-sm text-muted-foreground py-4 text-center">No linked execution history</p>;

  return (
    <div className="space-y-3">
      {history.map((h: any) => (
        <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <Avatar name={h.performed_by || 'System'} size="xsmall" />
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{h.performed_by || 'System'}</span>
              {' executed with result '}
              <span className={`font-medium uppercase ${resultColors[h.action] || ''}`}>{h.action || 'unknown'}</span>
            </p>
            {h.notes && <p className="text-xs text-muted-foreground mt-1">{h.notes}</p>}
            <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(h.performed_at), { addSuffix: true })}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
