/**
 * AdfDescriptionRenderer — Renders ADF HTML with real media images
 * Replaces [Media attachment] placeholders with actual images resolved
 * from ph_issue_attachments via jira_attachment_id or filename match.
 * Includes loading shimmer, aspect-ratio sizing, and lightbox on click.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Loader2, Download } from 'lucide-react';

/* ─── Types ───────────────────────────────────────────── */

interface AdfDescriptionRendererProps {
  /** HTML string from adfToHtml() */
  html: string;
  /** Issue key (e.g. "BAU-123") to resolve attachments */
  issueKey?: string;
  /** Optional: pre-fetched attachments list */
  attachments?: AttachmentRow[];
}

interface AttachmentRow {
  id: string;
  issue_key: string;
  jira_attachment_id: string;
  filename: string;
  mime_type: string | null;
  content_url: string;
  thumbnail_url: string | null;
  local_public_url: string | null;
  local_storage_path: string | null;
}

/* ─── Lightbox ────────────────────────────────────────── */

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, cursor: 'zoom-out',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          color: '#fff', fontSize: 24, cursor: 'pointer',
          background: 'transparent', border: 'none', zIndex: 1001,
        }}
      >
        <X size={24} />
      </button>
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '90vh',
          objectFit: 'contain', borderRadius: 3, cursor: 'default',
        }}
      />
    </div>
  );
}

/* ─── Single Media Image Card ─────────────────────────── */

function MediaImageCard({ src, onClick }: { src: string; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDims({ w: img.naturalWidth, h: img.naturalHeight });
    setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setErrored(true);
  }, []);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = src;
    a.download = src.split('/').pop() || 'image';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [src]);

  const containerWidth = containerRef.current?.clientWidth ?? 670;
  const aspectHeight = dims ? Math.min(containerWidth * (dims.h / dims.w), 600) : 200;

  if (errored) {
    return (
      <div style={{
        margin: '12px 0', padding: '16px', borderRadius: 4,
        background: '#F8F8F8', border: '1px solid #E2E8F0',
        fontSize: 13, color: '#6B778C', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>Image could not be loaded</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block', width: '100%', maxWidth: '100%',
        margin: '12px 0', clear: 'both', position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          height: loaded && dims ? aspectHeight : 200,
          borderRadius: 4, overflow: 'hidden',
          position: 'relative', cursor: 'pointer',
          background: loaded ? 'transparent' : '#F4F5F7',
          border: loaded ? '1px solid #E2E8F0' : 'none',
          transition: 'height 100ms ease-in',
        }}
        onClick={onClick}
      >
        {!loaded && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%',
          }}>
            <Loader2 size={24} style={{ color: '#6B6E76', animation: 'spin 0.86s cubic-bezier(0.4,0.15,0.6,0.85) infinite' }} />
          </div>
        )}
        <img
          src={src}
          alt=""
          onLoad={handleLoad}
          onError={handleError}
          style={{
            display: 'block',
            width: '100%', height: loaded && dims ? aspectHeight : 0,
            objectFit: 'contain', objectPosition: 'center',
            opacity: loaded ? 1 : 0,
            position: loaded ? 'relative' : 'absolute',
            top: 0, left: 0,
          }}
        />
      </div>
      {/* Download button overlay — like Jira */}
      {loaded && hovered && (
        <button
          onClick={handleDownload}
          title="Download image"
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 32, height: 32, borderRadius: 4,
            background: 'rgba(9, 30, 66, 0.54)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', transition: 'background 0.15s',
            zIndex: 2,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(9, 30, 66, 0.71)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(9, 30, 66, 0.54)'; }}
        >
          <Download size={16} />
        </button>
      )}
    </div>
  );
}

/* ─── Main Renderer ───────────────────────────────────── */

export function AdfDescriptionRenderer({ html, issueKey, attachments: preloadedAttachments }: AdfDescriptionRendererProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch attachments for this issue if not preloaded
  const { data: fetchedAttachments } = useQuery({
    queryKey: ['ph-issue-attachments', issueKey],
    enabled: !!issueKey && !preloadedAttachments,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issue_attachments')
        .select('id, issue_key, jira_attachment_id, filename, mime_type, content_url, thumbnail_url, local_public_url, local_storage_path')
        .eq('issue_key', issueKey!)
        .order('jira_created_at', { ascending: true });
      return (data ?? []) as AttachmentRow[];
    },
  });

  const attachments = preloadedAttachments ?? fetchedAttachments ?? [];

  // Build a lookup map: jira_attachment_id -> best URL
  // For Jira content URLs (no local_public_url), route through the proxy edge function
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';

  const mediaUrlMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const att of attachments) {
      // Only image attachments
      if (!att.mime_type?.startsWith('image/')) continue;
      let url = '';
      if (att.local_public_url) {
        url = att.local_public_url;
      } else if (att.jira_attachment_id && supabaseUrl) {
        // Route through proxy to avoid Jira auth issues
        url = `${supabaseUrl}/functions/v1/jira-attachment-proxy?id=${att.jira_attachment_id}`;
      } else {
        url = att.content_url || att.thumbnail_url || '';
      }
      if (url) {
        map.set(att.jira_attachment_id, url);
        // Also map by filename for fallback matching
        map.set(att.filename, url);
      }
    }
    return map;
  }, [attachments, supabaseUrl]);

  // Parse media placeholder divs from the HTML and render them as React components
  // The adfToHtml outputs: <div data-adf-media-id="..." data-adf-media-filename="..." class="adf-media-slot"></div>
  const hasMediaSlots = html.includes('data-adf-media-id') || html.includes('adf-media-placeholder');
  // Also detect inline <img> tags (from local uploads or direct URL embeds)
  const hasInlineImages = /<img\s+[^>]*src=/.test(html);

  // If no media slots AND no inline images, render plain HTML
  if (!hasMediaSlots && !hasInlineImages) {
    return (
      <>
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          className="adf-description-content adf-content"
          style={{
            fontSize: 14, fontWeight: 400, lineHeight: '24px', color: '#292A2E',
            wordBreak: 'break-word', margin: 0, padding: 0,
          }}
        />
        {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      </>
    );
  }

  // If there are inline images but no media slots, render with click-to-lightbox on images
  if (!hasMediaSlots && hasInlineImages) {
    const imgParts = splitHtmlAtInlineImages(html);
    return (
      <>
        <div
          ref={containerRef}
          className="adf-description-content adf-content"
          style={{
            fontSize: 14, fontWeight: 400, lineHeight: '24px', color: '#292A2E',
            wordBreak: 'break-word', margin: 0, padding: 0,
          }}
        >
          {imgParts.map((part, idx) => {
            if (part.type === 'html') {
              return <div key={idx} dangerouslySetInnerHTML={{ __html: part.content }} />;
            }
            return (
              <MediaImageCard
                key={`img-${idx}`}
                src={part.src!}
                onClick={() => setLightboxSrc(part.src!)}
              />
            );
          })}
        </div>
        {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      </>
    );
  }

  // Split HTML at media slot boundaries and render mixed content
  const parts = splitHtmlAtMediaSlots(html);

  return (
    <>
      <div
        ref={containerRef}
        className="adf-description-content adf-content"
        style={{
          fontSize: 14, fontWeight: 400, lineHeight: '24px', color: '#292A2E',
          wordBreak: 'break-word', margin: 0, padding: 0,
        }}
      >
        {parts.map((part, idx) => {
          if (part.type === 'html') {
            return <div key={idx} dangerouslySetInnerHTML={{ __html: part.content }} />;
          }
          // Media slot
          const mediaId = part.mediaId || '';
          const filename = part.filename || '';
          const url = mediaUrlMap.get(mediaId) || mediaUrlMap.get(filename) || '';
          if (!url) {
            // No matching attachment found — show nothing or subtle placeholder
            return null;
          }
          return (
            <MediaImageCard
              key={`media-${idx}-${mediaId}`}
              src={url}
              onClick={() => setLightboxSrc(url)}
            />
          );
        })}
      </div>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}

/* ─── HTML splitter ───────────────────────────────────── */

interface HtmlPart {
  type: 'html' | 'media';
  content: string;
  mediaId?: string;
  filename?: string;
}

/* ─── Inline image splitter ───────────────────────────── */

interface InlineImagePart {
  type: 'html' | 'image';
  content: string;
  src?: string;
}

function splitHtmlAtInlineImages(html: string): InlineImagePart[] {
  const parts: InlineImagePart[] = [];
  // Match <img> tags and extract src — handle both <img .../> and <img ...>
  const regex = /<(?:p>)?<img\s+[^>]*src="([^"]*)"[^>]*\/?>(?:<\/p>)?|<img\s+[^>]*src="([^"]*)"[^>]*\/?>(?:<\/p>)?/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }
    const src = match[1] || match[2] || '';
    parts.push({ type: 'image', content: '', src });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) {
    parts.push({ type: 'html', content: html.slice(lastIndex) });
  }

  return parts;
}

/* ─── Media slot splitter ────────────────────────────── */

function splitHtmlAtMediaSlots(html: string): HtmlPart[] {
  const parts: HtmlPart[] = [];
  // Match both new data-adf-media-id slots and old [Media attachment] placeholders
  const regex = /<div\s+data-adf-media-id="([^"]*?)"\s*data-adf-media-filename="([^"]*?)"\s*class="adf-media-slot"\s*><\/div>|<p><em\s+class="adf-media-placeholder">\[Media attachment\]<\/em><\/p>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    // Push any HTML before this match
    if (match.index > lastIndex) {
      parts.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      // New-style media slot
      parts.push({ type: 'media', content: '', mediaId: match[1], filename: match[2] });
    } else {
      // Old-style placeholder — try to match to any unmatched attachment
      parts.push({ type: 'media', content: '', mediaId: '', filename: '' });
    }
    lastIndex = match.index + match[0].length;
  }

  // Push remaining HTML
  if (lastIndex < html.length) {
    parts.push({ type: 'html', content: html.slice(lastIndex) });
  }

  return parts;
}
