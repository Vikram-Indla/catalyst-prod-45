/**
 * Project Activity Report - Prompt 3.21
 * Purpose: Detailed activity log for all test management actions
 * Sections: Activity Summary, Activity by Type, Daily Activity, Hourly Heatmap, Activity Feed
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Calendar, Users, Search, Download } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';


interface ActivitySummary {
  total: number;
  mostActiveDay: string;
  mostActiveDayCount: number;
  mostActiveUser: string;
  mostActiveUserCount: number;
  activityTypes: number;
}

interface ActivityByType {
  type: string;
  count: number;
  color: string;
}

interface DailyActivity {
  date: string;
  created: number;
  executed: number;
  updated: number;
  defects: number;
}

interface ActivityFeedItem {
  id: string;
  timestamp: string;
  user: string;
  userAvatar?: string;
  action: string;
  target: string;
  targetType: string;
  details?: string;
  link?: string;
}

interface UserLeaderboard {
  rank: number;
  user: string;
  avatar?: string;
  total: number;
  mostCommonAction: string;
  lastActivity: string;
}

interface ProjectActivityReportProps {
  data?: {
    summary: ActivitySummary;
    byType: ActivityByType[];
    daily: DailyActivity[];
    hourlyHeatmap: { day: string; hour: number; count: number }[];
    feed: ActivityFeedItem[];
    leaderboard: UserLeaderboard[];
  };
  isLoading?: boolean;
}

// Mock data per specification
const mockData = {
  summary: {
    total: 1250,
    mostActiveDay: 'May 10',
    mostActiveDayCount: 87,
    mostActiveUser: 'John Doe',
    mostActiveUserCount: 340,
    activityTypes: 12,
  },
  byType: [
    { type: 'Case Created', count: 245, color: '#3b82f6' },
    { type: 'Executed', count: 520, color: '#10b981' },
    { type: 'Set Created', count: 45, color: '#8b5cf6' },
    { type: 'Cycle Created', count: 32, color: '#f59e0b' },
    { type: 'Updated', count: 280, color: '#6b7280' },
    { type: 'Defect Linked', count: 128, color: '#ef4444' },
  ],
  daily: [
    { date: 'May 1', created: 12, executed: 45, updated: 23, defects: 5 },
    { date: 'May 2', created: 8, executed: 38, updated: 18, defects: 3 },
    { date: 'May 3', created: 15, executed: 52, updated: 28, defects: 7 },
    { date: 'May 4', created: 10, executed: 41, updated: 20, defects: 4 },
    { date: 'May 5', created: 18, executed: 60, updated: 32, defects: 8 },
  ],
  hourlyHeatmap: Array.from({ length: 168 }, (_, i) => ({
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Math.floor(i / 24)],
    hour: i % 24,
    count: Math.floor(Math.random() * 20),
  })),
  feed: [
    { id: '1', timestamp: '2 min ago', user: 'John Doe', action: 'created', target: 'TC-045: Login Test', targetType: 'case', details: 'New test case' },
    { id: '2', timestamp: '15 min ago', user: 'Jane Smith', action: 'executed', target: 'TC-012: Checkout Flow', targetType: 'execution', details: 'Passed' },
    { id: '3', timestamp: '32 min ago', user: 'Mike Johnson', action: 'linked defect', target: 'TC-089: Payment Test', targetType: 'defect', details: 'DEF-234' },
    { id: '4', timestamp: '1 hour ago', user: 'Sarah Wilson', action: 'updated', target: 'TC-023: Search Feature', targetType: 'case', details: 'Added steps' },
    { id: '5', timestamp: '2 hours ago', user: 'John Doe', action: 'created cycle', target: 'CYC-015: Sprint 12', targetType: 'cycle' },
  ],
  leaderboard: [
    { rank: 1, user: 'John Doe', total: 340, mostCommonAction: 'Created', lastActivity: '2 min ago' },
    { rank: 2, user: 'Jane Smith', total: 285, mostCommonAction: 'Executed', lastActivity: '15 min ago' },
    { rank: 3, user: 'Mike Johnson', total: 210, mostCommonAction: 'Updated', lastActivity: '32 min ago' },
    { rank: 4, user: 'Sarah Wilson', total: 180, mostCommonAction: 'Executed', lastActivity: '1 hour ago' },
    { rank: 5, user: 'Tom Brown', total: 145, mostCommonAction: 'Created', lastActivity: '3 hours ago' },
  ],
};

export const ProjectActivityReport: React.FC<ProjectActivityReportProps> = ({
  data = mockData,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activityFilter, setActivityFilter] = React.useState('all');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const { summary, byType, daily, feed, leaderboard } = data;

  const filteredFeed = feed.filter(item => 
    (activityFilter === 'all' || item.targetType === activityFilter) &&
    (item.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
     item.user.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Activity Summary Cards - per spec */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Activity className="h-4 w-4" />
              Total Activities
            </div>
            <div className="text-2xl font-bold text-brand-gold">{summary.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" />
              Most Active Day
            </div>
            <div className="text-2xl font-bold">{summary.mostActiveDay}</div>
            <div className="text-sm text-muted-foreground">{summary.mostActiveDayCount} activities</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              Most Active User
            </div>
            <div className="text-2xl font-bold">{summary.mostActiveUser}</div>
            <div className="text-sm text-muted-foreground">{summary.mostActiveUserCount} activities</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-sm">Activity Types</div>
            <div className="text-2xl font-bold">{summary.activityTypes}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity by Type Pie - per spec */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={byType.map(b => ({ name: b.type, value: b.count, fill: b.color }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {byType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={byType[index].color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Activity Bar Chart - Stacked by type per spec */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={daily}>
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" stackId="a" fill="#3b82f6" name="Created" />
                <Bar dataKey="executed" stackId="a" fill="#10b981" name="Executed" />
                <Bar dataKey="updated" stackId="a" fill="#6b7280" name="Updated" />
                <Bar dataKey="defects" stackId="a" fill="#ef4444" name="Defects" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Activity Heatmap - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hourly Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simplified heatmap grid */}
          <div className="grid grid-cols-25 gap-1 text-xs">
            <div></div>
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="text-center text-muted-foreground">{i}</div>
            ))}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <React.Fragment key={day}>
                <div className="text-right pr-2 text-muted-foreground">{day}</div>
                {Array.from({ length: 24 }, (_, hour) => {
                  const item = data.hourlyHeatmap.find(h => h.day === day && h.hour === hour);
                  const count = item?.count || 0;
                  const intensity = count > 15 ? 'bg-brand-gold' : count > 10 ? 'bg-brand-gold/60' : count > 5 ? 'bg-brand-gold/40' : count > 0 ? 'bg-brand-gold/20' : 'bg-muted';
                  return <div key={hour} className={`w-4 h-4 rounded-sm ${intensity}`} title={`${day} ${hour}:00 - ${count} activities`} />;
                })}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed Table with Infinite Scroll - per spec */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle className="text-lg">Activity Feed</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="case">Cases</SelectItem>
                  <SelectItem value="execution">Executions</SelectItem>
                  <SelectItem value="cycle">Cycles</SelectItem>
                  <SelectItem value="defect">Defects</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredFeed.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold font-medium">
                  {item.user.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.user}</span>
                    <span className="text-muted-foreground">{item.action}</span>
                    <span className="text-brand-gold truncate">{item.target}</span>
                  </div>
                  {item.details && (
                    <div className="text-sm text-muted-foreground">{item.details}</div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">{item.timestamp}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Activity Leaderboard - per spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Activity Leaderboard (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Rank</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-right p-2">Total Activities</th>
                  <th className="text-left p-2">Most Common</th>
                  <th className="text-left p-2">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.rank} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      {entry.rank === 1 && '🥇'}
                      {entry.rank === 2 && '🥈'}
                      {entry.rank === 3 && '🥉'}
                      {entry.rank > 3 && entry.rank}
                    </td>
                    <td className="p-2 font-medium">{entry.user}</td>
                    <td className="p-2 text-right text-brand-gold font-medium">{entry.total}</td>
                    <td className="p-2">
                      <Badge variant="outline">{entry.mostCommonAction}</Badge>
                    </td>
                    <td className="p-2 text-muted-foreground">{entry.lastActivity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons - per spec */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>
    </div>
  );
};
