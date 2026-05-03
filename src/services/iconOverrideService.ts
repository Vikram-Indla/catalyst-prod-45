/**
 * iconOverrideService — RESET ICONS server interactions.
 *
 * Encapsulates Supabase Storage uploads + catalyst_icon_overrides row
 * upserts so the AdminIconsPage doesn't have to wire both directly.
 *
 * Usage flow:
 *   1. uploadIconOverride({ category, key, variant, file }) — uploads to
 *      the icon-overrides bucket and writes the row in one shot.
 *   2. removeIconOverride({ category, key, variant }) — deletes the row
 *      and the storage object.
 *
 * Permission gating happens at the Supabase RLS layer — non-admins get
 * 403. The page UI shouldn't call these unless the user is admin.
 */

import { supabase } from '@/integrations/supabase/client';
import type { IconCategory } from '@/components/icons/useIconOverrides';

const BUCKET = 'icon-overrides';

export interface UploadIconOverrideInput {
  category: IconCategory;
  key: string;
  variant?: 'light' | 'dark';
  file: File;
  uploadedBy: string;
}

export interface IconOverrideRow {
  id: string;
  category: IconCategory;
  key: string;
  variant: 'light' | 'dark';
  override_url: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

function buildStoragePath(category: IconCategory, key: string, variant: 'light' | 'dark', file: File): string {
  // Timestamp suffix prevents browser cache hits on the previous upload.
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'svg';
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const variantSuffix = variant === 'dark' ? '_dark' : '';
  return `${category}/${safeKey}${variantSuffix}_${Date.now()}.${ext}`;
}

export async function uploadIconOverride(
  input: UploadIconOverrideInput,
): Promise<IconOverrideRow> {
  const { category, key, variant = 'light', file, uploadedBy } = input;
  const storagePath = buildStoragePath(category, key, variant, file);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || (storagePath.endsWith('.svg') ? 'image/svg+xml' : undefined),
      cacheControl: '3600',
    });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const overrideUrl = pub.publicUrl;

  const payload = {
    category,
    key,
    variant,
    override_url: overrideUrl,
    storage_path: storagePath,
    uploaded_by: uploadedBy,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('catalyst_icon_overrides')
    .upsert(payload, { onConflict: 'category,key,variant' })
    .select()
    .single();
  if (error) throw error;

  return data as IconOverrideRow;
}

// ─── Dynamic categories ────────────────────────────────────────────────

export interface CreateIconCategoryInput {
  name: string;     // slug, e.g. "severity"
  label: string;    // display, e.g. "Severity"
  description?: string;
  createdBy: string;
}

export async function createIconCategory(input: CreateIconCategoryInput) {
  const slug = input.name.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]{1,40}$/.test(slug)) {
    throw new Error('Name must be lowercase letters, digits, hyphens, or underscores (max 41 chars)');
  }
  if (['work-type', 'priority', 'project-avatar'].includes(slug)) {
    throw new Error(`"${slug}" is reserved`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('catalyst_icon_categories')
    .insert({
      name: slug,
      label: input.label.trim(),
      description: input.description?.trim() || null,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteIconCategory(name: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)('catalyst_icon_categories')
    .delete()
    .eq('name', name);
  if (error) throw error;
}

// ─── Override removal ─────────────────────────────────────────────────

export async function removeIconOverride(
  category: IconCategory,
  key: string,
  variant: 'light' | 'dark' = 'light',
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase.from as any)('catalyst_icon_overrides')
    .select('storage_path')
    .eq('category', category)
    .eq('key', key)
    .eq('variant', variant)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delError } = await (supabase.from as any)('catalyst_icon_overrides')
    .delete()
    .eq('category', category)
    .eq('key', key)
    .eq('variant', variant);
  if (delError) throw delError;

  if (row?.storage_path) {
    await supabase.storage.from(BUCKET).remove([row.storage_path]);
  }
}
