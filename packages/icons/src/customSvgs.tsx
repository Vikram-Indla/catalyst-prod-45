/**
 * Custom Catylast brand glyphs. Each component matches the prop surface
 * the registry expects from a Lucide component (`size`, `color`,
 * `strokeWidth`, className/style/aria pass-through) so they slot into
 * the same `<Icon name="…" />` API.
 *
 * All paths use `fill="currentColor"` so the icon colour follows the
 * `color` prop (which is applied as inline `color` style) — exactly the
 * same indirection Lucide uses for its stroked glyphs. `strokeWidth` is
 * accepted for API parity but ignored (these are filled glyphs).
 *
 * SVG path data is inlined here so the package has no static-asset
 * build step. To add another brand glyph, define a new component
 * following the same pattern (declare `naturalWidth`/`naturalHeight`
 * matching the original viewBox, swap any hardcoded `fill` value for
 * `currentColor`), then register it in `./registry.ts`.
 */
import type { CSSProperties, SVGAttributes } from "react";

// All optional fields explicitly include `undefined` so consumers using
// `exactOptionalPropertyTypes: true` (notably the shared `Icon`
// component) can forward `string | undefined` values without TS
// rejecting the explicit-undefined case.
export type CatylastSvgProps = {
  size?: number | string | undefined;
  color?: string | undefined;
  strokeWidth?: number | string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  "aria-label"?: string | undefined;
  "aria-hidden"?: boolean | undefined;
  role?: string | undefined;
  focusable?: boolean | "true" | "false" | undefined;
};

type SvgFactoryProps = CatylastSvgProps &
  Pick<SVGAttributes<SVGSVGElement>, "viewBox"> & {
    children: React.ReactNode;
    naturalWidth: number;
    naturalHeight: number;
  };

function CatylastSvg({
  size = 16,
  color,
  className,
  style,
  viewBox,
  children,
  naturalWidth,
  naturalHeight,
  // strokeWidth deliberately omitted — filled glyphs ignore it.
  strokeWidth: _strokeWidth,
  ...rest
}: SvgFactoryProps) {
  // Preserve the SVG's natural aspect ratio when rendered at a target
  // pixel size — height scales with width so non-square glyphs (e.g.
  // change-status at 16x8) don't get distorted.
  const aspect = naturalHeight / naturalWidth;
  const width = typeof size === "number" ? size : parseFloat(size);
  const height = Number.isFinite(width)
    ? Math.round(width * aspect * 100) / 100
    : size;

  const composedStyle: CSSProperties = color
    ? { color, ...style }
    : (style ?? {});

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={composedStyle}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function MouseSelectionIcon(props: CatylastSvgProps) {
  return (
    <CatylastSvg
      {...props}
      viewBox="0 0 16 16"
      naturalWidth={16}
      naturalHeight={16}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.90856 2.5C3.57823 2.5 2.49979 3.57844 2.49979 4.90877C2.49979 5.86007 3.05116 6.68401 3.85514 7.07579L3.19805 8.42421C1.8981 7.79074 0.999786 6.45538 0.999786 4.90877C0.999786 2.75002 2.7498 1 4.90856 1C6.45516 1 7.79052 1.89832 8.424 3.19827L7.07558 3.85536C6.68379 3.05138 5.85985 2.5 4.90856 2.5ZM4.71967 4.7199C4.92529 4.51428 5.23123 4.44605 5.50473 4.54481L14.5047 7.79481C14.7982 7.9008 14.9954 8.17744 14.9999 8.48945C15.0044 8.80147 14.8152 9.08366 14.5249 9.19804L10.7033 10.7035L9.19781 14.5251C9.08343 14.8155 8.80124 15.0046 8.48923 15.0002C8.17721 14.9957 7.90057 14.7985 7.79458 14.505L4.54458 5.50496C4.44582 5.23146 4.51405 4.92552 4.71967 4.7199ZM6.49811 6.49834L8.53051 12.1265L9.42719 9.85034C9.50343 9.65682 9.65659 9.50365 9.85011 9.42742L12.1263 8.53074L6.49811 6.49834Z"
        fill="currentColor"
      />
    </CatylastSvg>
  );
}

export function ChangeStatusIcon(props: CatylastSvgProps) {
  return (
    <CatylastSvg
      {...props}
      viewBox="0 0 16 8"
      naturalWidth={16}
      naturalHeight={8}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 2C0 0.895431 0.89543 0 2 0H14C15.1046 0 16 0.895431 16 2V6C16 7.10457 15.1046 8 14 8H2C0.895431 8 0 7.10457 0 6V2ZM2 1.5C1.72386 1.5 1.5 1.72386 1.5 2V6C1.5 6.27614 1.72386 6.5 2 6.5H14C14.2761 6.5 14.5 6.27614 14.5 6V2C14.5 1.72386 14.2761 1.5 14 1.5H2ZM13 4.75H3V3.25H13V4.75Z"
        fill="currentColor"
      />
    </CatylastSvg>
  );
}

export function EditIcon(props: CatylastSvgProps) {
  return (
    <CatylastSvg
      {...props}
      viewBox="0 0 16 16"
      naturalWidth={16}
      naturalHeight={16}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.5858 0.853364C12.3668 0.0723154 13.6332 0.0723166 14.4142 0.853365L15.1464 1.5856C15.9275 2.36665 15.9275 3.63298 15.1464 4.41402L10.0094 9.5511C9.76903 9.79144 9.47141 9.96656 9.1446 10.0599L5.95604 10.971C5.69415 11.0458 5.41227 10.9727 5.21967 10.7801C5.02707 10.5875 4.95403 10.3057 5.02886 10.0438L5.93987 6.85522C6.03325 6.5284 6.20837 6.23078 6.44871 5.99044L11.5858 0.853364ZM13.3536 1.91402C13.1583 1.71876 12.8417 1.71876 12.6464 1.91402L12.0607 2.49981L13.5 3.93915L14.0858 3.35336C14.281 3.1581 14.281 2.84152 14.0858 2.64626L13.3536 1.91402ZM12.4393 4.99981L11 3.56047L7.50937 7.0511C7.44928 7.11119 7.4055 7.18559 7.38216 7.2673L6.84202 9.15779L8.73251 8.61765C8.81422 8.59431 8.88862 8.55053 8.94871 8.49044L12.4393 4.99981ZM3 2.50091C2.72386 2.50091 2.5 2.72477 2.5 3.00091V13.0009C2.5 13.2771 2.72386 13.5009 3 13.5009H13C13.2761 13.5009 13.5 13.2771 13.5 13.0009V9.99981H15V13.0009C15 14.1055 14.1046 15.0009 13 15.0009H3C1.89543 15.0009 1 14.1055 1 13.0009V3.00091C1 1.89634 1.89543 1.00091 3 1.00091H6V2.50091H3Z"
        fill="currentColor"
      />
    </CatylastSvg>
  );
}

export function EyeSolidIcon(props: CatylastSvgProps) {
  return (
    <CatylastSvg
      {...props}
      viewBox="0 0 16 12"
      naturalWidth={16}
      naturalHeight={12}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.94258 1.5C4.99995 1.5 2.45199 3.34456 1.51847 5.89564C1.49384 5.96295 1.49384 6.03705 1.51847 6.10436C2.45199 8.65544 4.99995 10.5 7.94258 10.5C10.8852 10.5 13.4334 8.65542 14.3669 6.10436C14.3915 6.03705 14.3915 5.96295 14.3669 5.89564C13.4334 3.34458 10.8852 1.5 7.94258 1.5ZM0.109823 5.38017C1.26167 2.23246 4.376 0 7.94258 0C11.5091 0 14.6237 2.23244 15.7755 5.38017C15.922 5.78033 15.922 6.21967 15.7755 6.61983C14.6237 9.76756 11.5091 12 7.94258 12C4.376 12 1.26167 9.76754 0.109823 6.61983C-0.0366078 6.21967 -0.0366077 5.78033 0.109823 5.38017ZM7.94268 4.5C7.11425 4.5 6.44268 5.17157 6.44268 6C6.44268 6.82843 7.11425 7.5 7.94268 7.5C8.77111 7.5 9.44268 6.82843 9.44268 6C9.44268 5.17157 8.77111 4.5 7.94268 4.5ZM4.94268 6C4.94268 4.34315 6.28583 3 7.94268 3C9.59953 3 10.9427 4.34315 10.9427 6C10.9427 7.65685 9.59953 9 7.94268 9C6.28583 9 4.94268 7.65685 4.94268 6Z"
        fill="currentColor"
      />
    </CatylastSvg>
  );
}

export function TrashSolidIcon(props: CatylastSvgProps) {
  return (
    <CatylastSvg
      {...props}
      viewBox="0 0 13 16"
      naturalWidth={13}
      naturalHeight={16}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 0.75C3.5 0.335786 3.83579 0 4.25 0H8.75C9.16421 0 9.5 0.335786 9.5 0.75V2.5H13V4H12V14C12 15.1046 11.1046 16 10 16H3C1.89543 16 1 15.1046 1 14V4H0V2.5H3.5V0.75ZM5 2.5H8V1.5H5V2.5ZM2.5 4V14C2.5 14.2761 2.72386 14.5 3 14.5H10C10.2761 14.5 10.5 14.2761 10.5 14V4H2.5ZM4.25 13V5.5H5.75V13H4.25ZM7.25 13V5.5H8.75V13H7.25Z"
        fill="currentColor"
      />
    </CatylastSvg>
  );
}

export function CrossIcon(props: CatylastSvgProps) {
  return (
    <CatylastSvg
      {...props}
      viewBox="0 0 12 12"
      naturalWidth={12}
      naturalHeight={12}
    >
      <path
        d="M11.0605 1.06055L6.59082 5.53027L11.0605 10L10 11.0605L5.53027 6.59082L1.06055 11.0605L0 10L4.46973 5.53027L0 1.06055L1.06055 0L5.53027 4.46973L10 0L11.0605 1.06055Z"
        fill="currentColor"
      />
    </CatylastSvg>
  );
}
