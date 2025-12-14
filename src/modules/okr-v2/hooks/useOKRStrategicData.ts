// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Strategic Data Hook
// Fetches and transforms DB data into the unified OKR domain model
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Theme, 
  Objective, 
  KeyResult, 
  WorkItem, 
  OkrRiskSummary,
  StatusCode,
  StrategicData,
  WorkItemKind,
} from '../lib/okrTypes';
import {
  computeKeyResultProgress,
  computeObjectiveProgress,
  computeThemeProgress,
  deriveKeyResultStatus,
  deriveObjectiveStatus,
  deriveThemeStatus,
  aggregateRisks,
  aggregateValue,
} from '../lib/okrMetrics';
import { DEFAULT_THEME_COLORS } from '../lib/okrConfig';

// ─────────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Map DB status to domain status
 */
function mapDbStatusToStatusCode(status?: string): StatusCode {
  const statusMap: Record<string, StatusCode> = {
    'pending': 'pending',
    'in_progress': 'in-progress',
    'on_track': 'on-track',
    'at_risk': 'at-risk',
    'off_track': 'off-track',
    'paused': 'pending',
    'completed': 'completed',
    'canceled': 'off-track',
    'missed': 'off-track',
    // Theme statuses
    'proposed': 'pending',
    'active': 'in-progress',
    'done': 'completed',
    'cancelled': 'off-track',
  };
  return statusMap[status || ''] || 'pending';
}

/**
 * Create empty risk summary
 */
function emptyRiskSummary(): OkrRiskSummary {
  return { high: 0, medium: 0, low: 0 };
}

/**
 * Get theme color (use default if not set)
 */
function getThemeColor(color?: string, index: number = 0): string {
  if (color) return color;
  return DEFAULT_THEME_COLORS[index % DEFAULT_THEME_COLORS.length];
}

/**
 * Map risk severity (occurrence/impact) to high/medium/low
 * Uses the higher of occurrence or impact to determine severity
 */
function mapRiskSeverity(occurrence?: string | null, impact?: string | null): 'high' | 'medium' | 'low' {
  const severityOrder = ['Critical', 'High', 'Medium', 'Low'];
  const occurrenceIdx = occurrence ? severityOrder.indexOf(occurrence) : 3;
  const impactIdx = impact ? severityOrder.indexOf(impact) : 3;
  const maxSeverityIdx = Math.min(occurrenceIdx, impactIdx);
  
  if (maxSeverityIdx <= 1) return 'high'; // Critical or High
  if (maxSeverityIdx === 2) return 'medium';
  return 'low';
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch and transform strategic OKR data
 * Returns hierarchical Theme → Objective → KeyResult → WorkItem structure
 */
export function useOKRStrategicData(snapshotId?: string) {
  return useQuery({
    queryKey: ['okr-strategic-data', snapshotId],
    queryFn: async (): Promise<StrategicData> => {
      // 1. Fetch strategic themes
      let themesQuery = supabase
        .from('strategic_themes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (snapshotId) {
        themesQuery = themesQuery.eq('snapshot_id', snapshotId);
      }
      
      const { data: dbThemes, error: themesError } = await themesQuery;
      if (themesError) throw themesError;

      if (!dbThemes || dbThemes.length === 0) {
        return { themes: [], lastUpdated: new Date().toISOString() };
      }

      const themeIds = dbThemes.map(t => t.id);

      // 2. Fetch objectives linked to these themes (v2 objectives)
      const { data: dbObjectives, error: objError } = await supabase
        .from('objectives')
        .select('*')
        .eq('is_v2', true)
        .in('theme_id', themeIds)
        .order('created_at', { ascending: false });
      
      if (objError) throw objError;

      const objectiveIds = dbObjectives?.map(o => o.id) || [];

      // 3. Fetch key results for these objectives
      const { data: dbKeyResults, error: krError } = await supabase
        .from('key_results_v2')
        .select('*')
        .in('objective_id', objectiveIds.length > 0 ? objectiveIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: true });
      
      if (krError) throw krError;

      const krIds = dbKeyResults?.map(kr => kr.id) || [];

      // 4. Fetch work contributions (linked epics/features)
      const { data: dbContributions, error: contribError } = await supabase
        .from('kr_work_contributions')
        .select('*')
        .in('key_result_id', krIds.length > 0 ? krIds : ['00000000-0000-0000-0000-000000000000']);
      
      if (contribError) throw contribError;

      // 4b. Fetch actual work item names from epics and features tables
      const epicIds = (dbContributions || [])
        .filter((c: any) => c.work_item_type?.toLowerCase() === 'epic' && c.work_item_id)
        .map((c: any) => c.work_item_id);
      
      const featureIds = (dbContributions || [])
        .filter((c: any) => c.work_item_type?.toLowerCase() === 'feature' && c.work_item_id)
        .map((c: any) => c.work_item_id);

      const { data: epicsData } = epicIds.length > 0 
        ? await supabase.from('epics').select('id, name').in('id', epicIds)
        : { data: [] };
      
      const { data: featuresData } = featureIds.length > 0
        ? await supabase.from('features').select('id, name').in('id', featureIds)
        : { data: [] };

      // Build name lookup maps
      const epicNameMap = new Map((epicsData || []).map((e: any) => [e.id, e.name]));
      const featureNameMap = new Map((featuresData || []).map((f: any) => [f.id, f.name]));

      // 5. Collect all work item IDs to fetch their risks
      const allWorkItemIds = (dbContributions || [])
        .map((c: any) => c.work_item_id)
        .filter(Boolean);

      // 6. Fetch risks for linked work items (epics/features)
      const { data: dbRisks, error: risksError } = await supabase
        .from('risks')
        .select('id, related_item_id, occurrence, impact, status')
        .in('related_item_id', allWorkItemIds.length > 0 ? allWorkItemIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('status', 'Open');
      
      if (risksError) throw risksError;

      // Build risk summary map by work item ID
      const risksByWorkItem = new Map<string, OkrRiskSummary>();
      (dbRisks || []).forEach((risk: any) => {
        const workItemId = risk.related_item_id;
        if (!workItemId) return;
        
        const current = risksByWorkItem.get(workItemId) || { high: 0, medium: 0, low: 0 };
        const severity = mapRiskSeverity(risk.occurrence, risk.impact);
        current[severity]++;
        risksByWorkItem.set(workItemId, current);
      });

      // 7. Fetch owner profiles
      const allOwnerIds = [
        ...new Set([
          ...(dbThemes?.filter(t => t.owner_id).map(t => t.owner_id) || []),
          ...(dbObjectives?.filter(o => o.owner_id).map(o => o.owner_id) || []),
          ...(dbKeyResults?.filter(kr => kr.owner_id).map(kr => kr.owner_id) || []),
        ])
      ];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', allOwnerIds.length > 0 ? allOwnerIds : ['00000000-0000-0000-0000-000000000000']);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // 8. Build hierarchical structure
      // Group contributions by KR
      const contributionsByKr = new Map<string, any[]>();
      (dbContributions || []).forEach((c: any) => {
        const list = contributionsByKr.get(c.key_result_id) || [];
        list.push(c);
        contributionsByKr.set(c.key_result_id, list);
      });

      // Build KRs with work items
      const krsByObjective = new Map<string, KeyResult[]>();
      dbKeyResults?.forEach(dbKr => {
        const contributions = contributionsByKr.get(dbKr.id) || [];
        
        // Build work items from contributions with their risks
        const workItems: WorkItem[] = contributions.map((c: any) => {
          const workItemId = c.work_item_id || c.id;
          const workItemRisks = risksByWorkItem.get(workItemId) || emptyRiskSummary();
          
          // Determine work item type from contribution
          const rawType = (c.work_item_type || 'unknown').toLowerCase();
          let workItemType: WorkItemKind = 'unknown';
          if (rawType === 'epic') workItemType = 'epic';
          else if (rawType === 'feature') workItemType = 'feature';
          else if (rawType === 'story') workItemType = 'story';
          
          // Get actual work item name from the lookup maps
          let workItemName = 'Unknown Work Item';
          if (rawType === 'epic' && workItemId) {
            workItemName = epicNameMap.get(workItemId) || 'Epic';
          } else if (rawType === 'feature' && workItemId) {
            workItemName = featureNameMap.get(workItemId) || 'Feature';
          }
          
          return {
            id: workItemId,
            type: 'workItem' as const,
            workItemType,
            name: workItemName,
            krId: dbKr.id,
            objectiveId: dbKr.objective_id,
            themeId: '', // Will be set later
            status: 'in-progress' as StatusCode,
            progress: 50,
            risks: workItemRisks,
            value: { estimated: c.value_contribution || 0, realized: 0 },
            dependencies: [],
          };
        });

        // Aggregate risks from work items for the KR
        const krRisks = workItems.reduce(
          (acc, wi) => ({
            high: acc.high + (wi.risks?.high || 0),
            medium: acc.medium + (wi.risks?.medium || 0),
            low: acc.low + (wi.risks?.low || 0),
          }),
          { high: 0, medium: 0, low: 0 }
        );

        const kr: KeyResult = {
          id: dbKr.id,
          type: 'keyResult',
          name: dbKr.summary || 'Untitled KR',
          objectiveId: dbKr.objective_id,
          themeId: '',
          status: mapDbStatusToStatusCode(dbKr.status),
          progress: dbKr.progress || 0,
          actual: dbKr.current_value,
          target: dbKr.goal_value || dbKr.target_value,
          baseline: dbKr.baseline_value || 0,
          unit: dbKr.metric_type,
          weight: 1,
          dueDate: dbKr.due_date,
          direction: (dbKr.direction as 'increase' | 'decrease' | 'maintain') || 'increase',
          risks: krRisks,
          value: { 
            estimated: contributions.reduce((sum: number, c: any) => sum + (c.value_contribution || 0), 0), 
            realized: 0 
          },
          workItems,
          ownerId: dbKr.owner_id,
          ownerName: dbKr.owner_id ? profileMap.get(dbKr.owner_id) : undefined,
        };

        // Recalculate progress from actual/target
        kr.progress = computeKeyResultProgress(kr);
        kr.status = deriveKeyResultStatus(kr);

        const list = krsByObjective.get(dbKr.objective_id) || [];
        list.push(kr);
        krsByObjective.set(dbKr.objective_id, list);
      });

      // Build objectives with KRs
      const objectivesByTheme = new Map<string, Objective[]>();
      dbObjectives?.forEach(dbObj => {
        const krs = krsByObjective.get(dbObj.id) || [];
        
        // Set themeId on KRs and work items
        krs.forEach(kr => {
          kr.themeId = dbObj.theme_id || '';
          kr.workItems?.forEach(wi => {
            wi.themeId = dbObj.theme_id || '';
          });
        });

        const objective: Objective = {
          id: dbObj.id,
          type: 'objective',
          name: dbObj.name,
          description: dbObj.description || undefined,
          themeId: dbObj.theme_id || '',
          status: mapDbStatusToStatusCode(dbObj.status),
          progress: 0,
          risks: aggregateRisks(krs),
          value: aggregateValue(krs),
          keyResults: krs,
          ownerId: dbObj.owner_id || undefined,
          ownerName: dbObj.owner_id ? profileMap.get(dbObj.owner_id) : undefined,
          startDate: dbObj.start_date || undefined,
          dueDate: dbObj.due_date || undefined,
        };

        // Calculate progress and derive status
        objective.progress = computeObjectiveProgress(objective);
        objective.status = deriveObjectiveStatus(objective);

        if (dbObj.theme_id) {
          const list = objectivesByTheme.get(dbObj.theme_id) || [];
          list.push(objective);
          objectivesByTheme.set(dbObj.theme_id, list);
        }
      });

      // Build themes with objectives
      const themes: Theme[] = dbThemes.map((dbTheme, index) => {
        const objectives = objectivesByTheme.get(dbTheme.id) || [];

        const theme: Theme = {
          id: dbTheme.id,
          type: 'theme',
          name: dbTheme.name,
          color: getThemeColor(dbTheme.color_tag, index),
          status: mapDbStatusToStatusCode(dbTheme.status),
          progress: 0,
          risks: aggregateRisks(objectives),
          value: aggregateValue(objectives),
          sectors: [],
          strategicPillar: undefined,
          objectives,
          ownerId: dbTheme.owner_id || undefined,
          ownerName: dbTheme.owner_id ? profileMap.get(dbTheme.owner_id) : undefined,
        };

        // Calculate progress and derive status
        theme.progress = computeThemeProgress(theme);
        theme.status = deriveThemeStatus(theme);

        return theme;
      });

      return {
        themes,
        lastUpdated: new Date().toISOString(),
      };
    },
    staleTime: 60000,
  });
}

/**
 * Hook to get just the themes for filter chips
 */
export function useOKRThemes(snapshotId?: string) {
  return useQuery({
    queryKey: ['okr-themes-list', snapshotId],
    queryFn: async () => {
      let query = supabase
        .from('strategic_themes')
        .select('id, name, color_tag, status')
        .order('name', { ascending: true });
      
      if (snapshotId) {
        query = query.eq('snapshot_id', snapshotId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((t, idx) => ({
        id: t.id,
        name: t.name,
        color: getThemeColor(t.color_tag, idx),
        status: mapDbStatusToStatusCode(t.status),
      }));
    },
    staleTime: 300000,
  });
}
