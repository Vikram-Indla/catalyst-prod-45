/**
 * BrAttachmentsSection — APPROVED ADAPTER (not a fork).
 *
 * Per CLAUDE.md `REUSE FIRST` carve-out (2026-06-21 Phase 3 assessment):
 * canonical `AttachmentsSection` (story-detail-modules/AttachmentsSection.tsx)
 * is welded to the `PhAttachment` shape (`work_item_id`, `storage_path`,
 * permission check via `ph_project_members`, delete via `attachment-delete`
 * edge function, download-all via `attachment-download-all`). BR persists to
 * `business_request_links` with a different shape (`business_request_id`,
 * `file_path`, extra `title`/`url`/`link_type`/`kind`/`added_by_name`
 * columns) and has no project-membership concept.
 *
 * Promoting to canonical requires extracting an internal UI primitive from
 * canonical AttachmentsSection that accepts column-name + permission +
 * delete-path adapters. Tracked as a follow-up; current adapter ships.
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IconButton } from '@atlaskit/button/new';
import UploadIcon from '@atlaskit/icon/glyph/upload';
import AttachmentIcon from '@atlaskit/icon/glyph/attachment';
import DownloadIcon from '@atlaskit/icon/glyph/download';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import ChevronRightIcon from '@atlaskit/icon/utility/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import Tooltip from '@atlaskit/tooltip';
import { token } from '@atlaskit/tokens';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { flag } from '@/components/shared/JiraTable/flags';
import type { BusinessRequest } from '@/types/business-request';

const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6 MB / file
const MAX_TOTAL = 30 * 1024 * 1024; // 30 MB / BR

const FILE_TYPE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pdf: { label: 'PDF', color: 'var(--ds-text-danger, #AE2A19)', bg: 'var(--ds-background-danger, #FFECEB)' },
  xls: { label: 'XLS', color: 'var(--ds-text-success, #216E4E)', bg: 'var(--ds-background-success, #DCFFF1)' },
  xlsx: { label: 'XLS', color: 'var(--ds-text-success, #216E4E)', bg: 'var(--ds-background-success, #DCFFF1)' },
  csv: { label: 'XLS', color: 'var(--ds-text-success, #216E4E)', bg: 'var(--ds-background-success, #DCFFF1)' },
  doc: { label: 'DOC', color: 'var(--ds-text-information, #0055CC)', bg: 'var(--ds-background-information, #E9F2FF)' },
  docx: { label: 'DOC', color: 'var(--ds-text-information, #0055CC)', bg: 'var(--ds-background-information, #E9F2FF)' },
  png: { label: 'IMG', color: 'var(--ds-text-discovery, #5E4DB2)', bg: 'var(--ds-background-discovery, #F3F0FF)' },
  jpg: { label: 'IMG', color: 'var(--ds-text-discovery, #5E4DB2)', bg: 'var(--ds-background-discovery, #F3F0FF)' },
  jpeg: { label: 'IMG', color: 'var(--ds-text-discovery, #5E4DB2)', bg: 'var(--ds-background-discovery, #F3F0FF)' },
  gif: { label: 'IMG', color: 'var(--ds-text-discovery, #5E4DB2)', bg: 'var(--ds-background-discovery, #F3F0FF)' },
  webp: { label: 'IMG', color: 'var(--ds-text-discovery, #5E4DB2)', bg: 'var(--ds-background-discovery, #F3F0FF)' },
  svg: { label: 'IMG', color: 'var(--ds-text-discovery, #5E4DB2)', bg: 'var(--ds-background-discovery, #F3F0FF)' },
};
const DEFAULT_TYPE = { label: 'FILE', color: 'var(--ds-text-subtlest, #626F86)', bg: 'var(--ds-background-neutral, #F1F2F4)' };

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
  // Collapsible — mirrors Story AttachmentsSection (default collapsed when empty)
  const [collapsed, setCollapsed] = useState(true);

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

  // Auto-expand once attachments exist (parity with Story's collapse-when-empty default)
  useEffect(() => {
    if (files.length > 0) setCollapsed(false);
  }, [files.length]);

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
      {/* Section header — matches SubtasksPanel + LinkedWorkItemsHeader:
          24x24 chevron button (only click target) with rounded hover bg
          + Tooltip "Collapse"/"Expand". Title h2 outside button. Title
          click does nothing. Mirrors Jira pattern (live screenshot 2026-06-21). */}
      <div
        className="br-att-header"
        style={{
          display: 'flex', alignItems: 'center', gap: 0, padding: '6px 0',
          marginBottom: 4, userSelect: 'none',
        }}
      >
        <Tooltip content={collapsed ? 'Expand' : 'Collapse'} position="bottom">
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, marginLeft: -4,
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--ds-text-subtle, #505258)', borderRadius: 3,
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9, 30, 66, 0.06))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {collapsed
              ? <ChevronRightIcon label="" color="currentColor" />
              : <ChevronDownIcon label="" color="currentColor" />
            }
          </button>
        </Tooltip>
        <h2
          onClick={() => setCollapsed(c => !c)}
          style={{ margin: 0, padding: '0 4px', fontSize: 16, fontWeight: 653, lineHeight: '20px', color: 'var(--ds-text, #292A2E)', cursor: 'pointer' }}
        >
          Attachments
        </h2>
        {files.length > 0 && (
          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ds-text-subtlest, #626F86)', marginLeft: 4 }}>
            {files.length}
          </span>
        )}
      </div>

      {!collapsed && (<>
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
              : token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')
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
            color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
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
              border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
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
                  border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
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
      </>)}
    </section>
  );
}

export default BrAttachmentsSection;
