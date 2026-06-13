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
import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getProductAvatarUrl } from '@/components/icons';
import { ProjectHeaderChip, type HeaderAdapter, type HeaderEntity, type MemberRow } from './ProjectHeaderChip';

interface Props {
  /** products.code — e.g. "INV". */
  productCode: string;
}

export function ProductHeaderChip({ productCode }: Props) {
  // We need product.id for the member CRUD calls. Resolve it once and pass into the adapter callbacks.
  const [productId, setProductId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from('products')
        .select('id')
        .eq('code', productCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      if (alive) setProductId((data as { id?: string } | null)?.id ?? null);
    })();
    return () => { alive = false; };
  }, [productCode]);

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
        avatar_url: getProductAvatarUrl(productCode),
        icon: row?.icon ?? null,
        color: row?.color ?? null,
      };
    },
    // ── Member CRUD writing to product_members (mirrors project_members shape) ──
    membersCacheKey: ['product-header-chip-members', productCode],
    fetchMembers: async (): Promise<MemberRow[]> => {
      if (!productId) return [];
      const { data } = await (supabase as any)
        .from('product_members')
        .select('id, user_id, role, profiles:user_id(full_name, email, avatar_url)')
        .eq('product_id', productId);
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id, user_id: r.user_id, role: r.role,
        name: r.profiles?.full_name ?? r.profiles?.email ?? r.user_id,
        email: r.profiles?.email ?? '',
        avatar_url: r.profiles?.avatar_url ?? null,
      }));
    },
    addMember: async (userId: string) => {
      if (!productId) throw new Error('Product not loaded');
      const { error } = await (supabase as any).from('product_members').insert({
        product_id: productId, user_id: userId, role: 'member',
      });
      if (error && error.code !== '23505') throw error;  // 23505 = unique violation (already a member)
    },
    removeMember: async (memberId: string) => {
      const { error } = await (supabase as any).from('product_members').delete().eq('id', memberId);
      if (error) throw error;
    },
  }), [productCode, productId]);

  return <ProjectHeaderChip adapter={adapter} />;
}

export default ProductHeaderChip;
