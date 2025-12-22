// =====================================================
// TIMELINE SERVICE
// API for Timeline View operations
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { 
  FeatureWithDetails, 
  Priority,
  WorkItemType 
} from '@/types/views';
import { getBatchDependencyCounts } from './dependencyService';

export interface TimelineRelease {
  id: string;
  version: string;
  name: string;
  target_date: string | null;
  features: TimelineFeature[];
  isCollapsed?: boolean;
}

export interface TimelineFeature extends FeatureWithDetails {
  start_date: Date;
  end_date: Date;
  row_index: number;
}

export interface TimelineDependency {
  from_id: string;
  from_type: WorkItemType;
  to_id: string;
  to_type: WorkItemType;
  is_resolved: boolean;
}

export interface TimelineData {
  releases: TimelineRelease[];
  dependencies: TimelineDependency[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

// -----------------------------------------------------
// Get Timeline Data
// -----------------------------------------------------
export async function getTimelineData(projectId: string): Promise<TimelineData> {
  // Get all features with releases
  const { data: features, error } = await supabase
    .from('features')
    .select(`
      id,
      display_id,
      name,
      description,
      workflow_status,
      priority,
      release_id,
      assignee_id,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
      progress_pct,
      releases:release_id (
        id,
        name,
        target_date
      ),
      profiles:assignee_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('planned_start_date', { ascending: true });

  if (error) throw error;

  // Get story counts
  const featureIds = (features || []).map(f => f.id);
  
  let storyCounts: Array<{ feature_id: string; status: string }> = [];
  if (featureIds.length > 0) {
    const { data } = await supabase
      .from('stories')
      .select('feature_id, status')
      .in('feature_id', featureIds);
    storyCounts = data || [];
  }

  // Get dependencies
  let dependencies: Array<{
    blocker_id: string;
    blocker_type: string;
    dependent_id: string;
    dependent_type: string;
    is_resolved: boolean;
  }> = [];
  
  if (featureIds.length > 0) {
    const { data } = await supabase
      .from('work_item_dependencies')
      .select('blocker_id, blocker_type, dependent_id, dependent_type, is_resolved')
      .or(`dependent_id.in.(${featureIds.join(',')}),blocker_id.in.(${featureIds.join(',')})`);
    dependencies = data || [];
  }

  // Get dependency counts
  const depCounts = await getBatchDependencyCounts(
    (features || []).map(f => ({ type: 'feature' as WorkItemType, id: f.id }))
  );

  // Group by release
  const releaseMap = new Map<string, TimelineRelease>();
  const noReleaseFeatures: TimelineFeature[] = [];

  let rowIndex = 0;
  const now = new Date();
  let minDate = now;
  let maxDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months ahead

  for (const feature of features || []) {
    // Calculate dates
    const startDate = feature.actual_start_date 
      ? new Date(feature.actual_start_date)
      : feature.planned_start_date 
        ? new Date(feature.planned_start_date)
        : new Date();
    
    const endDate = feature.actual_end_date
      ? new Date(feature.actual_end_date)
      : feature.planned_end_date
        ? new Date(feature.planned_end_date)
        : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks default

    // Update date range
    if (startDate < minDate) minDate = startDate;
    if (endDate > maxDate) maxDate = endDate;

    // Calculate progress
    const featureStories = storyCounts.filter(s => s.feature_id === feature.id);
    const completedStories = featureStories.filter(
      s => s.status === 'done' || s.status === 'in_production'
    );
    const counts = depCounts.get(`feature:${feature.id}`) || { blocks: 0, blocked_by: 0, total: 0 };

    // Map assignee from profiles
    const assigneeData = feature.profiles as { id: string; full_name: string; avatar_url: string | null } | null;

    const timelineFeature: TimelineFeature = {
      id: feature.id,
      feature_id: feature.display_id || feature.id.slice(0, 8),
      title: feature.name,
      description: feature.description,
      workflow_status: (feature.workflow_status as any) || 'backlog',
      priority: (feature.priority as Priority) || 'medium',
      release_id: feature.release_id,
      release: feature.releases ? {
        id: (feature.releases as any).id,
        version: (feature.releases as any).name,
        name: (feature.releases as any).name,
        target_date: (feature.releases as any).target_date
      } : undefined,
      assignee_id: feature.assignee_id,
      assignee: assigneeData ? {
        id: assigneeData.id,
        full_name: assigneeData.full_name,
        avatar_url: assigneeData.avatar_url
      } : undefined,
      planned_start_date: feature.planned_start_date,
      planned_end_date: feature.planned_end_date,
      actual_start_date: feature.actual_start_date,
      actual_end_date: feature.actual_end_date,
      story_count: featureStories.length,
      completed_story_count: completedStories.length,
      total_story_points: 0,
      completed_story_points: 0,
      dependency_counts: { blocks: counts.blocks, blocked_by: counts.blocked_by },
      progress_percentage: feature.progress_pct 
        ? Number(feature.progress_pct) 
        : (featureStories.length > 0
          ? Math.round((completedStories.length / featureStories.length) * 100)
          : 0),
      start_date: startDate,
      end_date: endDate,
      row_index: rowIndex++
    };

    if (feature.release_id && feature.releases) {
      const release = feature.releases as any;
      if (!releaseMap.has(release.id)) {
        releaseMap.set(release.id, {
          id: release.id,
          version: release.name,
          name: release.name,
          target_date: release.target_date,
          features: [],
          isCollapsed: false
        });
      }
      releaseMap.get(release.id)!.features.push(timelineFeature);
    } else {
      noReleaseFeatures.push(timelineFeature);
    }
  }

  // Sort releases by target date
  const releases = Array.from(releaseMap.values()).sort((a, b) => {
    if (!a.target_date) return 1;
    if (!b.target_date) return -1;
    return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
  });

  // Add unassigned release if there are features without release
  if (noReleaseFeatures.length > 0) {
    releases.push({
      id: 'unassigned',
      version: 'Unassigned',
      name: 'No Release',
      target_date: null,
      features: noReleaseFeatures,
      isCollapsed: false
    });
  }

  // Format dependencies
  const formattedDependencies: TimelineDependency[] = dependencies.map(d => ({
    from_id: d.blocker_id,
    from_type: d.blocker_type as WorkItemType,
    to_id: d.dependent_id,
    to_type: d.dependent_type as WorkItemType,
    is_resolved: d.is_resolved
  }));

  return {
    releases,
    dependencies: formattedDependencies,
    dateRange: {
      start: minDate,
      end: maxDate
    }
  };
}

// -----------------------------------------------------
// Update Feature Dates
// -----------------------------------------------------
export async function updateFeatureDates(
  featureId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  const { error } = await supabase
    .from('features')
    .update({
      planned_start_date: startDate.toISOString().split('T')[0],
      planned_end_date: endDate.toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', featureId);

  if (error) throw error;
}

// -----------------------------------------------------
// Generate Date Headers
// -----------------------------------------------------
export function generateDateHeaders(
  startDate: Date,
  endDate: Date,
  zoom: 'week' | 'month' | 'quarter'
): Array<{
  label: string;
  subLabels: string[];
  width: number;
  date: Date;
}> {
  const headers: Array<{
    label: string;
    subLabels: string[];
    width: number;
    date: Date;
  }> = [];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];

  if (zoom === 'month') {
    // Show months with weeks
    const current = new Date(startDate);
    current.setDate(1);

    while (current <= endDate) {
      const weeksInMonth = getWeeksInMonth(current.getFullYear(), current.getMonth());
      headers.push({
        label: `${fullMonthNames[current.getMonth()]} ${current.getFullYear()}`,
        subLabels: weeksInMonth.map((_, i) => `W${i + 1}`),
        width: weeksInMonth.length * 40,
        date: new Date(current)
      });
      current.setMonth(current.getMonth() + 1);
    }
  } else if (zoom === 'week') {
    // Show weeks with days
    const current = new Date(startDate);
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    while (current <= endDate) {
      headers.push({
        label: `Week of ${monthNames[current.getMonth()]} ${current.getDate()}`,
        subLabels: dayNames,
        width: 7 * 30,
        date: new Date(current)
      });
      current.setDate(current.getDate() + 7);
    }
  } else {
    // Quarter view
    const current = new Date(startDate);
    current.setMonth(Math.floor(current.getMonth() / 3) * 3);
    current.setDate(1);

    while (current <= endDate) {
      const quarter = Math.floor(current.getMonth() / 3) + 1;
      const monthsInQuarter = [0, 1, 2].map(i => 
        monthNames[(current.getMonth() + i) % 12]
      );
      headers.push({
        label: `Q${quarter} ${current.getFullYear()}`,
        subLabels: monthsInQuarter,
        width: 3 * 60,
        date: new Date(current)
      });
      current.setMonth(current.getMonth() + 3);
    }
  }

  return headers;
}

function getWeeksInMonth(year: number, month: number): number[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks: number[] = [];
  
  const current = new Date(firstDay);
  while (current <= lastDay) {
    weeks.push(current.getDate());
    current.setDate(current.getDate() + 7);
  }
  
  return weeks;
}

// -----------------------------------------------------
// Calculate Grid Width
// -----------------------------------------------------
export function calculateGridWidth(
  startDate: Date,
  endDate: Date,
  zoom: 'week' | 'month' | 'quarter'
): number {
  const headers = generateDateHeaders(startDate, endDate, zoom);
  return headers.reduce((sum, h) => sum + h.width, 0);
}
