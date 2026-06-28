import React from 'react';
import type { ProductMilestoneWithProgress } from '@/types/product-milestone';

export interface MilestoneCardProps {
  milestone: ProductMilestoneWithProgress;
  onClick?: (milestoneId: string) => void;
  onEdit?: (milestoneId: string) => void;
  onDelete?: (milestoneId: string) => void;
}

export function MilestoneCard({
  milestone,
  onClick,
  onEdit,
  onDelete,
}: MilestoneCardProps) {
  const healthColor = {
    on_track: 'bg-green-50 border-green-200',
    at_risk: 'bg-yellow-50 border-yellow-200',
    off_track: 'bg-red-50 border-red-200',
  };

  const healthTextColor = {
    on_track: 'text-green-800',
    at_risk: 'text-yellow-800',
    off_track: 'text-red-800',
  };

  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
        healthColor[milestone.healthStatus]
      }`}
      onClick={() => onClick?.(milestone.id)}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">{milestone.title}</h3>
          <p className="text-xs text-gray-500">{milestone.key}</p>
        </div>
        <span className="px-2 py-1 bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded text-xs font-medium">
          {milestone.quarter}
        </span>
      </div>

      <div className="text-xs text-gray-600 mb-3">
        {milestone.startDate ? new Date(milestone.startDate).toLocaleDateString() : 'TBD'} →{' '}
        {new Date(milestone.targetDate).toLocaleDateString()}
      </div>

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium">Progress</span>
          <span className="text-xs text-gray-600">{milestone.progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{ width: `${milestone.progressPercent}%` }}
          />
        </div>
      </div>

      <div className={`text-xs font-medium mb-2 ${healthTextColor[milestone.healthStatus]}`}>
        {milestone.healthStatus.replace('_', ' ').toUpperCase()}
      </div>

      <div className="text-xs text-gray-600 mb-3 space-y-1">
        <p>{milestone.linkedBRCount} Business Requests</p>
        <p>{milestone.linkedFeatures.length} Features</p>
      </div>

      <div className="flex gap-2">
        <button
          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(milestone.id);
          }}
        >
          Edit
        </button>
        <button
          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-red-600"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(milestone.id);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
