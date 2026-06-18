import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConversationAttachments, type ChatAttachment } from '@/hooks/chat/useChatAttachments';

const SIGNED_TTL = 60 * 60;

export type AttachmentMap = Map<string, ChatAttachment[]>;

export function useMessageAttachments(conversationId: string | null): {
  byMessage: AttachmentMap;
  isLoading: boolean;
} {
  const { data: attachments, isLoading } = useConversationAttachments(conversationId);
  const [signed, setSigned] = useState<Record<string, string>>({});

  const paths = useMemo(() => (attachments ?? []).map(a => a.storagePath), [attachments]);
  const pathKey = paths.join('|');

  useEffect(() => {
    let cancelled = false;
    if (paths.length === 0) {
      setSigned({});
      return () => { cancelled = true; };
    }
    void (async () => {
      const { data } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrls(paths, SIGNED_TTL);
      if (cancelled || !data) return;
      const next: Record<string, string> = {};
      for (const row of data) {
        if (row.path && row.signedUrl) next[row.path] = row.signedUrl;
      }
      setSigned(next);
    })();
    return () => { cancelled = true; };
  }, [pathKey, paths]);

  const byMessage = useMemo<AttachmentMap>(() => {
    const map: AttachmentMap = new Map();
    for (const a of attachments ?? []) {
      const withUrl: ChatAttachment = { ...a, signedUrl: signed[a.storagePath] };
      const arr = map.get(a.messageId);
      if (arr) arr.push(withUrl);
      else map.set(a.messageId, [withUrl]);
    }
    // Stable order by createdAt asc per message.
    for (const arr of map.values()) {
      arr.sort((x, y) => x.createdAt.localeCompare(y.createdAt));
    }
    return map;
  }, [attachments, signed]);

  return { byMessage, isLoading };
}
