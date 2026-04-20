import { Lozenge } from '@/components/ads';
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
        <Lozenge appearance="default">
          Ranking Disabled (Filters Active)
        </Lozenge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <Lozenge appearance="default">
        {context.label}
      </Lozenge>
      {rank !== null && (
        <span className="text-muted-foreground">#{rank}</span>
      )}
    </div>
  );
}
