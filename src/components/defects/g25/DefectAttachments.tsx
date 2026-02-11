import { useState, useCallback } from 'react';
import { Upload, FileText, Image, Film, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useDropzone } from 'react-dropzone';

interface Attachment {
  id: string;
  defect_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
}

function useDefectAttachments(defectId: string) {
  return useQuery({
    queryKey: ['g25-defect-attachments', defectId],
    queryFn: async (): Promise<Attachment[]> => {
      const { data, error } = await supabase
        .from('th_defect_attachments' as any)
        .select('*')
        .eq('defect_id', defectId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as unknown as Attachment[];
    },
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Film;
  return FileText;
}

export function DefectAttachments({ defectId }: { defectId: string }) {
  const qc = useQueryClient();
  const { data: attachments, isLoading } = useDefectAttachments(defectId);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = useCallback(async (files: File[]) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of files) {
        const path = `${defectId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('defect-attachments')
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('defect-attachments')
          .getPublicUrl(path);

        const { error: insertError } = await supabase
          .from('th_defect_attachments' as any)
          .insert({
            defect_id: defectId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            file_url: publicUrl,
            uploaded_by: user.id,
          } as any);
        if (insertError) throw insertError;
      }

      qc.invalidateQueries({ queryKey: ['g25-defect-attachments', defectId] });
      toast.success(`${files.length} file(s) uploaded`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }, [defectId, qc]);

  const deleteAttachment = useMutation({
    mutationFn: async (att: Attachment) => {
      // Extract storage path from URL
      const urlParts = att.file_url.split('/defect-attachments/');
      if (urlParts[1]) {
        await supabase.storage.from('defect-attachments').remove([urlParts[1]]);
      }
      const { error } = await supabase.from('th_defect_attachments' as any).delete().eq('id', att.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['g25-defect-attachments', defectId] });
      toast.success('Attachment deleted');
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: uploadFiles,
    multiple: true,
    maxSize: 10485760, // 10MB
  });

  if (isLoading) return <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-10 w-full" /></div>;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground">Max 10MB per file</p>
          </div>
        )}
      </div>

      {/* Attachment list */}
      {attachments?.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No attachments yet</p>
      ) : (
        <div className="space-y-2">
          {attachments?.map(att => {
            const Icon = getFileIcon(att.file_type);
            return (
              <div key={att.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-xs">{att.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(att.file_size)} · {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(att.file_url, '_blank')}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:text-destructive"
                    onClick={() => deleteAttachment.mutate(att)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
