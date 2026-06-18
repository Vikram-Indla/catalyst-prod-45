// useMigrateLegacyFavorites — one-time migration of pre-2026-06-18 sidebar
// favorites from localStorage into user_starred_items.
//
// Before this change the sidebar row star wrote a bare path array to
// localStorage['catalyst-favorites']. The For You "Starred" tab reads
// user_starred_items, so those old favorites never appeared there. This hook
// reads the legacy paths once, upserts them as star rows (type via
// sidebarStarType, route in metadata), then sets a flag so it never re-runs.
//
// Idempotent: upsert ignores duplicates; the flag short-circuits subsequent
// loads even across multiple sidebar mounts.
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { sidebarStarType } from '@/lib/starType';
import type { StarredItemType } from '@/hooks/home/useStarredItems';

const LEGACY_KEY = 'catalyst-favorites';
const MIGRATED_FLAG = 'catalyst-favorites-migrated.v1';

export interface LegacyFavoriteRow {
  item_id: string;
  item_type: StarredItemType;
  metadata: { label: string; route: string };
}

function humanise(path: string): string {
  const tail = path.split('?')[0].replace(/\/+$/, '').split('/').filter(Boolean).pop();
  if (!tail) return path;
  const words = tail.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Pure mapper: legacy favorite path → star row. Surface route words map to
// their canonical type (so a migrated backlog/dashboard shares the same
// (item_id, item_type) as a header star); everything else → 'page'.
export function legacyFavoriteRow(path: string): LegacyFavoriteRow {
  return {
    item_id: path,
    item_type: sidebarStarType(path),
    metadata: { label: humanise(path), route: path },
  };
}

function readLegacyFavorites(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string' && p.length > 0) : [];
  } catch {
    return [];
  }
}

export function useMigrateLegacyFavorites() {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    if (localStorage.getItem(MIGRATED_FLAG) === 'true') return;

    const paths = readLegacyFavorites();
    if (paths.length === 0) {
      localStorage.setItem(MIGRATED_FLAG, 'true');
      return;
    }

    const rows = paths.map(legacyFavoriteRow).map(r => ({
      user_id: userId,
      item_id: r.item_id,
      item_type: r.item_type,
      metadata: r.metadata,
    }));

    let cancelled = false;
    (async () => {
      const { error } = await supabase
        .from('user_starred_items')
        .upsert(rows, { onConflict: 'user_id,item_id,item_type', ignoreDuplicates: true });
      // Mark migrated even on benign errors so we don't loop on every mount;
      // a hard failure (e.g. offline) leaves the flag unset to retry next load.
      if (!cancelled && !error) {
        localStorage.setItem(MIGRATED_FLAG, 'true');
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);
}
