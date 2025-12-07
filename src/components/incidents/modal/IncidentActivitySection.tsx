import { useState } from 'react';
import { Filter, ArrowUpDown } from 'lucide-react';
import type { Incident } from '@/types/release';
import { cn } from '@/lib/utils';

interface IncidentActivitySectionProps {
  incident: Incident;
}

type ActivityTab = 'all' | 'comments' | 'history' | 'sla' | 'approvals';

interface ActivityItem {
  id: string;
  type: 'history' | 'comments';
  author: { name: string; initials: string };
  timestamp: string;
  action?: string;
  changeType?: 'status' | 'assignee' | 'priority';
  oldValue?: string;
  newValue?: string;
  oldUser?: { name: string; initials: string };
  newUser?: { name: string; initials: string };
  content?: string;
}

// Sample activity data matching Jira screenshots
const SAMPLE_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    type: 'history',
    author: { name: 'Yazeed Daraz', initials: 'YD' },
    timestamp: 'November 30, 2025 at 10:22 AM',
    action: 'changed the Status',
    changeType: 'status',
    oldValue: 'UAT READY',
    newValue: 'CLOSED',
  },
  {
    id: '2',
    type: 'history',
    author: { name: 'Hassan Raza Hasrat', initials: 'HH' },
    timestamp: 'November 23, 2025 at 6:01 PM',
    action: 'changed the Assignee',
    changeType: 'assignee',
    oldUser: { name: 'Hassan Raza Hasrat', initials: 'HH' },
    newUser: { name: 'Yazeed Daraz', initials: 'YD' },
  },
  {
    id: '3',
    type: 'comments',
    author: { name: 'Hassan Raza Hasrat', initials: 'HH' },
    timestamp: 'November 23, 2025 at 6:01 PM',
    content: '4702045269 = moved\n4704134331 = moved\n4704176635, 4703233422, 4701115755 = renew request – moved to LD',
  },
  {
    id: '4',
    type: 'history',
    author: { name: 'Yazeed Daraz', initials: 'YD' },
    timestamp: 'November 20, 2025 at 2:15 PM',
    action: 'changed the Priority',
    changeType: 'priority',
    oldValue: 'HIGH',
    newValue: 'MEDIUM',
  },
];

const ACTIVITY_TABS: { id: ActivityTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'comments', label: 'Comments' },
  { id: 'history', label: 'History' },
  { id: 'sla', label: 'SLA History' },
  { id: 'approvals', label: 'Approvals' },
];

export function IncidentActivitySection({ incident }: IncidentActivitySectionProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>('all');
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);

  const filteredActivities = SAMPLE_ACTIVITIES.filter(activity => {
    if (activeTab === 'all') return true;
    return activity.type === activeTab;
  });

  const getAvatarColor = (initials: string) => {
    const colors = [
      'bg-[#C69C6D]', // Catalyst gold
      'bg-[#0052CC]', // Blue
      'bg-[#5243AA]', // Purple
      'bg-[#00A3BF]', // Teal
      'bg-[#FF8800]', // Orange
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return 'bg-red-500 text-white';
      case 'MEDIUM':
        return 'bg-[#0052CC] text-white';
      default:
        return 'bg-[#FAFBFC] text-[#42526E] border border-[#DFE1E6]';
    }
  };

  return (
    <div className="mt-6">
      {/* Activity Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-[#172B4D]">Activity</h2>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E]">
            <Filter className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E]">
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Activity Tabs */}
      <div className="flex gap-1 mb-4">
        {ACTIVITY_TABS.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "px-3 py-1.5 rounded text-sm transition-colors",
              activeTab === tab.id
                ? "bg-[#DEEBFF] text-[#0052CC] border border-[#0052CC]"
                : "text-[#42526E] hover:bg-[#F4F5F7] border border-transparent"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Comment Composer */}
      <div className="flex gap-3 mb-5">
        <div className="w-8 h-8 shrink-0 rounded-full bg-[#C69C6D] text-white text-xs font-medium flex items-center justify-center">V</div>
        <div className="flex-1">
          {!isComposerExpanded ? (
            <div 
              className="border border-[#DFE1E6] rounded p-3 cursor-text hover:border-[#A5ADBA]"
              onClick={() => setIsComposerExpanded(true)}
            >
              <div className="text-sm text-[#A5ADBA] mb-2">Add a comment...</div>
              <div className="flex gap-2 flex-wrap">
                <button className="text-sm text-[#42526E] bg-white border border-[#DFE1E6] px-3 py-1 rounded hover:bg-[#F4F5F7]">
                  Suggest a reply...
                </button>
                <button className="text-sm text-[#42526E] bg-white border border-[#DFE1E6] px-3 py-1 rounded hover:bg-[#F4F5F7]">
                  Status update...
                </button>
                <button className="text-sm text-[#42526E] bg-white border border-[#DFE1E6] px-3 py-1 rounded hover:bg-[#F4F5F7]">
                  Thanks...
                </button>
              </div>
              <div className="text-[11px] text-[#A5ADBA] mt-2">
                Pro tip: press <kbd className="inline-block bg-white border border-[#DFE1E6] px-1 rounded text-[11px]">M</kbd> to comment
              </div>
            </div>
          ) : (
            <div>
              <div className="border-2 border-[#C69C6D] rounded shadow-[0_0_0_2px_#C69C6D]">
                {/* Editor Toolbar */}
                <div className="flex items-center gap-0.5 p-2 border-b border-[#DFE1E6] flex-wrap">
                  <button className="h-7 min-w-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E] text-sm font-medium">Aa</button>
                  <button className="h-7 min-w-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E] font-bold">B</button>
                  <button className="h-7 min-w-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E] italic">I</button>
                  <button className="h-7 min-w-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E] underline">U</button>
                  <div className="w-px h-5 bg-[#DFE1E6] mx-1" />
                  <button className="h-7 min-w-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E]">≡</button>
                  <button className="h-7 min-w-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E]">≡</button>
                </div>
                {/* Editor Content */}
                <div 
                  contentEditable
                  className="min-h-[80px] p-3 text-sm text-[#172B4D] outline-none"
                  data-placeholder="Type /ai for Atlassian Intelligence or @ to mention and notify someone."
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#42526E]">@</span>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 h-8 rounded text-sm font-medium bg-[#0052CC] text-white hover:bg-[#0747A6]">
                    Save
                  </button>
                  <button 
                    className="px-3 h-8 rounded text-sm text-[#172B4D] hover:bg-[#F4F5F7]"
                    onClick={() => setIsComposerExpanded(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-0">
        {filteredActivities.map((activity) => (
          <div 
            key={activity.id}
            className="flex gap-3 py-4 border-t border-[#DFE1E6] first:border-t-0"
          >
            <div className={cn("w-8 h-8 shrink-0 rounded-full text-white text-xs font-medium flex items-center justify-center", getAvatarColor(activity.author.initials))}>
              {activity.author.initials}
            </div>
            <div className="flex-1">
              {/* Header */}
              <div className="flex flex-wrap items-baseline gap-1.5 mb-1">
                <span className="text-sm font-semibold text-[#172B4D]">{activity.author.name}</span>
                {activity.action && (
                  <span className="text-sm text-[#172B4D]">{activity.action}</span>
                )}
                {activity.type === 'comments' && (
                  <span className="text-sm text-[#172B4D]">added a Comment</span>
                )}
              </div>
              <div className="text-[11px] text-[#42526E] mb-1.5">{activity.timestamp}</div>
              
              {/* Activity Label */}
              <span className={cn(
                "inline-block text-[11px] font-semibold px-1.5 py-0.5 rounded border mb-2",
                activity.type === 'history' 
                  ? "text-[#42526E] bg-[#FAFBFC] border-[#DFE1E6]"
                  : "text-[#42526E] bg-[#FAFBFC] border-[#DFE1E6]"
              )}>
                {activity.type.toUpperCase()}
              </span>

              {/* Content based on type */}
              {activity.changeType === 'status' && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-[#DFE1E6] bg-white text-[#172B4D]">
                    {activity.oldValue}
                  </span>
                  <span className="text-[#A5ADBA]">→</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-[#DFE1E6] bg-white text-[#172B4D]">
                    {activity.newValue}
                  </span>
                </div>
              )}

              {activity.changeType === 'assignee' && activity.oldUser && activity.newUser && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-5 h-5 rounded-full text-white text-[8px] font-medium flex items-center justify-center", getAvatarColor(activity.oldUser.initials))}>
                      {activity.oldUser.initials}
                    </div>
                    <span className="text-sm text-[#172B4D]">{activity.oldUser.name}</span>
                  </div>
                  <span className="text-[#A5ADBA]">→</span>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-5 h-5 rounded-full text-white text-[8px] font-medium flex items-center justify-center", getAvatarColor(activity.newUser.initials))}>
                      {activity.newUser.initials}
                    </div>
                    <span className="text-sm text-[#172B4D]">{activity.newUser.name}</span>
                  </div>
                </div>
              )}

              {activity.changeType === 'priority' && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded", getPriorityColor(activity.oldValue || ''))}>
                    {activity.oldValue}
                  </span>
                  <span className="text-[#A5ADBA]">→</span>
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded", getPriorityColor(activity.newValue || ''))}>
                    {activity.newValue}
                  </span>
                </div>
              )}

              {activity.content && (
                <>
                  <div className="text-sm text-[#172B4D] leading-5 mt-2 whitespace-pre-wrap">
                    {activity.content}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E]">
                      👍
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E]">
                      🙂
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E]">
                      ...
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
