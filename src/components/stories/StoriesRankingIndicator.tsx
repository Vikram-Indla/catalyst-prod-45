import { Badge } from '@/components/ui/badge';
import { RankingContext } from '@/hooks/useWorkItemRanking';

interface StoriesRankingIndicatorProps {
  context: RankingContext;
  rank: number | null;
  isFilterActive?: boolean;
}

export function StoriesRankingIndicator({ 
  context, 
  rank, 
  isFilterActive 
}: StoriesRankingIndicatorProps) {
  if (isFilterActive) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">
          Ranking Disabled (Filters Active)
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant="secondary" className="text-xs">
        {context.label}
      </Badge>
      {rank !== null && (
        <span className="text-muted-foreground">#{rank}</span>
      )}
    </div>
  );
}
