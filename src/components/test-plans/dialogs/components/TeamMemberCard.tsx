/**
 * TeamMemberCard - Team member selection card with capacity visualization
 * GOD-TIER 9.8 Implementation
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TeamMemberOption } from '../CreateEditTestPlanDialog.types';
import { Avatar } from '@/components/ads';
import { Check, Minus } from 'lucide-react';

interface TeamMemberCardProps {
  member: TeamMemberOption;
  isSelected: boolean;
  isOwner?: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function TeamMemberCard({ 
  member, 
  isSelected, 
  isOwner = false,
  onToggle,
  disabled = false 
}: TeamMemberCardProps) {
  const getCapacityColor = () => {
    if (member.capacity_percent >= 70) return 'bg-destructive';
    if (member.capacity_percent >= 40) return 'bg-warning';
    return 'bg-success';
  };

  const getCapacityBgColor = () => {
    if (member.capacity_percent >= 70) return 'bg-destructive/20';
    if (member.capacity_percent >= 40) return 'bg-warning/20';
    return 'bg-success/20';
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || !member.is_available}
      className={cn(
        'w-full p-3 rounded-lg border text-left transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isSelected 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : 'border-border bg-card hover:border-primary/50',
        (disabled || !member.is_available) && 'opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none',
        isOwner && isSelected && 'bg-gradient-to-r from-primary/10 to-primary/5'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with availability indicator */}
        <span className="inline-block rounded-full border-2 border-background shadow-sm">
          <Avatar
            src={member.avatar_url}
            name={member.name}
            size="medium"
            presence={member.is_available ? 'online' : 'offline'}
          />
        </span>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground truncate">
              {member.name}
            </span>
            {isOwner && (
              <span className="text-[9px] uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                Owner
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {member.role}
            {member.specialty && ` • ${member.specialty}`}
          </p>
          
          {/* Capacity bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Capacity
              </span>
              <span className="text-[10px] font-bold tabular-nums text-foreground">
                {member.capacity_percent}%
              </span>
            </div>
            <div className={cn('h-1.5 rounded-full overflow-hidden', getCapacityBgColor())}>
              <div 
                className={cn('h-full rounded-full transition-all duration-500', getCapacityColor())}
                style={{ width: `${Math.min(member.capacity_percent, 100)}%` }}
              />
            </div>
          </div>

          {/* Active plans count */}
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {member.active_plans_count} active plan{member.active_plans_count !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Selection indicator */}
        <div 
          className={cn(
            'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
            isSelected 
              ? 'bg-primary border-primary text-primary-foreground' 
              : 'border-muted-foreground/30'
          )}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </div>
      </div>
    </button>
  );
}
