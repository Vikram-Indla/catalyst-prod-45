import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { TesterPerformance } from '@/types/reports';

const getPassRateAppearance = (rate: number): LozengeAppearance => {
  if (rate >= 90) return 'success';
  if (rate >= 70) return 'moved';
  return 'removed';
};

interface TesterLeaderboardProps { data: TesterPerformance[]; isLoading?: boolean; }

export function TesterLeaderboard({ data, isLoading }: TesterLeaderboardProps) {
  if (isLoading) return (
    <Card><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent><div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div></CardContent></Card>
  );

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getRankBadge = (index: number) => index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-medium">Top Testers</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">No tester data</div>
        ) : (
          <div className="space-y-3">
            {data.slice(0, 5).map((tester, index) => (
              <div key={tester.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <span className="w-6 text-center font-medium">{getRankBadge(index)}</span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={tester.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{getInitials(tester.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tester.full_name}</p>
                  <p className="text-xs text-muted-foreground">{tester.passed} passed, {tester.failed} failed</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{tester.total_executed}</p>
                  <Lozenge appearance={getPassRateAppearance(tester.pass_rate)}>{tester.pass_rate}%</Lozenge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
