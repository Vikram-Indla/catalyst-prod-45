import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Filter, CheckCircle, Edit, Plus, Calendar, Maximize2, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Metric Card Component
function MetricCard({ 
  icon, 
  value, 
  label, 
  subtitle 
}: { 
  icon: React.ReactNode; 
  value: number; 
  label: string; 
  subtitle: string;
}) {
  return (
    <Card className="flex-1">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
          {icon}
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold">{value}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Status Overview Donut Chart (simplified)
function StatusOverview() {
  // Mock data
  const statusData = [
    { status: 'In Production', count: 2, color: '#FF991F' },
    { status: 'Hold', count: 6, color: '#36B37E' },
    { status: 'Production Ready', count: 1, color: '#6554C0' },
    { status: 'On Hold', count: 7, color: '#8777D9' },
    { status: 'Backlog', count: 44, color: '#FF7452' },
    { status: 'In Development', count: 4, color: '#2684FF' },
  ];
  const total = statusData.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Status overview</CardTitle>
            <p className="text-sm text-muted-foreground">
              Get a snapshot of the status of your work items.{' '}
              <a href="#" className="text-primary hover:underline">View all work items</a>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          {/* Donut Chart Placeholder */}
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {statusData.reduce((acc, item, index) => {
                const startAngle = acc.angle;
                const sliceAngle = (item.count / total) * 360;
                const endAngle = startAngle + sliceAngle;
                
                const x1 = 50 + 35 * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 50 + 35 * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 50 + 35 * Math.cos((endAngle * Math.PI) / 180);
                const y2 = 50 + 35 * Math.sin((endAngle * Math.PI) / 180);
                
                const largeArc = sliceAngle > 180 ? 1 : 0;
                
                acc.paths.push(
                  <path
                    key={index}
                    d={`M 50 50 L ${x1} ${y1} A 35 35 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={item.color}
                    stroke="white"
                    strokeWidth="1"
                  />
                );
                acc.angle = endAngle;
                return acc;
              }, { angle: 0, paths: [] as React.ReactNode[] }).paths}
              <circle cx="50" cy="50" r="20" fill="white" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{total}</span>
              <span className="text-xs text-muted-foreground">Total work item...</span>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-col gap-1.5 text-sm">
            {statusData.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.status}:</span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Recent Activity Feed
function RecentActivity() {
  const activities = [
    {
      id: '1',
      userName: 'waqas ali',
      userInitials: 'WA',
      action: 'changed the Assignee to',
      target: 'Yazeed Daraz',
      itemKey: 'BAU-4401',
      itemSummary: 'Update request status to reject (4704203767)',
      itemStatus: 'READY FOR QA',
      time: 'Yesterday',
    },
    {
      id: '2',
      userName: 'waqas ali',
      userInitials: 'WA',
      action: 'commented on',
      itemKey: 'BAU-4401',
      itemSummary: 'Update request status to reject (4704203767)',
      itemStatus: 'READY FOR QA',
      time: '1 day ago',
      comment: 'Done',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
            <p className="text-sm text-muted-foreground">
              Stay up to date with what's happening across the space.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="space-y-1">
            <p className="text-xs text-muted-foreground">{activity.time}</p>
            <div className="flex items-start gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                  {activity.userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-sm">
                <span className="text-primary">{activity.userName}</span>
                <span className="text-muted-foreground"> {activity.action} </span>
                {activity.target && <span className="text-primary">{activity.target}</span>}
                <span className="text-muted-foreground"> on </span>
                <a href="#" className="text-primary hover:underline">
                  {activity.itemKey}: {activity.itemSummary}
                </a>
                <Badge variant="outline" className="ml-2 text-xs bg-amber-100 text-amber-700 border-amber-200">
                  {activity.itemStatus}
                </Badge>
              </div>
            </div>
            {activity.comment && (
              <div className="ml-8 mt-2 p-2 bg-muted rounded text-sm">
                {activity.comment}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Priority Breakdown Chart
function PriorityBreakdown() {
  const priorities = [
    { label: 'Highest', count: 2, color: '#FF5630' },
    { label: 'High', count: 5, color: '#FF7452' },
    { label: 'Medium', count: 42, color: '#FFAB00' },
    { label: 'Low', count: 8, color: '#36B37E' },
    { label: 'Lowest', count: 3, color: '#6B778C' },
    { label: 'None', count: 55, color: '#97A0AF' },
  ];
  const maxCount = Math.max(...priorities.map(p => p.count));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Priority breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Get a holistic view of how work is being prioritized.{' '}
          <a href="#" className="text-primary hover:underline">How to manage priorities for spaces</a>
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-40 flex items-end justify-around gap-2">
          {priorities.map((p) => (
            <div key={p.label} className="flex flex-col items-center gap-1">
              <div
                className="w-12 rounded-t transition-all"
                style={{
                  height: `${(p.count / maxCount) * 120}px`,
                  backgroundColor: p.color,
                }}
              />
              <span className="text-xs text-muted-foreground">{p.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Types of Work Distribution
function TypesOfWork() {
  const types = [
    { type: 'Epic', icon: '◇', count: 47, percentage: 47 },
    { type: 'Task', icon: '☑', count: 16, percentage: 16 },
    { type: 'Story', icon: '▢', count: 12, percentage: 12 },
    { type: 'Backend', icon: '●', count: 8, percentage: 8 },
    { type: 'Production Incident', icon: '⊙', count: 5, percentage: 5 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Types of work</CardTitle>
        <p className="text-sm text-muted-foreground">
          Get a breakdown of work items by their types.{' '}
          <a href="#" className="text-primary hover:underline">View all items</a>
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm font-medium text-muted-foreground">
            <span>Type</span>
            <span>Distribution</span>
          </div>
          {types.map((t) => (
            <div key={t.type} className="grid grid-cols-2 gap-4 items-center">
              <div className="flex items-center gap-2 text-sm">
                <span>{t.icon}</span>
                <span>{t.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-muted-foreground/30 flex items-center px-2"
                    style={{ width: `${t.percentage}%` }}
                  >
                    <span className="text-xs font-medium">{t.percentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Team Workload
function TeamWorkload() {
  const team = [
    { name: 'Nada alfassam', initials: 'NA', percentage: 34 },
    { name: 'vikram indla', avatar: '', percentage: 17 },
    { name: 'Sherif Gjini', initials: 'SG', percentage: 15 },
    { name: 'Yahya Aloyoni', initials: 'YA', percentage: 12 },
    { name: 'Muhammad Ayaz', initials: 'MA', percentage: 10 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Team workload</CardTitle>
        <p className="text-sm text-muted-foreground">
          Monitor the capacity of your team.{' '}
          <a href="#" className="text-primary hover:underline">Reassign work items to get the right balance</a>
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm font-medium text-muted-foreground">
            <span>Assignee</span>
            <span>Work distribution</span>
          </div>
          {team.map((member) => (
            <div key={member.name} className="grid grid-cols-2 gap-4 items-center">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {member.avatar ? (
                    <AvatarImage src={member.avatar} />
                  ) : (
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {member.initials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-sm">{member.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500 flex items-center px-2"
                    style={{ width: `${member.percentage}%` }}
                  >
                    <span className="text-xs font-medium text-white">{member.percentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Epic Progress
function EpicProgress() {
  const epics = [
    { key: 'BAU-2240', name: 'RCJY Site allocation', done: 100, inProgress: 0, todo: 0 },
    { key: 'BAU-22', name: 'Standard Incentive', done: 100, inProgress: 0, todo: 0 },
    { key: 'BAU-2225', name: 'Modon – Industrial Land Allocation request', done: 100, inProgress: 0, todo: 0 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Epic progress</CardTitle>
        <p className="text-sm text-muted-foreground">
          See how your epics are progressing at a glance.{' '}
          <a href="#" className="text-primary hover:underline">View all epics</a>
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Done</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>In progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-300" />
            <span>To do</span>
          </div>
        </div>
        <div className="space-y-4">
          {epics.map((epic) => (
            <div key={epic.key}>
              <div className="flex items-center gap-2 mb-1 text-sm">
                <span className="text-purple-600">◇</span>
                <span className="text-primary">{epic.key}</span>
                <span className="text-muted-foreground truncate">{epic.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-5 bg-muted rounded overflow-hidden flex">
                  {epic.done > 0 && (
                    <div className="h-full bg-green-500 flex items-center justify-center" style={{ width: `${epic.done}%` }}>
                      <span className="text-xs font-medium text-white">{epic.done}%</span>
                    </div>
                  )}
                  {epic.inProgress > 0 && (
                    <div className="h-full bg-blue-500" style={{ width: `${epic.inProgress}%` }} />
                  )}
                  {epic.todo > 0 && (
                    <div className="h-full bg-gray-300" style={{ width: `${epic.todo}%` }} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryView() {
  const { projectKey } = useParams();

  return (
    <div className="h-full overflow-auto p-6">
      {/* Filter Button */}
      <div className="mb-6">
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          value={8}
          label="completed"
          subtitle="in the last 7 days"
        />
        <MetricCard
          icon={<Edit className="h-5 w-5 text-blue-600" />}
          value={22}
          label="updated"
          subtitle="in the last 7 days"
        />
        <MetricCard
          icon={<Plus className="h-5 w-5 text-green-600" />}
          value={6}
          label="created"
          subtitle="in the last 7 days"
        />
        <MetricCard
          icon={<Calendar className="h-5 w-5 text-orange-600" />}
          value={0}
          label="due soon"
          subtitle="in the next 7 days"
        />
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Row A */}
        <StatusOverview />
        <RecentActivity />

        {/* Row B */}
        <PriorityBreakdown />
        <TypesOfWork />

        {/* Row C */}
        <TeamWorkload />
        <EpicProgress />
      </div>
    </div>
  );
}

export default SummaryView;
