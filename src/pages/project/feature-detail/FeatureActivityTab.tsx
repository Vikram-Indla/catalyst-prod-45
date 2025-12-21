/**
 * FeatureActivityTab — Comments and history (V1 Wired)
 */

import { useState } from 'react';
import { History, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Real hooks
import { useWorkItemComments } from '@/hooks/useWorkItemComments';
import { useWorkItemActivityFeed } from '@/hooks/useWorkItemActivityFeed';

interface FeatureActivityTabProps {
  featureId: string;
}

type FilterType = 'all' | 'comments' | 'history';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'comments', label: 'Comments' },
  { value: 'history', label: 'History' },
];

export function FeatureActivityTab({ featureId }: FeatureActivityTabProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [newComment, setNewComment] = useState('');

  // Real data
  const { comments, createComment, isCreating } = useWorkItemComments('feature', featureId);
  const { activities = [] } = useWorkItemActivityFeed('features', featureId);

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      createComment(newComment.trim());
      setNewComment('');
    }
  };

  // Combine and filter
  const allItems = [
    ...comments.map(c => ({ ...c, itemType: 'comment' as const, timestamp: new Date(c.created_at) })),
    ...activities.map(a => ({ ...a, itemType: 'history' as const, timestamp: new Date(a.timestamp) })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const filteredItems = allItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'comments') return item.itemType === 'comment';
    if (filter === 'history') return item.itemType === 'history';
    return true;
  });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              filter === option.value
                ? "bg-brand-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Comment Composer */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium flex-shrink-0">ME</div>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Add a comment... Use @mention to notify others"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSubmitComment} disabled={!newComment.trim() || isCreating}>
              <Send className="h-4 w-4 mr-1" />
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No activity yet.</div>
        ) : filteredItems.map((item: any) => (
          <div key={item.id} className="flex gap-3">
            {item.itemType === 'history' ? (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <History className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                {(item.user_name || 'U').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {item.itemType === 'comment' && (
                <div className="bg-card border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-foreground">{item.user_name || 'User'}</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(item.timestamp, { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm text-foreground/90">{item.content}</p>
                </div>
              )}
              {item.itemType === 'history' && (
                <div className="py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{item.action || 'Updated'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(item.timestamp, { addSuffix: true })}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
