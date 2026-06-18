/**
 * hubLanding — smart Project/Product hub landing resolution.
 *
 * Rule (Vikram, 2026-06-18): entering a hub root (/project-hub, /product-hub)
 * must land the user INSIDE an entity, never on the manager list. Resolution:
 *   1. Last-accessed entity (recency) — wins any contention.
 *   2. Most-recently-active subscribed entity (membership + activity ts).
 *   3. Manager list — last resort only (zero memberships).
 *
 * Single source of truth: mounted at the hub index route so hub-switcher
 * click, ⌘4/⌘5 shortcut, typed URL and breadcrumb all resolve identically.
 */
import { supabase } from '@/integrations/supabase/client';

const RECENT_KEY = 'catalyst.switcher-recent';
// Keys hidden from the switcher (CLAUDE.md) — never a valid landing target.
const EXCLUDED_PROJECT_KEYS = new Set(['TH-DEFAULT', 'MDT', 'INV']);

export const PROJECT_LIST_PATH = '/project-hub/projects';
export const PRODUCT_LIST_PATH = '/product-hub/products';

export const projectLandingPath = (key: string) => `/project-hub/${key}/dashboard`;
export const productLandingPath = (code: string) => `/product-hub/${code}/backlog`;

type RecentType = 'project' | 'product';

/**
 * Most-recently-accessed key of the given type from the switcher recency store.
 * The array is most-recent-first (ContextSwitcher unshifts on every visit).
 * Returns null on empty/malformed storage or no matching entry — never throws.
 */
export function readMostRecentKey(type: RecentType): string | null {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return null;
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return null;
    for (const it of items) {
      if (it && it.type === type && typeof it.key === 'string' && it.key) return it.key;
    }
    return null;
  } catch {
    return null;
  }
}

/** Resolve where /project-hub should land the current user. */
export async function resolveDefaultProjectPath(): Promise<string> {
  const recent = readMostRecentKey('project');
  if (recent) return projectLandingPath(recent);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return PROJECT_LIST_PATH;

  const { data: memberships } = await (supabase as any)
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id);
  const projectIds = ((memberships ?? []) as Array<{ project_id: string }>)
    .map((m) => m.project_id)
    .filter(Boolean);
  if (projectIds.length === 0) return PROJECT_LIST_PATH;

  const { data: rows } = await (supabase as any)
    .from('v_project_list')
    .select('project_key, last_synced_at')
    .in('id', projectIds)
    .order('last_synced_at', { ascending: false, nullsFirst: false });
  const top = ((rows ?? []) as Array<{ project_key: string }>)
    .find((r) => r.project_key && !EXCLUDED_PROJECT_KEYS.has(r.project_key));
  return top ? projectLandingPath(top.project_key) : PROJECT_LIST_PATH;
}

/** Resolve where /product-hub should land the current user. */
export async function resolveDefaultProductPath(): Promise<string> {
  const recent = readMostRecentKey('product');
  if (recent) return productLandingPath(recent);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return PRODUCT_LIST_PATH;

  const { data: memberships } = await (supabase as any)
    .from('product_members')
    .select('product_id')
    .eq('user_id', user.id);
  const productIds = ((memberships ?? []) as Array<{ product_id: string }>)
    .map((m) => m.product_id)
    .filter(Boolean);
  if (productIds.length === 0) return PRODUCT_LIST_PATH;

  const { data: rows } = await (supabase as any)
    .from('products')
    .select('code, updated_at')
    .in('id', productIds)
    .order('updated_at', { ascending: false, nullsFirst: false });
  const top = ((rows ?? []) as Array<{ code: string }>).find((r) => r.code);
  return top ? productLandingPath(top.code) : PRODUCT_LIST_PATH;
}
