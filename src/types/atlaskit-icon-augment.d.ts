// Relax @atlaskit/icon types so legacy call sites compile.
// BaseNewIconProps is an interface that flows into NewCoreIconProps/NewUtilityIconProps.
declare module '@atlaskit/icon/dist/types/types' {
  interface BaseNewIconProps {
    size?: any;
    primaryColor?: string;
  }
  interface OtherGlyphProps {
    label?: string;
    size?: any;
    primaryColor?: string;
  }
  interface LegacyOtherGlyphProps {
    label?: string;
    size?: any;
    primaryColor?: string;
  }
}
export {};
