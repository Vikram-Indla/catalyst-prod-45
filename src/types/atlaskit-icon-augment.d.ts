// Relax @atlaskit/icon types so legacy call sites compile.
// Targets the interfaces declared in @atlaskit/icon/dist/types/types.d.ts.
import type { CSSProperties } from 'react';

declare module '@atlaskit/icon/dist/types/types' {
  // New core icons (e.g. `@atlaskit/icon/core/*`) — accept legacy `size` and `primaryColor`.
  interface BaseNewIconProps {
    size?: any;
    primaryColor?: string;
    className?: string;
    style?: CSSProperties;
  }
  // Legacy glyph icons (e.g. `@atlaskit/icon/glyph/*`) — make `label` optional.
  interface OtherGlyphProps {
    label?: string;
    primaryColor?: string;
    className?: string;
    style?: CSSProperties;
  }
  interface LegacyOtherGlyphProps {
    label?: string;
    primaryColor?: string;
    className?: string;
    style?: CSSProperties;
  }
}
export {};
