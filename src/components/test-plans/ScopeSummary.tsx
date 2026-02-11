import { FileText, Folder, MinusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useScopeSummary } from '@/hooks/useTestPlansG26';

export function ScopeSummary({ planId }: { planId: string }) {
  const { data: summary, isLoading } = useScopeSummary(planId);
  if (isLoading) return <div className="h-16 animate-pulse bg-muted rounded-lg" />;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5 text-primary" />{summary?.total_tests || 0}</div>
            <p className="text-xs text-muted-foreground">Total Tests</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold"><Folder className="h-5 w-5 text-blue-500" />{summary?.folders || 0}</div>
            <p className="text-xs text-muted-foreground">Folders</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold"><MinusCircle className="h-5 w-5 text-red-500" />{summary?.excluded || 0}</div>
            <p className="text-xs text-muted-foreground">Excluded</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
