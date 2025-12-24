// src/hooks/useHomeData.ts
// Mode-specific query hooks for the Home ("For You") page
// Each mode queries different backend services based on domain context

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { HomeRoleMode } from '@/components/ja/home/HomeRoleModeSelector';
import type { WorkItemType } from '@/components/ja/icons/WorkItemTypeIcon';

// ============================================
// SHARED TYPES
// ============================================
export interface HomeWorkItem {
  id: string;
  key: string;
  summary: string;
  project: string;
  projectKey: string;
  status: string;
  type: WorkItemType;
  assignee: string | null;
  activityDate: Date;
  activityType: 'Updated' | 'Created';
  priority?: string;
  severity?: string;
}

export interface HomeCriticalCounts {
  majorIncidents: { open: number; breached: number; atRisk: number };
  slaAtRisk: number;
  awaitingMe: number;
  blocked: number;
  myWorkload: { incidents: number; workItems: number };
}

export interface HomeProject {
  id: string;
  key: string;
  name: string;
  color: string;
  openCount: number;
  doneCount: number;
  hasUrgency: boolean;
}

// ============================================
// OPERATIONS MODE HOOK
// Data source: Incident Management + Release Management
// ============================================
export function useHomeOperationsData() {
  // Fetch incidents for operations mode
  const incidentsQuery = useQuery({
    queryKey: ['home-operations-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          incident_key,
          title,
          status,
          severity,
          support_level,
          is_major_incident,
          assignee_id,
          created_at,
          updated_at,
          project:projects!incidents_project_id_fkey(id, name, key)
        `)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  // Fetch SLA records separately
  const slaQuery = useQuery({
    queryKey: ['home-operations-sla'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_records')
        .select('incident_id, response_breached, resolution_breached, response_due_at, resolution_due_at');

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  // Fetch releases for operations mode
  const releasesQuery = useQuery({
    queryKey: ['home-operations-releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .in('status', ['planned', 'ready'])
        .order('target_date', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  // Create SLA lookup map
  const slaMap = new Map<string, typeof slaQuery.data extends (infer T)[] ? T : never>();
  (slaQuery.data || []).forEach(sla => {
    slaMap.set(sla.incident_id, sla);
  });

  // Transform incidents to work items
  const workItems: HomeWorkItem[] = (incidentsQuery.data || []).map(incident => ({
    id: incident.id,
    key: incident.incident_key || `INC-${incident.id.slice(0, 6)}`,
    summary: incident.title,
    project: incident.project?.name || 'Unknown Project',
    projectKey: incident.project?.key || 'UNK',
    status: incident.status,
    type: 'defect' as WorkItemType, // Incidents show as defect type icon
    assignee: incident.assignee_id,
    activityDate: new Date(incident.updated_at || incident.created_at),
    activityType: 'Updated' as const,
    severity: incident.severity,
  }));

  // Calculate critical counts from incidents
  const incidents = incidentsQuery.data || [];
  const slaRecords = slaQuery.data || [];
  
  // Count SLA breaches and at-risk
  const breachedIncidents = slaRecords.filter(sla => 
    sla.response_breached === true || sla.resolution_breached === true
  ).length;
  
  const now = new Date();
  const atRiskIncidents = slaRecords.filter(sla => {
    if (sla.response_breached || sla.resolution_breached) return false;
    const dueAt = sla.resolution_due_at ? new Date(sla.resolution_due_at) : null;
    if (!dueAt) return false;
    const hoursUntilDue = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue > 0 && hoursUntilDue <= 4; // At risk if due within 4 hours
  }).length;

  const criticalCounts: HomeCriticalCounts = {
    majorIncidents: {
      open: incidents.filter(i => i.is_major_incident || i.severity === 'SEV1' || i.severity === 'SEV2').length,
      breached: breachedIncidents,
      atRisk: atRiskIncidents,
    },
    slaAtRisk: atRiskIncidents,
    awaitingMe: incidents.filter(i => i.status === 'triage' || i.status === 'to_committee').length,
    blocked: 0, // Incidents don't have blocked status
    myWorkload: {
      incidents: incidents.length,
      workItems: 0,
    },
  };

  // Projects with incidents
  const projectMap = new Map<string, HomeProject>();
  incidents.forEach(incident => {
    if (incident.project) {
      const existing = projectMap.get(incident.project.id);
      if (existing) {
        existing.openCount++;
        if (incident.severity === 'SEV1' || incident.severity === 'SEV2') {
          existing.hasUrgency = true;
        }
      } else {
        projectMap.set(incident.project.id, {
          id: incident.project.id,
          key: incident.project.key,
          name: incident.project.name,
          color: '#C69C6D', // Default brand color
          openCount: 1,
          doneCount: 0,
          hasUrgency: incident.severity === 'SEV1' || incident.severity === 'SEV2',
        });
      }
    }
  });

  return {
    workItems,
    criticalCounts,
    projects: Array.from(projectMap.values()),
    isLoading: incidentsQuery.isLoading || releasesQuery.isLoading || slaQuery.isLoading,
    error: incidentsQuery.error || releasesQuery.error || slaQuery.error,
  };
}

// ============================================
// DELIVERY MODE HOOK
// Data source: Execution work items (epics, features, stories, tasks)
// ============================================
export function useHomeDeliveryData() {
  // Fetch stories - using correct column names from schema
  const storiesQuery = useQuery({
    queryKey: ['home-delivery-stories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          story_key,
          title,
          name,
          status,
          state,
          priority,
          assignee_id,
          blocked,
          created_at,
          updated_at,
          feature:features(id, name, display_id)
        `)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  // Fetch features - using correct column names from schema
  const featuresQuery = useQuery({
    queryKey: ['home-delivery-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select(`
          id,
          display_id,
          name,
          status,
          priority,
          blocked,
          created_at,
          updated_at,
          epic:epics(id, name, epic_key)
        `)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  // Fetch defects
  const defectsQuery = useQuery({
    queryKey: ['home-delivery-defects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('defects')
        .select(`
          id,
          defect_id,
          title,
          workflow_status,
          priority,
          severity,
          assignee_id,
          created_at,
          updated_at,
          project:projects(id, name, key)
        `)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  // Transform to work items
  const storyItems: HomeWorkItem[] = (storiesQuery.data || []).map(story => ({
    id: story.id,
    key: story.story_key || `US-${story.id.slice(0, 6)}`,
    summary: story.title || story.name || 'Untitled Story',
    project: story.feature?.name || 'Backlog',
    projectKey: story.feature?.display_id || 'BKL',
    status: story.status || story.state || 'Open',
    type: 'story' as WorkItemType,
    assignee: story.assignee_id,
    activityDate: new Date(story.updated_at || story.created_at),
    activityType: 'Updated' as const,
    priority: story.priority,
  }));

  const featureItems: HomeWorkItem[] = (featuresQuery.data || []).map(feature => ({
    id: feature.id,
    key: feature.display_id || `F-${feature.id.slice(0, 6)}`,
    summary: feature.name,
    project: feature.epic?.name || 'Portfolio',
    projectKey: feature.epic?.epic_key || 'PRT',
    status: feature.status || 'Open',
    type: 'feature' as WorkItemType,
    assignee: null,
    activityDate: new Date(feature.updated_at || feature.created_at),
    activityType: 'Updated' as const,
    priority: feature.priority,
  }));

  const defectItems: HomeWorkItem[] = (defectsQuery.data || []).map(defect => ({
    id: defect.id,
    key: defect.defect_id || `D-${defect.id.slice(0, 6)}`,
    summary: defect.title,
    project: defect.project?.name || 'Unknown',
    projectKey: defect.project?.key || 'UNK',
    status: defect.workflow_status,
    type: 'defect' as WorkItemType,
    assignee: defect.assignee_id,
    activityDate: new Date(defect.updated_at || defect.created_at),
    activityType: 'Updated' as const,
    priority: defect.priority,
    severity: defect.severity,
  }));

  // Combine and sort by activity date
  const workItems = [...storyItems, ...featureItems, ...defectItems]
    .sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime())
    .slice(0, 50);

  // Calculate counts
  const stories = storiesQuery.data || [];
  const features = featuresQuery.data || [];
  
  const criticalCounts: HomeCriticalCounts = {
    majorIncidents: { open: 0, breached: 0, atRisk: 0 },
    slaAtRisk: 0,
    awaitingMe: 0, // Delivery mode doesn't have awaiting statuses
    blocked: stories.filter(s => s.blocked === true).length + 
             features.filter(f => f.blocked === true).length,
    myWorkload: {
      incidents: 0,
      workItems: workItems.length,
    },
  };

  return {
    workItems,
    criticalCounts,
    projects: [], // Delivery mode uses features/epics, not projects
    isLoading: storiesQuery.isLoading || featuresQuery.isLoading || defectsQuery.isLoading,
    error: storiesQuery.error || featuresQuery.error || defectsQuery.error,
  };
}

// ============================================
// PLANNER MODE HOOK
// Data source: Work Manager
// ============================================
export function useHomePlannerData() {
  // Fetch work manager tasks
  const tasksQuery = useQuery({
    queryKey: ['home-planner-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_manager_tasks')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  // Fetch business requests for planning context
  const businessRequestsQuery = useQuery({
    queryKey: ['home-planner-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select(`
          id,
          request_key,
          title,
          process_step,
          priority_tier,
          assignee,
          created_at,
          updated_at,
          product:products(id, name)
        `)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  // Transform tasks to work items
  const taskItems: HomeWorkItem[] = (tasksQuery.data || []).map(task => ({
    id: task.id,
    key: task.key || `WM-${task.id.slice(0, 6)}`,
    summary: task.title,
    project: 'Work Manager',
    projectKey: 'WM',
    status: task.status,
    type: 'task' as WorkItemType,
    assignee: task.assignee_id,
    activityDate: new Date(task.updated_at || task.created_at),
    activityType: 'Updated' as const,
    priority: task.priority,
  }));

  const requestItems: HomeWorkItem[] = (businessRequestsQuery.data || []).map(req => ({
    id: req.id,
    key: req.request_key || `BR-${req.id.slice(0, 6)}`,
    summary: req.title,
    project: req.product?.name || 'Business Requests',
    projectKey: 'BR',
    status: req.process_step || 'Draft',
    type: 'epic' as WorkItemType, // Business requests show as epics
    assignee: req.assignee,
    activityDate: new Date(req.updated_at || req.created_at),
    activityType: 'Updated' as const,
    priority: req.priority_tier,
  }));

  // Combine and sort
  const workItems = [...taskItems, ...requestItems]
    .sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime())
    .slice(0, 50);

  // Calculate counts - planner focuses on upcoming/scheduled items
  const tasks = tasksQuery.data || [];
  const requests = businessRequestsQuery.data || [];
  
  const criticalCounts: HomeCriticalCounts = {
    majorIncidents: { open: 0, breached: 0, atRisk: 0 },
    slaAtRisk: 0,
    awaitingMe: requests.filter(r => 
      r.process_step === 'Pending Review' || r.process_step === 'Ready for Review'
    ).length,
    blocked: tasks.filter(t => t.blocked === true).length,
    myWorkload: {
      incidents: 0,
      workItems: workItems.length,
    },
  };

  return {
    workItems,
    criticalCounts,
    projects: [],
    isLoading: tasksQuery.isLoading || businessRequestsQuery.isLoading,
    error: tasksQuery.error || businessRequestsQuery.error,
  };
}

// ============================================
// UNIFIED HOOK - Routes to mode-specific data
// ============================================
export function useHomeData(mode: HomeRoleMode) {
  const operationsData = useHomeOperationsData();
  const deliveryData = useHomeDeliveryData();
  const plannerData = useHomePlannerData();

  switch (mode) {
    case 'operations':
      return operationsData;
    case 'delivery':
      return deliveryData;
    case 'planner':
      return plannerData;
    default:
      return deliveryData;
  }
}
