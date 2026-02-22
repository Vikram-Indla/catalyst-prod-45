import { useQuery } from '@tanstack/react-query';
import * as svc from '@/services/resource360Service';

const STALE_5MIN = 5 * 60 * 1000;
const GC_30MIN = 30 * 60 * 1000;

export const useResource = (rid: string) =>
  useQuery({
    queryKey: ['r360-resource', rid],
    queryFn: () => svc.fetchResource(rid),
    enabled: !!rid,
    staleTime: STALE_5MIN,
    gcTime: GC_30MIN,
  });

export const useResourceSummary = (resourceId: string, jiraAccountId?: string | null) =>
  useQuery({
    queryKey: ['r360-summary', resourceId, jiraAccountId],
    queryFn: () => svc.fetchResourceSummary(resourceId, jiraAccountId),
    enabled: !!resourceId,
    staleTime: STALE_5MIN,
    gcTime: GC_30MIN,
  });

export const useWorkItems = (resourceId: string, jiraAccountId?: string | null) =>
  useQuery({
    queryKey: ['r360-work-items', resourceId, jiraAccountId],
    queryFn: () => svc.fetchWorkItems(resourceId, jiraAccountId),
    enabled: !!resourceId,
    staleTime: STALE_5MIN,
    gcTime: GC_30MIN,
  });

export const useProjectReleases = (jiraAccountId?: string | null) =>
  useQuery({
    queryKey: ['r360-project-releases', jiraAccountId],
    queryFn: () => svc.fetchProjectReleases(jiraAccountId),
    enabled: !!jiraAccountId,
    staleTime: STALE_5MIN,
    gcTime: GC_30MIN,
  });

export const useTransitions = (workItemId: string | null) =>
  useQuery({
    queryKey: ['r360-transitions', workItemId],
    queryFn: () => svc.fetchTransitions(workItemId!),
    enabled: !!workItemId,
    staleTime: STALE_5MIN,
  });

export const useChronologyEvents = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-chrono-events', resourceId],
    queryFn: () => svc.fetchChronologyEvents(resourceId),
    enabled: !!resourceId,
    staleTime: STALE_5MIN,
  });

export const useGanttData = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-gantt', resourceId],
    queryFn: () => svc.fetchGanttData(resourceId),
    enabled: !!resourceId,
    staleTime: STALE_5MIN,
  });

export const useHubDistribution = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-hub-dist', resourceId],
    queryFn: () => svc.fetchHubDistribution(resourceId),
    enabled: !!resourceId,
    staleTime: STALE_5MIN,
  });

export const useAiProfile = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-ai-profile', resourceId],
    queryFn: () => svc.fetchAiProfile(resourceId),
    enabled: !!resourceId,
    staleTime: STALE_5MIN,
  });

export const useBehavioralPatterns = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-ai-patterns', resourceId],
    queryFn: () => svc.fetchBehavioralPatterns(resourceId),
    enabled: !!resourceId,
    staleTime: STALE_5MIN,
  });

export const useReleaseStanding = (resourceId: string, releaseId: string) =>
  useQuery({
    queryKey: ['r360-release-standing', resourceId, releaseId],
    queryFn: () => svc.fetchReleaseStanding(resourceId, releaseId),
    enabled: !!resourceId && !!releaseId,
    staleTime: STALE_5MIN,
  });
