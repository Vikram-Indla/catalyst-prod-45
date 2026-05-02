/**
 * ProductChromeBand — Phase 5b (2026-05-02).
 *
 * Mirror of ProjectChromeBand for Product Hub. Renders the chrome-band
 * header (breadcrumb + product icon + product name + actions) above the
 * white card on /product-hub/{CODE}/* per-product pages.
 *
 * Behaviour and visual parity:
 *   Row A — "Products" breadcrumb (clickable, navigates to /product-hub/products)
 *   Row B — ProductIcon + H1 product name + actions slot (right cluster)
 *
 * This is structurally a drop-in twin of ProjectChromeBand. We didn't reuse
 * ProjectChromeBand directly because its breadcrumb root text is hardcoded
 * as "Projects" — and we explicitly don't modify project-hub files.
 */

import { type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import { Package } from 'lucide-react';

export interface ProductChromeBandProps {
  productName: string;
  /** Optional brand color used for the icon tile background. */
  productColor?: string | null;
  /** Optional href on the product name itself in the breadcrumb. */
  productHref?: string;
  /** Right-side actions slot — Add people / share / etc. */
  actions?: ReactNode;
  /** Inline element rendered immediately after the H1 (e.g. invite icon). */
  nameAdornment?: ReactNode;
}

export function ProductChromeBand({
  productName,
  productColor,
  productHref,
  actions,
  nameAdornment,
}: ProductChromeBandProps) {
  return (
    <div
      data-testid="product-chrome-band"
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      {/* Row A — Breadcrumb */}
      <div style={{ paddingTop: 8, paddingBottom: 0 }}>
        <Breadcrumbs>
          <BreadcrumbsItem
            href="/product-hub/products"
            text="Products"
            component={(props) => (
              <RouterLink to="/product-hub/products" {...props} />
            )}
          />
          <BreadcrumbsItem
            href={productHref ?? '#'}
            text={productName}
            onClick={(e) => e.preventDefault()}
          />
        </Breadcrumbs>
      </div>

      {/* Row B — Product icon + H1 + adornment + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
        <div
          aria-hidden="true"
          style={{
            width: 20,
            height: 20,
            borderRadius: 3,
            background: productColor ?? '#6554C0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <Package size={12} strokeWidth={2.25} />
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 653,
            lineHeight: '24px',
            letterSpacing: '-0.003em',
            color: 'var(--ds-text, #29292E)',
            fontFamily: 'var(--cp-font-heading)',
          }}
        >
          {productName}
        </h1>

        {nameAdornment}

        {/* Spacer pushes actions to the right */}
        <div style={{ flex: 1 }} />

        {actions}
      </div>
    </div>
  );
}

export default ProductChromeBand;
