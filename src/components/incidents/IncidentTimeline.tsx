import { useState } from 'react';
import { MessageSquare, ArrowRight, UserPlus, Paperclip, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/release/UserAvatar';
import { cn } from '@/lib/utils';
import type { TimelineEvent, Comment } from '@/types/release';

interface IncidentTimelineProps {
  timeline: TimelineEvent[];
  comments: Comment[];
  onAddComment?: (text: string) => void;
}

type TabType = 'all' | 'comments' | 'history';

const getEventIcon = (type: string) => {
  switch (type) {
    case 'status_change': return ArrowRight;
    case 'assignment': return UserPlus;
    case 'comment': return MessageSquare;
    case 'attachment': return Paperclip;
    case 'major_incident': return AlertTriangle;
    default: return Plus;
  }
};

const getDotColor = (color: string) => {
  switch (color) {
    case 'gold': return 'bg-[#C69C6D]';
    case 'blue': return 'bg-blue-500';
    case 'green': return 'bg-green-500';
    case 'red': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

export function IncidentTimeline({ timeline, comments, onAddComment }: IncidentTimelineProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [newComment, setNewComment] = useState('');

  const handlePostComment = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  // Merge timeline events and comments for "all" view
  const allItems = [
    ...timeline.map(t => ({ ...t, itemType: 'timeline' as const })),
    ...comments.map(c => ({
      id: c.id,
      type: 'comment' as const,
      user: c.author.name,
      time: new Date(c.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      event: c.text,
      dotColor: 'blue' as const,
      itemType: 'comment' as const,
      author: c.author,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const displayItems = activeTab === 'comments' 
    ? allItems.filter(i => i.type === 'comment')
    : activeTab === 'history'
    ? allItems.filter(i => i.type !== 'comment')
    : allItems;

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#E8E8E8]">
        {(['all', 'comments', 'history'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab
                ? "border-[#C69C6D] text-[#C69C6D]"
                : "border-transparent text-[#8C8C8C] hover:text-[#5C5C5C]"
            )}
          >
            {tab === 'all' ? 'All Activity' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Timeline Items */}
      <div className="max-h-[400px] overflow-y-auto">
        {displayItems.length === 0 ? (
          <div className="p-8 text-center text-[#8C8C8C] text-sm">
            No activity yet
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {displayItems.map((item, index) => {
              const Icon = getEventIcon(item.type);
              return (
                <div key={item.id || index} className="flex gap-3">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      item.type === 'comment' ? 'bg-blue-100' : 'bg-[#F5F5F5]'
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        item.type === 'comment' ? 'text-blue-600' : 'text-[#8C8C8C]'
                      )} />
                    </div>
                    {index < displayItems.length - 1 && (
                      <div className="w-px h-full bg-[#E8E8E8] my-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      {'author' in item && item.author ? (
                        <UserAvatar initials={item.author.initials} size="sm" />
                      ) : null}
                      <span className="font-semibold text-[13px] text-[#172B4D]">
                        {item.user}
                      </span>
                      <span className="text-xs text-[#8C8C8C]">{item.time}</span>
                    </div>
                    <p className={cn(
                      "text-sm",
                      item.type === 'comment' ? 'text-[#5C5C5C]' : 'text-[#8C8C8C]'
                    )}>
                      {item.event}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Comment */}
      <div className="p-4 border-t border-[#E8E8E8] bg-[#FAFBFC]">
        <div className="flex gap-3">
          <UserAvatar initials="ME" size="sm" />
          <div className="flex-1">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[70px] border-[#E8E8E8] bg-white resize-none"
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                onClick={handlePostComment}
                disabled={!newComment.trim()}
                className="h-9 bg-[#C69C6D] hover:bg-[#B8894D] text-white disabled:opacity-50"
              >
                Post Comment
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
