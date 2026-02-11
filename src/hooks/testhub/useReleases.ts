/**
 * useReleases — Data hooks for TestHub Release Management (Group 15)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

export interface Release {
  id: string;
  name: string;
  version: string;
  description: string | null;
  status: string;
  health: string;
  start_date: string | null;
  release_date: string | null;
  target_date: string | null;
  actual_release_date: string | null;
  test_cases_total: number;
  test_cases_passed: number;
  test_cases_executed: number;
  test_cases_failed: number;
  test_cases_blocked: number;
  defects_open: number;
  critical_defects: number;
  coverage_percent: number;
  progress: number;
  owner_id: string | null;
  release_manager_id: string | null;
  qa_lead_id: string | null;
  release_vehicle_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  vehicle?: { id: string; name: string; type: string } | null;
  release_manager?: { full_name: string } | null;
  qa_lead?: { full_name: string } | null;
  owner?: { full_name: string } | null;
}

export interface ReleaseFilters {
  status: string;
  health: string;
  search: string;
}

export function useReleases(filters: ReleaseFilters) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReleases = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('releases')
        .select(`
          *,
          vehicle:release_vehicles(id, name, type),
          release_manager:profiles!releases_release_manager_id_fkey(full_name),
          qa_lead:profiles!releases_qa_lead_id_fkey(full_name),
          owner:profiles!releases_owner_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as any);
      }

      if (filters.health && filters.health !== 'all') {
        query = query.eq('health', filters.health as any);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      let filtered = (data as any[]) || [];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(r =>
          r.name?.toLowerCase().includes(s) ||
          r.version?.toLowerCase().includes(s)
        );
      }

      setReleases(filtered);
    } catch (err: any) {
      console.error('Fetch releases error:', err);
      catalystToast.error('Failed to load releases');
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, filters.health, filters.search]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  return { releases, isLoading, refetch: fetchReleases };
}

export function useRelease(releaseId: string | undefined) {
  const [release, setRelease] = useState<Release | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!releaseId) return;
    const fetch = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('releases')
          .select(`
            *,
            vehicle:release_vehicles(id, name, type),
            release_manager:profiles!releases_release_manager_id_fkey(full_name),
            qa_lead:profiles!releases_qa_lead_id_fkey(full_name),
            owner:profiles!releases_owner_id_fkey(full_name)
          `)
          .eq('id', releaseId)
          .single();
        if (error) throw new Error(error.message);
        setRelease(data as any);
      } catch (err: any) {
        console.error('Fetch release error:', err);
        catalystToast.error('Failed to load release');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [releaseId]);

  return { release, isLoading };
}

export function useReleaseCycles(releaseId: string | undefined) {
  const [cycles, setCycles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!releaseId) return;
    const fetch = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('release_test_cycles')
          .select(`
            id,
            cycle_id,
            cycle:th_test_cycles(id, name, status, total_cases, passed_count, failed_count, blocked_count, start_date, end_date)
          `)
          .eq('release_id', releaseId);
        if (error) throw new Error(error.message);
        setCycles((data as any[]) || []);
      } catch (err: any) {
        console.error('Fetch release cycles error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [releaseId]);

  return { cycles, isLoading };
}

export async function createRelease(payload: Partial<Release>) {
  const { data, error } = await supabase
    .from('releases')
    .insert({
      name: payload.name || '',
      version: payload.version || '',
      description: payload.description || null,
      status: (payload.status as any) || 'planning',
      health: payload.health || 'none',
      start_date: payload.start_date || null,
      target_date: payload.target_date || null,
      release_date: payload.release_date || null,
      release_vehicle_id: payload.release_vehicle_id || null,
      release_manager_id: payload.release_manager_id || null,
      qa_lead_id: payload.qa_lead_id || null,
      project_id: payload.project_id || null,
    } as any)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateReleaseStatus(releaseId: string, status: string) {
  const { error } = await supabase
    .from('releases')
    .update({ status: status as any, updated_at: new Date().toISOString() })
    .eq('id', releaseId);
  if (error) throw new Error(error.message);
}

export async function deleteRelease(releaseId: string) {
  const { error } = await supabase
    .from('releases')
    .delete()
    .eq('id', releaseId);
  if (error) throw new Error(error.message);
}
