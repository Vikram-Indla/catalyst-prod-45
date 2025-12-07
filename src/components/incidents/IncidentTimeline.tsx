import { useState } from 'react';
import { 
  MessageSquare, 
  ArrowRight, 
  UserPlus, 
  Paperclip, 
  AlertTriangle, 
  Plus,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  AtSign,
  Smile,
  Table,
  Code,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

// Sample mention suggestions
const mentionSuggestions = [
  { id: 'u1', name: 'h.binslimah.c', initials: 'HB', color: 'bg-purple-500' },
  { id: 'u2', name: 'Yahya Aloyoni', initials: 'YA', color: 'bg-green-500' },
  { id: 'u3', name: 'Nada alfassam', initials: 'NA', color: 'bg-green-600' },
  { id: 'u4', name: 'Yazeed Daraz', initials: 'YD', color: 'bg-blue-500' },
  { id: 'u5', name: 'Imran Aslam', initials: 'IA', color: 'bg-gray-400' },
  { id: 'u6', name: 'Suleiman Ahmad Allawanseh', initials: 'SA', color: 'bg-green-500' },
];

export function IncidentTimeline({ timeline, comments, onAddComment }: IncidentTimelineProps) {
  const [activeTab, setActiveTab] = useState<TabType>('comments');
  const [newComment, setNewComment] = useState('');
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  const handlePostComment = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const handleCancel = () => {
    setNewComment('');
    setIsEditorFocused(false);
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

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'comments', label: 'Comments' },
    { key: 'history', label: 'History' },
  ];

  return (
    <div>
      {/* Activity Header */}
      <h3 className="text-sm font-semibold text-foreground mb-3">Activity</h3>
      
      {/* Tabs - Jira style */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors relative",
              activeTab === tab.key
                ? "text-[#0052CC]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0052CC]" />
            )}
          </button>
        ))}
      </div>

      {/* Comment Editor - Jira style with rich toolbar */}
      <div className="flex gap-3 mb-6">
        <UserAvatar initials="ME" size="sm" />
        <div className="flex-1">
          {/* Rich Text Toolbar */}
          <div className={cn(
            "border border-border rounded-t-md bg-white",
            isEditorFocused ? "border-[#4C9AFF] ring-2 ring-[#4C9AFF]/20" : ""
          )}>
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-[#F4F5F7]">
              {/* Text format dropdown */}
              <button className="flex items-center gap-1 px-2 py-1 text-sm text-foreground hover:bg-muted rounded">
                Normal text
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
              
              <div className="w-px h-5 bg-border mx-1" />
              
              {/* Formatting buttons */}
              <button className="p-1.5 hover:bg-muted rounded text-foreground">
                <Bold className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-muted rounded text-foreground">
                <Italic className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-muted rounded text-muted-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              <div className="w-px h-5 bg-border mx-1" />
              
              {/* Color */}
              <button className="p-1.5 hover:bg-muted rounded text-foreground flex items-center">
                <span className="text-sm font-bold">A</span>
                <svg className="w-3 h-3 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
              
              <div className="w-px h-5 bg-border mx-1" />
              
              {/* Lists */}
              <button className="p-1.5 hover:bg-muted rounded text-foreground">
                <List className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-muted rounded text-foreground">
                <ListOrdered className="w-4 h-4" />
              </button>
              
              <div className="w-px h-5 bg-border mx-1" />
              
              {/* Insert tools */}
              <button className="p-1.5 hover:bg-muted rounded text-foreground">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </button>
              <button className="p-1.5 hover:bg-muted rounded text-foreground">
                <LinkIcon className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-muted rounded text-foreground">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </button>
              <button className="p-1.5 hover:bg-muted rounded text-foreground">
                <AtSign className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-muted rounded text-foreground">
                <Smile className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-muted rounded text-foreground">
                <Table className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-muted rounded text-foreground">
                <Code className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-muted rounded text-muted-foreground">
                <Plus className="w-4 h-4" />
              </button>
              
              <div className="flex-1" />
              
              {/* Right side options */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted rounded">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  Write
                </button>
                <button className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted rounded">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                  Record
                </button>
              </div>
            </div>
            
            {/* Editor Area */}
            <div 
              contentEditable
              className="min-h-[60px] p-3 text-sm text-foreground outline-none"
              onFocus={() => setIsEditorFocused(true)}
              onBlur={() => setIsEditorFocused(false)}
              onInput={(e) => setNewComment(e.currentTarget.textContent || '')}
              data-placeholder="Type /ai for Atlassian Intelligence or @ to mention and notify someone."
              suppressContentEditableWarning
            />
          </div>
          
          {/* Mention Suggestions */}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <button className="p-1 text-muted-foreground hover:text-foreground">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </button>
            {mentionSuggestions.map(user => (
              <button 
                key={user.id}
                className="flex items-center gap-1.5 px-2 py-1 text-sm text-foreground hover:bg-muted rounded-full border border-border"
              >
                <span className={cn("w-5 h-5 rounded-full text-white text-xs flex items-center justify-center", user.color)}>
                  {user.initials}
                </span>
                + {user.name}
              </button>
            ))}
          </div>
          
          {/* Save/Cancel Buttons */}
          <div className="flex items-center gap-2 mt-3">
            <Button 
              size="sm"
              onClick={handlePostComment}
              disabled={!newComment.trim()}
              className="h-8 bg-[#0052CC] hover:bg-[#0747A6] text-white"
            >
              Save
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      {displayItems.length > 0 && (
        <div className="space-y-4">
          {displayItems.map((item, index) => {
            const Icon = getEventIcon(item.type);
            return (
              <div key={item.id || index} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    item.type === 'comment' ? 'bg-blue-100' : 'bg-muted'
                  )}>
                    <Icon className={cn(
                      "w-4 h-4",
                      item.type === 'comment' ? 'text-blue-600' : 'text-muted-foreground'
                    )} />
                  </div>
                  {index < displayItems.length - 1 && (
                    <div className="w-px flex-1 bg-border my-1" />
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {'author' in item && item.author ? (
                      <UserAvatar initials={item.author.initials} size="sm" />
                    ) : null}
                    <span className="font-semibold text-sm text-foreground">
                      {item.user}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.time}</span>
                  </div>
                  <p className={cn(
                    "text-sm",
                    item.type === 'comment' ? 'text-foreground' : 'text-muted-foreground'
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
  );
}
