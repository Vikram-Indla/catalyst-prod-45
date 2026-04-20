// ============================================================
// CATALYST SLACK ADMIN - Dashboard
// ============================================================

import React, { useState } from 'react';
import {
  SlackConfig,
  SlackStats,
  useSlackUsers,
  useSlackAuditLogs,
  useTestSlackConnection,
  useDisconnectSlackUser,
} from '@/hooks/useSlackAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Users,
  Bell,
  Activity,
  TestTube,
  Settings,
  FileText,
  TrendingUp,
  AlertTriangle,
  Unlink,
  RefreshCw,
  ExternalLink,
  Copy,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Slack icon component
const SlackIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.123 2.521a2.528 2.528 0 0 1 2.521-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.521V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.123a2.528 2.528 0 0 1 2.521 2.521A2.528 2.528 0 0 1 15.165 24a2.528 2.528 0 0 1-2.521-2.522v-2.521h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.313z"/>
  </svg>
);

// ============================================================
// TYPES
// ============================================================

interface DashboardProps {
  config: SlackConfig;
  stats: SlackStats | undefined;
}

// ============================================================
// STAT CARD COMPONENT
// ============================================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'purple',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: 'purple' | 'green' | 'blue' | 'amber' | 'red';
}) {
  const colors = {
    purple: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
    red: { bg: 'bg-red-50', icon: 'text-red-600' },
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">+{trend.value}</span>
                <span className="text-xs text-slate-500">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colors[color].bg)}>
            <Icon className={cn('w-5 h-5', colors[color].icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    config_created: 'Configuration created',
    config_updated: 'Configuration updated',
    credentials_updated: 'Credentials updated',
    workspace_installed: 'Workspace connected',
    user_connected: 'User connected',
    user_disconnected: 'User disconnected',
    test_sent: 'Test notification sent',
    notification_sent: 'Notification delivered',
    notification_failed: 'Notification failed',
    routing_updated: 'Routing rules updated',
  };
  return labels[action] || action;
};

const getActionIcon = (action: string, status: string) => {
  if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
  
  const icons: Record<string, React.ReactNode> = {
    config_created: <Settings className="w-4 h-4 text-blue-500" />,
    config_updated: <Settings className="w-4 h-4 text-blue-500" />,
    workspace_installed: <SlackIcon className="w-4 h-4 text-blue-500" />,
    user_connected: <Users className="w-4 h-4 text-green-500" />,
    user_disconnected: <Unlink className="w-4 h-4 text-amber-500" />,
    test_sent: <TestTube className="w-4 h-4 text-blue-500" />,
    notification_sent: <Bell className="w-4 h-4 text-green-500" />,
  };
  return icons[action] || <Activity className="w-4 h-4 text-slate-500" />;
};

// ============================================================
// DASHBOARD COMPONENT
// ============================================================

export function SlackDashboard({ config, stats }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [disconnectUserId, setDisconnectUserId] = useState<string | null>(null);
  const [disconnectUserName, setDisconnectUserName] = useState<string>('');

  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useSlackUsers();
  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } = useSlackAuditLogs(50);
  const testConnection = useTestSlackConnection();
  const disconnectMutation = useDisconnectSlackUser();

  const handleDisconnectUser = async () => {
    if (disconnectUserId) {
      await disconnectMutation.mutateAsync(disconnectUserId);
      setDisconnectUserId(null);
      setDisconnectUserName('');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Banner */}
      <Card className={cn(
        'border-l-4',
        config.is_active ? 'border-l-green-500' : 'border-l-amber-500'
      )}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                config.is_active ? 'bg-green-100' : 'bg-amber-100'
              )}>
                {config.is_active ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {config.workspace_name || 'Slack Integration'}
                  </h3>
                  <Lozenge appearance={config.is_active ? 'success' : 'default'}>
                    {config.is_active ? 'Connected' : 'Not Connected'}
                  </Lozenge>
                  {config.last_test_status && (
                    <Lozenge appearance={config.last_test_status === 'success' ? 'success' : 'removed'}>
                      Last test: {config.last_test_status}
                    </Lozenge>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {config.is_active
                    ? `Last tested: ${config.last_tested_at ? formatDistanceToNow(new Date(config.last_tested_at), { addSuffix: true }) : 'Never'}`
                    : 'Complete setup to enable notifications'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection.mutate({})}
                disabled={testConnection.isPending || !config.is_active}
              >
                {testConnection.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4 mr-2" />
                )}
                Send Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://api.slack.com/apps/' + config.app_id, '_blank')}
                disabled={!config.app_id}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Slack Console
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Connected Users"
            value={stats.active_connected_users}
            subtitle={`${stats.total_connected_users} total`}
            icon={Users}
            color="purple"
          />
          <StatCard
            title="Notifications Sent"
            value={stats.total_notifications_sent.toLocaleString()}
            subtitle="All time"
            icon={Bell}
            trend={stats.notifications_last_24h > 0 ? { value: stats.notifications_last_24h, label: 'today' } : undefined}
            color="green"
          />
          <StatCard
            title="Last 7 Days"
            value={stats.notifications_last_7d.toLocaleString()}
            subtitle="Notifications delivered"
            icon={Activity}
            color="blue"
          />
          <StatCard
            title="Failed (24h)"
            value={stats.failed_notifications_24h}
            subtitle="Delivery failures"
            icon={AlertTriangle}
            color={stats.failed_notifications_24h > 0 ? 'red' : 'green'}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">
            Connected Users
            {users && users.length > 0 && (
              <span className="ml-2"><Lozenge appearance="inprogress">{users.filter(u => u.is_active).length}</Lozenge></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configuration
                </CardTitle>
                <CardDescription>Current Slack integration settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">App ID</p>
                    <div className="flex items-center gap-1">
                      <p className="font-mono">{config.app_id || '—'}</p>
                      {config.app_id && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(config.app_id!)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500">Workspace ID</p>
                    <p className="font-mono">{config.workspace_id || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Workspace</p>
                    <p>{config.workspace_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Configured</p>
                    <p>{config.configured_at ? format(new Date(config.configured_at), 'MMM d, yyyy') : '—'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-2">Delivery Settings</p>
                  <div className="flex flex-wrap gap-2">
                    <Lozenge appearance={config.send_dm_by_default ? 'inprogress' : 'default'}>
                      DM: {config.send_dm_by_default ? 'Enabled' : 'Disabled'}
                    </Lozenge>
                    <Lozenge appearance={config.send_to_channel ? 'inprogress' : 'default'}>
                      Channel: {config.send_to_channel ? 'Enabled' : 'Disabled'}
                    </Lozenge>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-2">OAuth Scopes</p>
                  <div className="flex flex-wrap gap-1">
                    {config.bot_scopes?.map((scope) => (
                      <code key={scope} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                        {scope}
                      </code>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest integration events</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetchAudit()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  {auditLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-3/4 mb-1" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : auditData?.logs && auditData.logs.length > 0 ? (
                    <div className="space-y-3">
                      {auditData.logs.slice(0, 10).map((log) => (
                        <div key={log.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            {getActionIcon(log.action, log.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                              {getActionLabel(log.action)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {log.actor_email && `by ${log.actor_email} • `}
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </p>
                            {log.status === 'failed' && log.error_message && (
                              <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No activity yet</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Connected Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Connected Users</CardTitle>
                <CardDescription>Users who have linked their Slack accounts</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-1/3 mb-2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : users && users.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Slack User ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Connected</TableHead>
                      <TableHead>Notifications</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{user.full_name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {user.slack_user_id}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Lozenge appearance={user.is_active ? 'inprogress' : 'removed'}>
                            {user.is_active ? 'Active' : 'Disconnected'}
                          </Lozenge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {formatDistanceToNow(new Date(user.connected_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{user.notifications_sent}</span>
                            <span className="text-slate-500"> sent</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => testConnection.mutate({ target_user_id: user.user_id })}
                              >
                                <TestTube className="w-4 h-4 mr-2" />
                                Send Test
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setDisconnectUserId(user.user_id);
                                  setDisconnectUserName(user.full_name);
                                }}
                              >
                                <Unlink className="w-4 h-4 mr-2" />
                                Disconnect
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No connected users</h3>
                  <p className="text-slate-500 text-sm">
                    Users can connect their Slack accounts from their notification settings
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Audit Log</CardTitle>
                <CardDescription>Complete history of integration events</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchAudit()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : auditData?.logs && auditData.logs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditData.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action, log.status)}
                            <span className="text-sm">{getActionLabel(log.action)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {log.actor_email || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {log.target_user_email || '—'}
                        </TableCell>
                        <TableCell>
                          <Lozenge appearance={log.status === 'success' ? 'success' : 'removed'}>
                            {log.status}
                          </Lozenge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          {log.error_message && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title={log.error_message}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No audit logs</h3>
                  <p className="text-slate-500 text-sm">
                    Activity will appear here once the integration is used
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Disconnect User Dialog */}
      <AlertDialog open={!!disconnectUserId} onOpenChange={() => setDisconnectUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect User from Slack?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect <strong>{disconnectUserName}</strong> from Slack notifications.
              They will need to reconnect from their settings to receive notifications again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SlackDashboard;
