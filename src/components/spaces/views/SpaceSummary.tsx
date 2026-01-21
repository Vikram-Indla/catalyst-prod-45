// ════════════════════════════════════════════════════════════════════════════
// SPACE SUMMARY - Dashboard overview of the space
// ════════════════════════════════════════════════════════════════════════════

import { useParams, Link } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { useSpace, useSpaceMembers, useSpaceVersions } from '@/hooks/spaces';
import { SpaceAvatar } from '../shared/SpaceAvatar';
import { UserAvatar } from '../shared/UserAvatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { VersionStatusBadge } from '../shared/VersionStatusBadge';
import { cn } from '@/lib/utils';

export function SpaceSummary() {
  const { id } = useParams<{ id: string }>();
  const { data: space, isLoading: loadingSpace } = useSpace(id);
  const { data: members = [] } = useSpaceMembers(id);
  const { data: versions = [] } = useSpaceVersions(id);

  if (loadingSpace || !space) {
    return <SummarySkeleton />;
  }

  const unreleasedVersions = versions.filter((v) => v.status === 'unreleased');
  const currentVersion = unreleasedVersions[0];

  // Mock work item stats
  const workItemStats = { total: 156, todo: 45, inProgress: 32, done: 79, overdue: 8 };

  return (
    <div className="p-6 space-y-6">
      {/* Space Header Card */}
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <SpaceAvatar
            name={space.name}
            spaceKey={space.key}
            color={space.color}
            size="xl"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{space.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {space.key} · {space.type}
            </p>
            {space.description && (
              <p className="text-sm text-muted-foreground mt-3">{space.description}</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Space Lead</span>
            <p className="font-medium text-foreground">{space.lead_name || 'Unassigned'}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Total Work Items"
          value={workItemStats.total}
          color="primary"
        />
        <StatCard
          icon={<Circle className="w-5 h-5" />}
          label="To Do"
          value={workItemStats.todo}
          color="muted"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="In Progress"
          value={workItemStats.inProgress}
          color="teal"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Done"
          value={workItemStats.done}
          color="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Work Item Status */}
        <div className="lg:col-span-2 bg-background border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Work Item Status</h3>
          <div className="space-y-4">
            <StatusRow
              label="To Do"
              count={workItemStats.todo}
              total={workItemStats.total}
              color="bg-muted-foreground"
            />
            <StatusRow
              label="In Progress"
              count={workItemStats.inProgress}
              total={workItemStats.total}
              color="bg-primary"
            />
            <StatusRow
              label="Done"
              count={workItemStats.done}
              total={workItemStats.total}
              color="bg-green-500"
            />
          </div>
          {workItemStats.overdue > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <span className="font-medium text-destructive">
                  {workItemStats.overdue} Overdue Items
                </span>
                <p className="text-xs text-muted-foreground">
                  These items have passed their due date
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Team */}
        <div className="bg-background border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Team</h3>
            <span className="text-xs text-muted-foreground">{members.length} members</span>
          </div>
          <div className="space-y-3">
            {members.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <UserAvatar
                  name={member.user?.full_name}
                  email={member.user?.email}
                  avatarUrl={member.user?.avatar_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.user?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {members.length > 5 && (
            <Link
              to={`/spaces/${id}/settings?tab=access`}
              className="block mt-4 text-sm text-primary hover:underline"
            >
              View all {members.length} members
            </Link>
          )}
        </div>
      </div>

      {/* Current Version */}
      {currentVersion && (
        <div className="bg-background border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Current Version</h3>
            <VersionStatusBadge status={currentVersion.status} />
          </div>
          <div>
            <h4 className="text-lg font-medium text-foreground">{currentVersion.name}</h4>
            {currentVersion.description && (
              <p className="text-sm text-muted-foreground mt-1">{currentVersion.description}</p>
            )}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">
                  {currentVersion.progress_percentage || 0}%
                </span>
              </div>
              <ProgressBar
                value={currentVersion.progress_percentage || 0}
                variant={currentVersion.progress_percentage === 100 ? 'success' : 'default'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'primary' | 'teal' | 'success' | 'muted';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    muted: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="bg-background border border-border rounded-lg p-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', colorClasses[color])}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS ROW
// ─────────────────────────────────────────────────────────────────────────────

function StatusRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = Math.round((count / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {count} ({percentage}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-32 bg-muted rounded-lg" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}
