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
  ArrowRight
} from 'lucide-react';
import { useState } from 'react';

// Mock data for recently visited
const recentlyVisited = [
  { label: 'Users', path: '/admin/users', lastAccessed: '2 min ago' },
  { label: 'Jira Integration', path: '/admin/jira-config', lastAccessed: '15 min ago' },
  { label: 'Activity Log', path: '/admin/audit/activity', lastAccessed: '1 hour ago' },
  { label: 'Roles & Permissions', path: '/admin/roles-permissions', lastAccessed: '3 hours ago' },
];

// Mock data for recent admin changes
const recentAdminChanges = [
  { action: 'User role updated', actor: 'John Smith', time: '5 min ago', entity: 'Sarah Connor' },
  { action: 'Integration configured', actor: 'Admin', time: '2 hours ago', entity: 'Jira' },
  { action: 'New team created', actor: 'Jane Doe', time: '1 day ago', entity: 'Platform Team' },
  { action: 'Permission granted', actor: 'John Smith', time: '2 days ago', entity: 'Developer Role' },
];

// Pocket cards configuration
const pocketCards = [
  {
    id: 'users-access',
    title: 'Users & Access',
    description: 'Manage users, roles, and permissions',
    icon: Users,
    path: '/admin/users',
    count: 24,
    countLabel: 'users',
  },
  {
    id: 'configuration',
    title: 'Configuration',
    description: 'System settings and preferences',
    icon: Settings,
    path: '/admin/modules-packages',
    count: 13,
    countLabel: 'settings',
  },
  {
    id: 'reference-data',
    title: 'Reference Data',
    description: 'Teams, programs, and master data',
    icon: Database,
    path: '/admin/teams',
    count: 156,
    countLabel: 'records',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'External connections and imports',
    icon: Link2,
    path: '/admin/jira-config',
    count: 2,
    countLabel: 'active',
  },
  {
    id: 'audit-usage',
    title: 'Audit & Usage',
    description: 'Activity logs and usage analytics',
    icon: Activity,
    path: '/admin/audit/activity',
    count: 1247,
    countLabel: 'events',
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Security settings and policies',
    icon: Shield,
    path: '/admin/security',
    count: 3,
    countLabel: 'policies',
  },
];

// Quick actions
const quickActions = [
  { label: 'Invite user', icon: UserPlus, path: '/admin/users', action: 'invite' },
  { label: 'Create role', icon: Shield, path: '/admin/roles-permissions', action: 'create' },
  { label: 'Open audit log', icon: Activity, path: '/admin/audit/activity' },
  { label: 'Jira integration', icon: Link2, path: '/admin/jira-config' },
];

export default function AdminOverview() {
  const [searchQuery, setSearchQuery] = useState('');

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
                          <span className="text-2xl font-bold text-foreground">{pocket.count}</span>
                          <p className="text-xs text-muted-foreground">{pocket.countLabel}</p>
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
            {/* Recently Visited */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Recently Visited</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {recentlyVisited.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.path}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-muted transition-colors group"
                  >
                    <span className="text-sm text-foreground">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{item.lastAccessed}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Recent Admin Changes */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Recent Admin Changes</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="text-xs">
                    <Link to="/admin/audit/activity">View all</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentAdminChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{change.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {change.actor} • {change.entity}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {change.time}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
