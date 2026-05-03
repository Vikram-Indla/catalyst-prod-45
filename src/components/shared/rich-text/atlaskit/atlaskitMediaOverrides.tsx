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
import { Download, Loader2, X } from 'lucide-react';
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
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, cursor: 'zoom-out',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          color: 'var(--ds-surface, #fff)', fontSize: 24, cursor: 'pointer',
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
    /* jira-compare 2026-05-03 (P3.4 — chip honesty pass): the proxy
       returns HTTP 403 with body {"error":"Jira returned 403"} (probed).
       Root cause is auth-scope on the Supabase edge function's PAT, not
       a missing endpoint — the proxy IS deployed at
       /functions/v1/jira-attachment-proxy on the runtime project
       mqgshobotcvcjouzxdbi. Real fix lives in Supabase edge function
       config; this chip improves what the user sees in the meantime:
         - filename comes from ADF `alt` (real name) instead of URL tail
         - "Open" goes to the Jira ISSUE page (where the user's browser
           cookie can render the attachment), not the failing proxy URL
         - copy is honest: "Image hosted on Jira" + auth hint */
    const issueKey = useContext(IssueKeyContext);
    const fallbackName = (src.split('?')[0].split('/').pop() || 'image').slice(0, 60);
    const filename = (alt && alt.trim()) ? alt.trim().slice(0, 60) : fallbackName;
    const openHref = issueKey
      ? `${JIRA_BROWSE_BASE}/${issueKey}`
      : src;
    return (
      <div style={{
        margin: '12px 0', padding: '12px 16px', borderRadius: 'var(--ds-border-radius, 4px)',
        background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        fontSize: 14, color: 'var(--ds-text, #292A2E)',
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
          <span style={{ color: 'var(--ds-text-subtlest, #6B778C)', marginLeft: 8, fontSize: 12 }}>
            hosted on Jira · auth required
          </span>
        </span>
        <a href={openHref} target="_blank" rel="noopener noreferrer"
           style={{ color: 'var(--ds-text-brand, #0C66E4)', fontSize: 13, textDecoration: 'none' }}
           onClick={(e) => e.stopPropagation()}>
          {issueKey ? `Open in Jira ↗` : `Open ↗`}
        </a>
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
          background: loaded ? 'transparent' : 'var(--ds-surface-sunken, #F4F5F7)',
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
          alt={alt ?? ''}
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
            color: 'var(--ds-surface, #FFFFFF)', transition: 'background 0.15s',
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

/* `mediaSingle` wraps a single `media` node. Our default @atlaskit
   layout would apply figure styling / caption wrapping — we just pass
   children through and let MediaImageCard own its margins. */
function CatalystMediaSingle({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
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
