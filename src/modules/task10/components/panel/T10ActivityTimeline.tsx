import React from 'react';
import { Plus, Check, Edit, ArrowRight, UserPlus, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { useT10Activity } from '../../hooks/useT10Activity';
import { getRelativeTime } from '../../utils';
import type { T10Activity } from '../../types';

interface T10ActivityTimelineProps {
  itemId: string | undefined;
}

const getActivityIcon = (type: T10Activity['type']) => {
  switch (type) {
    case 'created': return <Plus size={16} />;
    case 'completed': return <Check size={16} />;
    case 'updated': return <Edit size={16} />;
    case 'ranked': return <ArrowRight size={16} />;
    case 'assigned': return <UserPlus size={16} />;
    case 'carried': return <RotateCcw size={16} />;
    default: return <Edit size={16} />;
  }
};

export function T10ActivityTimeline({ itemId }: T10ActivityTimelineProps) {
  const { data: activities = [], isLoading, error } = useT10Activity(itemId);

  if (isLoading) {
    return (
      <div className="t10-activity-loading">
        <Loader2 size={24} className="animate-spin" />
        <span>Loading activity...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="t10-activity-error">
        <AlertCircle size={20} />
        <span>Failed to load activity</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="t10-activity-empty">
        <span>No activity recorded yet</span>
      </div>
    );
  }

  return (
    <div className="t10-activity-list">
      {activities.map((activity) => (
        <div key={activity.id} className="t10-activity-item">
          <div className={`t10-activity-icon ${activity.type}`}>
            {getActivityIcon(activity.type)}
          </div>
          <div className="t10-activity-content">
            <div className="t10-activity-text">
              <strong>{activity.actor_name}</strong> {activity.description}
            </div>
            <div className="t10-activity-meta">
              {getRelativeTime(activity.created_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
