/**
 * supabaseImageUpload — Reuses Catalyst's existing Supabase image upload
 * path so the Atlaskit Epic description editor stores images in the same
 * `attachments/{storagePath}/{workItemId}/{timestamp}.{ext}` bucket as the
 * legacy TipTap editor. No new bucket, no schema change.
 */
import { supabase } from '@/integrations/supabase/client';

const MAX_BYTES = 10 * 1024 * 1024;

export interface UploadedImage {
  url: string;
  filename: string;
  width?: number;
  height?: number;
}

export interface UploadOptions {
  workItemId: string;
  /** Defaults to "description-images" — matches CatalystRichTextEditor */
  storagePath?: string;
}

export async function uploadDescriptionImage(file: File, opts: UploadOptions): Promise<UploadedImage | null> {
  if (!file || file.size > MAX_BYTES) return null;

  const ext = file.name?.split('.').pop()?.toLowerCase() || 'png';
  const folder = opts.workItemId || 'general';
  const storagePath = opts.storagePath || 'description-images';
  const path = `${storagePath}/${folder}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('attachments')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error('[supabaseImageUpload] upload failed', error);
    return null;
  }

  const { data } = supabase.storage.from('attachments').getPublicUrl(path);
  if (!data?.publicUrl) return null;

  const dims = await readImageDimensions(file).catch(() => null);

  return {
    url: data.publicUrl,
    filename: file.name || 'image',
    width: dims?.width,
    height: dims?.height,
  };
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('failed to read image dimensions'));
    };
    img.src = url;
  });
}
