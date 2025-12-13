/**
 * Admin Overview Metrics Sources:
 * ──────────────────────────────────────────────────────────
 * usersCount         -> useUsers() from src/hooks/useUsers.ts (profiles table)
 * integrationsCount  -> integration_connectors table (src/pages/admin/Integrations.tsx pattern)
 * auditEventsCount   -> activity_logs table (src/pages/admin/Activity.tsx pattern)
 * departmentsCount   -> useDepartments() from src/hooks/useDepartmentsAndOwners.ts
 * businessOwnersCount-> useBusinessOwners() from src/hooks/useDepartmentsAndOwners.ts
 * teamsCount         -> useTeams() from src/hooks/useTeams.ts
 * programsCount      -> programs table (src/pages/admin/OrgSetup.tsx pattern)
 * recentActivity     -> useRecentRooms() from src/hooks/useRecentRooms.ts
 * adminChanges       -> activity_logs table filtered to admin entity types
 *
 * NO seeded/demo data. All counts are from real database.
 */

import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { 
  Search, 
  UserPlus, 
  Shield, 
  Activity, 
  Link2,
  Users,
  Settings,
  Database,
  Clock,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { useAdminOverviewMetrics, useRecentAdminChanges, useRecentRooms } from '@/hooks/useAdminOverviewMetrics';
import { formatDistanceToNow } from 'date-fns';

// Quick actions - static config, no mock data
const quickActions = [
  { label: 'Invite user', icon: UserPlus, path: '/admin/users', action: 'invite' },
  { label: 'Create role', icon: Shield, path: '/admin/roles-permissions', action: 'create' },
  { label: 'Open audit log', icon: Activity, path: '/admin/activity' },
  { label: 'Jira integration', icon: Link2, path: '/admin/jira-config' },
];

export default function AdminOverview() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real data from existing hooks - NO MOCK DATA
  const metrics = useAdminOverviewMetrics();
  const { data: recentChanges, isLoading: changesLoading } = useRecentAdminChanges(5);
  const { recentRooms, loading: roomsLoading } = useRecentRooms({ limit: 4 });

  // Dynamic pocket cards driven by real metrics
  const pocketCards = [
    {
      id: 'users-access',
      title: 'Users & Access',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      path: '/admin/users',
      count: metrics.usersCount,
      countLabel: 'users',
    },
    {
      id: 'configuration',
      title: 'Configuration',
      description: 'System settings and preferences',
      icon: Settings,
      path: '/admin/modules-packages',
      count: metrics.settingsCount,
      countLabel: 'settings',
    },
    {
      id: 'reference-data',
      title: 'Reference Data',
      description: 'Teams, programs, and master data',
      icon: Database,
      path: '/admin/teams',
      count: metrics.referenceDataCount,
      countLabel: 'records',
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'External connections and imports',
      icon: Link2,
      path: '/admin/jira-config',
      count: metrics.integrationsCount,
      countLabel: 'active',
    },
    {
      id: 'audit-usage',
      title: 'Audit & Usage',
      description: 'Activity logs and usage analytics',
      icon: Activity,
      path: '/admin/activity',
      count: metrics.auditEventsCount,
      countLabel: 'events',
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Security settings and policies',
      icon: Shield,
      path: '/admin/security',
      // TODO: Security policies table does not exist - showing 0
      count: metrics.securityPoliciesCount,
      countLabel: 'policies',
    },
  ];

  // Format action label for display
  const formatActionLabel = (action: string, entityType: string): string => {
    const actionMap: Record<string, string> = {
      'INSERT': 'Created',
      'UPDATE': 'Updated',
      'DELETE': 'Deleted',
    };
    const entityMap: Record<string, string> = {
      'user_roles': 'User role',
      'profiles': 'User profile',
      'integration_connectors': 'Integration',
      'teams': 'Team',
      'programs': 'Program',
      'departments': 'Department',
      'business_owners': 'Business owner',
      'product_roles': 'Product role',
      'auth_settings': 'Auth setting',
    };
    return `${actionMap[action] || action} ${entityMap[entityType] || entityType}`;
  };

  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="h-[72px] flex items-center justify-between border-b bg-card px-6">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">Admin Overview</h1>
            <p className="text-sm text-muted-foreground">
              System configuration and administration hub
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Global Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search settings, users, integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <Link to={action.path}>
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>

          {/* Pocket Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pocketCards.map((pocket) => {
              const Icon = pocket.icon;
              return (
                <Link key={pocket.id} to={pocket.path}>
                  <Card className="hover:border-brand-gold/50 transition-colors cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-brand-gold" />
                        </div>
                        <div className="text-right">
                          {metrics.isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <span className="text-2xl font-bold text-foreground">{pocket.count}</span>
                              <p className="text-xs text-muted-foreground">{pocket.countLabel}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-base mb-1">{pocket.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{pocket.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Bottom Row: Recently Visited + Recent Changes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recently Visited - from real recent_activity table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Recently Visited</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {roomsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : recentRooms.length > 0 ? (
                  recentRooms.map((room) => (
                    <Link
                      key={room.id}
                      to={room.room_path}
                      className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-muted transition-colors group"
                    >
                      <span className="text-sm text-foreground">{room.room_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(room.last_accessed_at), { addSuffix: true })}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No recent activity yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Admin Changes - from real activity_logs table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Recent Admin Changes</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="text-xs">
                    <Link to="/admin/activity">View all</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {changesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : recentChanges && recentChanges.length > 0 ? (
                  recentChanges.map((change) => (
                    <div
                      key={change.id}
                      className="flex items-start justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {formatActionLabel(change.action, change.entity_type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {change.entity_type} • {change.entity_id.slice(0, 8)}...
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {change.created_at 
                          ? formatDistanceToNow(new Date(change.created_at), { addSuffix: true })
                          : '-'
                        }
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No admin changes yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
