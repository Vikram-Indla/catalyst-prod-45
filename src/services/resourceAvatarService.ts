/**
 * resourceAvatarService — face-avatar override CRUD.
 *
 * Mirrors iconOverrideService but for per-profile face photos.
 * Storage bucket: 'resource-avatars'.
 * Table: catalyst_resource_avatars (profile_id UNIQUE).
 *
 * Admin-only writes enforced by RLS at the database; this service does
 * not re-check permissions — UI must hide the actions for non-admins.
 */

import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'resource-avatars';

export interface ResourceAvatarRow {
  id: string;
  profile_id: string;
  avatar_url: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

function buildStoragePath(profileId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  return `${profileId}/${Date.now()}.${ext}`;
}

export interface UploadResourceAvatarInput {
  profileId: string;
  file: File;
  uploadedBy: string;
  /** When set, the previous storage object is removed after upsert. */
  previousStoragePath?: string | null;
}

export async function uploadResourceAvatar(
  input: UploadResourceAvatarInput,
): Promise<ResourceAvatarRow> {
  const storagePath = buildStoragePath(input.profileId, input.file);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, input.file, {
      upsert: false,
      contentType: input.file.type,
      cacheControl: '3600',
    });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const avatarUrl = pub.publicUrl;

  const payload = {
    profile_id: input.profileId,
    avatar_url: avatarUrl,
    storage_path: storagePath,
    uploaded_by: input.uploadedBy,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('catalyst_resource_avatars')
    .upsert(payload, { onConflict: 'profile_id' })
    .select()
    .single();
  if (error) throw error;

  // Remove previous storage object after the upsert succeeds (never block on it).
  if (input.previousStoragePath && input.previousStoragePath !== storagePath) {
    supabase.storage.from(BUCKET).remove([input.previousStoragePath]).catch(() => undefined);
  }

  return data as ResourceAvatarRow;
}

export async function removeResourceAvatar(profileId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase.from as any)('catalyst_resource_avatars')
    .select('storage_path')
    .eq('profile_id', profileId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delError } = await (supabase.from as any)('catalyst_resource_avatars')
    .delete()
    .eq('profile_id', profileId);
  if (delError) throw delError;

  if (row?.storage_path) {
    await supabase.storage.from(BUCKET).remove([row.storage_path]);
  }
}
