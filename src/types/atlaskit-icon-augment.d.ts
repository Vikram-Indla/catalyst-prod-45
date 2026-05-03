// Augments @atlaskit/icon to keep legacy call sites compiling after the
// upstream type tightening:
//   - `label` became required on Glyph/OtherGlyphProps
//   - new core/utility icon props dropped `size` and `primaryColor`
// The actual interfaces live in '@atlaskit/icon/dist/types/types'.
// Declaration merging on that exact module path relaxes them globally.

declare module '@atlaskit/icon/dist/types/types' {
  interface OtherGlyphProps {
    label?: string;
    size?: string;
    primaryColor?: string;
  }
  interface LegacyOtherGlyphProps {
    label?: string;
    size?: string | number;
    primaryColor?: string;
  }
  interface BaseNewIconProps {
    size?: string;
    primaryColor?: string;
  }
}

export {};
