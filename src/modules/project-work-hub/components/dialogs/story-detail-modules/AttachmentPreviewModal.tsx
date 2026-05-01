/**
 * AttachmentPreviewModal — Image / PDF preview with prev/next nav.
 * Signed URLs (5 min TTL). Esc + backdrop close. Arrow keys for nav.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { X, ChevronLeft, ChevronRight, Download, FileQuestion } from 'lucide-react';
import type { PhAttachment } from './AttachmentsSection';

const BUCKET = 'attachments';

interface Props {
  attachments: PhAttachment[];
  initialId: string;
  onClose: () => void;
}

export function AttachmentPreviewModal({ attachments, initialId, onClose }: Props) {
  const initialIdx = Math.max(0, attachments.findIndex(a => a.id === initialId));
  const [idx, setIdx] = useState(initialIdx);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const current = attachments[idx];

  const goPrev = useCallback(() => setIdx(i => (i - 1 + attachments.length) % attachments.length), [attachments.length]);
  const goNext = useCallback(() => setIdx(i => (i + 1) % attachments.length), [attachments.length]);

  // Sign the URL whenever the current attachment changes
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setLoading(true);
    setSignedUrl(null);
    supabase.storage.from(BUCKET).createSignedUrl(current.storage_path, 300).then(({ data }) => {
      if (cancelled) return;
      setSignedUrl(data?.signedUrl ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [current]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && attachments.length > 1) goPrev();
      else if (e.key === 'ArrowRight' && attachments.length > 1) goNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext, attachments.length]);

  if (!current) return null;

  const isImage = current.mime_type?.startsWith('image/');
  const isPdf = current.mime_type === 'application/pdf';

  const node = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${current.file_name}`}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 h-12 bg-black/40"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm text-white truncate max-w-[60vw]">{current.file_name}</span>
          <span className="text-xs text-white/60 shrink-0">
            {idx + 1} / {attachments.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {signedUrl && (
            <a
              href={signedUrl}
              download={current.file_name}
              className="flex items-center justify-center w-8 h-8 rounded text-white hover:bg-white/10 transition-colors"
              title="Download"
              onClick={e => e.stopPropagation()}
            >
              <Download size={16} />
            </a>
          )}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded text-white hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Prev / Next */}
      {attachments.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            title="Previous (←)"
            aria-label="Previous attachment"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            title="Next (→)"
            aria-label="Next attachment"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Content */}
      <div
        className="flex items-center justify-center max-w-[90vw] max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {loading || !signedUrl ? (
          <div className="text-white/70 text-sm">Loading…</div>
        ) : isImage ? (
          <img
            src={signedUrl}
            alt={current.file_name}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
          />
        ) : isPdf ? (
          <iframe
            src={signedUrl}
            title={current.file_name}
            className="bg-white rounded shadow-2xl"
            style={{ width: '90vw', height: '90vh' }}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 p-12 bg-[var(--ds-surface-raised,#1A1A1A)] rounded-lg text-white">
            <FileQuestion size={48} className="text-white/50" />
            <div className="text-base font-medium">Preview not available</div>
            <div className="text-sm text-white/60">{current.mime_type || 'Unknown type'}</div>
            <a
              href={signedUrl}
              download={current.file_name}
              className="mt-2 flex items-center gap-2 px-4 h-9 rounded bg-[var(--ds-text-brand,#2563EB)] hover:bg-[var(--ds-background-brand-bold-hovered,#1D4ED8)] text-white text-sm font-medium transition-colors"
            >
              <Download size={14} /> Download
            </a>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
