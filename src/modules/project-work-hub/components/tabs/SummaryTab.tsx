import React, { useState } from 'react';
import { CheckCircle, RefreshCw, Plus, Calendar, FileText } from 'lucide-react';
import { useProjectMetrics, useStatusDistribution, usePriorityDistribution, useTypeDistribution } from '../../hooks/useProjectMetrics';
import { WORK_ITEM_TYPE_CONFIG, PRIORITY_CONFIG } from '../../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
    <div className="p-6 bg-muted/30 min-h-full">
      {/* Filter Button */}
      <div className="mb-4">
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          value={metrics?.completed || 0}
          label="completed"
          subLabel="in the last 7 days"
        />
        <MetricCard
          icon={<RefreshCw className="h-5 w-5 text-primary" />}
          value={metrics?.updated || 0}
          label="updated"
          subLabel="in the last 7 days"
        />
        <MetricCard
          icon={<Plus className="h-5 w-5 text-purple-500" />}
          value={metrics?.created || 0}
          label="created"
          subLabel="in the last 7 days"
        />
        <MetricCard
          icon={<Calendar className="h-5 w-5 text-amber-500" />}
          value={metrics?.dueSoon || 0}
          label="due soon"
          subLabel="in the next 7 days"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Status Overview */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Status overview
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get a snapshot of the status of your work items.{' '}
              <a href="#" className="text-primary hover:underline">View all work items</a>
            </p>
          </div>

          <div className="flex items-center gap-8">
            {/* Donut Chart */}
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 160 160" className="-rotate-90">
                {statusData && renderDonutChart(statusData, 80, 25)}
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-2xl font-semibold text-foreground">
                  {totalItems}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total work item...
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2">
              {statusData?.map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-foreground">
                    {item.status}: {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* No Activity Panel */}
        <Card className="p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            No activity yet
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-[280px]">
            Create a few work items and invite some teammates to your space to see your space activity.
          </p>
        </Card>
      </div>

      {/* Priority & Types Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Priority Breakdown */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Priority breakdown
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get a holistic view of how work is being prioritized.{' '}
              <a href="#" className="text-primary hover:underline">How to manage priorities for spaces</a>
            </p>
          </div>

          <div className="h-44">
            {priorityData && (
              <div className="flex items-end gap-4 h-full pt-4">
                {priorityData.map((item) => {
                  const maxCount = Math.max(...priorityData.map(p => p.count));
                  const heightPct = (item.count / maxCount) * 100;
                  return (
                    <div key={item.priority} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full rounded-t-sm"
                        style={{ 
                          height: `${heightPct}%`,
                          minHeight: 4,
                          backgroundColor: PRIORITY_CONFIG[item.priority].color,
                        }} 
                      />
                      <div className="text-[11px] text-muted-foreground mt-2 text-center">
                        {PRIORITY_CONFIG[item.priority].label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Types of Work */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Types of work
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get a breakdown of work items by their types.{' '}
              <a href="#" className="text-primary hover:underline">View all items</a>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {typeData?.map((item) => (
              <div key={item.type} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-36 flex-shrink-0">
                  <span style={{ color: WORK_ITEM_TYPE_CONFIG[item.type].color }}>●</span>
                  <span className="text-sm text-foreground">
                    {WORK_ITEM_TYPE_CONFIG[item.type].label}
                  </span>
                </div>
                <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                  <div 
                    className="h-full bg-primary flex items-center pl-2"
                    style={{ width: `${item.percentage}%` }}
                  >
                    <span className="text-xs font-semibold text-primary-foreground">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
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
  <Card className="p-4 flex items-start gap-3">
    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
      {icon}
    </div>
    <div>
      <div className="text-2xl font-semibold text-foreground leading-tight">
        {value} <span className="text-sm font-normal">{label}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {subLabel}
      </div>
    </div>
  </Card>
);

// Helper to render donut chart
function renderDonutChart(data: { status: string; count: number; color: string }[], radius: number, strokeWidth: number) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return data.map((segment) => {
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
        className="transition-all duration-300"
      />
    );
  });
}
