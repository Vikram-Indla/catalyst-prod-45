/**
 * ActivityLog — Recent user actions display
 */
import { useState, useEffect } from 'react';
import { 
  Activity, FileText, Play, Bug, CheckCircle2, XCircle, 
  Plus, Edit2, Trash2, RefreshCw, User, Clock
} from 'lucide-react';
import { supabase, typedQuery, typedRpc } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  'create': { label: 'Created', icon: Plus, color: 'var(--sem-success)' },
  'update': { label: 'Updated', icon: Edit2, color: 'var(--cp-blue)' },
  'delete': { label: 'Deleted', icon: Trash2, color: 'var(--sem-danger)' },
  'execute': { label: 'Executed', icon: Play, color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' },
  'pass': { label: 'Passed', icon: CheckCircle2, color: 'var(--sem-success)' },
  'fail': { label: 'Failed', icon: XCircle, color: 'var(--sem-danger)' },
  'assign': { label: 'Assigned', icon: User, color: 'var(--sem-warning)' },
  'login': { label: 'Logged in', icon: User, color: 'var(--fg-3)' },
};

const ENTITY_CONFIG: Record<string, { label: string; icon: any }> = {
  'test_case': { label: 'Test Case', icon: FileText },
  'cycle': { label: 'Test Cycle', icon: RefreshCw },
  'defect': { label: 'Defect', icon: Bug },
  'requirement': { label: 'Requirement', icon: FileText },
};

interface ActivityLogProps {
  limit?: number;
  showHeader?: boolean;
}

export function ActivityLog({ limit = 20, showHeader = true }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivity = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await typedRpc('get_user_recent_activity', {
        p_user_id: user.id,
        p_limit: limit,
      });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Fetch activity error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchActivity(); }, [limit]);

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || { label: action, icon: Activity, color: 'var(--fg-3)' };
  };

  const getEntityConfig = (entityType: string | null) => {
    if (!entityType) return null;
    return ENTITY_CONFIG[entityType] || { label: entityType, icon: FileText };
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--fg-3)' }} />
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Activity size={20} style={{ color: 'var(--fg-3)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>Recent Activity</h3>
        </div>
      )}

      {activities.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)' }}>
          <Clock size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No recent activity</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activities.map((activity, index) => {
            const actionConfig = getActionConfig(activity.action);
            const entityConfig = getEntityConfig(activity.entity_type);
            const ActionIcon = actionConfig.icon;

            return (
              <div key={activity.id} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: index < activities.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <div style={{ width: 36, height: 50, borderRadius: 8, backgroundColor: `${actionConfig.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ActionIcon size={18} style={{ color: actionConfig.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, color: 'var(--fg-1)', margin: 0 }}>
                    <span style={{ fontWeight: 600 }}>{actionConfig.label}</span>
                    {entityConfig && <span style={{ color: 'var(--fg-3)' }}> {entityConfig.label.toLowerCase()}</span>}
                    {activity.entity_name && <span style={{ fontWeight: 500 }}> "{activity.entity_name}"</span>}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--fg-4)', margin: '4px 0 0' }}>{formatRelativeTime(activity.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
