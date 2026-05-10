/**
 * useR360Reporting
 *
 * Provides data and mutation for the "Reports to" row in the R360 profile header.
 *
 * useR360Reporting(profileId)
 *   - Fetches the current manager name from profiles.manager_id
 *   - Fetches all active profiles for the org to populate the picker dropdown
 *   - Returns: { managerName, options, updateManager, isUpdating }
 *
 * buildReportingOptions(profiles, currentUserId)
 *   - Pure function: filters out current user, sorts A→Z, normalises display name
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminProfile {
  id: string;
  full_name: string | null;
  email?: string | null;
}

export interface ReportingOption {
  id: string;
  name: string;
}

// ─── Pure helper ─────────────────────────────────────────────────────────────

export function buildReportingOptions(
  profiles: AdminProfile[],
  currentUserId: string,
): ReportingOption[] {
  return profiles
    .filter(p => p.id !== currentUserId)
    .map(p => ({
      id: p.id,
      name: p.full_name?.trim() || p.email || p.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useR360Reporting(profileId: string | null | undefined) {
  const qc = useQueryClient();

  // Fetch manager name from the profile's manager_id → profiles join
  const { data: managerName = null } = useQuery<string | null>({
    queryKey: ['r360-manager', profileId ?? ''],
    queryFn: async () => {
      if (!profileId) return null;
      const { data } = await typedQuery('profiles')
        .select('manager_id')
        .eq('id', profileId)
        .maybeSingle();
      const managerId = (data as any)?.manager_id;
      if (!managerId) return null;
      const { data: mgr } = await typedQuery('profiles')
        .select('full_name, email')
        .eq('id', managerId)
        .maybeSingle();
      return (mgr as any)?.full_name?.trim() || (mgr as any)?.email || null;
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all profiles to populate the dropdown
  const { data: allProfiles = [] } = useQuery<AdminProfile[]>({
    queryKey: ['r360-reporting-options'],
    queryFn: async () => {
      const { data } = await typedQuery('profiles')
        .select('id, full_name, email')
        .order('full_name');
      return ((data ?? []) as any[]).map(p => ({
        id: p.id as string,
        full_name: p.full_name as string | null,
        email: p.email as string | null,
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const options: ReportingOption[] = profileId
    ? buildReportingOptions(allProfiles, profileId)
    : [];

  // Mutation: write manager_id back to the profile row
  const { mutateAsync: updateManager, isPending: isUpdating } = useMutation({
    mutationFn: async (managerId: string | null) => {
      if (!profileId) return;
      await typedQuery('profiles')
        .update({ manager_id: managerId } as any)
        .eq('id', profileId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['r360-manager', profileId ?? ''] });
    },
  });

  return { managerName, options, updateManager, isUpdating };
}
