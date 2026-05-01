/**
 * BrAttachmentsSection — file attachments + drag-drop upload, ADS-only.
 *
 * Reads/writes `business_request_links` (the same table
 * `CreateBusinessRequestModal` writes BRD docs into) so a unified
 * attachments surface covers both BRD docs and any other files the user
 * wants to attach. Cycle 3 consolidates the cycle-1 split between
 * `BrBrdUploadSection` and `BrAttachmentsSection` into THIS section —
 * `BrBrdUploadSection` is left as a deprecated stub that renders nothing.
 *
 * Functional parity ports of `DetailTabAttachments` (the producthub
 * legacy panel):
 *  - Drag-drop + click-to-browse upload zone
 *  - Per-file size limit 6 MB / total cap 30 MB
 *  - Storage usage bar
 *  - Per-file Download / Delete buttons (Pin/Unpin dropped — the BR
 *    domain table has no `is_pinned` column; reintroduce in cycle 4 if
 *    needed via a migration)
 *  - File-type chip ([PDF | DOC | XLS | IMG | FILE])
 *  - Supabase storage bucket: `attachments` (matches CreateBR's writer)
 *
 * 100% ADS — `lucide-react` icons replaced with `@atlaskit/icon` glyphs:
 *   Upload   → @atlaskit/icon/glyph/upload
 *   Attach   → @atlaskit/icon/glyph/attachment
 *   Download → @atlaskit/icon/glyph/download
 *   Trash    → @atlaskit/icon/glyph/trash
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IconButton } from '@atlaskit/button/new';
import UploadIcon from '@atlaskit/icon/glyph/upload';
import AttachmentIcon from '@atlaskit/icon/glyph/attachment';
import DownloadIcon from '@atlaskit/icon/glyph/download';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import { token } from '@atlaskit/tokens';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { flag } from '@/components/shared/JiraTable/flags';
import type { BusinessRequest } from '@/types/business-request';

const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6 MB / file
const MAX_TOTAL = 30 * 1024 * 1024; // 30 MB / BR

const FILE_TYPE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pdf: { label: 'PDF', color: '#D92525', bg: '#D9252512' },
  xls: { label: 'XLS', color: '#0D7331', bg: '#0D733112' },
  xlsx: { label: 'XLS', color: '#0D7331', bg: '#0D733112' },
  csv: { label: 'XLS', color: '#0D7331', bg: '#0D733112' },
  doc: { label: 'DOC', color: 'var(--ds-text-brand, #2563EB)', bg: '#2563EB12' },
  docx: { label: 'DOC', color: 'var(--ds-text-brand, #2563EB)', bg: '#2563EB12' },
  png: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
  jpg: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
  jpeg: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
  gif: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
  webp: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
  svg: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
};
const DEFAULT_TYPE = { label: 'FILE', color: '#71717A', bg: '#71717A12' };

function getFileType(name: string) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return FILE_TYPE_MAP[ext] || DEFAULT_TYPE;
}

function formatSize(bytes: number) {
  if (!bytes) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function timeAgo(dateStr?: string | null) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

interface Props {
  request: BusinessRequest | null;
}

export function BrAttachmentsSection({ request }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const requestId = request?.id ?? null;

  const { data: files = [] } = useQuery({
    queryKey: ['br-view-attachments', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await typedQuery('business_request_links')
        .select('*')
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        file_name?: string | null;
        title?: string | null;
        file_path?: string | null;
        file_size?: number | null;
        mime_type?: string | null;
        url?: string | null;
        added_by_name?: string | null;
        created_at?: string | null;
        kind?: string | null;
      }>;
    },
  });

  const totalUsed = useMemo(
    () => files.reduce((s, f) => s + (f.file_size || 0), 0),
    [files],
  );
  const usedPct = Math.min(100, Math.round((totalUsed / MAX_TOTAL) * 100));

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!requestId) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        : { data: null };
      const actorName = profile?.full_name || user?.email || 'Unknown';

      let runningTotal = totalUsed;
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_FILE_SIZE) {
          flag.warning('File too large', `${file.name} exceeds the 6 MB per-file limit`);
          continue;
        }
        if (runningTotal + file.size > MAX_TOTAL) {
          flag.warning('Storage limit reached', 'Total storage cap is 30 MB per request');
          break;
        }
        const path = `${requestId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from('attachments')
          .upload(path, file);
        if (upErr) {
          flag.warning('Upload failed', `${file.name}: ${upErr.message}`);
          continue;
        }
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        const { error: dbErr } = await typedQuery('business_request_links').insert({
          business_request_id: requestId,
          title: file.name,
          url: urlData.publicUrl,
          link_type: 'documentation',
          kind: 'document',
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          uploaded_by: user?.id ?? null,
          added_by_name: actorName,
        });
        if (dbErr) {
          flag.warning('Save failed', `${file.name}: ${dbErr.message}`);
          continue;
        }
        runningTotal += file.size;
      }
      queryClient.invalidateQueries({ queryKey: ['br-view-attachments', requestId] });
    },
    [requestId, totalUsed, queryClient],
  );

  const handleDownload = (f: { url?: string | null; file_path?: string | null; file_name?: string | null; title?: string | null }) => {
    let downloadUrl = f.url;
    if (!downloadUrl && f.file_path) {
      const { data } = supabase.storage.from('attachments').getPublicUrl(f.file_path);
      downloadUrl = data?.publicUrl;
    }
    if (downloadUrl) {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } else {
      flag.warning('No download URL', `${f.file_name || f.title}`);
    }
  };

  const handleDelete = async (f: { id: string; file_path?: string | null; file_name?: string | null; title?: string | null }) => {
    if (!requestId) return;
    if (f.file_path) {
      await supabase.storage.from('attachments').remove([f.file_path]);
    }
    await typedQuery('business_request_links').delete().eq('id', f.id);
    flag.success(`Deleted ${f.file_name || f.title || 'attachment'}`);
    queryClient.invalidateQueries({ queryKey: ['br-view-attachments', requestId] });
  };

  if (!request) return null;

  return (
    <section
      data-cv-section="br-attachments"
      style={{ marginBottom: 20 }}
      aria-label="Attachments"
    >
      <div
        style={{
          fontSize: 11,
          color: token('color.text.subtle', '#6B6E76'),
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: 8,
          letterSpacing: '0.04em',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Attachments
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 84,
          padding: '14px 16px',
          borderRadius: 6,
          border: `2px dashed ${
            dragging
              ? token('color.border.brand', '#1868DB')
              : token('color.border', '#DFE1E6')
          }`,
          background: dragging
            ? token('color.background.selected', '#E9F2FF')
            : token('elevation.surface.sunken', '#F7F8F9'),
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'border-color 120ms, background 120ms',
        }}
      >
        <UploadIcon label="" size="medium" />
        <div
          style={{
            fontSize: 13,
            color: token('color.text.subtle', '#44546F'),
            fontFamily: 'var(--cp-font-body)',
            marginTop: 4,
          }}
        >
          Drag files here or{' '}
          <span style={{ color: token('color.link', '#0C66E4'), fontWeight: 600 }}>browse</span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: token('color.text.subtlest', '#8590A2'),
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          Max 6 MB per file · 30 MB total
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg"
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
      </div>

      {/* Storage bar */}
      <div
        style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: token('color.text.subtlest', '#6B6E76'),
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>{formatSize(totalUsed)} / 30 MB</span>
        <div
          style={{
            flex: 1,
            height: 4,
            borderRadius: 4,
            background: token('color.background.neutral', '#F4F5F7'),
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${usedPct}%`,
              height: '100%',
              background:
                usedPct > 95
                  ? token('color.background.danger.bold', '#C9372C')
                  : usedPct > 80
                    ? token('color.background.warning.bold', '#946F00')
                    : token('color.background.brand.bold', '#0C66E4'),
              transition: 'width 200ms',
            }}
          />
        </div>
        <span style={{ whiteSpace: 'nowrap' }}>{usedPct}%</span>
      </div>

      {/* File list */}
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {files.length === 0 ? (
          <div
            style={{
              padding: '20px 12px',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 6,
              textAlign: 'center',
              fontSize: 13,
              color: token('color.text.subtle', '#6B6E76'),
              fontFamily: 'var(--cp-font-body)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <AttachmentIcon label="" size="medium" />
            No attachments yet
          </div>
        ) : (
          files.map((f) => {
            const ft = getFileType(f.file_name || f.title || '');
            const displayName = f.file_name || f.title || 'Untitled';
            return (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  border: `1px solid ${token('color.border', '#DFE1E6')}`,
                  borderRadius: 6,
                  background: token('elevation.surface', '#FFFFFF'),
                  fontFamily: 'var(--cp-font-body)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: ft.bg,
                    color: ft.color,
                    fontSize: 10,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {ft.label}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: token('color.text', '#292A2E'),
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: token('color.text.subtlest', '#6B6E76'),
                      marginTop: 2,
                    }}
                  >
                    {formatSize(f.file_size || 0)} · {ft.label}
                    {f.added_by_name ? ` · ${f.added_by_name}` : ''}
                    {f.created_at ? ` · ${timeAgo(f.created_at)}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <IconButton
                    appearance="subtle"
                    spacing="compact"
                    label={`Download ${displayName}`}
                    icon={(props) => <DownloadIcon {...props} label="" size="small" />}
                    onClick={() => handleDownload(f)}
                  />
                  <IconButton
                    appearance="subtle"
                    spacing="compact"
                    label={`Delete ${displayName}`}
                    icon={(props) => <TrashIcon {...props} label="" size="small" />}
                    onClick={() => void handleDelete(f)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default BrAttachmentsSection;
