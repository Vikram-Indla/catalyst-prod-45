import React from 'react';
import { token } from '@atlaskit/tokens';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
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
    { name: 'To Do', value: todoCount, color: '#42526E' },
    { name: 'In Progress', value: inProgressCount, color: '#0052CC' },
    { name: 'Done', value: doneCount, color: '#00875A' },
  ];

  const priorityData = [
    { priority: 'High', count: highPriority },
    { priority: 'Medium', count: mediumPriority },
    { priority: 'Low', count: lowPriority },
  ];

  const typeData = [
    { type: 'Feature', count: featureCount, percentage: Math.round((featureCount / totalItems) * 100), color: '#6554C0' },
    { type: 'Story', count: storyCount, percentage: Math.round((storyCount / totalItems) * 100), color: '#00875A' },
    { type: 'Subtask', count: subtaskCount, percentage: Math.round((subtaskCount / totalItems) * 100), color: '#0052CC' },
  ];

  return (
    <div style={{
      padding: '24px',
      background: token('elevation.surface.sunken'),
      minHeight: 'calc(100vh - 180px)',
    }}>
      {/* METRICS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <MetricCard value={doneCount} label="completed" sublabel="in the last 7 days" />
        <MetricCard value={8} label="updated" sublabel="in the last 7 days" />
        <MetricCard value={totalItems} label="created" sublabel="in the last 7 days" />
        <MetricCard value={3} label="due soon" sublabel="in the next 7 days" />
      </div>

      {/* WIDGETS - 2x2 GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
      }}>
        {/* STATUS OVERVIEW */}
        <div style={{
          background: token('elevation.surface'),
          border: `1px solid ${token('color.border')}`,
          borderRadius: '4px',
          padding: '16px',
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: token('color.text'),
            margin: '0 0 16px 0',
          }}>
            Status overview
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
          }}>
            <div style={{ position: 'relative', width: '140px', height: '140px' }}>
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
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '20px', fontWeight: 600, color: token('color.text') }}>{totalItems}</div>
                <div style={{ fontSize: '11px', color: token('color.text.subtlest') }}>Total</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {statusData.map((status) => (
                <div key={status.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    background: status.color,
                  }} />
                  <span style={{ fontSize: '14px', color: token('color.text'), minWidth: '80px' }}>
                    {status.name}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: token('color.text') }}>
                    {status.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TYPES OF WORK */}
        <div style={{
          background: token('elevation.surface'),
          border: `1px solid ${token('color.border')}`,
          borderRadius: '4px',
          padding: '16px',
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: token('color.text'),
            margin: '0 0 16px 0',
          }}>
            Types of work
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {typeData.map((type) => (
              <div key={type.type} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', width: '70px', color: token('color.text') }}>{type.type}</span>
                <div style={{
                  flex: 1,
                  height: '20px',
                  background: token('color.background.neutral'),
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${type.percentage}%`,
                    height: '100%',
                    background: type.color,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '8px',
                  }}>
                    {type.percentage > 20 && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                        {type.percentage}%
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: token('color.text.subtlest'), width: '24px', textAlign: 'right' }}>
                  {type.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PRIORITY BREAKDOWN */}
        <div style={{
          background: token('elevation.surface'),
          border: `1px solid ${token('color.border')}`,
          borderRadius: '4px',
          padding: '16px',
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: token('color.text'),
            margin: '0 0 16px 0',
          }}>
            Priority breakdown
          </h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={priorityData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="priority" 
                width={60} 
                tick={{ fontSize: 12, fill: token('color.text') }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#0052CC" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* RECENT ACTIVITY */}
        <div style={{
          background: token('elevation.surface'),
          border: `1px solid ${token('color.border')}`,
          borderRadius: '4px',
          padding: '16px',
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: token('color.text'),
            margin: '0 0 16px 0',
          }}>
            Recent activity
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100px',
          }}>
            <span style={{ fontSize: '14px', color: token('color.text.subtlest') }}>
              No recent activity
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ value, label, sublabel }: { value: number; label: string; sublabel: string }) {
  return (
    <div style={{
      background: token('elevation.surface'),
      border: `1px solid ${token('color.border')}`,
      borderRadius: '4px',
      padding: '16px',
    }}>
      <div style={{
        fontSize: '48px',
        fontWeight: 500,
        color: token('color.text'),
        lineHeight: 1,
        marginBottom: '4px',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '14px',
        color: token('color.text'),
        marginBottom: '2px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '12px',
        color: token('color.text.subtlest'),
      }}>
        {sublabel}
      </div>
    </div>
  );
}
