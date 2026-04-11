/**
 * AttachmentsSection — Jira-parity attachments table
 * Pixel-perfect replica: collapsible header, sortable columns,
 * thumbnail + filename, size, date, eye/download actions.
 */
import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import './AttachmentsSection.css';

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

interface AttachmentsSectionProps {
  attachments: PhAttachment[];
  itemId: string;
  userId: string;
}

type SortKey = 'name' | 'size' | 'dateAdded';
type SortDir = 'asc' | 'desc';

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

export function AttachmentsSection({ attachments, itemId, userId }: AttachmentsSectionProps) {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(attachments.length === 0);
  const [sortKey, setSortKey] = useState<SortKey>('dateAdded');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

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
    else if (sortKey === 'size') cmp = a.file_size - b.file_size;
    else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleUpload = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `attachments/${itemId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file);
    if (uploadError) { toast.error('Failed to upload'); return; }
    const { error: dbError } = await supabase.from('ph_attachments').insert({
      work_item_id: itemId, file_name: file.name, file_size: file.size,
      mime_type: file.type, storage_path: path, uploaded_by: userId,
    });
    if (dbError) { toast.error('Failed to save attachment'); return; }
    toast.success('Attachment uploaded');
    queryClient.invalidateQueries({ queryKey: ['ph-attachments', itemId] });
  }, [itemId, userId, queryClient]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) { Array.from(files).forEach(f => handleUpload(f)); }
    e.target.value = '';
  };

  const getPublicUrl = (storagePath: string) =>
    supabase.storage.from('attachments').getPublicUrl(storagePath).data.publicUrl;

  const handleDownloadAll = () => {
    attachments.forEach(att => {
      const url = getPublicUrl(att.storage_path);
      window.open(url, '_blank');
    });
    setMoreMenuOpen(false);
  };

  const handleDeleteAttachment = useCallback(async (att: PhAttachment) => {
    const { error } = await supabase.from('ph_attachments').delete().eq('id', att.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Attachment deleted');
    queryClient.invalidateQueries({ queryKey: ['ph-attachments', itemId] });
  }, [itemId, queryClient]);

  return (
    <div className="att-section">
      {/* Section Header */}
      <div role="heading" className="att-heading-wrapper">
        <div className="att-heading-inner">
          {/* Left: chevron + label + badge */}
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

          {/* Right: more options + add — hidden when collapsed */}
          {!collapsed && <div className="att-heading-actions">
            <div style={{ position: 'relative' }} ref={moreMenuRef}>
              <button
                className="att-icon-btn"
                title="More options for attachments"
                onClick={() => setMoreMenuOpen(v => !v)}
              >
                <DotsIcon />
              </button>
              {moreMenuOpen && (
                <div className="att-more-menu">
                  {attachments.length > 0 && (
                    <button className="att-menu-item" onClick={handleDownloadAll}>
                      Download all
                      <span className="att-menu-badge">{attachments.length}</span>
                    </button>
                  )}
                  <button className="att-menu-item" onClick={() => { setMoreMenuOpen(false); }}>
                    Cancel
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
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="att-body">
          {attachments.length === 0 ? (
            <div className="att-empty">
              No attachments — click + to add
            </div>
          ) : (
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
                  <th className="att-th att-th-view" aria-label="View" />
                  <th className="att-th att-th-download" aria-label="Download" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(att => (
                  <AttachmentRow
                    key={att.id}
                    attachment={att}
                    publicUrl={getPublicUrl(att.storage_path)}
                    onDelete={handleDeleteAttachment}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Row ── */
function AttachmentRow({ attachment, publicUrl, onDelete }: {
  attachment: PhAttachment;
  publicUrl: string;
  onDelete: (a: PhAttachment) => void;
}) {
  const [base, ext] = splitFilename(attachment.file_name);
  const isImage = attachment.mime_type?.startsWith('image/');
  const isVideo = attachment.mime_type?.startsWith('video/');

  return (
    <tr className="att-row">
      {/* Name cell */}
      <td className="att-td att-td-name">
        <div
          className="att-file-row"
          role="button"
          tabIndex={0}
          aria-label={attachment.file_name}
          onClick={() => window.open(publicUrl, '_blank')}
        >
          {/* Thumbnail */}
          <div className="att-thumb">
            {isImage ? (
              <img src={publicUrl} alt={attachment.file_name} className="att-thumb-img" />
            ) : isVideo ? (
              <div className="att-thumb-fallback">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#42526E"><path d="M8 5v14l11-7z"/></svg>
              </div>
            ) : (
              <FileIcon />
            )}
          </div>
          {/* Filename */}
          <div className="att-filename">
            <div className="att-filename-inner">
              <span className="att-filename-base">{base}</span>
              <span className="att-filename-ext">{ext}</span>
            </div>
          </div>
        </div>
      </td>

      {/* Size */}
      <td className="att-td att-td-size">{formatSize(attachment.file_size)}</td>

      {/* Date */}
      <td className="att-td att-td-date">{formatDate(attachment.created_at)}</td>

      {/* Eye / preview */}
      <td className="att-td att-td-action">
        <button
          className="att-action-btn att-eye-btn"
          title="Preview"
          onClick={() => window.open(publicUrl, '_blank')}
        >
          <EyeIcon />
        </button>
      </td>

      {/* Download */}
      <td className="att-td att-td-action att-td-download-cell">
        <a
          className="att-action-btn att-download-btn"
          href={publicUrl}
          download={attachment.file_name}
          title="Download"
        >
          <DownloadIcon />
        </a>
      </td>
    </tr>
  );
}

/* ─────────── SVG Icons ─────────── */

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 16 16"
      style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease', color: 'rgb(80,82,88)' }}
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
      style={{ color: active ? 'rgb(80,82,88)' : 'transparent', flexShrink: 0 }}
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

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="-4 -4 24 24" fill="none">
      <path fill="currentColor" fillRule="evenodd"
        d="M8 3.5c-2.943 0-5.49 1.845-6.424 4.396a.3.3 0 0 0 0 .208C2.509 10.655 5.057 12.5 8 12.5s5.49-1.845 6.424-4.396a.3.3 0 0 0 0-.208C13.491 5.345 10.943 3.5 8 3.5M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0-1.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fill="currentColor" fillRule="evenodd"
        d="M8.75 1v7.44l2.72-2.72 1.06 1.06-4 4a.75.75 0 0 1-1.06 0l-4-4 1.06-1.06 2.72 2.72V1zM1 13V9h1.5v4a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V9H15v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"
      style={{ borderRadius: 4, background: '#F4F5F7' }}>
      <rect width="32" height="32" rx="4" fill="#F4F5F7"/>
      <path d="M10 8h8l6 6v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        fill="#DDE1E6" stroke="#BFC4CE" strokeWidth="1"/>
      <path d="M18 8v6h6" fill="none" stroke="#BFC4CE" strokeWidth="1"/>
    </svg>
  );
}
