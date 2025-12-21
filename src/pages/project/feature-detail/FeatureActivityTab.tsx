/**
 * FeatureActivityTab — Comments, history, and work log for Feature detail page
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, History, Clock, Send, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface FeatureActivityTabProps {
  featureId: string;
}

type FilterType = 'all' | 'comments' | 'history' | 'worklog';

// Mock activity data
const MOCK_ACTIVITY = [
  {
    id: '1',
    type: 'comment',
    user: 'Sara M.',
    avatar: 'SM',
    content: 'Updated the compliance rule specifications. Please review the attached document.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '2',
    type: 'history',
    user: 'System',
    action: 'Status changed',
    from: 'Backlog',
    to: 'In Progress',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    type: 'worklog',
    user: 'Ahmed K.',
    avatar: 'AK',
    hours: 4,
    description: 'API design and documentation',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    type: 'comment',
    user: 'Abu Badr',
    avatar: 'AB',
    content: 'Business requirements have been approved. Proceed with implementation.',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: '5',
    type: 'history',
    user: 'System',
    action: 'Owner changed',
    from: 'Unassigned',
    to: 'Sara M.',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
];

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'comments', label: 'Comments' },
  { value: 'history', label: 'History' },
  { value: 'worklog', label: 'Work Log' },
];

export function FeatureActivityTab({ featureId }: FeatureActivityTabProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [newComment, setNewComment] = useState('');

  const filteredActivity = MOCK_ACTIVITY.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'comments') return item.type === 'comment';
    if (filter === 'history') return item.type === 'history';
    if (filter === 'worklog') return item.type === 'worklog';
    return true;
  });

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      // Would submit to API
      setNewComment('');
    }
  };

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
        <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
          ME
        </div>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Add a comment... Use @mention to notify others"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end">
            <Button 
              size="sm" 
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
            >
              <Send className="h-4 w-4 mr-1" />
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-4">
        {filteredActivity.map((item) => (
          <div key={item.id} className="flex gap-3">
            {/* Avatar / Icon */}
            {item.type === 'history' ? (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <History className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : item.type === 'worklog' ? (
              <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-medium flex-shrink-0">
                {(item as any).avatar}
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                {(item as any).avatar}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {item.type === 'comment' && (
                <div className="bg-card border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-foreground">{item.user}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90">{(item as any).content}</p>
                </div>
              )}

              {item.type === 'history' && (
                <div className="py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{(item as any).action}:</span>
                    <Badge variant="outline" className="text-xs">
                      {(item as any).from}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="outline" className="text-xs">
                      {(item as any).to}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                  </span>
                </div>
              )}

              {item.type === 'worklog' && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-foreground">{item.user}</span>
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {(item as any).hours}h logged
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/90">{(item as any).description}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
