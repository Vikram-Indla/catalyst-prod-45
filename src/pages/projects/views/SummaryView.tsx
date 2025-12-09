import React from 'react';
import { token } from '@atlaskit/tokens';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ProjectData } from '../../../types/project.types';
import { useProjectData } from '../../../hooks/useProjectData';

interface SummaryViewProps {
  project: ProjectData;
}

export default function SummaryView({ project }: SummaryViewProps) {
  const { metrics, statusCounts, typeCounts } = useProjectData(project);

  return (
    <div style={{ padding: token('space.300'), overflow: 'auto' }}>
      {/* METRICS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: token('space.200'),
        marginBottom: token('space.300'),
      }}>
        <MetricCard icon="✓" value={metrics.completed} label="completed" sublabel="in the last 7 days" />
        <MetricCard icon="📝" value={metrics.updated} label="updated" sublabel="in the last 7 days" />
        <MetricCard icon="📄" value={metrics.created} label="created" sublabel="in the last 7 days" />
        <MetricCard icon="📅" value={metrics.dueSoon} label="due soon" sublabel="in the next 7 days" />
      </div>

      {/* WIDGETS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: token('space.200'),
      }}>
        <Widget title="Status overview">
          <div style={{ display: 'flex', alignItems: 'center', gap: token('space.300') }}>
            <div style={{ width: '120px', height: '120px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusCounts.map(s => ({ name: s.status, value: s.count, color: s.color }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {statusCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.100') }}>
              {statusCounts.map((status) => (
                <div key={status.status} style={{ display: 'flex', alignItems: 'center', gap: token('space.100') }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    background: status.color,
                  }} />
                  <span style={{ fontSize: '14px', color: token('color.text') }}>
                    {status.status}: {status.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Widget>

        <Widget title="Types of work">
          <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.100') }}>
            {typeCounts.map((type) => (
              <TypeBar key={type.type} label={type.type} percentage={type.percentage} count={type.count} />
            ))}
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
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: token('elevation.surface'),
      border: `1px solid ${token('color.border')}`,
      borderRadius: token('border.radius'),
      padding: token('space.200'),
    }}>
      <h3 style={{
        fontSize: '14px',
        fontWeight: 600,
        color: token('color.text'),
        margin: `0 0 ${token('space.150')} 0`,
      }}>
        {title}
      </h3>
      {children}
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
        height: '20px',
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
        }}>
          {percentage > 15 && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
              {percentage}%
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: '12px', color: token('color.text.subtlest'), width: '30px' }}>
        {count}
      </span>
    </div>
  );
}
