/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Variant E: Swimlane View - Epic lanes with feature card grids
 * Matches prototype structure: Epic → Feature Cards → Story Rows
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, HealthStatus } from '../types';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Square, Gem, FileText, User } from 'lucide-react';

interface SwimlaneViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
}

/* ══════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ══════════════════════════════════════════════════════════ */

function getHealthDotClass(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'bg-[var(--status-success)]';
    case 'At Risk': return 'bg-[var(--status-warning)]';
    case 'Blocked': return 'bg-[var(--status-danger)]';
    default: return 'bg-[var(--text-muted)]';
  }
}

function getHealthBadgeClass(health: HealthStatus): string {
  switch (health) {
    case 'On Track': 
      return 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border,var(--status-success-bg))]';
    case 'At Risk': 
      return 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border,var(--status-warning-bg))]';
    case 'Blocked': 
      return 'bg-[var(--status-danger-bg)] text-[var(--status-danger)] border-[var(--status-danger-border,var(--status-danger-bg))]';
    default: 
      return 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)]';
  }
}

function getProgressBarClass(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'bg-[var(--status-success)]';
    case 'At Risk': return 'bg-[var(--status-warning)]';
    case 'Blocked': return 'bg-[var(--status-danger)]';
    default: return 'bg-[var(--brand-primary)]';
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Done':
      return 'bg-[var(--status-success-bg)] text-[var(--status-success)]';
    case 'In Progress':
      return 'bg-[var(--status-info-bg)] text-[var(--status-info)]';
    case 'Blocked':
      return 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]';
    default:
      return 'bg-[var(--surface-subtle)] text-[var(--text-muted)]';
  }
}

/* ══════════════════════════════════════════════════════════
   STORY ROW COMPONENT
   ══════════════════════════════════════════════════════════ */

interface StoryRowProps {
  story: WorkItem;
  onItemClick: (item: WorkItem) => void;
}

function StoryRow({ story, onItemClick }: StoryRowProps) {
  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 hover:bg-[var(--row-hover)] cursor-pointer transition-colors border-t border-[var(--border-subtle)]"
      onClick={(e) => {
        e.stopPropagation();
        onItemClick(story);
      }}
    >
      <FileText className="h-3 w-3 text-[var(--text-muted)] flex-shrink-0" />
      <span className="font-mono text-[10px] text-[var(--text-muted)] flex-shrink-0">{story.key}</span>
      <span className="text-xs text-[var(--text-primary)] flex-1 truncate">{story.title}</span>
      
      {/* Status chip */}
      <span className={cn(
        "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
        getStatusBadgeClass(story.status)
      )}>
        {story.status}
      </span>
      
      {/* Assignee avatar */}
      {story.ownerInitials && (
        <div className="h-5 w-5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-medium text-[var(--text-secondary)]">{story.ownerInitials}</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FEATURE CARD COMPONENT
   ══════════════════════════════════════════════════════════ */

interface FeatureCardProps {
  feature: WorkItem;
  onItemClick: (item: WorkItem) => void;
}

function FeatureCard({ feature, onItemClick }: FeatureCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const storyCount = feature.children?.length || 0;
  const doneCount = feature.children?.filter(s => s.status === 'Done').length || 0;

  return (
    <div 
      className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
    >
      {/* Feature Header */}
      <div 
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[var(--row-hover)] transition-colors"
        onClick={() => onItemClick(feature)}
      >
        {/* Expand/Collapse */}
        {storyCount > 0 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="p-0.5 hover:bg-[var(--surface-hover)] rounded flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
          </button>
        )}
        
        {/* Type icon */}
        <Gem className="h-3.5 w-3.5 text-[var(--brand-gold)] flex-shrink-0" />
        
        {/* Key */}
        <span className="font-mono text-[10px] text-[var(--text-muted)] flex-shrink-0">{feature.key}</span>
        
        {/* Title */}
        <span className="text-xs font-medium text-[var(--text-primary)] flex-1 truncate">{feature.title}</span>
        
        {/* Health dot */}
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", getHealthDotClass(feature.health))} />
      </div>

      {/* Feature Metrics Bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-[var(--surface-subtle)] border-t border-[var(--border-subtle)]">
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 flex-1">
          <div className="flex-1 h-1 bg-[var(--progress-bg)] rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all", getProgressBarClass(feature.health))}
              style={{ width: `${feature.progress}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-[var(--text-secondary)] tabular-nums w-7 text-right">
            {feature.progress}%
          </span>
        </div>
        
        {/* Story count */}
        <span className="text-[10px] text-[var(--text-muted)]">
          {doneCount}/{storyCount} stories
        </span>
        
        {/* Assignee */}
        {feature.ownerInitials && (
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-[var(--secondary-bronze)] to-[var(--brand-primary)] text-white flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-semibold">{feature.ownerInitials}</span>
          </div>
        )}
      </div>

      {/* Story Rows */}
      {isExpanded && storyCount > 0 && (
        <div className="border-t border-[var(--border-default)]">
          {feature.children!.map(story => (
            <StoryRow key={story.id} story={story} onItemClick={onItemClick} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   EPIC LANE COMPONENT
   ══════════════════════════════════════════════════════════ */

interface EpicLaneProps {
  epic: WorkItem;
  onItemClick: (item: WorkItem) => void;
}

function EpicLane({ epic, onItemClick }: EpicLaneProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Compute metrics
  const featureCount = epic.children?.length || 0;
  const storyCount = epic.children?.reduce((sum, f) => sum + (f.children?.length || 0), 0) || 0;
  const onTrackCount = epic.children?.filter(f => f.health === 'On Track').length || 0;
  const atRiskCount = epic.children?.filter(f => f.health === 'At Risk').length || 0;
  const blockedCount = epic.children?.filter(f => f.health === 'Blocked').length || 0;

  return (
    <div className="rounded-lg border border-[var(--border-default)] overflow-hidden bg-[var(--surface-bg)]">
      {/* Epic Header Bar */}
      <div 
        className="flex items-center gap-3 px-4 py-3 bg-[var(--surface-tinted)] cursor-pointer hover:bg-[var(--surface-hover)] transition-colors border-b border-[var(--border-subtle)]"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {/* Expand/Collapse */}
        <button className="p-0.5 flex-shrink-0">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
          )}
        </button>

        {/* Type icon */}
        <Square className="h-4 w-4 text-[var(--brand-primary)] flex-shrink-0" />

        {/* Key */}
        <span className="font-mono text-xs text-[var(--text-muted)] flex-shrink-0">{epic.key}</span>

        {/* Title */}
        <span 
          className="text-sm font-semibold text-[var(--text-primary)] flex-1 truncate cursor-pointer hover:underline"
          onClick={(e) => { e.stopPropagation(); onItemClick(epic); }}
        >
          {epic.title}
        </span>

        {/* Health badge */}
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
          getHealthBadgeClass(epic.health)
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", getHealthDotClass(epic.health))} />
          {epic.health}
        </span>

        {/* Progress */}
        <div className="flex items-center gap-1.5 min-w-[80px]">
          <div className="flex-1 h-1.5 bg-[var(--progress-bg)] rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all", getProgressBarClass(epic.health))}
              style={{ width: `${epic.progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums w-8 text-right">
            {epic.progress}%
          </span>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] flex-shrink-0">
          <span className="flex items-center gap-1">
            <Gem className="h-3 w-3 text-[var(--brand-gold)]" />
            <span className="font-medium text-[var(--text-secondary)]">{featureCount}</span>
            <span>features</span>
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-[var(--text-muted)]" />
            <span className="font-medium text-[var(--text-secondary)]">{storyCount}</span>
            <span>stories</span>
          </span>
        </div>

        {/* Health summary dots */}
        <div className="flex items-center gap-3 text-[10px] flex-shrink-0">
          {onTrackCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" />
              <span className="text-[var(--status-success)] font-medium">{onTrackCount}</span>
            </span>
          )}
          {atRiskCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-warning)]" />
              <span className="text-[var(--status-warning)] font-medium">{atRiskCount}</span>
            </span>
          )}
          {blockedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-danger)]" />
              <span className="text-[var(--status-danger)] font-medium">{blockedCount}</span>
            </span>
          )}
        </div>

        {/* Epic Owner */}
        {epic.ownerInitials && (
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--secondary-bronze)] to-[var(--brand-primary)] text-white flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold">{epic.ownerInitials}</span>
          </div>
        )}
      </div>

      {/* Feature Cards Grid */}
      {!isCollapsed && featureCount > 0 && (
        <div className="p-4 bg-[var(--surface-subtle)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {epic.children!.map(feature => (
              <FeatureCard key={feature.id} feature={feature} onItemClick={onItemClick} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isCollapsed && featureCount === 0 && (
        <div className="p-6 text-center text-[var(--text-muted)] text-sm bg-[var(--surface-subtle)]">
          No features in this epic
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN SWIMLANE VIEW COMPONENT
   ══════════════════════════════════════════════════════════ */

export function SwimlaneView({ items, onItemClick }: SwimlaneViewProps) {
  // Filter to only epics (they contain the hierarchy)
  const epics = useMemo(() => {
    return items.filter(item => item.type === 'epic');
  }, [items]);

  if (epics.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-[var(--text-muted)]">
          <Square className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No epics to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto p-4 gap-4">
      {epics.map(epic => (
        <EpicLane key={epic.id} epic={epic} onItemClick={onItemClick} />
      ))}
    </div>
  );
}
