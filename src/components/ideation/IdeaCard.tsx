// ==============================================
// IDEA CARD COMPONENT
// Based on Jira Align Ideation screenshots
// ==============================================

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Bell, BellOff, ChevronUp, ChevronDown, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import type { Idea, VotingType, IdeationVote, IdeaStatus } from '@/types/ideation';
import { IDEA_STATUS_COLORS } from '@/types/ideation';

interface IdeaCardProps {
  idea: Idea;
  votingType: VotingType;
  userVote: IdeationVote | null;
  userTokensRemaining: number;
  isSubscribed: boolean;
  onVote: (voteType: 'For' | 'Against' | 'Token', tokens?: number) => void;
  onRemoveVote: () => void;
  onToggleSubscribe: () => void;
  onClick: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function IdeaCard({
  idea,
  votingType,
  userVote,
  userTokensRemaining,
  isSubscribed,
  onVote,
  onRemoveVote,
  onToggleSubscribe,
  onClick,
  selectable = false,
  selected = false,
  onSelect,
}: IdeaCardProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  const truncatedDescription = idea.description.length > 200 
    ? idea.description.slice(0, 200) + '...'
    : idea.description;
  
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleVoteUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (votingType === 'ForAgainst') {
      if (userVote?.vote_type === 'For') {
        onRemoveVote();
      } else {
        onVote('For');
      }
    }
  };

  const handleVoteDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (votingType === 'ForAgainst') {
      if (userVote?.vote_type === 'Against') {
        onRemoveVote();
      } else {
        onVote('Against');
      }
    }
  };

  const handleTokenIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userTokensRemaining > 0 || userVote) {
      const currentTokens = userVote?.token_count || 0;
      onVote('Token', currentTokens + 1);
    }
  };

  const handleTokenDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userVote && userVote.token_count > 0) {
      if (userVote.token_count === 1) {
        onRemoveVote();
      } else {
        onVote('Token', userVote.token_count - 1);
      }
    }
  };

  return (
    <div
      className={cn(
        "bg-card border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer",
        selected && "ring-2 ring-brand-gold"
      )}
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* Vote Section - Left */}
        <div className="flex flex-col items-center min-w-[80px] border rounded p-2 bg-muted/30">
          <span className="text-xs text-muted-foreground mb-1">Idea Score</span>
          <span className="text-2xl font-semibold">{idea.vote_score}</span>
          
          {votingType === 'ForAgainst' ? (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleVoteUp}
                className={cn(
                  "p-1 rounded hover:bg-green-100 transition-colors",
                  userVote?.vote_type === 'For' && "bg-green-100"
                )}
              >
                <ChevronUp className={cn(
                  "h-5 w-5",
                  userVote?.vote_type === 'For' ? "text-green-600" : "text-muted-foreground"
                )} />
              </button>
              <button
                onClick={handleVoteDown}
                className={cn(
                  "p-1 rounded hover:bg-red-100 transition-colors",
                  userVote?.vote_type === 'Against' && "bg-red-100"
                )}
              >
                <ChevronDown className={cn(
                  "h-5 w-5",
                  userVote?.vote_type === 'Against' ? "text-red-600" : "text-muted-foreground"
                )} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-2">
              <button
                onClick={handleTokenDecrement}
                disabled={!userVote || userVote.token_count === 0}
                className="p-1 rounded hover:bg-muted disabled:opacity-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-sm min-w-[24px] text-center">
                {userVote?.token_count || 0}
              </span>
              <button
                onClick={handleTokenIncrement}
                disabled={userTokensRemaining <= 0 && !userVote}
                className="p-1 rounded hover:bg-muted disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {votingType === 'ForAgainst' ? (
            <div className="flex gap-2 text-xs mt-1">
              <span className="text-green-600">{idea.for_votes}</span>
              <span className="text-red-600">{idea.against_votes}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground mt-1">tokens</span>
          )}
        </div>

        {/* Content Section - Center */}
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-medium text-primary hover:underline truncate">
              {idea.title}
            </h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Meta Row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Avatar className="h-6 w-6">
              <AvatarImage src={idea.created_by?.avatar_url} />
              <AvatarFallback className="text-xs">
                {getInitials(idea.created_by?.full_name)}
              </AvatarFallback>
            </Avatar>
            
            <button
              onClick={(e) => { e.stopPropagation(); }}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              {idea.comment_count > 0 && (
                <span className="text-xs bg-destructive text-destructive-foreground rounded-full px-1.5">
                  {idea.comment_count}
                </span>
              )}
            </button>
            
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSubscribe();
              }}
            >
              {isSubscribed ? (
                <><BellOff className="h-3 w-3 mr-1" /> Unsubscribe</>
              ) : (
                <><Bell className="h-3 w-3 mr-1" /> Subscribe</>
              )}
            </Button>
            
            <Badge
              variant="outline"
              className={cn("text-xs", IDEA_STATUS_COLORS[idea.status as IdeaStatus])}
            >
              {idea.status}
            </Badge>
            
            {idea.created_by?.full_name && (
              <span className="text-xs text-muted-foreground">
                {idea.created_by.full_name}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mt-2">
            {showFullDescription ? idea.description : truncatedDescription}
            {idea.description.length > 200 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullDescription(!showFullDescription);
                }}
                className="text-primary hover:underline ml-1"
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </p>
        </div>

        {/* Selection Checkbox - Right */}
        {selectable && (
          <div className="flex items-start">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => {
                onSelect?.(!!checked);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
