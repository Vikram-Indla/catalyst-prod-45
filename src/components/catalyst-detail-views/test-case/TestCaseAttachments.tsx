/**
 * TestCaseAttachments — Attachments surface for a tm_test_cases row.
 *
 * CAT-TESTHUB-REBUILD Phase 3: test cases were missing the Attachments UI that
 * the TestHub already has for other entities. This mirrors the canonical TestHub
 * attachment flow exactly:
 *   - table:  tm_attachments  (generic, keyed by entity_type + entity_id)
 *   - bucket: testhub-attachments  (the working, RLS-backed bucket the live
 *             ExecutionPage flow writes tm_attachments rows into; the defect
 *             hook's 'tm-attachments' bucket does not exist on cyij)
 *   - wired to entity_type='test_case', entity_id={testCaseId}
 *
 * Storage path idiom matches ExecutionPage: `{entity_type}/{entity_id}/{ts}-{name}`.
 * file_path stores the storage object path (not a public URL) — downloads
 * resolve via getPublicUrl at click time.
 *
 * Access model mirrors tm_attachments RLS on cyij:
 *   - SELECT/INSERT: any authenticated user
 *   - DELETE: uploader only (uploaded_by = auth.uid()) — delete control is
 *     therefore only offered on rows the current user uploaded.
 *
 * Zero-assumption: renders an explicit empty state when there are no
 * attachments — never a fabricated placeholder row.
 */
import React, { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import DeleteIcon from '@atlaskit/icon/core/delete';
import DownloadIcon from '@atlaskit/icon/core/download';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { useAuth } from '@/hooks/useAuth';

const BUCKET = 'testhub-attachments';
const ENTITY_TYPE = 'test_case';
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB — parity with AttachmentsSection

interface TestCaseAttachment {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string | null;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const datePart = d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${datePart}, ${timePart}`;
}

const iconButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 4,
  border: 'none',
  borderRadius: 4,
  background: 'none',
  cursor: 'pointer',
  color: 'var(--ds-icon-subtle)',
};

export function TestCaseAttachments({ testCaseId }: { testCaseId: string | null | undefined }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const queryKey = ['tm-attachments', ENTITY_TYPE, testCaseId];

  const { data: attachments = [], isLoading } = useQuery({
    queryKey,
    enabled: !!testCaseId,
    staleTime: 30_000,
    queryFn: async (): Promise<TestCaseAttachment[]> => {
      const { data, error } = await supabase
        .from('tm_attachments')
        .select('*')
        .eq('entity_type', ENTITY_TYPE)
        .eq('entity_id', testCaseId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TestCaseAttachment[];
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, testCaseId]);

  /* ── Upload: storage object + tm_attachments row, mirroring ExecutionPage. ── */
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!testCaseId) throw new Error('Missing test case');
      if (!user?.id) throw new Error('Not authenticated');
      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          throw new Error(`${file.name} exceeds the 25MB limit`);
        }
        const ext = file.name.split('.').pop() ?? 'bin';
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const storagePath = `${ENTITY_TYPE}/${testCaseId}/${safeName}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) throw upErr;
        const { error: insertErr } = await supabase.from('tm_attachments').insert({
          entity_type: ENTITY_TYPE,
          entity_id: testCaseId,
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
          mime_type: file.type || null,
          uploaded_by: user.id,
        });
        if (insertErr) throw insertErr;
      }
      return files.length;
    },
    onSuccess: (n) => {
      catalystToast.success(n === 1 ? 'File uploaded' : `${n} files uploaded`);
      invalidate();
    },
    onError: (err: Error) => {
      catalystToast.error('Failed to upload', err.message);
    },
  });

  /* ── Delete: storage object + row (uploader only per RLS). ── */
  const deleteMutation = useMutation({
    mutationFn: async (att: TestCaseAttachment) => {
      const { error: storageErr } = await supabase.storage.from(BUCKET).remove([att.file_path]);
      if (storageErr) throw storageErr;
      const { error } = await supabase.from('tm_attachments').delete().eq('id', att.id);
      if (error) throw error;
    },
    onSuccess: () => {
      catalystToast.success('Attachment deleted');
      invalidate();
    },
    onError: (err: Error) => {
      catalystToast.error('Failed to delete attachment', err.message);
    },
  });

  const handleDownload = useCallback(async (att: TestCaseAttachment) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(att.file_path);
    const url = data?.publicUrl;
    if (!url) {
      catalystToast.error('Could not resolve download URL');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handlePickFiles = useCallback(() => fileInputRef.current?.click(), []);

  const handleFilesSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = ''; // allow re-selecting the same file
      if (files.length === 0) return;
      setUploading(true);
      try {
        await uploadMutation.mutateAsync(files);
      } finally {
        setUploading(false);
      }
    },
    [uploadMutation],
  );

  if (!testCaseId) return null;

  return (
    <div style={{ padding: '8px 16px' }}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button appearance="default" onClick={handlePickFiles} isDisabled={uploading || !user?.id}>
          {uploading ? 'Uploading…' : 'Add attachment'}
        </Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spinner size="medium" />
        </div>
      ) : attachments.length === 0 ? (
        <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)', margin: 0 }}>
          No attachments yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {attachments.map((att) => {
            const canDelete = !!user?.id && att.uploaded_by === user.id;
            return (
              <div
                key={att.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  border: '1px solid var(--ds-border)',
                  borderRadius: 6,
                  background: 'var(--ds-surface-raised)',
                }}
              >
                <button
                  onClick={() => handleDownload(att)}
                  title={att.file_name}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--ds-text-brand)',
                    fontSize: 'var(--ds-font-size-300)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {att.file_name}
                </button>
                <span
                  style={{
                    fontSize: 'var(--ds-font-size-200)',
                    color: 'var(--ds-text-subtlest)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatSize(att.file_size)}
                </span>
                <span
                  style={{
                    fontSize: 'var(--ds-font-size-200)',
                    color: 'var(--ds-text-subtlest)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatDate(att.created_at)}
                </span>
                <Tooltip content="Download">
                  <button
                    type="button"
                    onClick={() => handleDownload(att)}
                    aria-label="Download attachment"
                    style={iconButtonStyle}
                  >
                    <DownloadIcon label="Download" />
                  </button>
                </Tooltip>
                {canDelete ? (
                  <Tooltip content="Delete">
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(att)}
                      aria-label="Delete attachment"
                      style={iconButtonStyle}
                    >
                      <DeleteIcon label="Delete" />
                    </button>
                  </Tooltip>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
