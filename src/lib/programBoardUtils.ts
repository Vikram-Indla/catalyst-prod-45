/**
 * Program Board Utilities
 * Status color-coding logic from Jira Align specification
 * Source: help.jiraalign.com-Program board.pdf pages 9-11
 */

// No imports needed - returns string identifiers for icons

/**
 * Get feature status color based on exact Jira Align rules
 * 
 * Rules (in priority order):
 * - Black: Orphan (no child stories)
 * - Green: Done 
 * - Red: Blocked
 * - Orange: Planning issues
 * - Yellow: Risks apply
 * - Blue: Implementing
 * - Gray: Not started
 */
export function getFeatureStatusColor(feature: any): string {
  // Black: Orphan status (no child stories)
  if (feature.is_orphan_on_board) {
    return 'border-l-gray-900 bg-gray-900/10';
  }
  
  // Green: Done
  if (feature.status === 'done') {
    return 'border-l-green-600 bg-green-600/10';
  }
  
  // Red: Blocked
  if (feature.blocked || feature.status === 'blocked') {
    return 'border-l-red-600 bg-red-600/10';
  }
  
  // Orange: Planning issues (funnel/analyzing states indicate planning phase)
  if (feature.status === 'funnel' || feature.status === 'analyzing') {
    return 'border-l-orange-500 bg-orange-500/10';
  }
  
  // Yellow: Risks apply
  if (feature.health === 'yellow' || feature.health === 'red') {
    return 'border-l-yellow-500 bg-yellow-500/10';
  }
  
  // Blue: Implementing
  if (feature.status === 'implementing') {
    return 'border-l-blue-600 bg-blue-600/10';
  }
  
  // Gray: Not started (backlog state)
  return 'border-l-gray-400 bg-gray-400/10';
}

/**
 * Get dependency status color based on Jira Align rules
 */
export function getDependencyStatusColor(dependency: any): string {
  // Green: Done (marked Done, or committed + sprint not ended + all stories accepted)
  if (
    dependency.status === 'done' ||
    (dependency.committed && !dependency.committed_sprint_ended && dependency.all_stories_accepted)
  ) {
    return 'bg-green-600 text-white border-green-600';
  }
  
  // Red: Blocked
  if (
    dependency.blocked ||
    (!dependency.committed && dependency.pi_in_progress) ||
    (dependency.committed && dependency.committed_sprint_ended)
  ) {
    return 'bg-red-600 text-white border-red-600';
  }
  
  // Orange: Planning issues
  if (
    !dependency.requested_in ||
    !dependency.committed_in ||
    !dependency.has_stories ||
    (!dependency.committed && !dependency.pi_begun) ||
    dependency.rejected
  ) {
    return 'bg-orange-500 text-white border-orange-500';
  }
  
  return 'bg-gray-400 text-white border-gray-400';
}

/**
 * Get objective/milestone status color
 */
export function getObjectiveStatusColor(objective: any): string {
  const status = objective.status?.toLowerCase();
  
  // Green: Completed
  if (status === 'completed') {
    return 'bg-green-600 text-white border-green-600';
  }
  
  // Brown: Cancelled
  if (status === 'cancelled') {
    return 'bg-amber-800 text-white border-amber-800';
  }
  
  // Red: Blocked/Missed or has blocking conditions
  if (
    status === 'blocked' ||
    status === 'missed' ||
    objective.has_open_impediment ||
    objective.has_red_dependency ||
    objective.has_blocked_feature
  ) {
    return 'bg-red-600 text-white border-red-600';
  }
  
  // Yellow: Has risks
  if (objective.has_open_risk) {
    return 'bg-yellow-500 text-black border-yellow-500';
  }
  
  // Orange: Paused
  if (status === 'paused') {
    return 'bg-orange-500 text-white border-orange-500';
  }
  
  // Blue: In Progress/On Track
  if (status === 'in_progress' || status === 'on_track') {
    return 'bg-blue-600 text-white border-blue-600';
  }
  
  // Gray: Pending
  return 'bg-gray-400 text-white border-gray-400';
}

/**
 * Get appropriate symbol icon name for item type
 * Shapes per PDF:
 * - Hexagon: Objective
 * - Rectangle: Feature
 * - Rectangle with highlight: Split feature parent/child
 * - Bowtie: Dependency
 * - Diamond: Milestone
 */
export function getItemSymbol(
  type: 'feature' | 'dependency' | 'objective' | 'milestone',
  item: any
): string {
  if (type === 'objective') {
    return 'hexagon';
  }
  
  if (type === 'feature') {
    if (item.is_split_parent) {
      return 'square-split-right';
    }
    if (item.is_split_child) {
      return 'square-split-left';
    }
    return 'square';
  }
  
  if (type === 'dependency') {
    return 'circle';
  }
  
  if (type === 'milestone') {
    return 'diamond';
  }
  
  return 'square';
}

/**
 * Check if feature has planning issues
 */
export function hasFeaturePlanningIssues(feature: any): boolean {
  return !!(
    feature.has_unassigned_story ||
    feature.has_story_not_in_sprint ||
    feature.has_conflict_dependencies
  );
}

/**
 * Get planning issues description
 */
export function getPlanningIssuesDescription(feature: any): string[] {
  const issues: string[] = [];
  
  if (feature.has_unassigned_story) {
    issues.push('At least one child story is not assigned to any team');
  }
  
  if (feature.has_story_not_in_sprint) {
    issues.push('One or more stories not assigned to any sprint');
  }
  
  if (feature.has_conflict_dependencies) {
    issues.push('There are conflict dependencies with this feature');
  }
  
  if (feature.has_blocked_story) {
    issues.push('At least one child story is blocked by an open impediment');
  }
  
  if (feature.sprint_dates_past) {
    issues.push('Sprint dates are in the past');
  }
  
  return issues;
}
