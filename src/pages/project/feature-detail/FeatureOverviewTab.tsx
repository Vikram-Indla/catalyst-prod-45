/**
 * FeatureOverviewTab — Overview content for Feature detail page
 * 
 * Includes:
 * - Rich description
 * - Readiness snapshot (approvals, exceptions, dependencies)
 * - Acceptance criteria checklist
 * - Attachments (real-time from database)
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Clock, 
  FileText,
  Upload,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  Download,
  Trash2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth';

interface FeatureOverviewTabProps {
  feature: {
    id: string;
    description: string | null;
    acceptance_criteria: string | null;
    updated_at: string | null;
    owner?: { id: string; full_name: string } | null;
  };
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

// Parse acceptance criteria from text (line-separated)
function parseAcceptanceCriteria(text: string | null): { id: string; text: string; checked: boolean }[] {
  if (!text) return [];
  
  return text.split('\n')
    .filter(line => line.trim())
    .map((line, idx) => {
      const isChecked = line.startsWith('[x]') || line.startsWith('[X]');
      const cleanText = line.replace(/^\[(x|X|\s)\]\s*/, '').trim();
      return {
        id: `ac-${idx}`,
        text: cleanText,
        checked: isChecked,
      };
    });
}

function getFileIcon(mimeType: string, fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return <ImageIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
  }
  if (mimeType.includes('pdf') || ext === 'pdf') {
    return <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />;
  }
  if (['fig', 'sketch', 'xd'].includes(ext || '')) {
    return <ImageIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
  }
  if (['doc', 'docx'].includes(ext || '') || mimeType.includes('document')) {
    return <File className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
  }
  if (['xls', 'xlsx'].includes(ext || '') || mimeType.includes('spreadsheet')) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />;
  }
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function FeatureOverviewTab({ feature }: FeatureOverviewTabProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const criteria = parseAcceptanceCriteria(feature.acceptance_criteria);

  // Fetch attachments from database
  const { data: attachments = [], isLoading: attachmentsLoading } = useQuery({
    queryKey: ['feature-attachments', feature.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('attachments')
        .select('*')
        .eq('entity_id', feature.id)
        .eq('entity_type', 'features')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Attachment[];
    },
  });

  // Real-time subscription for attachments
  useEffect(() => {
    const channel = supabase
      .channel(`feature-attachments-${feature.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attachments',
          filter: `entity_id=eq.${feature.id}`,
        },
        (payload) => {
          console.log('Attachment change:', payload);
          queryClient.invalidateQueries({ queryKey: ['feature-attachments', feature.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [feature.id, queryClient]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const authUser = (await supabase.auth.getUser()).data.user;
      if (!authUser) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const filePath = `${authUser.id}/${feature.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await (supabase as any)
        .from('attachments')
        .insert({
          entity_id: feature.id,
          entity_type: 'features',
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          uploaded_by: authUser.id,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-attachments', feature.id] });
      toast.success('File uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error('Upload failed', { description: error.message });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await (supabase as any)
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-attachments', feature.id] });
      toast.success('File deleted');
    },
    onError: (error: Error) => {
      toast.error('Delete failed', { description: error.message });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMutation.mutateAsync(file);
      }
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const downloadFile = async (attachment: Attachment) => {
    const { data, error } = await supabase.storage
      .from('attachments')
      .download(attachment.file_path);

    if (error) {
      toast.error('Download failed', { description: error.message });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Mock readiness data
  const readinessData = {
    approvalsPending: 2,
    exceptions: 1,
    dependenciesClear: 3,
    dependenciesTotal: 4,
  };

  const handleCriteriaToggle = (id: string, checked: boolean) => {
    // In a real implementation, this would update the acceptance_criteria text
    toast.success('Acceptance criteria updated');
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Description */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          Description
        </h3>
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
          {feature.description ? (
            <div dangerouslySetInnerHTML={{ __html: feature.description.replace(/\n/g, '<br/>') }} />
          ) : (
            <p className="text-muted-foreground italic">No description provided.</p>
          )}
        </div>
      </section>

      {/* Readiness Snapshot */}
      <section className="bg-muted/30 border rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-brand-primary" />
            <span className="font-medium">{readinessData.approvalsPending}</span>
            <span className="text-muted-foreground">Approvals Pending</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-status-warning" />
            <span className="font-medium">{readinessData.exceptions}</span>
            <span className="text-muted-foreground">Exception</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-primary" />
            <span className="font-medium">{readinessData.dependenciesClear}/{readinessData.dependenciesTotal}</span>
            <span className="text-muted-foreground">Deps Clear</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Updated{' '}
            <strong className="text-foreground">
              {feature.updated_at 
                ? format(new Date(feature.updated_at), "'at' h:mm a 'on' MMM d, yyyy")
                : 'recently'
              }
            </strong>
            {feature.owner && (
              <span> by {feature.owner.full_name}</span>
            )}
          </span>
        </div>
      </section>

      {/* Acceptance Criteria */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          Acceptance Criteria
        </h3>
        {criteria.length > 0 ? (
          <div className="space-y-3">
            {criteria.map((criterion) => (
              <label 
                key={criterion.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  criterion.checked 
                    ? "bg-status-success/5 border-status-success/30" 
                    : "bg-card hover:bg-muted/50"
                )}
              >
                <Checkbox 
                  checked={criterion.checked}
                  onCheckedChange={(checked) => handleCriteriaToggle(criterion.id, !!checked)}
                  className="mt-0.5"
                />
                <span className={cn(
                  "text-sm leading-relaxed",
                  criterion.checked && "text-muted-foreground line-through"
                )}>
                  {criterion.text}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            No acceptance criteria defined.
          </div>
        )}
      </section>

      {/* Attachments */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Attachments
          </h3>
          <div>
            <input
              type="file"
              id="feature-file-upload"
              className="hidden"
              onChange={handleFileSelect}
              multiple
              disabled={uploading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('feature-file-upload')?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>

        {attachmentsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading attachments...
          </div>
        ) : attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div 
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group"
              >
                {getFileIcon(attachment.mime_type, attachment.file_name)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {attachment.file_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)} · Uploaded {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadFile(attachment)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {attachment.uploaded_by === user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(attachment)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic py-4 text-center border border-dashed rounded-lg">
            No attachments yet. Upload files to get started.
          </div>
        )}
      </section>
    </div>
  );
}
