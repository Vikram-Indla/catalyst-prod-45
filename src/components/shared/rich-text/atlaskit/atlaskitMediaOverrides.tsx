/**
 * atlaskitMediaOverrides — Catalyst-specific media rendering for
 * `@atlaskit/renderer`'s `nodeComponents` prop. Replaces Atlassian's
 * native MediaCard (which expects Atlassian-hosted media + auth tokens)
 * with Catalyst's attachment pipeline:
 *
 *   ph_issues.description_adf  (ADF with media nodes — id or url)
 *   └─ ph_issue_attachments    (lookup by jira_attachment_id or filename)
 *      └─ local_public_url     (preferred — Supabase storage)
 *      └─ jira-attachment-proxy edge function (routes Jira auth)
 *
 * Retires the bespoke ADF→HTML translator (adfToHtml.ts) — image nodes
 * now render in-tree as React components via @atlaskit/renderer's
 * `nodeComponents` override, preserving position within paragraphs,
 * lists, and layout columns exactly as Jira does.
 *
 * ---------------------------------------------------------------
 * Exports:
 *   - MediaProvidersShell — wraps children in MediaUrl + Lightbox
 *     context; consumes `issueKey` and fetches attachments.
 *   - mediaNodeComponents — { media, mediaSingle, mediaGroup,
 *     mediaInline } map ready to pass to `<ReactRenderer nodeComponents />`.
 *   - types used by callers.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, X } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';

/* ─── Types ─────────────────────────────────────────────── */

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

/* ─── URL-map context ───────────────────────────────────── */

const MediaUrlContext = createContext<Map<string, string> | null>(null);

/** Resolve an ADF media node's display URL from the current context. */
export function useMediaUrl(attrs: {
  type?: string;
  id?: string;
  url?: string;
  src?: string;
  alt?: string;
  [k: string]: unknown;
}): string {
  const map = useContext(MediaUrlContext);

  // External media — URL is carried on the attrs (see adfNormalizer.ts
  // which rewrites local `type:'file'` with a `url` to `type:'external'`).
  if (attrs?.type === 'external') {
    const u = (attrs.url as string | undefined) ?? (attrs.src as string | undefined);
    if (u) return u;
  }

  // File media — look up via attachment map by id or filename.
  if (attrs?.id && map) {
    const byId = map.get(attrs.id);
    if (byId) return byId;
  }
  if (attrs?.alt && map) {
    const byFilename = map.get(attrs.alt as string);
    if (byFilename) return byFilename;
  }

  return '';
}

/* ─── Issue-key context ─────────────────────────────────────
   2026-05-03 (P3.4 chip-honesty patch): the failed-image chip needs to
   route "Open" to the user's authenticated Jira session (where their
   browser cookie can read the attachment), NOT to the Supabase proxy
   URL that just 403'd. Issue key flows from MediaProvidersShell into
   this context so MediaImageCard can compute the Jira page URL. */
const IssueKeyContext = createContext<string | null>(null);
const JIRA_BROWSE_BASE = 'https://digital-transformation.atlassian.net/browse';

/* ─── Lightbox context ──────────────────────────────────── */

interface LightboxState {
  open: (src: string) => void;
}

const LightboxContext = createContext<LightboxState | null>(null);

function useLightbox(): LightboxState {
  const ctx = useContext(LightboxContext);
  return ctx ?? { open: () => undefined };
}

/* ─── Lightbox UI ───────────────────────────────────────── */

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
        background: 'var(--ds-shadow-raised, rgba(0,0,0,0.85))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, cursor: 'zoom-out',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          color: 'var(--ds-surface)', fontSize: 24, cursor: 'pointer',
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

/* ─── MediaImageCard — Catalyst-canonical single image tile ────── */

function MediaImageCard({ src, alt, onClick }: { src: string; alt?: string; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [hovered, setHovered] = useState(false);
  const issueKey = useContext(IssueKeyContext);

  const handleLoad = useCallback(() => { setLoaded(true); }, []);
  const handleError = useCallback(() => { setErrored(true); }, []);

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

  if (errored) {
    /* jira-compare 2026-05-03 (P3.4 — chip honesty pass) */
    const fallbackName = (src.split('?')[0].split('/').pop() || 'image').slice(0, 60);
    const filename = (alt && alt.trim()) ? alt.trim().slice(0, 60) : fallbackName;
    const openHref = issueKey ? `${JIRA_BROWSE_BASE}/${issueKey}` : src;
    return (
      <div style={{
        margin: '8px 0', padding: '12px 16px', borderRadius: 'var(--ds-border-radius, 4px)',
        background: 'var(--ds-background-neutral-subtle)',
        border: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))',
        fontSize: 14, color: 'var(--ds-text)',
        display: 'inline-flex', alignItems: 'center', gap: 12, maxWidth: '100%',
        fontFamily: '"Atlassian Sans", -apple-system, sans-serif',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 500 }}>{filename}</span>
          <span style={{ color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', marginLeft: 8, fontSize: 12 }}>
            hosted on Jira · auth required
          </span>
        </span>
        <a href={openHref} target="_blank" rel="noopener noreferrer"
           style={{ color: 'var(--ds-text-brand)', fontSize: 13, textDecoration: 'none' }}
           onClick={(e) => e.stopPropagation()}>
          {issueKey ? `Open in Jira ↗` : `Open ↗`}
        </a>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'block', width: '100%', margin: '8px 0', position: 'relative' }}
    >
      {/* Loading skeleton — shown until the image fires onLoad */}
      {!loaded && (
        <div style={{
          width: '100%', height: 200, borderRadius: 3,
          background: 'var(--ds-surface-sunken, var(--cp-bg-sunken))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Loader2 size={24} style={{ color: 'var(--ds-text-subtlest)', animation: 'spin 0.86s cubic-bezier(0.4,0.15,0.6,0.85) infinite' }} />
        </div>
      )}
      {/* Natural proportional rendering — width:100% of container, height:auto.
          Matches Jira's <img> rendering: no fixed-height box, no objectFit crop,
          no letterboxing. The img is hidden (opacity:0, height:0) until onLoad
          so the skeleton is visible during fetch without layout jump. */}
      <img
        src={src}
        alt={alt ?? ''}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
        style={{
          display: loaded ? 'block' : 'none',
          width: '100%',
          height: 'auto',
          borderRadius: 3,
          cursor: 'pointer',
        }}
      />
      {loaded && hovered && (
        <button
          onClick={handleDownload}
          title="Download image"
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 32, height: 32, borderRadius: 4,
            background: 'var(--ds-shadow-raised, rgba(9, 30, 66, 0.54))',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', transition: 'background 0.15s',
            zIndex: 2,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-shadow-raised, rgba(9, 30, 66, 0.71))'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--ds-shadow-raised, rgba(9, 30, 66, 0.54))'; }}
        >
          <Download size={16} />
        </button>
      )}
    </div>
  );
}

/* ─── Node-component overrides ──────────────────────────── */

/* A `media` node is a leaf — @atlaskit/renderer's serializer calls our
   override with the ADF attrs spread in directly (see getMediaProps →
   getProps). We ignore children (media has none at the node level) and
   resolve the URL from context. */
function CatalystMediaNode(props: Record<string, any>) {
  const src = useMediaUrl(props);
  const { open } = useLightbox();
  if (!src) return null;
  return (
    <MediaImageCard
      src={src}
      alt={(props.alt as string | undefined) ?? undefined}
      onClick={() => open(src)}
    />
  );
}

/* `mediaSingle` wraps a single `media` node. Jira stores the author's
   chosen pixel width and layout alignment on the mediaSingle attrs
   (e.g. width:671, widthType:"pixel", layout:"align-start"). We must
   honour those values so the image renders at the same size the author
   set in the Jira editor — not stretched to 100% of the container.
   Without this, a 671px image saved in Jira renders at ~700px in
   Catalyst (full container width). */
function CatalystMediaSingle({
  children,
  width,
  widthType,
  layout,
}: {
  children?: React.ReactNode;
  width?: number;
  widthType?: string;
  layout?: string;
  [key: string]: unknown;
}) {
  let maxWidth: string = '500px';
  if (widthType === 'pixel' && typeof width === 'number' && width >= 200) {
    maxWidth = `${width}px`;
  } else if (widthType === 'percentage' && typeof width === 'number' && width >= 20) {
    maxWidth = `${width}%`;
  }
  if (layout === 'wide' || layout === 'full-width') maxWidth = '100%';

  let marginLeft = '0';
  let marginRight = '0';
  if (layout === 'center') {
    marginLeft = 'auto';
    marginRight = 'auto';
  } else if (layout === 'align-end' || layout === 'wrap-right') {
    marginLeft = 'auto';
    marginRight = '0';
  } else if (layout === 'align-start' || layout === 'wrap-left' || !layout) {
    marginLeft = '0';
    marginRight = 'auto';
  }

  return (
    <div style={{ maxWidth, marginLeft, marginRight, width: '100%' }}>
      {children}
    </div>
  );
}

/* `mediaGroup` wraps multiple `media` nodes (attachment grid). Flex
   layout mirrors Jira's gallery — cards flow with 8px gap. */
function CatalystMediaGroup({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0' }}>
      {children}
    </div>
  );
}

/* `mediaInline` is a text-flow media reference — render as a small
   inline image. Same URL resolution as the block media node. */
function CatalystMediaInline(props: Record<string, any>) {
  const src = useMediaUrl(props);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={(props.alt as string | undefined) ?? ''}
      style={{
        display: 'inline-block',
        maxHeight: 20, verticalAlign: 'middle',
        borderRadius: 2, margin: '0 2px',
      }}
    />
  );
}

/** nodeComponents map — pass to `<ReactRenderer nodeComponents={...} />`. */
export const mediaNodeComponents = {
  media: CatalystMediaNode,
  mediaSingle: CatalystMediaSingle,
  mediaGroup: CatalystMediaGroup,
  mediaInline: CatalystMediaInline,
};

/* ─── MediaProvidersShell — URL fetch + lightbox host ───── */

interface MediaProvidersShellProps {
  /** Issue key (e.g. "BAU-123") used to fetch ph_issue_attachments. */
  issueKey?: string;
  /** Optional preloaded attachments — skips the internal fetch. */
  attachments?: AttachmentRow[];
  children: React.ReactNode;
}

export function MediaProvidersShell({
  issueKey,
  attachments: preloaded,
  children,
}: MediaProvidersShellProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const { data: fetched } = useQuery({
    queryKey: ['ph-issue-attachments', issueKey],
    enabled: !!issueKey && !preloaded,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issue_attachments')
        .select('id, issue_key, jira_attachment_id, filename, mime_type, content_url, thumbnail_url, local_public_url, local_storage_path')
        .eq('issue_key', issueKey!)
        .order('jira_created_at', { ascending: true });
      return (data ?? []) as AttachmentRow[];
    },
  });

  const attachments = preloaded ?? fetched ?? [];

  /* Build lookup map: jira_attachment_id + filename → best URL.
     Mirrors AdfDescriptionRenderer's resolution: prefer Supabase-hosted
     `local_public_url`; fall back to the `jira-attachment-proxy` edge
     function (handles Jira auth); last resort content_url/thumbnail_url. */
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const urlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const att of attachments) {
      if (!att.mime_type?.startsWith('image/')) continue;
      let url = '';
      if (att.local_public_url) {
        url = att.local_public_url;
      } else if (att.jira_attachment_id && supabaseUrl) {
        url = `${supabaseUrl}/functions/v1/jira-attachment-proxy?id=${att.jira_attachment_id}`;
      } else {
        url = att.content_url || att.thumbnail_url || '';
      }
      if (url) {
        map.set(att.jira_attachment_id, url);
        map.set(att.filename, url);
      }
    }
    return map;
  }, [attachments, supabaseUrl]);

  const lightboxValue = useMemo<LightboxState>(() => ({
    open: (src: string) => setLightboxSrc(src),
  }), []);

  return (
    <IssueKeyContext.Provider value={issueKey ?? null}>
      <MediaUrlContext.Provider value={urlMap}>
        <LightboxContext.Provider value={lightboxValue}>
          {children}
          {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
        </LightboxContext.Provider>
      </MediaUrlContext.Provider>
    </IssueKeyContext.Provider>
  );
}
