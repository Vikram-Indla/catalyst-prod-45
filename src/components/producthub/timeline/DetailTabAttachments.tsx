/**
 * Detail Tab — Attachments (MARAM V3.1 + Catalyst V11 Carbon Precision)
 * Drag-drop upload, storage bar, file cards with pin/download/delete
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logRequestAudit } from '@/lib/requestAudit';
import { Upload, Paperclip, Download, Pin, PinOff, Trash2 } from 'lucide-react';

interface DetailTabAttachmentsProps {
  requestId: string;
}

const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
const MAX_TOTAL = 30 * 1024 * 1024; // 30MB
const TOAST_OPTS = { duration: 2200, style: { background: '#18181B', color: 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))' } as const, position: 'bottom-center' as const };

const FILE_TYPE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pdf: { label: 'PDF', color: '#D92525', bg: '#D9252512' },
  xls: { label: 'XLS', color: '#0D7331', bg: '#0D733112' },
  xlsx: { label: 'XLS', color: '#0D7331', bg: '#0D733112' },
  csv: { label: 'XLS', color: '#0D7331', bg: '#0D733112' },
  doc: { label: 'DOC', color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', bg: '#2563EB12' },
  docx: { label: 'DOC', color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', bg: '#2563EB12' },
  png: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
  jpg: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
  jpeg: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
  gif: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
  webp: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
  svg: { label: 'IMG', color: '#7C3AED', bg: '#7C3AED12' },
};
const DEFAULT_TYPE = { label: 'FILE', color: '#71717A', bg: '#71717A12' };

function getFileType(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_TYPE_MAP[ext] || DEFAULT_TYPE;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export const DetailTabAttachments: React.FC<DetailTabAttachmentsProps> = ({ requestId }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const { data: files = [], refetch } = useQuery({
    queryKey: ['idp-attachments', requestId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_request_attachments')
        .select('*, uploader:profiles!uploaded_by(full_name)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Sort: pinned first, then by created_at
  const sortedFiles = useMemo(() =>
    [...files].sort((a: any, b: any) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0;
    }),
    [files]
  );

  const totalUsed = useMemo(() => files.reduce((s: number, f: any) => s + (f.file_size || 0), 0), [files]);
  const usedPct = Math.min(100, Math.round((totalUsed / MAX_TOTAL) * 100));

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const user = (await supabase.auth.getUser()).data.user;
    const toUpload = Array.from(fileList);

    for (const file of toUpload) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 6MB limit`);
        continue;
      }
      if (totalUsed + file.size > MAX_TOTAL) {
        toast.error('Storage limit (30MB) exceeded');
        break;
      }
      const path = `${requestId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('request-attachments').upload(path, file);
      if (uploadErr) { toast.error(`Upload failed: ${file.name}`); continue; }

      const { error: dbErr } = await typedQuery('ph_request_attachments').insert({
        request_id: requestId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        category: 'general',
        uploaded_by: user?.id || null,
        is_pinned: false,
      });
      if (dbErr) { toast.error(`DB insert failed: ${file.name}`); continue; }

      logRequestAudit({ request_id: requestId, action: 'uploaded', entity_type: 'attachment', new_value: file.name });
      toast.success(`Uploaded ${file.name}`, TOAST_OPTS);
    }
    refetch();
  }, [requestId, totalUsed, refetch]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  };

  const handleDownload = async (f: any) => {
    const { data } = supabase.storage.from('request-attachments').getPublicUrl(f.file_path);
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
      toast.success(`Downloading ${f.file_name}`, TOAST_OPTS);
    }
  };

  const handlePin = async (f: any) => {
    await typedQuery('ph_request_attachments').update({ is_pinned: !f.is_pinned }).eq('id', f.id);
    logRequestAudit({ request_id: requestId, action: f.is_pinned ? 'unpinned' : 'pinned', entity_type: 'attachment', new_value: f.file_name });
    // Silent auto-save
    refetch();
  };

  const handleDelete = async (f: any) => {
    await supabase.storage.from('request-attachments').remove([f.file_path]);
    await typedQuery('ph_request_attachments').delete().eq('id', f.id);
    logRequestAudit({ request_id: requestId, action: 'deleted', entity_type: 'attachment', new_value: f.file_name });
    toast.success(`Deleted ${f.file_name}`, TOAST_OPTS);
    refetch();
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* A1 — Drag & Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          height: 88, borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
          border: dragging ? '2px dashed var(--idp-primary)' : '2px dashed var(--idp-border-strong)',
          background: dragging ? 'var(--idp-primary-bg)' : 'var(--idp-surface-secondary)',
        }}>
        <Upload size={20} style={{ marginBottom: 4, color: 'var(--idp-ink-tertiary)' }} />
        <span style={{ fontSize: 13, color: 'var(--idp-ink-tertiary)' }}>
          Drag files here or <span style={{ fontWeight: 600, color: 'var(--idp-primary)' }}>browse</span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--idp-ink-muted)' }}>Max 6MB/file · 30MB total</span>
      </div>
      <input ref={fileInputRef} type="file" multiple hidden onChange={e => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ''; }} />

      {/* A2 — Storage Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--idp-ink-muted)', whiteSpace: 'nowrap' }}>Used: {formatSize(totalUsed)} / 30 MB</span>
        <div style={{ flex: 1, height: 4, background: 'var(--idp-surface-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: `${usedPct}%`, height: '100%', borderRadius: 4, transition: 'width 0.3s',
            background: usedPct > 95 ? 'var(--idp-danger)' : usedPct > 80 ? 'var(--idp-warning)' : 'var(--idp-primary)',
          }} />
        </div>
        <span style={{ fontSize: 11, fontFamily: 'var(--idp-font-mono)', color: 'var(--idp-ink-muted)' }}>{usedPct}%</span>
      </div>

      {/* A3 — File Cards */}
      {sortedFiles.length === 0 ? (
        <div style={{ border: '1px solid var(--idp-border)', borderRadius: 8, padding: '40px 20px', textAlign: 'center' }}>
          <Paperclip size={28} style={{ margin: '0 auto 8px', color: 'var(--idp-ink-tertiary)' }} />
          <div style={{ fontSize: 13, color: 'var(--idp-ink-tertiary)' }}>No attachments yet</div>
        </div>
      ) : sortedFiles.map((f: any) => {
        const ft = getFileType(f.file_name);
        return (
          <div key={f.id}
            onMouseEnter={() => setHoveredCard(f.id)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              border: '1px solid var(--idp-border)', borderRadius: 8, transition: 'background 0.1s',
              background: hoveredCard === f.id ? 'var(--idp-surface-secondary)' : undefined,
            }}>
            {/* File type icon */}
            <div style={{
              width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: ft.bg, color: ft.color, fontSize: 10, fontWeight: 800,
            }}>{ft.label}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--idp-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                {f.is_pinned && <Pin size={11} style={{ flexShrink: 0 }} />}
                {f.file_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--idp-ink-muted)' }}>
                {formatSize(f.file_size)} · {ft.label} · {f.uploader?.full_name || 'Unknown'} · {timeAgo(f.created_at)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 2, opacity: hoveredCard === f.id ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
              <button onClick={() => handleDownload(f)} className="idp-hover-action-btn" title="Download"><Download size={14} /></button>
              <button onClick={() => handlePin(f)} className="idp-hover-action-btn" title={f.is_pinned ? 'Unpin' : 'Pin'}>{f.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}</button>
              <button onClick={() => handleDelete(f)} className="idp-hover-action-btn" title="Delete"><Trash2 size={14} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DetailTabAttachments;
