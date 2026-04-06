/**
 * Activity Feed Page — TestHub Module
 * Route: /testhub/activity
 */
import { useState, useEffect } from 'react';
import {
  Activity, Search, X, RefreshCw, Plus, Edit2, Trash2,
  Play, UserPlus, ArrowRight, FileText, Bug, RefreshCcw,
  ClipboardList, FileCheck, Server, Tags
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { useTheme } from '@/hooks/useTheme';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_key: string | null;
  entity_name: string | null;
  user_name: string | null;
  created_at: string;
}

interface AuditStats {
  total_events: number;
  creates: number;
  updates: number;
  deletes: number;
  active_users: number;
  most_active_entity: string | null;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  create: { label: 'Created', color: '#059669', icon: Plus },
  update: { label: 'Updated', color: '#2563EB', icon: Edit2 },
  delete: { label: 'Deleted', color: '#DC2626', icon: Trash2 },
  execute: { label: 'Executed', color: '#7C3AED', icon: Play },
  assign: { label: 'Assigned', color: '#0891B2', icon: UserPlus },
  status_change: { label: 'Status Changed', color: '#D97706', icon: ArrowRight },
  view: { label: 'Viewed', color: 'rgba(237,237,237,0.40)', icon: Activity },
  export: { label: 'Exported', color: '#EC4899', icon: Activity },
  import: { label: 'Imported', color: '#EC4899', icon: Activity },
};

const ENTITY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  test_case: { label: 'Test Case', color: '#2563EB', icon: FileText },
  defect: { label: 'Defect', color: '#DC2626', icon: Bug },
  test_cycle: { label: 'Test Cycle', color: '#0891B2', icon: RefreshCcw },
  test_plan: { label: 'Test Plan', color: '#7C3AED', icon: ClipboardList },
  requirement: { label: 'Requirement', color: '#059669', icon: FileCheck },
  environment: { label: 'Environment', color: '#6366F1', icon: Server },
  tag: { label: 'Tag', color: '#EC4899', icon: Tags },
};

export default function ActivityFeedPage() {
  const { isDark } = useTheme();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_recent_activity', {
        p_user_id: null,
        p_entity_type: entityFilter === 'all' ? null : entityFilter,
        p_limit: 100,
      });

      if (error) throw error;
      
      let filtered = data || [];
      if (actionFilter !== 'all') {
        filtered = filtered.filter((a: ActivityItem) => a.action === actionFilter);
      }
      
      setActivities(filtered);

      const { data: statsData } = await (supabase as any).rpc('get_audit_stats', { p_days: 30 });
      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }
    } catch (err) {
      console.error('Fetch activities error:', err);
      catalystToast.error('Failed to load activity feed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchActivities(); }, [entityFilter, actionFilter]);

  const filteredActivities = activities.filter(a => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (a.entity_name && a.entity_name.toLowerCase().includes(search)) ||
      (a.entity_key && a.entity_key.toLowerCase().includes(search)) ||
      (a.user_name && a.user_name.toLowerCase().includes(search))
    );
  });

  const formatTime = (dateStr: string) => {
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

  const clearFilters = () => {
    setSearchTerm('');
    setEntityFilter('all');
    setActionFilter('all');
  };

  const hasActiveFilters = entityFilter !== 'all' || actionFilter !== 'all' || searchTerm;

  const groupedActivities = filteredActivities.reduce((acc, activity) => {
    const date = new Date(activity.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, ActivityItem[]>);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: isDark ? '#0A0A0A' : '#1A1A1A' }}>
      <TestHubPageHeader title="Activity Feed" subtitle="Track all changes and actions across TestHub">
        <button onClick={fetchActivities}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 20px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 8, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.53)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </TestHubPageHeader>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderRadius: 12, padding: 16, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}` }}>
            <p style={{ fontSize: 11, color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.40)', margin: 0, textTransform: 'uppercase' }}>Total (30d)</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', margin: '4px 0 0' }}>{stats.total_events}</p>
          </div>
          <div style={{ backgroundColor: 'rgba(74,222,128,0.06)', borderRadius: 12, padding: 16, border: '1px solid #A7F3D0' }}>
            <p style={{ fontSize: 11, color: '#059669', margin: 0, textTransform: 'uppercase' }}>Created</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#059669', margin: '4px 0 0' }}>{stats.creates}</p>
          </div>
          <div style={{ backgroundColor: 'rgba(59,130,246,0.06)', borderRadius: 12, padding: 16, border: '1px solid #BFDBFE' }}>
            <p style={{ fontSize: 11, color: '#2563EB', margin: 0, textTransform: 'uppercase' }}>Updated</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#2563EB', margin: '4px 0 0' }}>{stats.updates}</p>
          </div>
          <div style={{ backgroundColor: 'rgba(248,113,113,0.06)', borderRadius: 12, padding: 16, border: '1px solid #FECACA' }}>
            <p style={{ fontSize: 11, color: '#DC2626', margin: 0, textTransform: 'uppercase' }}>Deleted</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#DC2626', margin: '4px 0 0' }}>{stats.deletes}</p>
          </div>
          <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderRadius: 12, padding: 16, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}` }}>
            <p style={{ fontSize: 11, color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.40)', margin: 0, textTransform: 'uppercase' }}>Active Users</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', margin: '4px 0 0' }}>{stats.active_users}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(237,237,237,0.40)' }} />
          <input type="text" placeholder="Search activity..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', height: 44, padding: '0 14px 0 44px', border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 12, fontSize: 14, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#EDEDED' : undefined }} />
        </div>
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}
          style={{ height: 44, padding: '0 36px 0 14px', border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 12, fontSize: 14, backgroundColor: isDark ? '#1A1A1A' : '#FFF', color: isDark ? '#EDEDED' : undefined, cursor: 'pointer' }}>
          <option value="all">All Entities</option>
          <option value="test_case">Test Cases</option>
          <option value="defect">Defects</option>
          <option value="test_cycle">Test Cycles</option>
          <option value="test_plan">Test Plans</option>
          <option value="requirement">Requirements</option>
          <option value="environment">Environments</option>
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          style={{ height: 44, padding: '0 36px 0 14px', border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 12, fontSize: 14, backgroundColor: isDark ? '#1A1A1A' : '#FFF', color: isDark ? '#EDEDED' : undefined, cursor: 'pointer' }}>
          <option value="all">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
          <option value="execute">Executed</option>
          <option value="status_change">Status Changed</option>
        </select>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 16px', border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 12, backgroundColor: isDark ? '#1A1A1A' : '#FFF', color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.40)', fontSize: 14, cursor: 'pointer' }}>
            <X size={16} /> Clear
          </button>
        )}
      </div>

      {/* Activity Feed */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#8B5CF6' }} />
        </div>
      ) : filteredActivities.length === 0 ? (
        <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderRadius: 12, padding: 60, textAlign: 'center', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}` }}>
          <Activity size={48} style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.53)', marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.40)', margin: 0 }}>No activity found</p>
          <p style={{ fontSize: 14, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', margin: '8px 0 0' }}>Activity will appear here as users make changes</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(groupedActivities).map(([date, items]) => (
            <div key={date}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.40)', margin: '0 0 12px', textTransform: 'uppercase' }}>{date}</h3>
              <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderRadius: 12, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}`, overflow: 'hidden' }}>
                {items.map((activity, index) => {
                  const action = ACTION_CONFIG[activity.action] || ACTION_CONFIG.view;
                  const entity = ENTITY_CONFIG[activity.entity_type] || { label: activity.entity_type, color: 'rgba(237,237,237,0.40)', icon: FileText };
                  const ActionIcon = action.icon;
                  const EntityIcon = entity.icon;

                  return (
                    <div key={activity.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderBottom: index < items.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#1A1A1A'}` : 'none' }}>
                      <div style={{ width: 36, height: 50, borderRadius: 8, backgroundColor: `${action.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ActionIcon size={18} style={{ color: action.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)' }}>{activity.user_name || 'Unknown user'}</span>
                          <span style={{ fontSize: 14, color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.40)' }}>{action.label.toLowerCase()}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: entity.color, backgroundColor: `${entity.color}15`, padding: '2px 8px', borderRadius: 4 }}>
                            <EntityIcon size={12} /> {entity.label}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.53)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {activity.entity_key && <span style={{ fontWeight: 600, color: '#2563EB' }}>{activity.entity_key}</span>}
                          {activity.entity_key && activity.entity_name && ' - '}
                          {activity.entity_name}
                        </p>
                      </div>
                      <span style={{ fontSize: 12, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', whiteSpace: 'nowrap' }}>{formatTime(activity.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
