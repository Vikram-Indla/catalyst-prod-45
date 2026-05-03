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
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
/* jira-compare 2026-05-03 — Patch D3 (lucide sweep) ·
   Trash2  → @atlaskit/icon/core/delete
   Download → @atlaskit/icon/core/download
   Loader2 → @atlaskit/spinner (component, replaces .att-spin keyframes for the
              download-all CTA) */
import DeleteIcon from '@atlaskit/icon/core/delete';
import DownloadIcon from '@atlaskit/icon/core/download';
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
import './AttachmentsSection.css';

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB
const BLOCKED_EXTS = ['exe', 'bat', 'sh', 'msi', 'cmd', 'com', 'scr'];

export interface PhAttachment {
  id: string;
  work_item_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

type WorkItemSource = 'jira' | 'catalyst';

interface AttachmentsSectionProps {
  attachments: PhAttachment[];
  itemId: string;
  userId: string;
  projectKey?: string;
  /** Routes table + storage bucket. Defaults to 'jira' for back-compat. */
  source?: WorkItemSource;
}

type SortKey = 'name' | 'size' | 'dateAdded';
type SortDir = 'asc' | 'desc';

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
  return d.toLocaleString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function splitFilename(name: string): [string, string] {
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx === -1) return [name, ''];
  return [name.slice(0, dotIdx), name.slice(dotIdx)];
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
  const [sortKey, setSortKey] = useState<SortKey>('dateAdded');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [pendingDelete, setPendingDelete] = useState<PhAttachment | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = useMemo(() => [...attachments].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.file_name.localeCompare(b.file_name);
    else if (sortKey === 'size') cmp = a.file_size - b.file_size;
    else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  }), [attachments, sortKey, sortDir]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ph-attachments', itemId] });
  }, [queryClient, itemId]);

  /* ───── UPLOAD ───── */
  const uploadFile = useCallback(async (file: File) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const validationErr = validateFile(file);
    if (validationErr) {
      setUploads(u => [...u, { id, fileName: file.name, pct: 0, status: 'error', error: validationErr }]);
      toast.error(validationErr);
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
      toast.error(`Failed: ${file.name} — ${msg}`);
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
      toast.success('Attachment deleted');
      invalidate();
    } catch (e) {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : 'Unknown'}`);
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
      toast.success('Download ready');
    } catch (e) {
      toast.error(`Download all failed: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setZipping(false);
    }
  }, [attachments.length, itemId]);

  const canDelete = (att: PhAttachment) => att.uploaded_by === userId || isProjectAdmin;

  return (
    <div
      className={`att-section ${isDragging ? 'att-section--dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Section Header */}
      <div role="heading" className="att-heading-wrapper">
        <div className="att-heading-inner">
          <div className="att-heading-left">
            <div className="att-heading-toggle-area">
              <button
                className="att-icon-btn att-collapse-btn"
                aria-label={collapsed ? 'Expand Attachments' : 'Collapse Attachments'}
                onClick={() => setCollapsed(v => !v)}
              >
                <ChevronIcon collapsed={collapsed} />
              </button>
              <span className="att-heading-label">Attachments</span>
            </div>
            <div className="att-badge-wrapper">
              <span className="att-badge">{attachments.length}</span>
            </div>
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
                      <span style={{ marginLeft: 6 }}>Download all</span>
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
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
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
            <table className="att-table">
              <thead>
                <tr>
                  <th className="att-th att-th-name">
                    <button className="att-sort-btn" onClick={() => handleSort('name')}>
                      <span>Name</span>
                      <SortIcon active={sortKey === 'name'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="att-th att-th-size">
                    <button className="att-sort-btn" onClick={() => handleSort('size')}>
                      <span>Size</span>
                      <SortIcon active={sortKey === 'size'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="att-th att-th-date">
                    <button className="att-sort-btn" onClick={() => handleSort('dateAdded')}>
                      <span>Date added</span>
                      <SortIcon active={sortKey === 'dateAdded'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="att-th att-th-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(att => (
                  <AttachmentRow
                    key={att.id}
                    attachment={att}
                    canDelete={canDelete(att)}
                    bucket={BUCKET}
                    onPreview={() => setPreviewId(att.id)}
                    onDelete={() => setPendingDelete(att)}
                  />
                ))}
              </tbody>
            </table>
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
              className="bg-[#DE350B] hover:bg-[#BF2600] text-white"
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

/* ── Row ── */
function AttachmentRow({ attachment, canDelete, bucket, onPreview, onDelete }: {
  attachment: PhAttachment;
  canDelete: boolean;
  bucket: string;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const [base, ext] = splitFilename(attachment.file_name);
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

  return (
    <tr className="att-row">
      <td className="att-td att-td-name">
        <div
          className="att-file-row"
          role="button"
          tabIndex={0}
          aria-label={`Preview ${attachment.file_name}`}
          onClick={onPreview}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPreview(); } }}
        >
          <div className="att-thumb">
            {isImage && thumbUrl ? (
              <img src={thumbUrl} alt="" className="att-thumb-img" />
            ) : isVideo ? (
              <div className="att-thumb-fallback">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#42526E"><path d="M8 5v14l11-7z" /></svg>
              </div>
            ) : (
              <FileIcon />
            )}
          </div>
          <div className="att-filename">
            <div className="att-filename-inner">
              <span className="att-filename-base">{base}</span>
              <span className="att-filename-ext">{ext}</span>
            </div>
          </div>
        </div>
      </td>

      <td className="att-td att-td-size">{formatSize(attachment.file_size)}</td>
      <td className="att-td att-td-date">{formatDate(attachment.created_at)}</td>

      {/* Hover-revealed actions */}
      <td className="att-td att-td-actions-cell">
        <div className="att-row-actions">
          {downloadUrl && (
            <a
              className="att-action-btn att-download-btn"
              href={downloadUrl}
              download={attachment.file_name}
              title="Download"
              onClick={(e) => e.stopPropagation()}
            >
              <DownloadIcon label="Download" />
            </a>
          )}
          {canDelete && (
            <button
              className="att-action-btn att-delete-btn"
              title="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              aria-label="Delete attachment"
            >
              <DeleteIcon label="Delete" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─────────── SVG Icons ─────────── */

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 16 16"
      style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
      fill="none"
    >
      <path fill="currentColor"
        d="m14.53 6.03-6 6a.75.75 0 0 1-1.004.052l-.056-.052-6-6 1.06-1.06L8 10.44l5.47-5.47z"
      />
    </svg>
  );
}

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

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ color: active ? 'currentColor' : 'transparent', flexShrink: 0 }}
    >
      {dir === 'desc' || !active ? (
        <path fill="currentColor" fillRule="evenodd"
          d="M8.75 1v11.44l3.72-3.72 1.06 1.06-5 5a.75.75 0 0 1-1.06 0l-5-5 1.06-1.06 3.72 3.72V1z"
          clipRule="evenodd"
        />
      ) : (
        <path fill="currentColor" fillRule="evenodd"
          d="M7.25 15V3.56L3.53 7.28 2.47 6.22l5-5a.75.75 0 0 1 1.06 0l5 5-1.06 1.06-3.72-3.72V15z"
          clipRule="evenodd"
        />
      )}
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="4" fill="var(--ds-surface-sunken, #F4F5F7)" />
      <path d="M10 8h8l6 6v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        fill="#DDE1E6" stroke="#BFC4CE" strokeWidth="1" />
      <path d="M18 8v6h6" fill="none" stroke="#BFC4CE" strokeWidth="1" />
    </svg>
  );
}
