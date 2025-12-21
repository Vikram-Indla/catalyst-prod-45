/**
 * Change Number Service
 * CRUD operations for Change Numbers
 */

import { supabase } from '@/integrations/supabase/client';
import type { ChangeNumber } from '@/types/changeNumber';

// Get all open change numbers
export async function getOpenChangeNumbers(): Promise<ChangeNumber[]> {
  const { data, error } = await supabase
    .from('change_numbers')
    .select(`
      *,
      release:releases(id, name)
    `)
    .eq('status', 'open')
    .order('number', { ascending: false });

  if (error) throw error;
  return (data || []) as ChangeNumber[];
}

// Get change numbers for a specific release
export async function getChangeNumbersByRelease(releaseId: string): Promise<ChangeNumber[]> {
  const { data, error } = await supabase
    .from('change_numbers')
    .select(`
      *,
      release:releases(id, name)
    `)
    .eq('release_id', releaseId)
    .eq('status', 'open')
    .order('number', { ascending: false });

  if (error) throw error;
  return (data || []) as ChangeNumber[];
}

// Get a single change number by ID
export async function getChangeNumberById(id: string): Promise<ChangeNumber | null> {
  const { data, error } = await supabase
    .from('change_numbers')
    .select(`
      *,
      release:releases(id, name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as ChangeNumber;
}

// Link change number to feature
export async function linkChangeNumberToFeature(
  featureId: string,
  changeNumberId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('features')
    .update({ 
      change_number_id: changeNumberId,
      updated_at: new Date().toISOString()
    })
    .eq('id', featureId);

  if (error) throw error;
}

// Link change number to story
export async function linkChangeNumberToStory(
  storyId: string,
  changeNumberId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('stories')
    .update({ 
      change_number_id: changeNumberId,
      updated_at: new Date().toISOString()
    })
    .eq('id', storyId);

  if (error) throw error;
}
