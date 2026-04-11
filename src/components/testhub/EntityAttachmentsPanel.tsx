/**
 * EntityAttachmentsPanel — Generic reusable attachments panel for TestHub entities
 * Collapsible, sortable table with inline delete confirm, drag-drop, signed URLs
 */
import React, { useState, useCallback, useRef } from 'react';
import { Paperclip, Upload, FileText, FileImage, FileVideo, File, Eye, Download, Trash2, Loader2, ChevronDown, Plus } from 'lucide-react';
import {
  useEntityAttachments,
  useUploadEntityAttachment,
  useDeleteEntityAttachment,
  EntityAttachment,
} from '@/hooks/useEntityAttachments';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

interface EntityAttachmentsPanelProps {
  entityType: string;
  entityId: string | undefined;
  title?: string;
}

const BUCKET = 'defect-attachments';

type SortKey = 'name' | 'size' | 'dateAdded';
type SortDir = 'asc' | 'desc';

function formatSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function splitFilename(name: string): [string, string] {
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx === -1) return [name, ''];
  return [name.slice(0, dotIdx), name.slice(dotIdx)];
}

function getFileIcon(mime: string | null) {
  if (!mime) return File;
  if (mime.startsWith('image/')) return FileImage;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime.startsWith('text/') || mime.includes('pdf') || mime.includes('document')) return FileText;
  return File;
}

export function EntityAttachmentsPanel({
  entityType,
  entityId,
  title = 'Attachments',
}: EntityAttachmentsPanelProps) {
  const { data: attachments = [], isLoading } = useEntityAttachments(entityType, entityId);
  const uploadMutation = useUploadEntityAttachment(entityType, entityId);
  const deleteMutation = useDeleteEntityAttachment(entityType, entityId);

  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('dateAdded');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data logic (unchanged) ──
  const handleUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setUploadCount(files.length);
    try {
      await uploadMutation.mutateAsync(files);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadCount(0);
    }
  }, [uploadMutation]);

  const handlePreview = useCallback(async (att: EntityAttachment) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(att.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error('Failed to generate preview link');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }, []);

  const handleDownload = useCallback(async (att: EntityAttachment) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(att.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error('Failed to generate download link');
      return;
    }
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = att.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleDelete = useCallback(async (att: EntityAttachment) => {
    try {
      await deleteMutation.mutateAsync(att);
      toast.success('Attachment deleted');
    } catch {
      toast.error('Failed to delete attachment');
    }
    setConfirmDeleteId(null);
  }, [deleteMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    multiple: true,
    maxSize: 10485760,
  });

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) handleUpload(Array.from(files));
    e.target.value = '';
  };

  // ── Sorting ──
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...attachments].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.file_name.localeCompare(b.file_name);
    else if (sortKey === 'size') cmp = (a.file_size ?? 0) - (b.file_size ?? 0);
    else cmp = new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (!entityId) return null;

  const SortArrow = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return <span className="ml-1 text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="border border-border rounded-md overflow-hidden">
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-muted/30 cursor-pointer select-none"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`}
          />
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {attachments.length}
          </span>
        </div>
        <button
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Add attachment"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
        >
          <Plus className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : attachments.length === 0 ? (
            /* ── Empty state: drag-drop zone ── */
            <div
              {...getRootProps()}
              className={`p-8 text-center cursor-pointer transition-colors border-t border-border ${
                isDragActive ? 'bg-[#2563EB]/5' : ''
              }`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-[#2563EB]" />
                  <p className="text-sm font-medium text-[#2563EB]">Drop to upload</p>
                </div>
              ) : uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
                  <p className="text-sm text-muted-foreground">Uploading {uploadCount} file(s)...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-lg p-6">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop files here or click to upload</p>
                  <p className="text-xs text-muted-foreground">Max 10MB per file</p>
                </div>
              )}
            </div>
          ) : (
            /* ── Table ── */
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left">
                    <th
                      className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort('name')}
                    >
                      Name<SortArrow col="name" />
                    </th>
                    <th
                      className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none w-20"
                      onClick={() => handleSort('size')}
                    >
                      Size<SortArrow col="size" />
                    </th>
                    <th
                      className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none w-32"
                      onClick={() => handleSort('dateAdded')}
                    >
                      Date added<SortArrow col="dateAdded" />
                    </th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((att) => {
                    const Icon = getFileIcon(att.mime_type);
                    const [base, ext] = splitFilename(att.file_name);
                    const isImage = att.mime_type?.startsWith('image/');
                    const isDeleting = confirmDeleteId === att.id;

                    return (
                      <tr
                        key={att.id}
                        className="group border-t border-border hover:bg-muted/50 transition-colors"
                      >
                        {/* Name */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            {isImage ? (
                              <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                                <img
                                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${att.file_path}`}
                                  alt={att.file_name}
                                  className="h-full w-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                            ) : (
                              <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="font-medium truncate block max-w-[200px]">{base}</span>
                              {ext && <span className="text-xs text-muted-foreground">{ext}</span>}
                            </div>
                          </div>
                        </td>

                        {/* Size */}
                        <td className="px-3 py-2 text-muted-foreground text-xs">
                          {formatSize(att.file_size)}
                        </td>

                        {/* Date */}
                        <td className="px-3 py-2 text-muted-foreground text-xs">
                          {att.created_at
                            ? formatDistanceToNow(new Date(att.created_at), { addSuffix: true })
                            : '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2">
                          {isDeleting ? (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">Delete?</span>
                              <button
                                className="text-destructive hover:underline font-medium"
                                onClick={() => handleDelete(att)}
                              >
                                Confirm
                              </button>
                              <button
                                className="text-muted-foreground hover:underline"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Preview"
                                onClick={() => handlePreview(att)}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Download"
                                onClick={() => handleDownload(att)}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                                title="Delete"
                                onClick={() => setConfirmDeleteId(att.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Upload progress row */}
                  {uploading && (
                    <tr className="border-t border-border">
                      <td colSpan={4} className="px-3 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
                          Uploading {uploadCount} file(s)...
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Secondary drop zone below table */}
              <div
                {...getRootProps()}
                className={`border-t border-border px-3 py-3 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'bg-[#2563EB]/5' : 'hover:bg-muted/30'
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-xs text-muted-foreground">
                  {isDragActive ? 'Drop to upload' : 'Drop files here or click to add more'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
