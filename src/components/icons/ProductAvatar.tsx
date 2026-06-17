import { getProductAvatarUrl } from './icons.registry';
import { iconUrlForKey, PRODUCT_ICONS } from '@/components/shared/IconPickerGrid';

export interface ProductAvatarProps {
  code: string;
  /**
   * products.icon_key — the user-picked product icon. When set and resolvable in
   * PRODUCT_ICONS it wins over the code-based Saudi-landmark default. Omit to keep
   * the legacy code-keyed avatar (every existing call site behaves unchanged).
   */
  iconKey?: string | null;
  size?: number;
  className?: string;
}

/**
 * Renders the user-picked product icon (icon_key) when present, otherwise a
 * Saudi-landmark gradient SVG for the product code. Known codes (e.g. INV) get a
 * fixed assignment; unknown codes rotate deterministically via djb2 hash.
 */
export function ProductAvatar({ code, iconKey, size = 32, className }: ProductAvatarProps) {
  const pickedUrl = iconUrlForKey(iconKey, PRODUCT_ICONS);
  return (
    <img
      src={pickedUrl ?? getProductAvatarUrl(code)}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={className}
      style={{ borderRadius: 8, objectFit: 'fill', flexShrink: 0, display: 'block' }}
    />
  );
}

export default ProductAvatar;
