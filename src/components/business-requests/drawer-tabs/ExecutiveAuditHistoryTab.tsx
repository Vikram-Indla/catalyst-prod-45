/**
 * ExecutiveAuditHistoryTab - CIO-grade audit history with grouping
 * Groups by changeset, shows business-readable changes, hides technical by default
 */

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameMinute, parseISO } from 'date-fns';
import { History, ArrowRight, Loader2, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ExecutiveAuditHistoryTabProps {
  requestId: string;
}

const PAGE_SIZE = 50;

// Fields considered "technical" (hidden by default)
const TECHNICAL_FIELDS = [
  'id', 'uuid', 'created_at', 'updated_at', 'created_by', 
  'deleted_at', 'request_key', 'score_resource_feasibility',
  'score_strategic_alignment', 'score_time_urgency'
];

// Human-readable field labels
const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  process_step: 'Status',
  department: 'Department',
  business_owner: 'Business Owner',
  requestor: 'Reporter',
  assignee: 'Assignee',
  delivery_platform: 'Delivery Platform',
  delivery_track: 'Delivery Track',
  planned_quarter: 'Quarter',
  start_date: 'Business Ask Date',
  impl_start_date: 'Kickoff Date',
  end_date: 'Target Complete',
  priority_tier: 'Priority Tier',
  business_score: 'Priority Score',
  rank: 'Rank',
  approved_budget_sar: 'Approved Budget',
  funding_status: 'Funding Status',
  budget_year: 'Budget Year',
  health: 'Health',
  urgency: 'Urgency',
  complexity: 'Complexity',
};

interface AuditLog {
  id: string;
  action: string;
  actor_name: string | null;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

interface ChangeGroup {
  timestamp: string;
  actor: string;
  action: string;
  changes: AuditLog[];
}

export function ExecutiveAuditHistoryTab({ requestId }: ExecutiveAuditHistoryTabProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['business-request-audit', requestId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('business_request_audit_logs')
        .select('*', { count: 'exact' })
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { logs: data || [], count: count || 0, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      const totalLoaded = (lastPage.page + 1) * PAGE_SIZE;
      return totalLoaded < lastPage.count ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !!requestId
  });

  const allLogs = data?.pages.flatMap(page => page.logs) || [];
  const totalCount = data?.pages[0]?.count || 0;

  // Group logs by timestamp (same minute = same changeset)
  const groupedChanges = allLogs.reduce<ChangeGroup[]>((groups, log) => {
    const lastGroup = groups[groups.length - 1];
    const logTime = parseISO(log.created_at);
    
    if (
      lastGroup && 
      lastGroup.actor === (log.actor_name || 'System') &&
      isSameMinute(parseISO(lastGroup.timestamp), logTime)
    ) {
      lastGroup.changes.push(log);
    } else {
      groups.push({
        timestamp: log.created_at,
        actor: log.actor_name || 'System',
        action: log.action,
        changes: [log]
      });
    }
    return groups;
  }, []);

  const toggleGroup = (timestamp: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(timestamp)) {
        next.delete(timestamp);
      } else {
        next.add(timestamp);
      }
      return next;
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name || name === 'System') return 'SY';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getFieldLabel = (field: string | null) => {
    if (!field) return 'Record';
    return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const isTechnicalField = (field: string | null) => {
    if (!field) return false;
    return TECHNICAL_FIELDS.includes(field) || field.includes('_id') || field.includes('uuid');
  };

  const formatValue = (value: string | null) => {
    if (value === null || value === 'null' || value === '') return 'Empty';
    
    // Format dates
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        return format(new Date(value), 'MMM d, yyyy');
      } catch {
        return value;
      }
    }
    
    // Format status values
    if (typeof value === 'string' && value.includes('_')) {
      return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    
    return value;
  };

  // Filter out technical changes if hidden
  const filteredGroups = groupedChanges.map(group => ({
    ...group,
    changes: showTechnical 
      ? group.changes 
      : group.changes.filter(c => !isTechnicalField(c.field_changed))
  })).filter(group => group.changes.length > 0);

  return (
    <div 
      className="flex flex-col flex-1 min-h-0 overflow-hidden"
      style={{ backgroundColor: 'var(--surface-1)' }}
    >
      {/* Header with toggle */}
      <div 
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" style={{ color: 'var(--accent-color)' }} />
          <span 
            className="text-[11px] font-semibold uppercase tracking-[0.5px]"
            style={{ color: 'var(--accent-color)' }}
          >
            Change History
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
            ({totalCount})
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            Technical
          </Label>
          <Switch
            checked={showTechnical}
            onCheckedChange={setShowTechnical}
            className="h-4 w-7"
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-3)' }}>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-[12px]">Loading history...</span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-3)' }}>
            <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No changes recorded</p>
            <p className="text-[11px]">Updates will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGroups.map((group, idx) => {
              const isExpanded = expandedGroups.has(group.timestamp);
              const isCreate = group.action === 'CREATE';
              const changeCount = group.changes.length;
              
              return (
                <div 
                  key={group.timestamp + idx}
                  className="rounded-md overflow-hidden"
                  style={{ 
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {/* Group Header */}
                  <button
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--surface-3)] transition-colors"
                    onClick={() => toggleGroup(group.timestamp)}
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback 
                        className="text-[10px]"
                        style={{ 
                          background: isCreate ? 'var(--accent-color)' : 'var(--surface-3)',
                          color: isCreate ? 'white' : 'var(--text-2)'
                        }}
                      >
                        {getInitials(group.actor)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>
                          {group.actor}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                          {isCreate ? 'created this request' : `updated ${changeCount} field${changeCount > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                        {format(new Date(group.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    
                    {!isCreate && (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'var(--text-3)' }} />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--text-3)' }} />
                      )
                    )}
                  </button>
                  
                  {/* Expanded Changes */}
                  {isExpanded && !isCreate && (
                    <div 
                      className="px-3 pb-3 space-y-2"
                      style={{ borderTop: '1px solid var(--divider)' }}
                    >
                      <div className="pt-2">
                        {group.changes.map((change) => (
                          <div 
                            key={change.id}
                            className="flex items-start gap-2 py-1.5 text-[11px]"
                          >
                            <span 
                              className="font-medium shrink-0 w-28"
                              style={{ color: 'var(--text-2)' }}
                            >
                              {getFieldLabel(change.field_changed)}
                            </span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span 
                                className="truncate max-w-[120px]"
                                style={{ color: 'var(--text-3)' }}
                              >
                                {formatValue(change.old_value)}
                              </span>
                              <ArrowRight className="h-3 w-3 shrink-0" style={{ color: 'var(--text-3)' }} />
                              <span 
                                className="truncate max-w-[120px] font-medium"
                                style={{ color: 'var(--text-1)' }}
                              >
                                {formatValue(change.new_value)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Load More */}
            {hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full h-8 text-[11px]"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
