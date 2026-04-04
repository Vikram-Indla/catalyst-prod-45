import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CollapsibleSection } from './CollapsibleSection';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  workItemId: string;
  projectId: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
}

export function AttachmentsSection({ workItemId, projectId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ['ph-attachments', workItemId];
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: attachments = [] } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_attachments')
        .select('*')
        .eq('work_item_id', workItemId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as Attachment[];
    },
    enabled: !!workItemId,
  });

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Not authenticated'); setUploading(false); return; }

    try {
      for (const file of files) {
        const path = `${projectId}/${workItemId}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from('work-item-attachments')
          .upload(path, file);
        if (uploadErr) throw new Error(uploadErr.message);

        const { error: insertErr } = await supabase.from('ph_attachments').insert({
          work_item_id: workItemId,
          uploaded_by: user.id,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          storage_path: path,
        });
        if (insertErr) throw new Error(insertErr.message);
      }
      queryClient.invalidateQueries({ queryKey });
      toast.success(`${files.length} file(s) uploaded`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }, [workItemId, projectId, queryClient, queryKey]);

  const deleteAttachment = useMutation({
    mutationFn: async (att: Attachment) => {
      await supabase.storage.from('work-item-attachments').remove([att.storage_path]);
      const { error } = await supabase.from('ph_attachments').delete().eq('id', att.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Attachment deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
    e.target.value = '';
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('work-item-attachments').getPublicUrl(path);
    return data.publicUrl;
  };

  const isImage = (mime: string) => mime.startsWith('image/');

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <CollapsibleSection title="Attachments" count={attachments.length} defaultOpen={attachments.length > 0}>
      {/* Thumbnail grid */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map(att => (
            <div
              key={att.id}
              className="relative group rounded overflow-hidden"
              style={{ width: 140, border: '1px solid var(--divider)' }}
            >
              {/* Preview */}
              <div className="h-[90px] flex items-center justify-center bg-[var(--bg-1)]">
                {isImage(att.mime_type) ? (
                  <img
                    src={getPublicUrl(att.storage_path)}
                    alt={att.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText size={28} className="text-[#94A3B8]" />
                )}
              </div>
              {/* Delete button */}
              <button
                onClick={() => deleteAttachment.mutate(att)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60"
              >
                <X size={10} className="text-white" />
              </button>
              {/* Info */}
              <div className="px-2 py-1.5">
                <div className="text-[11px] font-medium truncate" style={{ color: 'var(--fg-1)' }}>{att.file_name}</div>
                <div className="text-[10px]" style={{ color: 'var(--fg-4)' }}>{formatSize(att.file_size)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`relative rounded-md text-center cursor-pointer transition-colors ${dragOver ? 'bg-[var(--cp-blue-wash)]' : 'bg-[var(--bg-1)]'}`}
        style={{
          border: dragOver ? '2px dashed var(--cp-blue)' : '2px dashed var(--divider)',
          padding: '14px 12px',
        }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('att-file-input')?.click()}
      >
        {uploading ? (
          <Loader2 size={18} className="animate-spin text-[#2563EB] mx-auto" />
        ) : (
          <>
            <Upload size={16} className="mx-auto mb-1" style={{ color: 'var(--fg-4)' }} />
            <div className="text-[12px]" style={{ color: 'var(--fg-3)' }}>Drop files or click to upload</div>
          </>
        )}
        <input
          id="att-file-input"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    </CollapsibleSection>
  );
}
