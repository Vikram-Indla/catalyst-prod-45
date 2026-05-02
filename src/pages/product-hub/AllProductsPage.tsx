/**
 * AllProductsPage — /product-hub/products
 *
 * jira-compare cycle 1 (2026-05-02) — column shape, header order, and toolbar
 * mirror Jira's /jira/projects (tenant: digital-transformation) probed Lane A:
 *
 *   Headers:  [star] Name (icon+anchor) Key  Type  Lead (avatar+name)  Category  ⋯
 *   Toolbar:  search input above the table, "+ Create product" top-right
 *
 * Atlaskit primitives (Atlaskit-only inside scope):
 *   @atlaskit/dynamic-table   table
 *   @atlaskit/textfield       search
 *   @atlaskit/avatar          name icon + lead avatar
 *   @atlaskit/lozenge         type / category
 *   @atlaskit/dropdown-menu   row actions (⋯)
 *   @atlaskit/icon/glyph/star{,-filled}   favorite toggle
 *
 * Data source: public.products (visible MINI/SEN/ENT/UNA/INV depending on
 * RLS / cleanup state). Frontend-only audit: data shape concerns are
 * out of scope for this cycle.
 */

import { useMemo, useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DynamicTable from '@atlaskit/dynamic-table';
import EmptyState from '@atlaskit/empty-state';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import Textfield from '@atlaskit/textfield';
import DropdownMenu, {
  DropdownItem,
  DropdownItemGroup,
} from '@atlaskit/dropdown-menu';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { token } from '@atlaskit/tokens';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';

const CreateProductModal = lazy(() =>
  import('@/components/product-hub/CreateProductModal').then((m) => ({
    default: m.CreateProductModal,
  })),
);

interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  owner_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const FAV_STORAGE_KEY = 'product-hub.favorites';

/**
 * Column shape mirrors Jira /jira/projects probe (Lane A):
 *   col 1 — star (no header text)
 *   col 2 — Name
 *   col 3 — Key
 *   col 4 — Type
 *   col 5 — Lead
 *   col 6 — Category
 *   col 7 — ⋯ actions (no header text)
 */
const HEAD = {
  cells: [
    { key: 'star',     content: '',         isSortable: false, width: 4 },
    { key: 'name',     content: 'Name',     isSortable: true,  width: 28 },
    { key: 'code',     content: 'Key',      isSortable: true,  width: 10 },
    { key: 'type',     content: 'Type',     isSortable: false, width: 18 },
    { key: 'lead',     content: 'Lead',     isSortable: false, width: 18 },
    { key: 'category', content: 'Category', isSortable: false, width: 16 },
    { key: 'actions',  content: '',         isSortable: false, width: 6 },
  ],
};

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveFavorites(favs: Set<string>): void {
  try {
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(Array.from(favs)));
  } catch {
    /* localStorage may be blocked — degrade silently */
  }
}

export default function AllProductsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['product-hub', 'products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select(
          'id, code, name, description, color, owner_id, is_active, sort_order, created_at',
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as Product[]) ?? [];
    },
    staleTime: 60_000,
  });

  /** Apply search filter + sort favorites first (matches Jira behaviour). */
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = searchQuery.trim().toLowerCase();
    let out = products;
    if (q) {
      out = out.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false),
      );
    }
    return out.slice().sort((a, b) => {
      const af = favorites.has(a.id) ? 0 : 1;
      const bf = favorites.has(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.sort_order - b.sort_order;
    });
  }, [products, searchQuery, favorites]);

  const rows = useMemo(() => {
    return filteredProducts.map((p) => {
      const isFav = favorites.has(p.id);
      return {
        key: p.id,
        cells: [
          /* col 1 — star toggle */
          {
            key: 'star',
            content: (
              <button
                type="button"
                aria-label={isFav ? 'Unstar product' : 'Star product'}
                aria-pressed={isFav}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(p.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                  color: isFav
                    ? token('color.icon.warning')
                    : token('color.icon.subtle'),
                }}
              >
                {isFav ? (
                  <StarFilledIcon label="" size="small" />
                ) : (
                  <StarIcon label="" size="small" />
                )}
              </button>
            ),
          },
          /* col 2 — name (icon + anchor → drilldown) */
          {
            key: 'name',
            content: (
              <RouterLink
                to={`/product-hub/${p.code}/backlog`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  textDecoration: 'none',
                  color: token('color.link'),
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.textDecoration =
                    'underline';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.textDecoration =
                    'none';
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 3,
                    background: p.color || token('color.background.brand.bold'),
                    color: token('color.text.inverse'),
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--cp-font-mono)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {p.code.slice(0, 2)}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {p.name}
                </span>
              </RouterLink>
            ),
          },
          /* col 3 — key (plain text, no anchor; Name is the click target) */
          {
            key: 'code',
            content: (
              <span
                style={{
                  fontFamily: 'var(--cp-font-mono)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: token('color.text.subtle'),
                }}
              >
                {p.code}
              </span>
            ),
          },
          /* col 4 — type (lozenge; placeholder text matching Jira's
                     "Company-managed software" / "Team-managed business" pattern) */
          {
            key: 'type',
            content: (
              <span
                style={{ fontSize: 13, color: token('color.text.subtle') }}
              >
                Product line
              </span>
            ),
          },
          /* col 5 — lead (avatar + name) */
          {
            key: 'lead',
            content: p.owner_id ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Avatar size="small" />
                <span
                  style={{
                    fontSize: 13,
                    color: token('color.text'),
                  }}
                >
                  Owner
                </span>
              </span>
            ) : (
              <span
                style={{
                  fontSize: 13,
                  color: token('color.text.subtlest'),
                }}
              >
                Unassigned
              </span>
            ),
          },
          /* col 6 — category (description first 30 chars or em-dash) */
          {
            key: 'category',
            content: p.description ? (
              <span
                style={{
                  fontSize: 13,
                  color: token('color.text.subtle'),
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  maxWidth: '100%',
                }}
                title={p.description}
              >
                {p.description}
              </span>
            ) : (
              <span
                style={{
                  fontSize: 13,
                  color: token('color.text.subtlest'),
                }}
              >
                —
              </span>
            ),
          },
          /* col 7 — ⋯ actions menu */
          {
            key: 'actions',
            content: (
              <DropdownMenu
                trigger={({ triggerRef, ...triggerProps }) => (
                  <button
                    {...triggerProps}
                    ref={triggerRef}
                    type="button"
                    aria-label={`More actions for ${p.name}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 4,
                      cursor: 'pointer',
                      borderRadius: 3,
                      color: token('color.icon.subtle'),
                    }}
                  >
                    <MoreIcon label="" size="small" />
                  </button>
                )}
                placement="bottom-end"
              >
                <DropdownItemGroup>
                  <DropdownItem href={`/product-hub/${p.code}/backlog`}>
                    Open backlog
                  </DropdownItem>
                  <DropdownItem href={`/product-hub/${p.code}/dashboard`}>
                    Open dashboard
                  </DropdownItem>
                  <DropdownItem href={`/product-hub/${p.code}/settings`}>
                    Settings
                  </DropdownItem>
                </DropdownItemGroup>
              </DropdownMenu>
            ),
          },
        ],
      };
    });
  }, [filteredProducts, favorites, toggleFavorite]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* Header row: title + Create button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <CatalystPageHeader title="Products" />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 4,
            border: 'none',
            background: token('color.background.brand.bold'),
            color: token('color.text.inverse'),
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Plus size={16} />
          Create product
        </button>
      </div>

      {/* Toolbar: search input — mirrors Jira's project-filter row */}
      <div style={{ marginTop: 16, maxWidth: 320 }}>
        <Textfield
          name="product-search"
          placeholder="Search products"
          value={searchQuery}
          onChange={(e: any) => setSearchQuery(e.target.value)}
          aria-label="Search products"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        {error ? (
          <EmptyState
            header="Couldn't load products"
            description={
              <span>
                Could not query <code>public.products</code>. Check the browser
                console for the Supabase error code.
              </span>
            }
          />
        ) : (
          <DynamicTable
            head={HEAD}
            rows={rows}
            isLoading={isLoading}
            loadingSpinnerSize="large"
            emptyView={
              <EmptyState
                header="No products found"
                description={
                  searchQuery
                    ? 'Try adjusting your search.'
                    : 'Create a product to get started.'
                }
              />
            }
            rowsPerPage={20}
            defaultPage={1}
            defaultSortKey="name"
            defaultSortOrder="ASC"
          />
        )}
      </div>

      <Suspense fallback={null}>
        {createOpen && (
          <CreateProductModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
