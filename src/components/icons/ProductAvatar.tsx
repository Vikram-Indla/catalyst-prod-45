import { getProductAvatarUrl } from './icons.registry';

export interface ProductAvatarProps {
  code: string;
  size?: number;
  className?: string;
}

/**
 * Renders a Saudi-landmark gradient SVG for a product code.
 * Known codes (e.g. INV) get a fixed assignment; unknown codes rotate
 * deterministically through the 20-landmark pool via djb2 hash.
 */
export function ProductAvatar({ code, size = 32, className }: ProductAvatarProps) {
  return (
    <img
      src={getProductAvatarUrl(code)}
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
