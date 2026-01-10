import React, { useState } from 'react';
import { Layers, CheckCircle, BarChart3, Clock, TrendingUp, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { cn } from '@/lib/utils';

const stats = [
  { 
    label: 'Total Generations', 
    value: '1,247', 
    change: '+12%', 
    changeLabel: 'from last month',
    positive: true,
    icon: Layers 
  },
  { 
    label: 'Items Generated', 
    value: '8,453', 
    change: '+18%', 
    changeLabel: 'from last month',
    positive: true,
    icon: CheckCircle 
  },
  { 
    label: 'Avg. Confidence', 
    value: '92%', 
    change: '+3%', 
    changeLabel: 'from last month',
    positive: true,
    icon: BarChart3 
  },
  { 
    label: 'Time Saved', 
    value: '847h', 
    change: '+24%', 
    changeLabel: 'from last month',
    positive: true,
    icon: Clock 
  },
];

const chartData = [
  { name: 'Mon', value: 45 },
  { name: 'Tue', value: 52 },
  { name: 'Wed', value: 38 },
  { name: 'Thu', value: 65 },
  { name: 'Fri', value: 72 },
  { name: 'Sat', value: 40 },
  { name: 'Sun', value: 58 },
];

const topUsers = [
  { rank: 1, name: 'Vikram S.', initial: 'V', generations: 156, color: 'bg-[#2563eb]' },
  { rank: 2, name: 'Ahmed K.', initial: 'A', generations: 142, color: 'bg-[#7c3aed]' },
  { rank: 3, name: 'Sara M.', initial: 'S', generations: 128, color: 'bg-[#0d9488]' },
  { rank: 4, name: 'Mohammed R.', initial: 'M', generations: 97, color: 'bg-[#f59e0b]' },
];

export default function RAAdminAnalytics() {
  const [timeRange, setTimeRange] = useState('7days');

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-full">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a]">Analytics</h1>
        <p className="text-sm text-[#64748b] mt-1">Monitor usage and performance metrics for Requirement Assist</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-white border-[#e2e8f0]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#2563eb]" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#0f172a] mb-1">{stat.value}</div>
                <div className="text-sm text-[#64748b] mb-2">{stat.label}</div>
                <div className="flex items-center gap-1">
                  <TrendingUp className={cn(
                    'w-3.5 h-3.5',
                    stat.positive ? 'text-[#10b981]' : 'text-[#ef4444]'
                  )} />
                  <span className={cn(
                    'text-xs font-medium',
                    stat.positive ? 'text-[#10b981]' : 'text-[#ef4444]'
                  )}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-[#64748b]">{stat.changeLabel}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Line Chart - Wider */}
        <Card className="col-span-2 bg-white border-[#e2e8f0]">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[#0f172a]">Generations Over Time</CardTitle>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card className="bg-white border-[#e2e8f0]">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-[#0f172a]">Top Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topUsers.map((user) => (
              <div 
                key={user.rank}
                className="flex items-center gap-3 p-3 rounded-lg bg-[#f8fafc]"
              >
                <div className="w-6 h-6 rounded-full bg-[#e2e8f0] flex items-center justify-center text-xs font-bold text-[#64748b]">
                  {user.rank}
                </div>
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white font-medium', user.color)}>
                  {user.initial}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#0f172a]">{user.name}</div>
                </div>
                <div className="text-sm font-semibold text-[#0f172a]">{user.generations}</div>
                <div className="text-xs text-[#64748b]">generations</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
