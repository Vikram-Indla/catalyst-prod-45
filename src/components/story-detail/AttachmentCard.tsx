import React, { useState } from 'react';
import { FileText, FileSpreadsheet, FileArchive, File, Download, Trash2 } from 'lucide-react';

/* ── Types ── */
export interface AttachmentFile {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface AttachmentCardProps {
  file: AttachmentFile;
  onPreview?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

/* ── Tokens (hex only, V12) ── */
const T = {
  borderSubtle:  '#E2E8F0',
  bgSunken:      '#F1F5F9',
  textPrimary:   '#0F172A',
  textTertiary:  '#94A3B8',
  white:         '#FFFFFF',
  shadowSm:      '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  overlayBg:     'rgba(0,0,0,0.4)',
  font:          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

/* ── Helpers ── */
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const PDF_DOC_EXTS = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
const SHEET_EXTS = ['xls', 'xlsx', 'csv'];
const ARCHIVE_EXTS = ['zip', 'rar', '7z', 'tar', 'gz'];

function getExt(name: string): string {
  return (name.split('.').pop() || '').toLowerCase();
}

function isImage(name: string): boolean {
  return IMAGE_EXTS.includes(getExt(name));
}

function getFileIcon(name: string) {
  const ext = getExt(name);
  if (PDF_DOC_EXTS.includes(ext)) return FileText;
  if (SHEET_EXTS.includes(ext)) return FileSpreadsheet;
  if (ARCHIVE_EXTS.includes(ext)) return FileArchive;
  return File;
}

function formatUploadDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const time = d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day} ${mon} ${year}, ${time}`;
}

/* ── Component ── */
export function AttachmentCard({ file, onPreview, onDownload, onDelete }: AttachmentCardProps) {
  const [hovered, setHovered] = useState(false);
  const FileIcon = getFileIcon(file.name);
  const hasImage = file.thumbnailUrl || isImage(file.name);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Attachment: ${file.name}`}
      onClick={onPreview}
      onKeyDown={(e) => { if (e.key === 'Enter') onPreview?.(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 156,
        border: `1px solid ${T.borderSubtle}`,
        borderRadius: 6,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 150ms ease-in-out',
        boxShadow: hovered ? T.shadowSm : 'none',
        fontFamily: T.font,
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: 'relative',
          width: 156,
          height: 100,
          overflow: 'hidden',
          borderBottom: `1px solid ${T.borderSubtle}`,
        }}
      >
        {hasImage ? (
          <img
            src={file.thumbnailUrl || file.url}
            alt={file.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: T.bgSunken,
            }}
          >
            <FileIcon size={32} color={T.textTertiary} />
          </div>
        )}

        {/* Hover overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: T.overlayBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 150ms ease-in-out',
            pointerEvents: hovered ? 'auto' : 'none',
          }}
        >
          {onDownload && (
            <button
              aria-label={`Download ${file.name}`}
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                border: 'none',
                borderRadius: 4,
                background: 'transparent',
                cursor: 'pointer',
                color: T.white,
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget.style.background = 'rgba(255,255,255,0.15)'); }}
              onMouseLeave={(e) => { (e.currentTarget.style.background = 'transparent'); }}
            >
              <Download size={20} />
            </button>
          )}
          {onDelete && (
            <button
              aria-label={`Delete ${file.name}`}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                border: 'none',
                borderRadius: 4,
                background: 'transparent',
                cursor: 'pointer',
                color: T.white,
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget.style.background = 'rgba(255,255,255,0.15)'); }}
              onMouseLeave={(e) => { (e.currentTarget.style.background = 'transparent'); }}
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          title={file.name}
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: T.textPrimary,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {file.name}
        </span>
        <span style={{ fontSize: 12, color: T.textTertiary, lineHeight: 1.3 }}>
          {formatUploadDate(file.uploadedAt)}
        </span>
      </div>
    </div>
  );
}

/* ── Demo ── */
const DEMO_FILES: AttachmentFile[] = [
  {
    id: '1',
    name: 'product-mockup.png',
    url: '',
    thumbnailUrl: 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="156" height="100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FF6B6B"/><stop offset="100%" stop-color="#4ECDC4"/></linearGradient></defs><rect fill="url(#g)" width="156" height="100"/></svg>'
    ),
    size: '1.2 MB',
    uploadedAt: '2025-02-17T13:40:00Z',
    uploadedBy: 'Sarah Chen',
  },
  {
    id: '2',
    name: 'design-specs.pdf',
    url: '',
    size: '2.3 MB',
    uploadedAt: '2025-02-15T10:15:00Z',
    uploadedBy: 'Alex Rivera',
  },
  {
    id: '3',
    name: 'data.xlsx',
    url: '',
    size: '456 KB',
    uploadedAt: '2025-02-10T15:22:00Z',
    uploadedBy: 'Morgan Lee',
  },
];

export function AttachmentCardDemo() {
  return (
    <div style={{ padding: 40, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {DEMO_FILES.map((f) => (
        <AttachmentCard
          key={f.id}
          file={f}
          onPreview={() => console.log('Preview:', f.name)}
          onDownload={() => console.log('Download:', f.name)}
          onDelete={() => console.log('Delete:', f.name)}
        />
      ))}
    </div>
  );
}

export default AttachmentCard;
