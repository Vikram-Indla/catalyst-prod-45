/**
 * For You Page Data Hook - Mock data and state management
 */

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

export type WorkMode = 'OPS' | 'DEL' | 'PLN';
export type WorkGroup = 'YESTERDAY' | 'THIS_WEEK' | 'EARLIER';
export type TabType = 'worked' | 'assigned' | 'starred';
export type ModeFilter = 'all' | 'ops' | 'del' | 'pln';

export interface WorkItemAssignee {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
}

export interface WorkItem {
  id: string;
  key: string;
  summary: string;
  mode: WorkMode;
  level: string;
  updatedAt: string;
  assignee: WorkItemAssignee;
  group: WorkGroup;
  starred?: boolean;
}

export type AIWorkItemType = 'feature' | 'epic' | 'story' | 'defect' | 'incident' | 'task' | 'business-request';

export interface AISuggestion {
  id: string;
  itemId: string;
  key: string;
  title: string;
  type: AIWorkItemType;
  reason: string;
  timeLeft: string;
  isPriority: boolean;
  context: string;
}

export interface PerformanceStats {
  closed: number;
  ops: number;
  del: number;
  pln: number;
  slaRate: number;
  percentChange: number;
  personalBest: number;
}

// Mock work items data
const MOCK_WORK_ITEMS: WorkItem[] = [
  {
    id: '1',
    key: 'INC-160',
    summary: 'Cache invalidation causing stale data in dashboard',
    mode: 'OPS',
    level: 'Release',
    updatedAt: '2h ago',
    assignee: { id: 'u1', name: 'Ahmed Al-Rashid', initials: 'AR', avatarColor: '#dc2626' },
    group: 'YESTERDAY',
  },
  {
    id: '2',
    key: 'INC-159',
    summary: 'Network timeout on mobile connections',
    mode: 'OPS',
    level: 'Release',
    updatedAt: '4h ago',
    assignee: { id: 'u2', name: 'Sarah Chen', initials: 'SC', avatarColor: '#2563eb' },
    group: 'YESTERDAY',
  },
  {
    id: '3',
    key: 'FTR-020',
    summary: 'Sustainability reporting module development',
    mode: 'DEL',
    level: 'Program',
    updatedAt: '1d ago',
    assignee: { id: 'u1', name: 'Ahmed Al-Rashid', initials: 'AR', avatarColor: '#dc2626' },
    group: 'THIS_WEEK',
    starred: true,
  },
  {
    id: '4',
    key: 'FTR-019',
    summary: 'Investor portal accessibility compliance',
    mode: 'DEL',
    level: 'Program',
    updatedAt: '2d ago',
    assignee: { id: 'u3', name: 'Maya Johnson', initials: 'MJ', avatarColor: '#0d9488' },
    group: 'THIS_WEEK',
  },
  {
    id: '5',
    key: 'PLN-045',
    summary: 'Q2 capacity planning for mobile team',
    mode: 'PLN',
    level: 'Portfolio',
    updatedAt: '3d ago',
    assignee: { id: 'u1', name: 'Ahmed Al-Rashid', initials: 'AR', avatarColor: '#dc2626' },
    group: 'THIS_WEEK',
  },
  {
    id: '6',
    key: 'INC-155',
    summary: 'Login authentication flow optimization',
    mode: 'OPS',
    level: 'Team',
    updatedAt: '5d ago',
    assignee: { id: 'u4', name: 'James Wilson', initials: 'JW', avatarColor: '#7c3aed' },
    group: 'EARLIER',
  },
  {
    id: '7',
    key: 'FTR-018',
    summary: 'Real-time notification system upgrade',
    mode: 'DEL',
    level: 'Release',
    updatedAt: '1w ago',
    assignee: { id: 'u2', name: 'Sarah Chen', initials: 'SC', avatarColor: '#2563eb' },
    group: 'EARLIER',
    starred: true,
  },
  {
    id: '8',
    key: 'PLN-042',
    summary: 'Annual technology roadmap review',
    mode: 'PLN',
    level: 'Portfolio',
    updatedAt: '1w ago',
    assignee: { id: 'u1', name: 'Ahmed Al-Rashid', initials: 'AR', avatarColor: '#dc2626' },
    group: 'EARLIER',
  },
];

// Mock AI suggestions
const MOCK_AI_SUGGESTIONS: AISuggestion[] = [
  {
    id: 'ai1',
    itemId: '1',
    key: 'INC-160',
    title: 'Cache invalidation causing stale data',
    type: 'incident',
    reason: 'This incident has been open for 18 hours and is blocking 3 dependent features. Customer escalation expected if not resolved today.',
    timeLeft: '6h left',
    isPriority: true,
    context: 'Blocking 3 features',
  },
  {
    id: 'ai2',
    itemId: '3',
    key: 'FTR-020',
    title: 'Sustainability reporting module',
    type: 'feature',
    reason: 'Sprint ends in 2 days',
    isPriority: false,
    context: 'Sprint deadline approaching',
    timeLeft: '2d',
  },
  {
    id: 'ai3',
    itemId: '4',
    key: 'FTR-019',
    title: 'Investor portal accessibility',
    type: 'feature',
    reason: 'Compliance deadline next week',
    isPriority: false,
    context: 'Regulatory requirement',
    timeLeft: '5d',
  },
];

// Mock performance stats
const MOCK_PERFORMANCE_STATS: PerformanceStats = {
  closed: 12,
  ops: 5,
  del: 4,
  pln: 3,
  slaRate: 94,
  percentChange: 15,
  personalBest: 15,
};

export function useForYouData() {
  // State
  const [activeMode, setActiveMode] = useState<ModeFilter>('all');
  const [activeTab, setActiveTab] = useState<TabType>('worked');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ field: string; order: 'asc' | 'desc' }>({ 
    field: 'updated', 
    order: 'desc' 
  });
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [starredItems, setStarredItems] = useState<Set<string>>(
    new Set(MOCK_WORK_ITEMS.filter(i => i.starred).map(i => i.id))
  );

  // Fetch actual user profile
  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState<{ firstName: string; lastName: string } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!authUser?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', authUser.id)
        .single();
      
      if (data?.full_name) {
        const parts = data.full_name.split(' ');
        setUserProfile({
          firstName: parts[0] || 'there',
          lastName: parts.slice(1).join(' ') || '',
        });
      }
    }
    fetchProfile();
  }, [authUser?.id]);

  const user = {
    id: authUser?.id || 'current-user',
    firstName: userProfile?.firstName || 'there',
    lastName: userProfile?.lastName || '',
  };

  // Filtered and grouped work items
  const filteredItems = useMemo(() => {
    let items = MOCK_WORK_ITEMS.map(item => ({
      ...item,
      starred: starredItems.has(item.id),
    }));

    // Filter by mode
    if (activeMode !== 'all') {
      items = items.filter(item => item.mode.toLowerCase() === activeMode);
    }

    // Filter by tab
    if (activeTab === 'starred') {
      items = items.filter(item => item.starred);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.key.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query)
      );
    }

    return items;
  }, [activeMode, activeTab, searchQuery, starredItems]);

  // Group items
  const groupedItems = useMemo(() => {
    const groups: Record<WorkGroup, WorkItem[]> = {
      YESTERDAY: [],
      THIS_WEEK: [],
      EARLIER: [],
    };

    filteredItems.forEach(item => {
      groups[item.group].push(item);
    });

    return groups;
  }, [filteredItems]);

  // Counts for tabs
  const tabCounts = useMemo(() => ({
    worked: MOCK_WORK_ITEMS.length,
    assigned: MOCK_WORK_ITEMS.filter(i => i.assignee.id === 'u1').length,
    starred: starredItems.size,
  }), [starredItems]);

  // AI Data
  const aiData = useMemo(() => {
    const priorityItem = MOCK_AI_SUGGESTIONS.find(s => s.isPriority);
    const nextItems = MOCK_AI_SUGGESTIONS.filter(s => !s.isPriority).slice(0, 2);
    
    return {
      criticalCount: 3,
      priorityItem,
      nextItems,
      suggestions: MOCK_AI_SUGGESTIONS,
    };
  }, []);

  // Handlers
  const handleRowClick = (itemId: string) => {
    console.log('Navigate to item:', itemId);
  };

  const handleStartTask = (itemId: string) => {
    console.log('Start task:', itemId);
  };

  const generateStatusUpdate = () => {
    console.log('Generate status update');
  };

  const generateImpactReport = () => {
    console.log('Generate impact report');
  };

  const showDeprioritize = () => {
    console.log('Show deprioritize options');
  };

  const toggleStar = (itemId: string) => {
    setStarredItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  return {
    // State
    activeMode,
    setActiveMode,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    sortConfig,
    setSortConfig,
    isAIPanelOpen,
    setIsAIPanelOpen,

    // Data
    user,
    workItems: filteredItems,
    groupedItems,
    tabCounts,
    aiData,
    performanceStats: MOCK_PERFORMANCE_STATS,
    isLoading: false,

    // Handlers
    handleRowClick,
    handleStartTask,
    generateStatusUpdate,
    generateImpactReport,
    showDeprioritize,
    toggleStar,
  };
}
