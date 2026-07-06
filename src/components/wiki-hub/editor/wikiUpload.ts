/**
 * wikiUpload — BlockNote `uploadFile` handler for Wiki pages
 * (CAT-DOCS-NOTION-20260704-001). Mirrors the canonical
 * jira-description-editor/mediaUpload.ts pattern against the public
 * wiki-media bucket (migration 20260705150000).
 */
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'wiki-media';

export async function uploadWikiFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
