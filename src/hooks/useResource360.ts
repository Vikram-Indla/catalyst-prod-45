import { useQuery } from '@tanstack/react-query';
import * as svc from '@/services/resource360Service';

export const useResource = (rid: string) =>
  useQuery({
    queryKey: ['r360-resource', rid],
    queryFn: () => svc.fetchResource(rid),
    enabled: !!rid,
  });

export const useResourceSummary = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-summary', resourceId],
    queryFn: () => svc.fetchResourceSummary(resourceId),
    enabled: !!resourceId,
  });

export const useWorkItems = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-work-items', resourceId],
    queryFn: () => svc.fetchWorkItems(resourceId),
    enabled: !!resourceId,
  });

export const useTransitions = (workItemId: string | null) =>
  useQuery({
    queryKey: ['r360-transitions', workItemId],
    queryFn: () => svc.fetchTransitions(workItemId!),
    enabled: !!workItemId,
  });

export const useChronologyEvents = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-chrono-events', resourceId],
    queryFn: () => svc.fetchChronologyEvents(resourceId),
    enabled: !!resourceId,
  });

export const useGanttData = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-gantt', resourceId],
    queryFn: () => svc.fetchGanttData(resourceId),
    enabled: !!resourceId,
  });

export const useConstellation = () =>
  useQuery({
    queryKey: ['r360-constellation'],
    queryFn: () => svc.fetchConstellation(),
  });

export const useHubDistribution = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-hub-dist', resourceId],
    queryFn: () => svc.fetchHubDistribution(resourceId),
    enabled: !!resourceId,
  });

export const useAiProfile = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-ai-profile', resourceId],
    queryFn: () => svc.fetchAiProfile(resourceId),
    enabled: !!resourceId,
  });

export const useBehavioralPatterns = (resourceId: string) =>
  useQuery({
    queryKey: ['r360-ai-patterns', resourceId],
    queryFn: () => svc.fetchBehavioralPatterns(resourceId),
    enabled: !!resourceId,
  });

export const useReleaseStanding = (resourceId: string, releaseId: string) =>
  useQuery({
    queryKey: ['r360-release-standing', resourceId, releaseId],
    queryFn: () => svc.fetchReleaseStanding(resourceId, releaseId),
    enabled: !!resourceId && !!releaseId,
  });
