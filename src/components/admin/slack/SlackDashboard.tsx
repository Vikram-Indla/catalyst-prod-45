// ============================================================
// CATALYST SLACK ADMIN - Dashboard
// ============================================================

import React, { useState } from 'react';
import ChartTrendIcon from '@atlaskit/icon/core/chart-trend';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CopyIcon from '@atlaskit/icon/core/copy';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import EyeOpenIcon from '@atlaskit/icon/core/eye-open';
import FileIcon from '@atlaskit/icon/core/file';
import LinkBrokenIcon from '@atlaskit/icon/core/link-broken';
import LinkExternalIcon from '@atlaskit/icon/core/link-external';
import NotificationIcon from '@atlaskit/icon/core/notification';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import SettingsIcon from '@atlaskit/icon/core/settings';
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
import ToolsIcon from '@atlaskit/icon/core/tools';
import WarningIcon from '@atlaskit/icon/core/warning';
import {
  SlackConfig,
  SlackStats,
  useSlackUsers,
  useSlackAuditLogs,
  useTestSlackConnection,
  useDisconnectSlackUser,
} from '@/hooks/useSlackAdmin';
import Button, { IconButton } from '@atlaskit/button/new';
import { Avatar, Lozenge } from '@/components/ads';
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
} from '@/components/admin/admin-alert-dialog';
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
    <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '24px' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <ChartTrendIcon label="" size="small" />
              <span className="text-xs text-green-600">+{trend.value}</span>
              <span className="text-xs text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colors[color].bg)}>
          <span className={colors[color].icon}>
            <Icon label="" size="small" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

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
  if (status === 'failed') return <CrossCircleIcon label="" size="small" />;
  
  const icons: Record<string, React.ReactNode> = {
    config_created: <SettingsIcon label="" size="small" />,
    config_updated: <SettingsIcon label="" size="small" />,
    workspace_installed: <SlackIcon className="w-4 h-4 text-blue-500" />,
    user_connected: <PeopleGroupIcon label="" size="small" />,
    user_disconnected: <LinkBrokenIcon label="" size="small" />,
    test_sent: <ToolsIcon label="" size="small" />,
    notification_sent: <NotificationIcon label="" size="small" />,
  };
  return icons[action] || <ChartTrendIcon label="" size="small" />;
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
      <div style={{
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DCDFE4)',
        borderLeft: config.is_active ? '4px solid #22c55e' : '4px solid #f59e0b',
        borderRadius: '3px',
        padding: '16px 24px',
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              config.is_active ? 'bg-green-100' : 'bg-amber-100'
            )}>
              {config.is_active ? (
                <CheckCircleIcon label="" size="small" />
              ) : (
                <WarningIcon label="" size="small" />
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
              appearance="default"
              iconBefore={testConnection.isPending ? RefreshIcon : ToolsIcon}
              onClick={() => testConnection.mutate({})}
              isDisabled={testConnection.isPending || !config.is_active}
            >
              Send Test
            </Button>
            <Button
              appearance="default"
              iconBefore={LinkExternalIcon}
              onClick={() => window.open('https://api.slack.com/apps/' + config.app_id, '_blank')}
              isDisabled={!config.app_id}
            >
              Slack Console
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Connected Users"
            value={stats.active_connected_users}
            subtitle={`${stats.total_connected_users} total`}
            icon={PeopleGroupIcon}
            color="purple"
          />
          <StatCard
            title="Notifications Sent"
            value={stats.total_notifications_sent.toLocaleString()}
            subtitle="All time"
            icon={NotificationIcon}
            trend={stats.notifications_last_24h > 0 ? { value: stats.notifications_last_24h, label: 'today' } : undefined}
            color="green"
          />
          <StatCard
            title="Last 7 Days"
            value={stats.notifications_last_7d.toLocaleString()}
            subtitle="Notifications delivered"
            icon={ChartTrendIcon}
            color="blue"
          />
          <StatCard
            title="Failed (24h)"
            value={stats.failed_notifications_24h}
            subtitle="Delivery failures"
            icon={WarningIcon}
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
            <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
                <h3 className="text-base flex items-center gap-2" style={{ fontWeight: 500, margin: 0 }}>
                  <SettingsIcon label="" size="small" />
                  Configuration
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #626F86)', margin: '4px 0 0' }}>Current Slack integration settings</p>
              </div>
              <div style={{ padding: '24px' }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">App ID</p>
                    <div className="flex items-center gap-1">
                      <p className="font-mono">{config.app_id || '—'}</p>
                      {config.app_id && (
                        <IconButton appearance="subtle" icon={CopyIcon} onClick={() => copyToClipboard(config.app_id!)} label="" />
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
              </div>
            </div>

            {/* Recent Activity Card */}
            <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }} className="flex flex-row items-center justify-between">
                <div>
                  <h3 className="text-base flex items-center gap-2" style={{ fontWeight: 500, margin: 0 }}>
                    <ChartTrendIcon label="" size="small" />
                    Recent Activity
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #626F86)', margin: '4px 0 0' }}>Latest integration events</p>
                </div>
                <IconButton appearance="subtle" icon={RefreshIcon} onClick={() => refetchAudit()} label="" />
              </div>
              <div style={{ padding: '24px' }}>
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
                      <FileIcon label="" size="small" />
                      <p className="text-sm">No activity yet</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Connected Users Tab */}
        <TabsContent value="users" className="mt-4">
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }} className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-base" style={{ fontWeight: 500, margin: 0 }}>Connected Users</h3>
                <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #626F86)', margin: '4px 0 0' }}>Users who have linked their Slack accounts</p>
              </div>
              <Button appearance="default" iconBefore={RefreshIcon} onClick={() => refetchUsers()}>
                Refresh
              </Button>
            </div>
            <div style={{ padding: '24px' }}>
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
                            <Avatar src={user.avatar_url || undefined} name={user.full_name} size="small" />
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
                              <Button appearance="subtle" iconBefore={ShowMoreHorizontalIcon} >{null}</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => testConnection.mutate({ target_user_id: user.user_id })}
                              >
                                <ToolsIcon label="" size="small" />
                                Send Test
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setDisconnectUserId(user.user_id);
                                  setDisconnectUserName(user.full_name);
                                }}
                              >
                                <LinkBrokenIcon label="" size="small" />
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
                  <PeopleGroupIcon label="" size="small" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No connected users</h3>
                  <p className="text-slate-500 text-sm">
                    Users can connect their Slack accounts from their notification settings
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="mt-4">
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }} className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-base" style={{ fontWeight: 500, margin: 0 }}>Audit Log</h3>
                <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #626F86)', margin: '4px 0 0' }}>Complete history of integration events</p>
              </div>
              <Button appearance="default" iconBefore={RefreshIcon} onClick={() => refetchAudit()}>
                Refresh
              </Button>
            </div>
            <div style={{ padding: '24px' }}>
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
                              appearance="subtle"
                              iconBefore={EyeOpenIcon}
                            >{null}</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <FileIcon label="" size="small" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No audit logs</h3>
                  <p className="text-slate-500 text-sm">
                    Activity will appear here once the integration is used
                  </p>
                </div>
              )}
            </div>
          </div>
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
