// ═══════════════════════════════════════════════════════════════════════════
// SIGNED URL MANAGEMENT HOOK
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Attachment } from '../types';
import { toast } from 'sonner';

export const useSignedUrls = (attachments: Attachment[]) => {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const loadSignedUrls = useCallback(async (atts: Attachment[]) => {
    if (atts.length === 0) return;
    
    setLoading(true);
    const urls: Record<string, string> = {};
    
    try {
      await Promise.all(
        atts.map(async (attachment) => {
          // Skip if we already have a valid URL for this attachment
          if (signedUrls[attachment.id]) {
            urls[attachment.id] = signedUrls[attachment.id];
            return;
          }

          const { data, error } = await supabase.storage
            .from('evidence')
            .createSignedUrl(attachment.storagePath, 3600); // 1 hour expiry
          
          if (error) {
            console.error('Failed to get signed URL:', error);
            return;
          }

          if (data?.signedUrl) {
            urls[attachment.id] = data.signedUrl;
          }
        })
      );
      
      setSignedUrls(prev => ({ ...prev, ...urls }));
    } catch (error) {
      console.error('Error loading signed URLs:', error);
    } finally {
      setLoading(false);
    }
  }, [signedUrls]);

  useEffect(() => {
    loadSignedUrls(attachments);
  }, [attachments, loadSignedUrls]);

  const refreshUrls = useCallback(() => {
    setSignedUrls({});
    loadSignedUrls(attachments);
  }, [attachments, loadSignedUrls]);

  return { signedUrls, loading, refreshUrls };
};

export const downloadFile = async (attachment: Attachment) => {
  try {
    const { data, error } = await supabase.storage
      .from('evidence')
      .createSignedUrl(attachment.storagePath, 60);
    
    if (error) throw error;

    if (data?.signedUrl) {
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    }
  } catch (error) {
    console.error('Download failed:', error);
    toast.error('Failed to generate download link');
  }
};
