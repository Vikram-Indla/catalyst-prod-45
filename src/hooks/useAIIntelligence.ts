/**
 * useAIIntelligence — Data fetching for AI Intelligence Panel
 * Sources: ph_issues, resource_inventory, profiles, r360_resource_metrics, r360_ai_profiles, r360_ai_behavioral_patterns
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isDeveloperRole } from '@/constants/r360RoleClassification';
import type { HubClosureData } from '@/components/resources/ai-intelligence/HubClosures';
import type { BacklogHub, BacklogMetrics } from '@/components/resources/ai-intelligence/DeliveryBacklog';
import type { PatternInsight } from '@/components/resources/ai-intelligence/BehavioralPatterns';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

function classifyHub(key: string): string {
  if (!key) return 'Other';
  if (key.startsWith('BAU-') || key.startsWith('INC-')) return 'IncidentHub';
  if (key.startsWith('PRD-') || key.startsWith('PB-')) return 'ProductHub';
  if (key.startsWith('TST-') || key.startsWith('TC-')) return 'TestHub';
  if (key.startsWith('PRJ-') || key.startsWith('SPR-') || key.startsWith('SEN-') || key.startsWith('FAC-') || key.startsWith('OPS-') || key.startsWith('SUP-') || key.startsWith('LND-')) return 'ProjectHub';
  if (key.startsWith('REL-')) return 'ReleaseHub';
  return 'Other';
}

interface ResourceInfo {
  id: string;
  full_name: string;
  role_name: string;
  avatar_url: string | null;
  jira_account_id: string | null;
  rid: string;
}

export function useResourceInfo(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['r360-ai-resource-info', resourceId],
    queryFn: async () => {
      if (!resourceId) return null;
      const { data: ri } = await (supabase
        .from('resource_inventory' as any)
        .select('id, rid, name, role_name, department_name, jira_account_id, profile_id')
        .eq('id', resourceId)
        .maybeSingle() as any);

      let profile: any = null;
      if (ri?.profile_id) {
        const { data: p } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, rid')
          .eq('id', ri.profile_id)
          .maybeSingle();
        profile = p;
      }

      const roleParts = [ri?.role_name, ri?.department_name].filter(Boolean);
      return {
        id: resourceId,
        full_name: profile?.full_name || ri?.name || 'Unknown',
        role_name: roleParts.length > 0 ? roleParts.join(' · ') : 'Team Member',
        avatar_url: profile?.avatar_url || null,
        jira_account_id: ri?.jira_account_id || null,
        rid: profile?.rid || ri?.rid || `RES-${String(resourceId).slice(-3).toUpperCase()}`,
      } as ResourceInfo;
    },
    enabled: !!resourceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHubClosures(resourceId: string | undefined, jiraAccountId: string | null | undefined) {
  return useQuery({
    queryKey: ['r360-ai-hub-closures', resourceId, jiraAccountId],
    queryFn: async (): Promise<HubClosureData[]> => {
      if (!jiraAccountId) return [];
      const { data, error } = await (supabase
        .from('ph_issues')
        .select('issue_key, status_category')
        .eq('assignee_account_id', jiraAccountId) as any);

      if (error || !data) return [];

      const hubMap = new Map<string, { closed: number; total: number }>();
      for (const row of data) {
        const hub = classifyHub(row.issue_key);
        if (!hubMap.has(hub)) hubMap.set(hub, { closed: 0, total: 0 });
        const entry = hubMap.get(hub)!;
        entry.total++;
        if (row.status_category === 'Done') entry.closed++;
      }

      return Array.from(hubMap.entries()).map(([hub, { closed, total }]) => ({
        hub,
        closed,
        total,
        pct: total > 0 ? Math.round((closed / total) * 100) : 0,
      }));
    },
    enabled: !!resourceId && !!jiraAccountId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeliveryBacklog(resourceId: string | undefined, jiraAccountId: string | null | undefined) {
  return useQuery({
    queryKey: ['r360-ai-delivery-backlog', resourceId, jiraAccountId],
    queryFn: async (): Promise<{ metrics: BacklogMetrics; hubs: BacklogHub[] }> => {
      if (!jiraAccountId) return { metrics: { avgSubtaskDays: null, avgStoryDays: null, avgBugDays: null, pickupSpeedHours: null }, hubs: [] };

      const { data: issues, error } = await (supabase
        .from('ph_issues')
        .select('issue_key, status, status_category, issue_type, jira_created_at, jira_updated_at, summary')
        .eq('assignee_account_id', jiraAccountId) as any);

      if (error || !issues) return { metrics: { avgSubtaskDays: null, avgStoryDays: null, avgBugDays: null, pickupSpeedHours: null }, hubs: [] };

      const doneItems = issues.filter((i: any) => i.status_category === 'Done');
      const typeAvgs = (type: string) => {
        const typed = doneItems.filter((i: any) => i.issue_type === type && i.jira_created_at && i.jira_updated_at);
        if (typed.length === 0) return null;
        const totalDays = typed.reduce((sum: number, i: any) => {
          return sum + (new Date(i.jira_updated_at).getTime() - new Date(i.jira_created_at).getTime()) / 86400000;
        }, 0);
        return totalDays / typed.length;
      };

      const metrics: BacklogMetrics = {
        avgSubtaskDays: typeAvgs('Sub-task') ?? typeAvgs('Subtask'),
        avgStoryDays: typeAvgs('Story') ?? typeAvgs('Frontend'),
        avgBugDays: typeAvgs('QA Bug') ?? typeAvgs('Defect') ?? typeAvgs('Bug'),
        pickupSpeedHours: null,
      };

      const openItems = issues.filter((i: any) => i.status_category !== 'Done' && i.status !== 'Cancelled' && i.status !== 'Canceled');
      const hubMap = new Map<string, { openCount: number; statuses: Set<string>; titles: string[] }>();

      for (const item of openItems) {
        const hub = classifyHub(item.issue_key);
        if (!hubMap.has(hub)) hubMap.set(hub, { openCount: 0, statuses: new Set(), titles: [] });
        const entry = hubMap.get(hub)!;
        entry.openCount++;
        if (item.status) entry.statuses.add(item.status);
        entry.titles.push(item.summary || item.issue_key);
      }

      const hubs: BacklogHub[] = Array.from(hubMap.entries()).map(([hub, data]) => ({
        hub,
        openCount: data.openCount,
        statuses: Array.from(data.statuses).join(', '),
        itemTitles: data.titles.slice(0, 5).join(' | '),
      }));

      return { metrics, hubs };
    },
    enabled: !!resourceId && !!jiraAccountId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAIPatterns(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['r360-ai-behavioral-patterns', resourceId],
    queryFn: async (): Promise<{ summary: string | null; warning: string | null; insights: PatternInsight[]; archetypeTitle: string; archetypeDesc: string; archetypeTags: string[]; roleFitness: number }> => {
      if (!resourceId) return { summary: null, warning: null, insights: [], archetypeTitle: 'Loading', archetypeDesc: '', archetypeTags: [], roleFitness: 50 };

      // Get AI profile for summary
      const { data: profile } = await (supabase
        .from('r360_ai_profiles' as any)
        .select('resource_pattern, role_expectation')
        .eq('resource_id', resourceId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      // Get behavioral patterns from dedicated table
      const { data: patterns } = await (supabase
        .from('r360_ai_behavioral_patterns' as any)
        .select('pattern_text, evidence_refs, sort_order')
        .eq('resource_id', resourceId)
        .order('sort_order', { ascending: true }) as any);

      const insights: PatternInsight[] = (patterns || []).map((p: any) => ({
        text: p.pattern_text || '',
        refs: Array.isArray(p.evidence_refs) ? p.evidence_refs : [],
      }));

      // Derive warning from role anomalies if present
      const roleExp = profile?.role_expectation as any;
      const warning = roleExp?.anomalies?.length > 0 ? roleExp.anomalies[0] : null;

      // Derive archetype from actual_distribution
      const dist = (roleExp?.actual_distribution || []) as { label: string; pct: number }[];
      const topActivity = dist.length > 0 ? dist.sort((a: any, b: any) => b.pct - a.pct)[0] : null;

      // Build archetype title from top activity
      let archetypeTitle = 'Generalist';
      let archetypeDesc = 'Balanced contributor across multiple areas.';
      const archetypeTags: string[] = [];

      if (topActivity && topActivity.pct >= 0.5) {
        const label = topActivity.label.toLowerCase();
        if (label.includes('bug') || label.includes('qa')) {
          archetypeTitle = 'QA\nSpecialist';
          archetypeDesc = `Primarily focused on quality assurance (${Math.round(topActivity.pct * 100)}% of work). Drives defect resolution and compliance.`;
          archetypeTags.push('Bug-Focused', 'QA Affinity', 'Quality Gate');
        } else if (label.includes('incident')) {
          archetypeTitle = 'Reactive\nSpecialist';
          archetypeDesc = 'Precision output under pressure. Self-activates on incidents and bugs without being asked.';
          archetypeTags.push('Incident-First', 'Crunch Closer');
        } else if (label.includes('feature') || label.includes('frontend') || label.includes('backend')) {
          archetypeTitle = 'Feature\nBuilder';
          archetypeDesc = `Core feature delivery contributor (${Math.round(topActivity.pct * 100)}% of work). Drives new capability development.`;
          archetypeTags.push('Feature-First', 'Builder');
        } else if (label.includes('task') || label.includes('management')) {
          archetypeTitle = 'Task\nCoordinator';
          archetypeDesc = 'Orchestrates work items and sub-tasks across the team.';
          archetypeTags.push('Task-Driven', 'Coordinator');
        } else {
          archetypeTitle = 'Domain\nSpecialist';
          archetypeDesc = `Concentrated effort on ${topActivity.label} (${Math.round(topActivity.pct * 100)}%).`;
          archetypeTags.push('Focused', 'Specialist');
        }
      } else if (dist.length >= 2) {
        archetypeTitle = 'Balanced\nContributor';
        archetypeDesc = 'Spread across multiple work streams without a dominant focus area.';
        archetypeTags.push('Multi-Stream', 'Versatile');
      }

      // Add secondary tags from distribution
      for (const d of dist.slice(0, 3)) {
        const shortLabel = d.label.split('(')[0].trim();
        if (shortLabel.length < 25 && !archetypeTags.includes(shortLabel)) {
          archetypeTags.push(shortLabel);
        }
      }

      // Calculate role fitness from distribution alignment
      // Higher fitness = more aligned with expected role activities
      const roleFitness = topActivity
        ? Math.min(99, Math.max(20, Math.round(50 + topActivity.pct * 40 + dist.length * 5)))
        : 50;

      return {
        summary: profile?.resource_pattern || null,
        warning,
        insights,
        archetypeTitle,
        archetypeDesc,
        archetypeTags: archetypeTags.slice(0, 4),
        roleFitness,
      };
    },
    enabled: !!resourceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStalenessLabel(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['r360-ai-staleness', resourceId],
    queryFn: async () => {
      if (!resourceId) return null;
      const { data } = await (supabase
        .from('r360_resource_metrics' as any)
        .select('computed_at')
        .eq('resource_id', resourceId)
        .maybeSingle() as any);

      if (!data?.computed_at) return null;
      const mins = Math.round((Date.now() - new Date(data.computed_at).getTime()) / 60000);
      if (mins < 60) return `${mins}m ago`;
      if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
      return `${Math.round(mins / 1440)}d ago`;
    },
    enabled: !!resourceId,
    staleTime: 60 * 1000,
  });
}

/** Check if AI profile exists and is fresh (generated in last 24h) */
export function useAIProfileStatus(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['r360-ai-profile-status', resourceId],
    queryFn: async () => {
      if (!resourceId) return { exists: false, stale: true };
      const { data } = await (supabase
        .from('r360_ai_profiles' as any)
        .select('generated_at')
        .eq('resource_id', resourceId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      if (!data) return { exists: false, stale: true };
      const ageHours = (Date.now() - new Date(data.generated_at).getTime()) / 3600000;
      return { exists: true, stale: ageHours > 24 };
    },
    enabled: !!resourceId,
    staleTime: 60 * 1000,
  });
}

export function useAIActions(resourceId: string, jiraAccountId: string | null | undefined) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['r360-ai-'] });
    queryClient.invalidateQueries({ queryKey: ['r360-cached-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['r360-ai-profile'] });
    queryClient.invalidateQueries({ queryKey: ['r360-ai-patterns'] });
    queryClient.invalidateQueries({ queryKey: ['r360-ai-hub-closures'] });
    queryClient.invalidateQueries({ queryKey: ['r360-ai-delivery-backlog'] });
    queryClient.invalidateQueries({ queryKey: ['r360-ai-behavioral-patterns'] });
    queryClient.invalidateQueries({ queryKey: ['r360-ai-staleness'] });
    queryClient.invalidateQueries({ queryKey: ['r360-ai-profile-status'] });
    queryClient.invalidateQueries({ queryKey: ['r360-weekly-story'] });
  }, [queryClient]);

  const syncData = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('r360-compute-metrics', {
        body: { resource_id: resourceId, jira_account_id: jiraAccountId },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success(`Metrics computed — ${data?.total_items || 0} items`);
      invalidateAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to sync data');
    } finally {
      setSyncing(false);
    }
  }, [resourceId, jiraAccountId, invalidateAll]);

  const refreshAI = useCallback(async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('r360-generate-profile', {
        body: { resource_id: resourceId },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success('AI profile regenerated');
      invalidateAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate AI profile');
    } finally {
      setGenerating(false);
    }
  }, [resourceId, invalidateAll]);

  return { syncData, refreshAI, syncing, generating, invalidateAll };
}

/**
 * Auto-trigger AI profile generation if no cached profile exists.
 * Called once when panel opens. Won't re-trigger if profile already exists.
 */
export function useAutoGenerateIfMissing(resourceId: string, jiraAccountId: string | null | undefined) {
  const { data: status } = useAIProfileStatus(resourceId);
  const { refreshAI, generating } = useAIActions(resourceId, jiraAccountId);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (!status || triggered || generating) return;
    if (!status.exists) {
      setTriggered(true);
      refreshAI();
    }
  }, [status, triggered, generating, refreshAI]);

  return { autoGenerating: generating && triggered };
}
