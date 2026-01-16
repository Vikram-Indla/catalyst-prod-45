import { Release } from '@/types/release-dashboard';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { differenceInDays } from 'date-fns';

interface ReleaseHeaderProps {
  release: Release;
}

const statusStyles: Record<Release['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-primary/10 text-primary',
  completed: 'bg-teal-100 text-teal-700',
  archived: 'bg-slate-100 text-slate-500',
};

export function ReleaseHeader({ release }: ReleaseHeaderProps) {
  const daysLeft = differenceInDays(new Date(release.targetDate), new Date());
  const totalTests = release.testCycles.reduce((sum, c) => sum + c.testCount, 0);
  const passedTests = release.testCycles.reduce((sum, c) => sum + c.passedCount, 0);
  const progressPercent = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  return (
    <div className="flex items-center gap-4 bg-card border border-border rounded-lg p-4">
      {/* Version Badge */}
      <div className="w-11 h-11 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg shrink-0">
        {release.version.split('.')[0]}.{release.version.split('.')[1]}
      </div>

      {/* Title and Status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground truncate">{release.name}</h1>
          <Badge className={`${statusStyles[release.status]} capitalize text-[10px] font-semibold px-2 py-0.5`}>
            {release.status === 'active' && (
              <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1.5 animate-pulse" />
            )}
            {release.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {release.description} • Sprint {release.sprintId?.slice(-2) || '—'}
        </p>
      </div>

      {/* Days Left */}
      <div className="text-right shrink-0">
        <div className="text-xl font-bold text-foreground">{daysLeft > 0 ? daysLeft : 0}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Days Left
        </div>
      </div>

      {/* Progress */}
      <div className="w-32 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xl font-bold text-primary">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>
    </div>
  );
}
