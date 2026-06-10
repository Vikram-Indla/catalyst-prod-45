/**
 * useChatAttachments — list + upload attachments tied to a conversation.
 * Upload flow:
 *   1. PUT file into `chat-attachments` Storage bucket under <convId>/<uuid>-<name>
 *   2. INSERT chat_attachments row referencing the message + storage_path
 * The bucket is private; read uses createSignedUrl with a 60-min TTL.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChatAttachment {
  id: string;
  messageId: string;
  conversationId: string;
  uploaderId: string | null;
  storagePath: string;
  filename: string;
  mimeType: string | null;
  byteSize: number | null;
  createdAt: string;
  signedUrl?: string;
}

const SIGNED_TTL_SECONDS = 60 * 60;

// File type allowlist for chat attachments
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function uuid(): string {
  return (crypto && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface FileValidationError {
  filename: string;
  reason: 'invalid-type' | 'too-large' | 'unknown';
  message: string;
}

export function validateFile(file: File): FileValidationError | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      filename: file.name,
      reason: 'invalid-type',
      message: `File type not allowed: ${file.type || 'unknown'}`,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      filename: file.name,
      reason: 'too-large',
      message: `File exceeds 50 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
    };
  }
  return null;
}

export function useConversationAttachments(conversationId: string | null) {
  return useQuery({
    queryKey: ['chat', 'attachments', conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<ChatAttachment[]> => {
      if (!conversationId) return [];
      const { data, error } = await (supabase as any)
        .from('chat_attachments')
        .select('id, message_id, conversation_id, uploader_id, storage_path, filename, mime_type, byte_size, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error || !data) return [];
      const rows = data as Array<{
        id: string;
        message_id: string;
        conversation_id: string;
        uploader_id: string | null;
        storage_path: string;
        filename: string;
        mime_type: string | null;
        byte_size: number | null;
        created_at: string;
      }>;
      return rows.map((r) => ({
        id: r.id,
        messageId: r.message_id,
        conversationId: r.conversation_id,
        uploaderId: r.uploader_id,
        storagePath: r.storage_path,
        filename: r.filename,
        mimeType: r.mime_type,
        byteSize: r.byte_size,
        createdAt: r.created_at,
      }));
    },
  });
}

export interface UploadProgress {
  filename: string;
  loaded: number;
  total: number;
  percent: number;
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useCallback(
    async (params: {
      conversationId: string;
      messageId: string;
      file: File;
      onProgress?: (p: UploadProgress) => void;
    }): Promise<ChatAttachment | null> => {
      const { conversationId, messageId, file, onProgress } = params;
      const path = `${conversationId}/${uuid()}-${file.name}`;

      const { error: upErr } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (upErr) {
        console.error('chat-attachments upload failed', upErr);
        return null;
      }

      if (onProgress) {
        onProgress({ filename: file.name, loaded: file.size, total: file.size, percent: 100 });
      }

      const { data, error } = await (supabase as any)
        .from('chat_attachments')
        .insert({
          message_id: messageId,
          conversation_id: conversationId,
          storage_path: path,
          filename: file.name,
          mime_type: file.type || null,
          byte_size: file.size,
        })
        .select('id, message_id, conversation_id, uploader_id, storage_path, filename, mime_type, byte_size, created_at')
        .single();

      if (error || !data) {
        console.error('chat_attachments insert failed', error);
        return null;
      }

      qc.invalidateQueries({ queryKey: ['chat', 'attachments', conversationId] });

      const r = data as {
        id: string;
        message_id: string;
        conversation_id: string;
        uploader_id: string | null;
        storage_path: string;
        filename: string;
        mime_type: string | null;
        byte_size: number | null;
        created_at: string;
      };

      return {
        id: r.id,
        messageId: r.message_id,
        conversationId: r.conversation_id,
        uploaderId: r.uploader_id,
        storagePath: r.storage_path,
        filename: r.filename,
        mimeType: r.mime_type,
        byteSize: r.byte_size,
        createdAt: r.created_at,
      };
    },
    [qc],
  );
}

export function useBatchUploadAttachments() {
  const uploadAttachment = useUploadAttachment();

  return useCallback(
    async (params: {
      conversationId: string;
      messageId: string;
      files: File[];
      onProgress?: (filename: string, percent: number) => void;
      onError?: (error: FileValidationError) => void;
    }): Promise<ChatAttachment[]> => {
      const { conversationId, messageId, files, onProgress, onError } = params;
      const results: ChatAttachment[] = [];

      for (const file of files) {
        const validation = validateFile(file);
        if (validation) {
          onError?.(validation);
          continue;
        }

        const attachment = await uploadAttachment({
          conversationId,
          messageId,
          file,
          onProgress: (p) => onProgress?.(p.filename, p.percent),
        });

        if (attachment) {
          results.push(attachment);
        }
      }

      return results;
    },
    [uploadAttachment],
  );
}

export async function signAttachmentUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(storagePath, SIGNED_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}
