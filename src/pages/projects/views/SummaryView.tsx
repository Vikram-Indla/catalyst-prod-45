import React from 'react';
import { token } from '@atlaskit/tokens';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { ProjectData } from '../../../types/project.types';
import { useProjectData } from '../../../hooks/useProjectData';

interface SummaryViewProps {
  project: ProjectData;
}

export default function SummaryView({ project }: SummaryViewProps) {
  const { metrics, statusCounts, priorityCounts, typeCounts, totalItems } = useProjectData(project);

  return (
    <div style={{
      padding: token('space.300'),
      overflowY: 'auto',
      height: 'calc(100vh - 200px)',
    }}>
      {/* METRICS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: token('space.200'),
        marginBottom: token('space.300'),
      }}>
        <MetricCard
          icon="✓"
          value={metrics.completed}
          label="completed"
          sublabel="in the last 7 days"
        />
        <MetricCard
          icon="✏️"
          value={metrics.updated}
          label="updated"
          sublabel="in the last 7 days"
        />
        <MetricCard
          icon="📄"
          value={metrics.created}
          label="created"
          sublabel="in the last 7 days"
        />
        <MetricCard
          icon="📅"
          value={metrics.dueSoon}
          label="due soon"
          sublabel="in the next 7 days"
        />
      </div>

      {/* WIDGETS - 2 COLUMNS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: token('space.200'),
      }}>
        {/* STATUS OVERVIEW */}
        <Widget
          title="Status overview"
          description="Get a snapshot of the status of your work items."
          link="View all work items"
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '40px',
            padding: '20px 0',
            minHeight: '200px',
          }}>
            <div style={{ position: 'relative', width: '160px', height: '160px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusCounts.map(s => ({ name: s.status, value: s.count, color: s.color }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {statusCounts.map((entry, index) => (
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
                <div style={{ fontSize: '24px', fontWeight: 600, color: token('color.text') }}>{totalItems}</div>
                <div style={{ fontSize: '12px', color: token('color.text.subtlest') }}>Total</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.150') }}>
              {statusCounts.map((status) => (
                <div key={status.status} style={{ display: 'flex', alignItems: 'center', gap: token('space.100') }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    background: status.color,
                  }} />
                  <span style={{ fontSize: '14px', color: token('color.text'), minWidth: '80px' }}>
                    {status.status}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: token('color.text') }}>
                    {status.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Widget>

        {/* TYPES OF WORK */}
        <Widget
          title="Types of work"
          description="Break down of work items by type."
        >
          <div style={{ padding: '20px 0', minHeight: '200px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.150') }}>
              {typeCounts.map((type) => (
                <TypeBar key={type.type} label={type.type} percentage={type.percentage} count={type.count} />
              ))}
            </div>
          </div>
        </Widget>

        {/* PRIORITY BREAKDOWN */}
        <Widget
          title="Priority breakdown"
          description="Distribution of work items by priority level."
        >
          <div style={{ padding: '20px 0', minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={priorityCounts} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="priority" width={60} tick={{ fontSize: 12 }} />
                <Bar dataKey="count" fill={token('color.chart.blue.bold')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Widget>

        {/* TEAM ACTIVITY */}
        <Widget
          title="Team activity"
          description="Recent activity across team members."
        >
          <div style={{
            padding: '20px 0',
            minHeight: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '14px', color: token('color.text.subtlest') }}>
              Activity data will appear here
            </span>
          </div>
        </Widget>
      </div>
    </div>
  );
}

function MetricCard({ icon, value, label, sublabel }: { icon: string; value: number; label: string; sublabel: string }) {
  return (
    <div style={{
      background: token('elevation.surface'),
      border: `1px solid ${token('color.border')}`,
      borderRadius: token('border.radius'),
      padding: token('space.200'),
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: token('space.150') }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <div>
          <div style={{
            fontSize: '24px',
            fontWeight: 500,
            color: token('color.text'),
            marginBottom: token('space.050'),
          }}>
            {value}
          </div>
          <div style={{
            fontSize: '14px',
            color: token('color.text'),
            marginBottom: token('space.050'),
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
      </div>
    </div>
  );
}

function Widget({ title, description, link, children }: { title: string; description?: string; link?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: token('elevation.surface'),
      border: `1px solid ${token('color.border')}`,
      borderRadius: token('border.radius'),
      padding: token('space.200'),
    }}>
      <div style={{ marginBottom: token('space.100') }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: token('color.text'),
          margin: 0,
        }}>
          {title}
        </h3>
        {description && (
          <p style={{
            fontSize: '12px',
            color: token('color.text.subtlest'),
            margin: `${token('space.050')} 0 0 0`,
          }}>
            {description}
          </p>
        )}
      </div>
      {children}
      {link && (
        <div style={{ marginTop: token('space.150') }}>
          <a href="#" style={{
            fontSize: '14px',
            color: token('color.link'),
            textDecoration: 'none',
          }}>
            {link} →
          </a>
        </div>
      )}
    </div>
  );
}

function TypeBar({ label, percentage, count }: { label: string; percentage: number; count: number }) {
  const colors: Record<string, string> = {
    Feature: '#6554C0',
    Story: '#00875A',
    Subtask: '#0052CC',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100') }}>
      <span style={{ fontSize: '14px', width: '70px', color: token('color.text') }}>{label}</span>
      <div style={{
        flex: 1,
        height: '24px',
        background: token('color.background.neutral'),
        borderRadius: token('border.radius'),
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: colors[label] || token('color.background.discovery'),
          display: 'flex',
          alignItems: 'center',
          paddingLeft: token('space.100'),
          transition: 'width 0.3s ease',
        }}>
          {percentage > 15 && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
              {percentage}%
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: '12px', color: token('color.text.subtlest'), width: '30px', textAlign: 'right' }}>
        {count}
      </span>
    </div>
  );
}
