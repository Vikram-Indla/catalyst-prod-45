/**
 * For You Page Data Hook - Real data from Jira sync (ph_issues)
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
  reporter?: string;
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

// Helper: compute time group based on jira_updated_at
function computeGroup(updatedAt: string): WorkGroup {
  const now = new Date();
  const updated = new Date(updatedAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (updated >= yesterday) return 'YESTERDAY';
  if (updated >= weekAgo) return 'THIS_WEEK';
  return 'EARLIER';
}

// Helper: format relative time
function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
}

// Helper: get initials from name
function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// Helper: infer mode from project_key or issue_type
function inferMode(projectKey: string, issueType: string): WorkMode {
  const type = issueType?.toLowerCase() || '';
  if (type.includes('incident') || type.includes('bug') || type.includes('production')) return 'OPS';
  // Default to DEL (delivery) for stories, epics, sub-tasks, etc.
  return 'DEL';
}

// Map ph_issues row to WorkItem
function mapIssueToWorkItem(row: any, starredSet: Set<string>): WorkItem {
  const assigneeName = row.assignee_display_name || 'Unassigned';
  return {
    id: row.issue_key,
    key: row.issue_key,
    summary: row.summary || '',
    mode: inferMode(row.project_key, row.issue_type),
    level: row.issue_type || 'Task',
    updatedAt: row.jira_updated_at ? formatRelativeTime(row.jira_updated_at) : '-',
    assignee: {
      id: row.assignee_account_id || 'none',
      name: assigneeName,
      initials: getInitials(assigneeName),
      avatarColor: '#6b7280',
    },
    reporter: row.reporter_display_name || undefined,
    group: row.jira_updated_at ? computeGroup(row.jira_updated_at) : 'EARLIER',
    starred: starredSet.has(row.issue_key),
  };
}

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
  const [starredItems, setStarredItems] = useState<Set<string>>(new Set());

  // Data state
  const [workedOnItems, setWorkedOnItems] = useState<any[]>([]);
  const [assignedItems, setAssignedItems] = useState<any[]>([]);
  const [starredData, setStarredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jiraAccountIds, setJiraAccountIds] = useState<string[]>([]);

  // Fetch actual user profile
  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState<{ firstName: string; lastName: string } | null>(null);

  // 1. Fetch profile + Jira mapping
  useEffect(() => {
    async function fetchUserMapping() {
      if (!authUser?.id) return;

      // Fetch profile name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', authUser.id)
        .single();

      if (profileData?.full_name) {
        const parts = profileData.full_name.split(' ');
        setUserProfile({
          firstName: parts[0] || 'there',
          lastName: parts.slice(1).join(' ') || '',
        });
      }

      // Fetch user's Jira account IDs from mapping
      const { data: mappings } = await supabase
        .from('ph_user_mapping')
        .select('jira_account_id')
        .eq('catalyst_profile_id', authUser.id)
        .eq('is_mapped', true);

      if (mappings && mappings.length > 0) {
        const ids = mappings.map(m => m.jira_account_id).filter(Boolean);
        setJiraAccountIds(ids);
      } else {
        // No mapping found - try matching by name
        if (profileData?.full_name) {
          const { data: nameMatches } = await supabase
            .from('ph_user_mapping')
            .select('jira_account_id')
            .ilike('jira_display_name', `%${profileData.full_name}%`)
            .eq('is_mapped', true);
          
          if (nameMatches && nameMatches.length > 0) {
            setJiraAccountIds(nameMatches.map(m => m.jira_account_id).filter(Boolean));
          } else {
            setJiraAccountIds([]);
          }
        }
      }
    }
    fetchUserMapping();
  }, [authUser?.id]);

  // 2. Fetch issues once we have Jira account IDs
  useEffect(() => {
    async function fetchIssues() {
      if (!authUser?.id) {
        setIsLoading(false);
        return;
      }

      // Wait for mapping resolution
      if (jiraAccountIds.length === 0 && authUser?.id) {
        // Check if mapping query has completed (give it a moment)
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Assigned: directly assigned to user
        const { data: assigned } = await supabase
          .from('ph_issues')
          .select('issue_key, project_key, issue_type, summary, status, status_category, assignee_account_id, assignee_display_name, reporter_display_name, priority, jira_updated_at, parent_key, parent_summary')
          .in('assignee_account_id', jiraAccountIds)
          .order('jira_updated_at', { ascending: false })
          .limit(200);

        setAssignedItems(assigned || []);

        // Worked on: for now same as assigned (user's name appears as assignee)
        // In future, can expand to check comments/changelog
        setWorkedOnItems(assigned || []);

        // Starred: fetch from user_starred_items
        const { data: stars } = await supabase
          .from('user_starred_items')
          .select('item_id, item_type')
          .eq('user_id', authUser.id);

        if (stars && stars.length > 0) {
          const starredKeys = new Set(stars.map(s => s.item_id));
          setStarredItems(starredKeys as any);

          // Fetch the actual starred issue data
          // item_id might be UUID or issue_key, let's handle both
          const itemIds = stars.map(s => s.item_id);
          const { data: starredIssues } = await supabase
            .from('ph_issues')
            .select('issue_key, project_key, issue_type, summary, status, status_category, assignee_account_id, assignee_display_name, reporter_display_name, priority, jira_updated_at, parent_key, parent_summary')
            .in('issue_key', itemIds)
            .order('jira_updated_at', { ascending: false });

          setStarredData(starredIssues || []);
        }
      } catch (err) {
        console.error('Error fetching ForYou data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchIssues();
  }, [authUser?.id, jiraAccountIds]);

  const user = {
    id: authUser?.id || 'current-user',
    firstName: userProfile?.firstName || 'there',
    lastName: userProfile?.lastName || '',
  };

  // Pick source data based on active tab
  const sourceItems = useMemo(() => {
    switch (activeTab) {
      case 'assigned': return assignedItems;
      case 'starred': return starredData;
      case 'worked':
      default: return workedOnItems;
    }
  }, [activeTab, workedOnItems, assignedItems, starredData]);

  // Filtered and grouped work items
  const filteredItems = useMemo(() => {
    let items = sourceItems.map(row => mapIssueToWorkItem(row, starredItems));

    // Filter by mode
    if (activeMode !== 'all') {
      items = items.filter(item => item.mode.toLowerCase() === activeMode);
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
  }, [sourceItems, activeMode, searchQuery, starredItems]);

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
    worked: workedOnItems.length,
    assigned: assignedItems.length,
    starred: starredData.length,
  }), [workedOnItems, assignedItems, starredData]);

  // AI Data (empty for now)
  const aiData = useMemo(() => ({
    criticalCount: 0,
    priorityItem: undefined,
    nextItems: [] as AISuggestion[],
    suggestions: [] as AISuggestion[],
  }), []);

  // Performance stats (empty for now)
  const performanceStats: PerformanceStats = {
    closed: 0, ops: 0, del: 0, pln: 0,
    slaRate: 0, percentChange: 0, personalBest: 0,
  };

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

  const toggleStar = async (itemId: string) => {
    if (!authUser?.id) return;
    
    const isCurrentlyStarred = starredItems.has(itemId);
    
    // Optimistic update
    setStarredItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });

    try {
      if (isCurrentlyStarred) {
        const { error } = await supabase
          .from('user_starred_items')
          .delete()
          .eq('user_id', authUser.id)
          .eq('item_id', itemId);
        if (error) throw error;
        
        // Remove from starredData
        setStarredData(prev => prev.filter(r => r.issue_key !== itemId));
      } else {
        const { error } = await supabase
          .from('user_starred_items')
          .insert({
            user_id: authUser.id,
            item_id: itemId,
            item_type: 'ph_issue',
          });
        if (error) throw error;
        
        // Add to starredData from assigned/worked items
        const issueRow = [...assignedItems, ...workedOnItems].find(r => r.issue_key === itemId);
        if (issueRow) {
          setStarredData(prev => [issueRow, ...prev]);
        }
      }
    } catch (err) {
      console.error('Error toggling star:', err);
      // Revert optimistic update
      setStarredItems(prev => {
        const next = new Set(prev);
        if (isCurrentlyStarred) next.add(itemId);
        else next.delete(itemId);
        return next;
      });
    }
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
    performanceStats,
    isLoading,

    // Handlers
    handleRowClick,
    handleStartTask,
    generateStatusUpdate,
    generateImpactReport,
    showDeprioritize,
    toggleStar,
  };
}
