// Relax @atlaskit/icon types so legacy call sites compile.
import type { CSSProperties } from 'react';

declare module '@atlaskit/icon/dist/types/types' {
  interface BaseNewIconProps {
    size?: any;
    primaryColor?: string;
    className?: string;
    style?: CSSProperties;
  }
  interface OtherGlyphProps {
    label?: string;
    size?: any;
    primaryColor?: string;
    className?: string;
    style?: CSSProperties;
  }
  interface LegacyOtherGlyphProps {
    label?: string;
    size?: any;
    primaryColor?: string;
    className?: string;
    style?: CSSProperties;
  }
  interface GlyphSizeProps {
    size?: any;
  }
}
export {};
