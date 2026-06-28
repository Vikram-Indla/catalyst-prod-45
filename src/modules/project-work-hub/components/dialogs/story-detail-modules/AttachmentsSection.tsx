/**
 * AttachmentsSection — Jira-parity attachments table with full CRUD.
 * - Drag-drop multi upload + per-file progress
 * - Per-row delete (uploader OR project admin/owner)
 * - Filename click → AttachmentPreviewModal (image/PDF/fallback)
 * - "..." menu → Download all (zip via attachment-download-all edge function)
 * - 25MB max, blocked extensions client-side
 * - V12 tokens, ECLIPSE DARK MODE-aware via Tailwind dark: classes (no inline overrides)
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { useAddAttachmentListener } from '@/components/catalyst-detail-views/shared/sections/quickActionsBus';
import { useQueryClient, useQuery } from '@tanstack/react-query';
/* jira-compare 2026-05-03 — Patch D3 (lucide sweep) ·
   Trash2  → @atlaskit/icon/core/delete
   Download → @atlaskit/icon/core/download
   Loader2 → @atlaskit/spinner (component, replaces .att-spin keyframes for the
              download-all CTA) */
import DeleteIcon from '@atlaskit/icon/core/delete';
import DownloadIcon from '@atlaskit/icon/core/download';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/utility/chevron-right';
import Tooltip from '@atlaskit/tooltip';
import Spinner from '@atlaskit/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import type { PhAttachment } from './types';
import './AttachmentsSection.css';

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB
const BLOCKED_EXTS = ['exe', 'bat', 'sh', 'msi', 'cmd', 'com', 'scr'];

// Re-export for backward compatibility
export type { PhAttachment };

type WorkItemSource = 'jira' | 'catalyst';

interface AttachmentsSectionProps {
  attachments: PhAttachment[];
  itemId: string;
  userId: string;
  projectKey?: string;
  /** Routes table + storage bucket. Defaults to 'jira' for back-compat. */
  source?: WorkItemSource;
}

interface UploadProgress {
  id: string;
  fileName: string;
  pct: number;
  status: 'uploading' | 'error';
  error?: string;
  controller?: AbortController;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  // Jira-parity card timestamp: "22 May 2026, 03:21 PM"
  const datePart = d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const timePart = d.toLocaleString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

function splitFilename(name: string): [string, string] {
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx === -1) return [name, ''];
  return [name.slice(0, dotIdx), name.slice(dotIdx)];
}

/**
 * Middle-truncate filename for card labels — "Screenshot 20…917.png".
 * Preserves the extension and the last few characters of the basename.
 */
function truncateFilenameMiddle(name: string, maxLength = 22): string {
  if (name.length <= maxLength) return name;
  const [base, ext] = splitFilename(name);
  const reserved = 1 + ext.length; // 1 char for the ellipsis
  const remaining = Math.max(maxLength - reserved, 6);
  const headLen = Math.ceil(remaining * 0.7);
  const tailLen = Math.max(remaining - headLen, 3);
  if (base.length <= headLen + tailLen) return name;
  return `${base.slice(0, headLen)}…${base.slice(-tailLen)}${ext}`;
}

function validateFile(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `File too large (${formatSize(file.size)}). Max 25MB.`;
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (BLOCKED_EXTS.includes(ext)) {
    return `Blocked file type: .${ext}`;
  }
  return null;
}

export function AttachmentsSection({ attachments, itemId, userId, projectKey, source = 'jira' }: AttachmentsSectionProps) {
  // Source-aware bucket + table routing — Catalyst items live in
  // catalyst-attachments bucket + catalyst_attachments table; Jira items
  // continue to use the legacy `attachments` bucket + ph_attachments table.
  const BUCKET = source === 'catalyst' ? 'catalyst-attachments' : 'attachments';
  const ATTACHMENTS_TABLE = source === 'catalyst' ? 'catalyst_attachments' : 'ph_attachments';
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(attachments.length === 0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [pendingDelete, setPendingDelete] = useState<PhAttachment | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);
  const sectionRootRef = useRef<HTMLDivElement>(null);

  // Determine if current user is project admin/owner (used for canDelete)
  const { data: userRole } = useQuery({
    queryKey: ['ph-project-role', projectKey, userId],
    enabled: !!projectKey && !!userId,
    queryFn: async () => {
      const { data: project } = await supabase.from('ph_projects').select('id').eq('key', projectKey!).maybeSingle();
      if (!project?.id) return null;
      const { data: member } = await supabase
        .from('ph_project_members')
        .select('role')
        .eq('project_id', project.id)
        .eq('user_id', userId)
        .maybeSingle();
      return member?.role ?? null;
    },
  });

  const isProjectAdmin = userRole === 'admin' || userRole === 'owner';

  // Cross-component bridge: CatalystQuickActions' "Add attachment" menu
  // item emits via quickActionsBus. Expand the panel if collapsed,
  // smooth-scroll the section into view, then open the native file
  // picker. The .click() runs synchronously inside the listener call
  // chain that started with the user's click in CatalystQuickActions,
  // so the browser preserves user-activation and allows the dialog.
  useAddAttachmentListener(
    useCallback(() => {
      if (collapsed) setCollapsed(false);
      requestAnimationFrame(() => {
        sectionRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      fileInputRef.current?.click();
    }, [collapsed]),
  );

  // Close more menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [moreMenuOpen]);

  // Jira parity: card grid is always newest-first by date added.
  const sorted = useMemo(
    () => [...attachments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
    [attachments],
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ph-attachments', itemId] });
  }, [queryClient, itemId]);

  /* ───── UPLOAD ───── */
  const uploadFile = useCallback(async (file: File) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const validationErr = validateFile(file);
    if (validationErr) {
      setUploads(u => [...u, { id, fileName: file.name, pct: 0, status: 'error', error: validationErr }]);
      catalystToast.error(validationErr);
      return;
    }

    setUploads(u => [...u, { id, fileName: file.name, pct: 5, status: 'uploading' }]);

    try {
      const ext = file.name.split('.').pop();
      const path = `attachments/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      // Simulate progress (Supabase JS upload doesn't expose progress events)
      const progressTimer = setInterval(() => {
        setUploads(u => u.map(x => x.id === id && x.status === 'uploading' && x.pct < 90
          ? { ...x, pct: Math.min(90, x.pct + 10) } : x));
      }, 200);

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || 'application/octet-stream',
      });
      clearInterval(progressTimer);
      if (uploadError) throw new Error(uploadError.message);

      const { error: dbError } = await supabase.from(ATTACHMENTS_TABLE as any).insert({
        work_item_id: itemId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: path,
        uploaded_by: userId,
      } as any);
      if (dbError) {
        // Best-effort cleanup of storage on DB failure
        await supabase.storage.from(BUCKET).remove([path]);
        throw new Error(dbError.message);
      }

      setUploads(u => u.map(x => x.id === id ? { ...x, pct: 100, status: 'uploading' } : x));
      // Remove from list after a beat
      setTimeout(() => setUploads(u => u.filter(x => x.id !== id)), 600);
      invalidate();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setUploads(u => u.map(x => x.id === id ? { ...x, status: 'error', error: msg } : x));
      catalystToast.error(`Failed: ${file.name} — ${msg}`);
    }
  }, [itemId, userId, invalidate]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (collapsed) setCollapsed(false);
    await Promise.allSettled(files.map(f => uploadFile(f)));
  }, [collapsed, uploadFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) uploadFiles(Array.from(files));
    e.target.value = '';
  };

  /* ───── DRAG / DROP ───── */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    dragCounter.current += 1;
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) { dragCounter.current = 0; setIsDragging(false); }
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) uploadFiles(files);
  };

  /* ───── DELETE ───── */
  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const att = pendingDelete;
    setPendingDelete(null);
    try {
      if (source === 'catalyst') {
        // Catalyst path — inline delete (no dedicated edge function yet).
        // RLS on catalyst_attachments enforces uploader-or-admin permission.
        await supabase.storage.from(BUCKET).remove([att.storage_path]);
        const { error: dbErr } = await supabase.from(ATTACHMENTS_TABLE as any).delete().eq('id', att.id);
        if (dbErr) throw dbErr;
      } else {
        // Jira path — go through hardened edge function (handles signed cleanup).
        const { data, error } = await supabase.functions.invoke('attachment-delete', {
          body: { attachmentId: att.id },
        });
        if (error) throw error;
        if (data && (data as any).error) throw new Error((data as any).error);
      }
      catalystToast.success('Attachment deleted');
      invalidate();
    } catch (e) {
      catalystToast.error(`Delete failed: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
  }, [pendingDelete, invalidate, source, BUCKET, ATTACHMENTS_TABLE]);

  /* ───── DOWNLOAD ALL (zip) ───── */
  const handleDownloadAll = useCallback(async () => {
    if (attachments.length === 0) return;
    setMoreMenuOpen(false);
    setZipping(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/attachment-download-all`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ issueId: itemId }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({ error: 'Zip failed' }));
        throw new Error(errBody.error || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const cd = resp.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename="([^"]+)"/);
      const filename = m?.[1] || 'attachments.zip';
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      catalystToast.success('Download ready');
    } catch (e) {
      catalystToast.error(`Download all failed: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setZipping(false);
    }
  }, [attachments.length, itemId]);

  const canDelete = (att: PhAttachment) => att.uploaded_by === userId || isProjectAdmin;

  return (
    <div
      ref={sectionRootRef}
      className={`att-section ${isDragging ? 'att-section--dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input — kept OUTSIDE the {!collapsed} gate so it
          stays in the DOM at all times. The PlusIcon header button calls
          it via fileInputRef, and CatalystQuickActions' "Add attachment"
          listener calls it the same way; both need the ref to be set
          even while the panel is collapsed. */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {/* Section Header */}
      <div role="heading" className="att-heading-wrapper">
        <div className="att-heading-inner">
          <div className="att-heading-left">
            <div className="att-heading-toggle-area">
              <Tooltip content={collapsed ? 'Expand' : 'Collapse'} position="bottom">
                <button
                  className="att-icon-btn att-collapse-btn"
                  aria-label={collapsed ? 'Expand' : 'Collapse'}
                  aria-expanded={!collapsed}
                  onClick={() => setCollapsed(v => !v)}
                >
                  {collapsed
                    ? <ChevronRightIcon label="" color="var(--ds-text-subtle)" />
                    : <ChevronDownIcon label="" color="var(--ds-text-subtle)" />
                  }
                </button>
              </Tooltip>
              <span
                className="att-heading-label"
                onClick={() => setCollapsed(v => !v)}
                style={{ cursor: 'pointer' }}
              >
                Attachments
              </span>
            </div>
            {/* jira-compare 2026-05-10 — A5: gated per CLAUDE.md 2026-05-05
                section-count-badge ban. Never render a zero badge. */}
            {attachments.length > 0 && (
              <div className="att-badge-wrapper">
                <span className="att-badge">{attachments.length}</span>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="att-heading-actions">
              <div style={{ position: 'relative' }} ref={moreMenuRef}>
                <button
                  className="att-icon-btn"
                  title="More options for attachments"
                  onClick={() => setMoreMenuOpen(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={moreMenuOpen}
                >
                  <DotsIcon />
                </button>
                {moreMenuOpen && (
                  <div className="att-more-menu" role="menu">
                    <button
                      className="att-menu-item"
                      onClick={handleDownloadAll}
                      disabled={attachments.length === 0 || zipping}
                      role="menuitem"
                    >
                      {zipping ? <Spinner size="small" /> : <DownloadIcon label="Download" />}
                      <span style={{ marginLeft: 4 }}>Download all</span>
                      <span className="att-menu-badge">{attachments.length}</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                className="att-icon-btn"
                title="Add Attachment"
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusIcon />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drop overlay (visible only while dragging) */}
      {isDragging && (
        <div className="att-drop-overlay" aria-hidden="true">
          <span>Drop files to upload</span>
        </div>
      )}

      {/* Body */}
      {!collapsed && (
        <div className="att-body">
          {/* Upload progress rows */}
          {uploads.length > 0 && (
            <div className="att-upload-list">
              {uploads.map(u => (
                <div key={u.id} className={`att-upload-row att-upload-row--${u.status}`}>
                  <div className="att-upload-name" title={u.fileName}>{u.fileName}</div>
                  {u.status === 'uploading' ? (
                    <>
                      <div className="att-upload-bar"><div className="att-upload-bar-fill" style={{ width: `${u.pct}%` }} /></div>
                      <span className="att-upload-pct">{u.pct}%</span>
                    </>
                  ) : (
                    <>
                      <span className="att-upload-error">{u.error}</span>
                      <button
                        className="att-upload-retry"
                        onClick={() => setUploads(list => list.filter(x => x.id !== u.id))}
                      >Dismiss</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {attachments.length === 0 && uploads.length === 0 ? (
            <div className="att-empty">
              <div className="att-empty-text">No attachments yet</div>
              <button
                className="att-empty-cta"
                onClick={() => fileInputRef.current?.click()}
              >Drop files here or click to upload</button>
            </div>
          ) : attachments.length > 0 ? (
            <div className="att-grid" role="list">
              {sorted.map(att => (
                <AttachmentCard
                  key={att.id}
                  attachment={att}
                  canDelete={canDelete(att)}
                  bucket={BUCKET}
                  onPreview={() => setPreviewId(att.id)}
                  onDelete={() => setPendingDelete(att)}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.file_name} will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-[var(--ds-background-danger-bold)] hover:bg-[var(--ds-background-danger-bold-hovered)] text-white"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview modal */}
      {previewId && (
        <AttachmentPreviewModal
          attachments={sorted}
          initialId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}

/* ── Card ── */
function AttachmentCard({ attachment, canDelete, bucket, onPreview, onDelete }: {
  attachment: PhAttachment;
  canDelete: boolean;
  bucket: string;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const isImage = attachment.mime_type?.startsWith('image/');
  const isVideo = attachment.mime_type?.startsWith('video/');
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Sign URL for thumbnail (image) and download
  useEffect(() => {
    let cancelled = false;
    supabase.storage.from(bucket).createSignedUrl(attachment.storage_path, 600).then(({ data }) => {
      if (cancelled) return;
      const url = data?.signedUrl ?? null;
      setDownloadUrl(url);
      if (isImage) setThumbUrl(url);
    });
    return () => { cancelled = true; };
  }, [attachment.storage_path, isImage, bucket]);

  const displayName = truncateFilenameMiddle(attachment.file_name);

  return (
    <div
      className="att-card"
      role="listitem"
      tabIndex={0}
      aria-label={`Preview ${attachment.file_name}`}
      onClick={onPreview}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPreview(); } }}
    >
      <div className="att-card__thumb">
        {isImage && thumbUrl ? (
          <img src={thumbUrl} alt="" className="att-card__thumb-img" />
        ) : isVideo ? (
          <div className="att-card__thumb-fallback">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </div>
        ) : (
          <div className="att-card__thumb-fallback">
            <FileIcon />
          </div>
        )}

        {/* Hover-revealed actions */}
        <div className="att-card__actions" onClick={(e) => e.stopPropagation()}>
          {downloadUrl && (
            <a
              className="att-action-btn att-download-btn"
              href={downloadUrl}
              download={attachment.file_name}
              title="Download"
            >
              <DownloadIcon label="Download" />
            </a>
          )}
          {canDelete && (
            <button
              className="att-action-btn att-delete-btn"
              title="Delete"
              onClick={onDelete}
              aria-label="Delete attachment"
            >
              <DeleteIcon label="Delete" />
            </button>
          )}
        </div>
      </div>

      <div className="att-card__name" title={attachment.file_name}>
        {displayName}
      </div>
      <div className="att-card__date">
        {formatDate(attachment.created_at)}
      </div>
    </div>
  );
}

/* ─────────── SVG Icons ─────────── */

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fill="currentColor" fillRule="evenodd"
        d="M0 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0m6.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0M13 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fill="currentColor" fillRule="evenodd"
        d="M7.25 8.75V15h1.5V8.75H15v-1.5H8.75V1h-1.5v6.25H1v1.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="4" fill="var(--ds-surface-sunken, var(--cp-bg-sunken))" />
      <path d="M10 8h8l6 6v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        fill="var(--ds-background-neutral)" stroke="var(--ds-border)" strokeWidth="1" />
      <path d="M18 8v6h6" fill="none" stroke="var(--ds-border)" strokeWidth="1" />
    </svg>
  );
}
