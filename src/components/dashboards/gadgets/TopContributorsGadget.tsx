import { useProjectMetricsReport } from '@/hooks/useProjectMetrics';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { GadgetConfig } from '@/types/dashboard.types';
import { Trophy } from 'lucide-react';

interface TopContributorsGadgetProps {
  config: GadgetConfig;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function TopContributorsGadget({ config }: TopContributorsGadgetProps) {
  const { data, isLoading } = useProjectMetricsReport({ programId: config.projectId });
  const topN = config.topN || 5;

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded" />
        ))}
      </div>
    );
  }

  if (!data || data.contributors.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <Trophy className="h-12 w-12 mb-2 opacity-50" />
        <p>No contributors yet</p>
      </div>
    );
  }

  const contributors = data.contributors.slice(0, topN);
  const maxScore = contributors[0]?.contributionScore || 1;

  return (
    <div className="p-4 space-y-3">
      <div className="text-sm font-medium text-muted-foreground mb-2">Past 90 Days</div>
      {contributors.map((contributor, index) => (
        <div key={contributor.userId} className="flex items-center gap-3">
          <div className="w-8 text-center text-lg">
            {index < 3 ? MEDALS[index] : <span className="text-sm text-muted-foreground">{index + 1}</span>}
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-brand-gold/20 text-brand-gold text-xs">
              {contributor.userName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{contributor.userName}</div>
            <Progress 
              value={(contributor.contributionScore / maxScore) * 100} 
              className="h-1.5 mt-1"
            />
          </div>
          <div className="text-sm font-bold text-brand-gold">{contributor.contributionScore}</div>
        </div>
      ))}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        Score = (Created × 2) + (Executed × 3) + (Defects × 1)
      </div>
    </div>
  );
}
