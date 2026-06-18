/**
 * useLinkPreview — extracts URLs from a message body and reads OG metadata
 * from chat_link_previews. On cache miss (or stub-only rows), invokes the
 * chat-unfurl edge function once per URL set to populate the cache, then
 * the query refetches.
 */
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

// Session-level flag — the chat_link_previews table is part of an unapplied
// migration on some environments. If the cache read errors with "relation
// does not exist", we skip the unfurl path entirely for the rest of the
// session so failed queries don't spam the console.
let linkPreviewBackendAvailable: boolean | null = null;

export function useLinkPreviews(urls: string[]) {
  const queryClient = useQueryClient();
  const unfurledRef = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['chat', 'link-previews', urls.join('|')],
    enabled: urls.length > 0,
    queryFn: async (): Promise<LinkPreviewRow[]> => {
      const cached = new Map<string, LinkPreviewRow>();
      if (linkPreviewBackendAvailable !== false) {
        const { data, error } = await db
          .from('chat_link_previews')
          .select('url, domain, title, description, image_url')
          .in('url', urls);
        if (error) {
          if (error.code === '42P01' || /chat_link_previews/i.test(error.message ?? '')) {
            linkPreviewBackendAvailable = false;
          }
        } else {
          linkPreviewBackendAvailable = true;
          (data ?? []).forEach((r: any) => {
            cached.set(r.url, {
              url: r.url,
              domain: r.domain ?? domainOf(r.url),
              title: r.title,
              description: r.description,
              imageUrl: r.image_url,
            });
          });
        }
      }
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

  // Trigger the chat-unfurl edge function for URLs that don't yet have any
  // OG metadata (title/description/image all null). Runs once per URL.
  useEffect(() => {
    if (urls.length === 0 || !query.data) return;
    if (linkPreviewBackendAvailable === false) return;
    const missing = query.data
      .filter(row => !row.title && !row.description && !row.imageUrl)
      .map(row => row.url)
      .filter(url => !unfurledRef.current.has(url));
    if (missing.length === 0) return;
    missing.forEach(url => unfurledRef.current.add(url));
    void (async () => {
      try {
        const { error } = await supabase.functions.invoke('chat-unfurl', {
          body: { urls: missing },
        });
        if (error) {
          console.warn('[chat-v2] unfurl invoke failed', error);
          return;
        }
        await queryClient.invalidateQueries({
          queryKey: ['chat', 'link-previews', urls.join('|')],
        });
      } catch (e) {
        console.warn('[chat-v2] unfurl threw', e);
      }
    })();
  }, [query.data, urls, queryClient]);

  return query;
}
