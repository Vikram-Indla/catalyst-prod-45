/**
 * ProductHeaderChip — thin wrapper around the canonical ProjectHeaderChip.
 *
 * Mounts the SAME chrome strip (icon + name + Add people + meatball) on
 * /product-hub/:code/* surfaces by providing a product-flavored adapter.
 *
 * Per CLAUDE.md "Adopt canonical components, never reimplement" (2026-06-01):
 * the visual + interaction code lives in ProjectHeaderChip; this wrapper
 * only provides the data source (`products` table) and the routing.
 *
 * Action affordances (Add people / Manage people / Star) wire through to
 * the SAME modal/menu code path as the project version. The new
 * `product_members` table (migration 20260601150000) is in place for the
 * future write wiring; the modal currently queues invites locally on both
 * project and product surfaces.
 */
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProjectHeaderChip, type HeaderAdapter, type HeaderEntity } from './ProjectHeaderChip';

interface Props {
  /** products.code — e.g. "INV". */
  productCode: string;
}

export function ProductHeaderChip({ productCode }: Props) {
  const adapter = useMemo<HeaderAdapter>(() => ({
    cacheKey: ['product-header-chip', productCode],
    iconKey: productCode,
    settingsHref: `/product-hub/${productCode}/settings`,
    starItemType: 'product',
    fetchEntity: async (): Promise<HeaderEntity> => {
      const { data } = await (supabase as any)
        .from('products')
        .select('id, code, name, icon, color')
        .eq('code', productCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      const row = data as { id?: string; name?: string; icon?: string | null; color?: string | null } | null;
      return {
        id: row?.id ?? null,
        name: row?.name ?? null,
        avatar_url: null, // products use icon/color, not avatar_url
        icon: row?.icon ?? null,
        color: row?.color ?? null,
      };
    },
  }), [productCode]);

  return <ProjectHeaderChip adapter={adapter} />;
}

export default ProductHeaderChip;
