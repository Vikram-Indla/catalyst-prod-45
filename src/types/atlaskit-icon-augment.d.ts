// Augments @atlaskit/icon to keep legacy call sites compiling after the
// upstream type tightening (label became required on GlyphProps, and the new
// core icon props dropped `size`/`primaryColor`). All existing usages pass
// these props, so we relax the contract here in one place.
import type { Size } from '@atlaskit/icon';

declare module '@atlaskit/icon/types' {
  interface LegacyOtherGlyphProps {
    label?: string;
  }
  interface OtherGlyphProps {
    label?: string;
  }
}

declare module '@atlaskit/icon' {
  interface GlyphProps {
    label?: string;
  }
  interface NewCoreIconProps {
    size?: Size | string;
    primaryColor?: string;
  }
  interface NewUtilityIconProps {
    size?: Size | string;
    primaryColor?: string;
  }
}

export {};
