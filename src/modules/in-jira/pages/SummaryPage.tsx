/**
 * Summary Page
 * Project overview dashboard with KPIs, status donut, priority breakdown, etc.
 */

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Users,
  BarChart3,
  PieChart,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Mock KPI data
const KPI_DATA = [
  { 
    id: 'total', 
    label: 'Total Issues', 
    value: 247, 
    change: '+12', 
    trend: 'up',
    icon: Layers 
  },
  { 
    id: 'done', 
    label: 'Done', 
    value: 142, 
    change: '+8', 
    trend: 'up',
    icon: CheckCircle2 
  },
  { 
    id: 'in-progress', 
    label: 'In Progress', 
    value: 56, 
    change: '-3', 
    trend: 'down',
    icon: Clock 
  },
  { 
    id: 'overdue', 
    label: 'Overdue', 
    value: 7, 
    change: '+2', 
    trend: 'up',
    icon: AlertCircle 
  },
];

// Mock status distribution
const STATUS_DISTRIBUTION = [
  { status: 'Done', count: 142, percentage: 57.5, color: 'bg-green-500' },
  { status: 'In Progress', count: 56, percentage: 22.7, color: 'bg-blue-500' },
  { status: 'To Do', count: 49, percentage: 19.8, color: 'bg-slate-400' },
];

// Mock priority breakdown
const PRIORITY_BREAKDOWN = [
  { priority: 'Highest', count: 12, color: 'bg-red-500' },
  { priority: 'High', count: 34, color: 'bg-orange-500' },
  { priority: 'Medium', count: 89, color: 'bg-yellow-500' },
  { priority: 'Low', count: 78, color: 'bg-green-500' },
  { priority: 'Lowest', count: 34, color: 'bg-blue-400' },
];

// Mock types of work
const TYPES_OF_WORK = [
  { type: 'Story', count: 156, percentage: 63, color: 'bg-green-500' },
  { type: 'Bug', count: 45, percentage: 18, color: 'bg-red-500' },
  { type: 'Feature', count: 28, percentage: 11, color: 'bg-purple-500' },
  { type: 'Sub-task', count: 18, percentage: 7, color: 'bg-blue-400' },
];

// Mock team workload
const TEAM_WORKLOAD = [
  { name: 'Alice Chen', initials: 'AC', assigned: 12, completed: 8, color: 'bg-purple-500' },
  { name: 'Bob Smith', initials: 'BS', assigned: 9, completed: 7, color: 'bg-blue-500' },
  { name: 'Carol Wu', initials: 'CW', assigned: 15, completed: 11, color: 'bg-green-500' },
  { name: 'David Kim', initials: 'DK', assigned: 8, completed: 6, color: 'bg-orange-500' },
  { name: 'Emma Lee', initials: 'EL', assigned: 11, completed: 9, color: 'bg-pink-500' },
];

// Mock epic progress
const EPIC_PROGRESS = [
  { key: 'PROJ-1', name: 'User Authentication Revamp', done: 12, total: 18, percentage: 67 },
  { key: 'PROJ-2', name: 'Payment Integration', done: 8, total: 24, percentage: 33 },
  { key: 'PROJ-3', name: 'Mobile App MVP', done: 45, total: 60, percentage: 75 },
  { key: 'PROJ-4', name: 'Admin Dashboard', done: 22, total: 30, percentage: 73 },
  { key: 'PROJ-5', name: 'Reporting Module', done: 5, total: 20, percentage: 25 },
];

export function SummaryPage() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* KPI Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_DATA.map((kpi) => (
            <Card key={kpi.id} className="bg-surface-2 border-border-default">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-text-tertiary">{kpi.label}</p>
                    <p className="text-2xl font-semibold text-text-primary mt-1">
                      {kpi.value}
                    </p>
                    <div className={cn(
                      "flex items-center gap-1 mt-1 text-xs",
                      kpi.trend === 'up' && kpi.id !== 'overdue' ? 'text-green-600' : 
                      kpi.trend === 'up' && kpi.id === 'overdue' ? 'text-red-600' :
                      'text-blue-600'
                    )}>
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{kpi.change} this week</span>
                    </div>
                  </div>
                  <div className="p-2 bg-surface-3 rounded-lg">
                    <kpi.icon className="h-5 w-5 text-text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Overview Donut */}
          <Card className="bg-surface-2 border-border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Placeholder donut chart */}
              <div className="flex items-center justify-center py-8">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {/* Done segment */}
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      className="stroke-status-success"
                      strokeWidth="20"
                      strokeDasharray="144.51 251.33"
                      strokeDashoffset="0"
                    />
                    {/* In Progress segment */}
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      className="stroke-accent-primary"
                      strokeWidth="20"
                      strokeDasharray="57.02 251.33"
                      strokeDashoffset="-144.51"
                    />
                    {/* To Do segment */}
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      className="stroke-text-quaternary"
                      strokeWidth="20"
                      strokeDasharray="49.80 251.33"
                      strokeDashoffset="-201.53"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-text-primary">247</span>
                  </div>
                </div>
              </div>
              {/* Legend */}
              <div className="space-y-2">
                {STATUS_DISTRIBUTION.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-sm", item.color)} />
                      <span className="text-sm text-text-secondary">{item.status}</span>
                    </div>
                    <span className="text-sm font-medium text-text-primary">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Priority Breakdown */}
          <Card className="bg-surface-2 border-border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Priority Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 py-4">
                {PRIORITY_BREAKDOWN.map((item) => (
                  <div key={item.priority} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{item.priority}</span>
                      <span className="font-medium text-text-primary">{item.count}</span>
                    </div>
                    <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", item.color)}
                        style={{ width: `${(item.count / 247) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Types of Work */}
          <Card className="bg-surface-2 border-border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Types of Work
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 py-4">
                {TYPES_OF_WORK.map((item) => (
                  <div key={item.type} className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-sm flex-shrink-0", item.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{item.type}</span>
                        <span className="font-medium text-text-primary">{item.count}</span>
                      </div>
                      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden mt-1">
                        <div 
                          className={cn("h-full rounded-full", item.color)}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Workload */}
          <Card className="bg-surface-2 border-border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Workload
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 py-2">
                {TEAM_WORKLOAD.map((member) => (
                  <div key={member.name} className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0",
                      member.color
                    )}>
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {member.name}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          {member.completed}/{member.assigned} done
                        </span>
                      </div>
                      <Progress 
                        value={(member.completed / member.assigned) * 100} 
                        className="h-1.5 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Epic Progress */}
          <Card className="bg-surface-2 border-border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Epic Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 py-2">
                {EPIC_PROGRESS.map((epic) => (
                  <div key={epic.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-accent-primary flex-shrink-0">
                          {epic.key}
                        </span>
                        <span className="text-sm text-text-primary truncate">
                          {epic.name}
                        </span>
                      </div>
                      <span className="text-xs text-text-tertiary flex-shrink-0 ml-2">
                        {epic.done}/{epic.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={epic.percentage} 
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs font-medium text-text-secondary w-8 text-right">
                        {epic.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}

export default SummaryPage;
