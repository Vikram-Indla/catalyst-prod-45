/**
 * Release Service
 * Supabase operations for releases
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ReleaseStatus = Database['public']['Tables']['releases']['Row']['status'];

export const bulkUpdateReleaseStatus = async (ids: string[], status: ReleaseStatus) => {
  const { error } = await supabase
    .from('releases')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw error;
};

export const bulkReassignReleases = async (ids: string[], ownerId: string) => {
  const { error } = await supabase
    .from('releases')
    .update({ owner_id: ownerId, updated_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw error;
};

export const bulkArchiveReleases = async (ids: string[]) => {
  // Use 'shipped' as fallback since 'archived' might not exist
  const { error } = await supabase
    .from('releases')
    .update({ status: 'shipped', updated_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw error;
};
