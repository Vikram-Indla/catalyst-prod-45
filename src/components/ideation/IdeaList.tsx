// ==============================================
// IDEA LIST COMPONENT
// Displays list of ideas with voting and actions
// ==============================================

import { IdeaCard } from './IdeaCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Idea, VotingType, IdeationVote, IdeationSubscription } from '@/types/ideation';

interface IdeaListProps {
  ideas: Idea[];
  isLoading: boolean;
  votingType: VotingType;
  userVotes: IdeationVote[];
  userSubscriptions: IdeationSubscription[];
  userTokensRemaining: number;
  onVote: (ideaId: string, voteType: 'For' | 'Against' | 'Token', tokens?: number) => void;
  onRemoveVote: (ideaId: string) => void;
  onToggleSubscribe: (ideaId: string, isSubscribed: boolean) => void;
  onIdeaClick: (idea: Idea) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectChange?: (ideaId: string, selected: boolean) => void;
}

export function IdeaList({
  ideas,
  isLoading,
  votingType,
  userVotes,
  userSubscriptions,
  userTokensRemaining,
  onVote,
  onRemoveVote,
  onToggleSubscribe,
  onIdeaClick,
  selectable = false,
  selectedIds = [],
  onSelectChange,
}: IdeaListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
          <span className="text-2xl">💡</span>
        </div>
        <h3 className="text-lg font-medium mb-2">No Ideas Found</h3>
        <p className="text-muted-foreground max-w-md">
          There are no ideas matching your current filters. Try adjusting your filters or create a new idea.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ideas.map((idea) => {
        const userVote = userVotes.find((v) => v.idea_id === idea.id) || null;
        const isSubscribed = userSubscriptions.some((s) => s.idea_id === idea.id);

        return (
          <IdeaCard
            key={idea.id}
            idea={idea}
            votingType={votingType}
            userVote={userVote}
            userTokensRemaining={userTokensRemaining}
            isSubscribed={isSubscribed}
            onVote={(voteType, tokens) => onVote(idea.id, voteType, tokens)}
            onRemoveVote={() => onRemoveVote(idea.id)}
            onToggleSubscribe={() => onToggleSubscribe(idea.id, isSubscribed)}
            onClick={() => onIdeaClick(idea)}
            selectable={selectable}
            selected={selectedIds.includes(idea.id)}
            onSelect={(selected) => onSelectChange?.(idea.id, selected)}
          />
        );
      })}
    </div>
  );
}
