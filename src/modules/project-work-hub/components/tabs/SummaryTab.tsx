import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import { CheckCircle, RefreshCw, Plus, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { useProjectMetrics, useStatusDistribution, usePriorityDistribution, useTypeDistribution } from '../../hooks/useProjectMetrics';
import { WORK_ITEM_TYPE_CONFIG, PRIORITY_CONFIG } from '../../types';

interface SummaryTabProps {
  projectId: string;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ projectId }) => {
  const { data: metrics } = useProjectMetrics(projectId);
  const [includeFeatures, setIncludeFeatures] = useState(false);
  const { data: statusData } = useStatusDistribution(projectId, includeFeatures);
  const { data: priorityData } = usePriorityDistribution(projectId);
  const { data: typeData } = useTypeDistribution(projectId);

  const totalItems = statusData?.reduce((sum, s) => sum + s.count, 0) || 0;

  return (
    <div style={{ 
      padding: token('space.300', '24px'),
      backgroundColor: token('elevation.surface', '#F4F5F7'),
      minHeight: '100%',
    }}>
      {/* Filter Button */}
      <div style={{ marginBottom: token('space.200', '16px') }}>
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: token('space.100', '8px'),
            padding: `${token('space.075', '6px')} ${token('space.150', '12px')}`,
            backgroundColor: token('color.background.neutral', '#F4F5F7'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '3px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <FileText size={16} />
          Filter
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: token('space.200', '16px'),
        marginBottom: token('space.300', '24px'),
      }}>
        <MetricCard
          icon={<CheckCircle size={20} color={token('color.icon.success', '#36B37E')} />}
          value={metrics?.completed || 0}
          label="completed"
          subLabel="in the last 7 days"
        />
        <MetricCard
          icon={<RefreshCw size={20} color={token('color.icon.brand', '#0052CC')} />}
          value={metrics?.updated || 0}
          label="updated"
          subLabel="in the last 7 days"
        />
        <MetricCard
          icon={<Plus size={20} color={token('color.icon.discovery', '#6554C0')} />}
          value={metrics?.created || 0}
          label="created"
          subLabel="in the last 7 days"
        />
        <MetricCard
          icon={<Calendar size={20} color={token('color.icon.warning', '#FF991F')} />}
          value={metrics?.dueSoon || 0}
          label="due soon"
          subLabel="in the next 7 days"
        />
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: token('space.200', '16px'),
        marginBottom: token('space.200', '16px'),
      }}>
        {/* Status Overview */}
        <div style={{
          backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
          borderRadius: '8px',
          padding: token('space.300', '24px'),
          boxShadow: token('elevation.shadow.raised', '0 1px 3px rgba(0,0,0,0.1)'),
        }}>
          <div style={{ marginBottom: token('space.200', '16px') }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: token('color.text', '#172B4D'),
              margin: 0,
            }}>
              Status overview
            </h3>
            <p style={{ 
              fontSize: '14px', 
              color: token('color.text.subtlest', '#5E6C84'),
              margin: `${token('space.050', '4px')} 0 0 0`,
            }}>
              Get a snapshot of the status of your work items.{' '}
              <a href="#" style={{ color: token('color.link', '#0052CC') }}>View all work items</a>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: token('space.400', '32px') }}>
            {/* Donut Chart */}
            <div style={{ position: 'relative', width: 160, height: 160 }}>
              <svg viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                {statusData && renderDonutChart(statusData, 80, 25)}
              </svg>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '28px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
                  {totalItems}
                </div>
                <div style={{ fontSize: '12px', color: token('color.text.subtlest', '#5E6C84') }}>
                  Total work item...
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.100', '8px') }}>
              {statusData?.map((item) => (
                <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
                  <span style={{ 
                    width: 12, 
                    height: 12, 
                    backgroundColor: item.color, 
                    borderRadius: '2px',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>
                    {item.status}: {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* No Activity Panel */}
        <div style={{
          backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
          borderRadius: '8px',
          padding: token('space.300', '24px'),
          boxShadow: token('elevation.shadow.raised', '0 1px 3px rgba(0,0,0,0.1)'),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64,
            height: 64,
            backgroundColor: token('color.background.neutral', '#F4F5F7'),
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: token('space.200', '16px'),
          }}>
            <CheckCircle size={32} color={token('color.icon.brand', '#0052CC')} />
          </div>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: token('color.text', '#172B4D'),
            margin: 0,
          }}>
            No activity yet
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: token('color.text.subtlest', '#5E6C84'),
            margin: `${token('space.100', '8px')} 0 0 0`,
            maxWidth: 280,
          }}>
            Create a few work items and invite some teammates to your space to see your space activity.
          </p>
        </div>
      </div>

      {/* Priority & Types Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: token('space.200', '16px'),
      }}>
        {/* Priority Breakdown */}
        <div style={{
          backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
          borderRadius: '8px',
          padding: token('space.300', '24px'),
          boxShadow: token('elevation.shadow.raised', '0 1px 3px rgba(0,0,0,0.1)'),
        }}>
          <div style={{ marginBottom: token('space.200', '16px') }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: token('color.text', '#172B4D'),
              margin: 0,
            }}>
              Priority breakdown
            </h3>
            <p style={{ 
              fontSize: '14px', 
              color: token('color.text.subtlest', '#5E6C84'),
              margin: `${token('space.050', '4px')} 0 0 0`,
            }}>
              Get a holistic view of how work is being prioritized.{' '}
              <a href="#" style={{ color: token('color.link', '#0052CC') }}>How to manage priorities for spaces</a>
            </p>
          </div>

          <div style={{ height: 180 }}>
            {priorityData && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: token('space.200', '16px'), height: '100%', paddingTop: token('space.200', '16px') }}>
                {priorityData.map((item) => {
                  const maxCount = Math.max(...priorityData.map(p => p.count));
                  const heightPct = (item.count / maxCount) * 100;
                  return (
                    <div key={item.priority} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ 
                        width: '100%', 
                        height: `${heightPct}%`,
                        minHeight: 4,
                        backgroundColor: PRIORITY_CONFIG[item.priority].color,
                        borderRadius: '2px 2px 0 0',
                      }} />
                      <div style={{ 
                        fontSize: '11px', 
                        color: token('color.text.subtlest', '#5E6C84'),
                        marginTop: token('space.100', '8px'),
                        textAlign: 'center',
                      }}>
                        {PRIORITY_CONFIG[item.priority].label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Types of Work */}
        <div style={{
          backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
          borderRadius: '8px',
          padding: token('space.300', '24px'),
          boxShadow: token('elevation.shadow.raised', '0 1px 3px rgba(0,0,0,0.1)'),
        }}>
          <div style={{ marginBottom: token('space.200', '16px') }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: token('color.text', '#172B4D'),
              margin: 0,
            }}>
              Types of work
            </h3>
            <p style={{ 
              fontSize: '14px', 
              color: token('color.text.subtlest', '#5E6C84'),
              margin: `${token('space.050', '4px')} 0 0 0`,
            }}>
              Get a breakdown of work items by their types.{' '}
              <a href="#" style={{ color: token('color.link', '#0052CC') }}>View all items</a>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.150', '12px') }}>
            {typeData?.map((item) => (
              <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: token('space.150', '12px') }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: token('space.100', '8px'),
                  width: 140,
                  flexShrink: 0,
                }}>
                  <span style={{ color: WORK_ITEM_TYPE_CONFIG[item.type].color }}>●</span>
                  <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>
                    {WORK_ITEM_TYPE_CONFIG[item.type].label}
                  </span>
                </div>
                <div style={{ 
                  flex: 1, 
                  height: 20, 
                  backgroundColor: token('color.background.neutral', '#DFE1E6'),
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${item.percentage}%`,
                    height: '100%',
                    backgroundColor: token('color.background.brand.bold', '#0052CC'),
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: token('space.100', '8px'),
                  }}>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: token('color.text.inverse', '#FFFFFF'),
                    }}>
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  icon: React.ReactNode;
  value: number;
  label: string;
  subLabel: string;
}> = ({ icon, value, label, subLabel }) => (
  <div style={{
    backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
    borderRadius: '8px',
    padding: token('space.200', '16px'),
    boxShadow: token('elevation.shadow.raised', '0 1px 3px rgba(0,0,0,0.1)'),
    display: 'flex',
    alignItems: 'flex-start',
    gap: token('space.150', '12px'),
  }}>
    <div style={{
      width: 40,
      height: 40,
      backgroundColor: token('color.background.neutral', '#F4F5F7'),
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {icon}
    </div>
    <div>
      <div style={{ 
        fontSize: '24px', 
        fontWeight: 600, 
        color: token('color.text', '#172B4D'),
        lineHeight: 1.2,
      }}>
        {value} <span style={{ fontSize: '14px', fontWeight: 400 }}>{label}</span>
      </div>
      <div style={{ 
        fontSize: '12px', 
        color: token('color.text.subtlest', '#5E6C84'),
      }}>
        {subLabel}
      </div>
    </div>
  </div>
);

// Helper to render donut chart
function renderDonutChart(data: { status: string; count: number; color: string }[], radius: number, strokeWidth: number) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return data.map((segment, index) => {
    const segmentLength = (segment.count / total) * circumference;
    const dashArray = `${segmentLength} ${circumference - segmentLength}`;
    const strokeDashoffset = -offset;
    offset += segmentLength;

    return (
      <circle
        key={segment.status}
        cx={80}
        cy={80}
        r={radius}
        fill="none"
        stroke={segment.color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.3s' }}
      />
    );
  });
}
