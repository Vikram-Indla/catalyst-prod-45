import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectData } from '../../../types/project.types';

interface SummaryViewProps {
  project: ProjectData;
}

export default function SummaryView({ project }: SummaryViewProps) {
  // Calculate metrics from project data
  const allItems = project.features.flatMap(f => [
    f,
    ...f.stories.flatMap(s => [s, ...s.subtasks])
  ]);
  
  const totalItems = allItems.length;
  const doneCount = allItems.filter(i => i.status === 'DONE').length;
  const inProgressCount = allItems.filter(i => i.status === 'IN PROGRESS').length;
  const todoCount = allItems.filter(i => i.status === 'TO DO').length;
  
  const featureCount = project.features.length;
  const storyCount = project.features.reduce((sum, f) => sum + f.stories.length, 0);
  const subtaskCount = project.features.reduce((sum, f) => 
    sum + f.stories.reduce((s, story) => s + story.subtasks.length, 0), 0
  );
  
  const highPriority = allItems.filter(i => i.priority === 'High').length;
  const mediumPriority = allItems.filter(i => i.priority === 'Medium').length;
  const lowPriority = allItems.filter(i => i.priority === 'Low').length;

  const statusData = [
    { name: 'To Do', value: todoCount, color: '#64748b' },
    { name: 'In Progress', value: inProgressCount, color: '#3b82f6' },
    { name: 'Done', value: doneCount, color: '#22c55e' },
  ];

  const priorityData = [
    { priority: 'High', count: highPriority },
    { priority: 'Medium', count: mediumPriority },
    { priority: 'Low', count: lowPriority },
  ];

  const typeData = [
    { type: 'Feature', count: featureCount, percentage: Math.round((featureCount / totalItems) * 100), color: '#8b5cf6' },
    { type: 'Story', count: storyCount, percentage: Math.round((storyCount / totalItems) * 100), color: '#22c55e' },
    { type: 'Subtask', count: subtaskCount, percentage: Math.round((subtaskCount / totalItems) * 100), color: '#3b82f6' },
  ];

  return (
    <div className="p-6 bg-muted/50 min-h-[calc(100vh-180px)]">
      {/* METRICS ROW */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard value={doneCount} label="completed" sublabel="in the last 7 days" />
        <MetricCard value={8} label="updated" sublabel="in the last 7 days" />
        <MetricCard value={totalItems} label="created" sublabel="in the last 7 days" />
        <MetricCard value={3} label="due soon" sublabel="in the next 7 days" />
      </div>

      {/* WIDGETS - 2x2 GRID */}
      <div className="grid grid-cols-2 gap-4">
        {/* STATUS OVERVIEW */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Status overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-8">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="text-xl font-semibold text-foreground">{totalItems}</div>
                  <div className="text-[11px] text-muted-foreground">Total</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {statusData.map((status) => (
                  <div key={status.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm" 
                      style={{ background: status.color }}
                    />
                    <span className="text-sm text-foreground min-w-[80px]">{status.name}</span>
                    <span className="text-sm font-semibold text-foreground">{status.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TYPES OF WORK */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Types of work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {typeData.map((type) => (
                <div key={type.type} className="flex items-center gap-3">
                  <span className="text-sm w-16 text-foreground">{type.type}</span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div 
                      className="h-full flex items-center pl-2"
                      style={{ width: `${type.percentage}%`, background: type.color }}
                    >
                      {type.percentage > 20 && (
                        <span className="text-xs font-semibold text-white">{type.percentage}%</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right">{type.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PRIORITY BREAKDOWN */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Priority breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={priorityData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="priority" 
                  width={60} 
                  tick={{ fontSize: 12 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* RECENT ACTIVITY */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-24">
              <span className="text-sm text-muted-foreground">No recent activity</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ value, label, sublabel }: { value: number; label: string; sublabel: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-5xl font-medium text-foreground leading-none mb-1">{value}</div>
        <div className="text-sm text-foreground mb-0.5">{label}</div>
        <div className="text-xs text-muted-foreground">{sublabel}</div>
      </CardContent>
    </Card>
  );
}
