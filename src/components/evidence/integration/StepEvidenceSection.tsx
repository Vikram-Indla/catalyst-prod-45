/**
 * Step Evidence Section Component
 * Integrates upload zone and gallery within test step execution UI
 */

import React, { useState, useEffect } from 'react';
import { Camera, ChevronDown, Paperclip, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { EvidenceUploadZone } from '../EvidenceUploadZone';
import { EvidenceGallery } from '../EvidenceGallery';
import { Attachment } from '../types';
import { toast } from 'sonner';

interface StepEvidenceSectionProps {
  stepResultId: string;
  executionResultId: string;
  initialAttachments?: Attachment[];
  isExecutionComplete?: boolean;
  onAttachmentsChange?: (attachments: Attachment[]) => void;
}

export const StepEvidenceSection: React.FC<StepEvidenceSectionProps> = ({
  stepResultId,
  executionResultId,
  initialAttachments = [],
  isExecutionComplete = false,
  onAttachmentsChange,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [isExpanded, setIsExpanded] = useState(true);

  // Real-time subscription to attachment changes
  useEffect(() => {
    const channel = supabase
      .channel(`attachments:${stepResultId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'step_result_attachments',
          filter: `step_result_id=eq.${stepResultId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAttachment = mapDbToAttachment(payload.new);
            setAttachments((prev) => {
              if (prev.some((a) => a.id === newAttachment.id)) return prev;
              return [...prev, newAttachment];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedAttachment = mapDbToAttachment(payload.new);
            if (payload.new.deleted_at) {
              setAttachments((prev) => prev.filter((a) => a.id !== payload.new.id));
            } else {
              setAttachments((prev) =>
                prev.map((a) => (a.id === updatedAttachment.id ? updatedAttachment : a))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setAttachments((prev) => prev.filter((a) => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stepResultId]);

  // Notify parent of changes
  useEffect(() => {
    onAttachmentsChange?.(attachments);
  }, [attachments, onAttachmentsChange]);

  const mapDbToAttachment = (data: any): Attachment => ({
    id: data.id,
    fileName: data.file_name,
    fileSize: data.file_size,
    mimeType: data.mime_type,
    storagePath: data.storage_path,
    captureMethod: data.capture_method,
    width: data.width,
    height: data.height,
    annotations: data.annotations,
    ocrText: data.ocr_text,
    aiHasIssues: data.ai_has_issues,
    createdAt: data.created_at,
  });

  const handleUploadComplete = (attachment: Attachment) => {
    setAttachments((prev) => [...prev, attachment]);
  };

  const handleUploadError = (error: string) => {
    toast.error(error);
  };

  const handleDeleteAttachment = async (id: string) => {
    try {
      await supabase
        .from('step_result_attachments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      toast.success('Evidence deleted');
    } catch (error) {
      toast.error('Failed to delete evidence');
    }
  };

  const handleAnnotate = (id: string) => {
    // This would open the annotation editor - to be wired up by parent component
    console.log('Open annotation editor for:', id);
  };

  const handleRefresh = async () => {
    const { data } = await supabase
      .from('step_result_attachments')
      .select('*')
      .eq('step_result_id', stepResultId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (data) {
      setAttachments(data.map(mapDbToAttachment));
    }
  };

  const hasAiIssues = attachments.some((a) => a.aiHasIssues);

  return (
    <div className="border-t">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium text-foreground flex items-center gap-2">
          <Camera className="w-4 h-4" />
          Evidence ({attachments.length})
          {hasAiIssues && (
            <span className="w-2 h-2 bg-destructive rounded-full" title="AI detected issues" />
          )}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform text-muted-foreground',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {isExecutionComplete ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Execution completed</p>
              <p className="text-xs">Evidence upload disabled</p>
            </div>
          ) : (
            <>
              {/* Upload Zone */}
              <EvidenceUploadZone
                stepResultId={stepResultId}
                executionResultId={executionResultId}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                disabled={isExecutionComplete}
              />

              {/* Keyboard Shortcuts Banner */}
              <div className="text-xs text-muted-foreground text-center py-2 bg-muted/50 rounded-lg flex items-center justify-center gap-4">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">
                    Ctrl+Shift+S
                  </kbd>{' '}
                  Capture
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">
                    Ctrl+V
                  </kbd>{' '}
                  Paste
                </span>
              </div>
            </>
          )}

          {/* Gallery */}
          {attachments.length > 0 && (
            <EvidenceGallery
              stepResultId={stepResultId}
              attachments={attachments}
              onDelete={handleDeleteAttachment}
              onAnnotate={handleAnnotate}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Attachment Count Badge for Step Headers
 */
export const AttachmentCountBadge: React.FC<{
  count: number;
  hasAiIssues?: boolean;
}> = ({ count, hasAiIssues }) => {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
      <Paperclip className="w-3 h-3" />
      {count}
      {hasAiIssues && (
        <span className="w-2 h-2 bg-destructive rounded-full" title="AI detected issues" />
      )}
    </div>
  );
};
