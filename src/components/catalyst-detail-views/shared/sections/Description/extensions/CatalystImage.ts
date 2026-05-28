/**
 * CatalystImage — extends Tiptap's Image with the Jira-ADF attrs the
 * floating image toolbar drives:
 *   - alignment    : 1:1 with mediaSingle.attrs.layout
 *   - borderColor  : null | 'light' | 'medium' | 'dark'
 *   - borderSize   : 'small' | 'medium' | 'large'
 *
 * The border is rendered via an inline style on the <img> tag (computed
 * from borderColor + borderSize in the borderColor renderHTML callback)
 * so a single attribute owns the style emission and avoids two attrs
 * colliding on the `style` attribute.
 */
import Image from '@tiptap/extension-image';

export type ImageAlignment =
  | 'center'
  | 'align-start'
  | 'align-end'
  | 'wrap-left'
  | 'wrap-right'
  | 'wide'
  | 'full-width';

export type BorderColor = 'light' | 'medium' | 'dark';
export type BorderSize = 'small' | 'medium' | 'large';

export const BORDER_COLOR_HEX: Record<BorderColor, string> = {
  light: '#DCDFE4',
  medium: '#8590A2',
  dark: '#22272B',
};

export const BORDER_SIZE_PX: Record<BorderSize, number> = {
  small: 1,
  medium: 2,
  large: 4,
};

export const CatalystImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null as number | null,
        parseHTML: (el) => {
          const raw = el.getAttribute('width');
          if (raw == null) return null;
          const n = parseInt(raw, 10);
          return Number.isFinite(n) ? n : null;
        },
        renderHTML: (attrs) => {
          if (!attrs.width || typeof attrs.width !== 'number') return {};
          return { width: String(attrs.width) };
        },
      },
      alignment: {
        default: 'center' as ImageAlignment,
        parseHTML: (el) =>
          (el.getAttribute('data-alignment') as ImageAlignment) ?? 'center',
        renderHTML: (attrs) => ({ 'data-alignment': attrs.alignment }),
      },
      borderColor: {
        default: null as BorderColor | null,
        parseHTML: (el) =>
          (el.getAttribute('data-border-color') as BorderColor | null) ?? null,
        renderHTML: (attrs) => {
          const color = attrs.borderColor as BorderColor | null;
          const size = (attrs.borderSize as BorderSize) ?? 'medium';
          if (!color) {
            return { 'data-border-color': '' };
          }
          const px = BORDER_SIZE_PX[size];
          const hex = BORDER_COLOR_HEX[color];
          return {
            'data-border-color': color,
            style: `border: ${px}px solid ${hex};`,
          };
        },
      },
      borderSize: {
        default: 'medium' as BorderSize,
        parseHTML: (el) =>
          (el.getAttribute('data-border-size') as BorderSize) ?? 'medium',
        renderHTML: (attrs) => ({ 'data-border-size': attrs.borderSize }),
      },
    };
  },
});
