/**
 * Feature Service — Database operations for features
 */

import { supabase } from '@/integrations/supabase/client';

// Get feature with owner and contributors
export async function getFeatureWithAssignments(featureId: string) {
  const { data, error } = await supabase
    .from('features')
    .select(`
      *,
      owner:profiles!features_owner_id_fkey(id, full_name, email, avatar_url)
    `)
    .eq('id', featureId)
    .single();
    
  if (error) throw error;

  // Fetch contributors separately
  const { data: contributors } = await supabase
    .from('feature_contributors')
    .select(`
      id,
      user_id,
      user:profiles(id, full_name, email, avatar_url)
    `)
    .eq('feature_id', featureId);

  return {
    ...data,
    contributors: contributors || []
  };
}

// Update owner
export async function updateFeatureOwner(featureId: string, ownerId: string | null) {
  const { data, error } = await supabase
    .from('features')
    .update({ owner_id: ownerId, updated_at: new Date().toISOString() })
    .eq('id', featureId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// Update contributors (replace all)
export async function updateFeatureContributors(featureId: string, contributorIds: string[]) {
  // Delete existing
  await supabase.from('feature_contributors').delete().eq('feature_id', featureId);
  
  // Insert new
  if (contributorIds.length > 0) {
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from('feature_contributors').insert(
      contributorIds.map(userId => ({
        feature_id: featureId,
        user_id: userId,
        added_by: user?.user?.id
      }))
    );
    if (error) throw error;
  }
}

// Get team members for a program/project
export async function getTeamMembers(projectId?: string) {
  // Get all profiles as team members
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role')
    .order('full_name');
    
  if (error) throw error;
  return data || [];
}
