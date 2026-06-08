/**
 * useLinkPreview — extracts URLs from a message body and renders compact
 * preview cards. Cache-first read of chat_link_previews; on miss, returns
 * a domain-only stub so the UI always shows SOMETHING. A future edge
 * function (chat-unfurl) can populate full OG metadata server-side; the
 * cache table is already in place.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const URL_RE = /https?:\/\/[^\s<>"']+/g;

export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_RE) ?? [];
  return Array.from(new Set(matches)).slice(0, 4);
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export interface LinkPreviewRow {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

const db = supabase as unknown as { from: (table: string) => any };

export function useLinkPreviews(urls: string[]) {
  return useQuery({
    queryKey: ['chat', 'link-previews', urls.join('|')],
    enabled: urls.length > 0,
    queryFn: async (): Promise<LinkPreviewRow[]> => {
      const { data } = await db
        .from('chat_link_previews')
        .select('url, domain, title, description, image_url')
        .in('url', urls);
      const cached = new Map<string, LinkPreviewRow>();
      (data ?? []).forEach((r: any) => {
        cached.set(r.url, {
          url: r.url,
          domain: r.domain ?? domainOf(r.url),
          title: r.title,
          description: r.description,
          imageUrl: r.image_url,
        });
      });
      // Fill in cache-miss with domain-only stubs so callers always render.
      return urls.map(
        (u) =>
          cached.get(u) ?? {
            url: u,
            domain: domainOf(u),
            title: null,
            description: null,
            imageUrl: null,
          },
      );
    },
    staleTime: 60_000,
  });
}
