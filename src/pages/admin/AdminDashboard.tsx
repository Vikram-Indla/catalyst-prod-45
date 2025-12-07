import { useNavigate } from 'react-router-dom';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Users, 
  Settings, 
  Database, 
  Shield,
  TrendingUp,
  Building2,
  FileText
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const quickLinks = [
    {
      title: 'Access Controls',
      description: 'View activity logs and usage trends',
      icon: Activity,
      path: '/admin/activity',
      color: 'text-blue-600',
    },
    {
      title: 'Users & Roles',
      description: 'Manage users, teams, and permissions',
      icon: Users,
      path: '/admin/users',
      color: 'text-green-600',
    },
    {
      title: 'Application Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      path: '/admin/general-settings',
      color: 'text-purple-600',
    },
    {
      title: 'Basic Structure',
      description: 'Manage teams, programs, and portfolios',
      icon: Building2,
      path: '/admin/teams',
      color: 'text-orange-600',
    },
    {
      title: 'Integrations',
      description: 'Configure Jira and other connectors',
      icon: Database,
      path: '/admin/jira-config',
      color: 'text-cyan-600',
    },
    {
      title: 'Security',
      description: 'Security and permission settings',
      icon: Shield,
      path: '/admin/security',
      color: 'text-red-600',
    },
  ];

  const recentActivity = [
    { action: 'User role updated', user: 'John Doe', time: '5 minutes ago' },
    { action: 'New program created', user: 'Jane Smith', time: '1 hour ago' },
    { action: 'Settings modified', user: 'Admin', time: '2 hours ago' },
    { action: 'Integration connected', user: 'System', time: '3 hours ago' },
  ];

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background overflow-hidden">
        <div className="h-[72px] border-b bg-card px-3 sm:px-6 flex items-center">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground truncate">Administration Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Manage system configuration, users, and integrations
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
            {/* Quick Links Grid */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Card 
                    key={link.path}
                    className="cursor-pointer hover:border-brand-gold transition-colors"
                    onClick={() => navigate(link.path)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Icon className={`h-6 w-6 ${link.color}`} />
                      </div>
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {link.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-brand-gold hover:bg-brand-gold/10"
                      >
                        Open →
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* System Status */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">1,247</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-green-600">↑ 12%</span> from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Programs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">47</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-green-600">↑ 3</span> new this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">Good</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All systems operational
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-brand-gold" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest administrative actions and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">by {activity.user}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-4 text-brand-gold hover:bg-brand-gold/10"
                  onClick={() => navigate('/admin/activity')}
                >
                  View All Activity →
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
