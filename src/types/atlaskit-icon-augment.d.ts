// Relax @atlaskit/icon types so legacy call sites compile.
// The interfaces in @atlaskit/icon/dist/types/types are not exported,
// so we can't merge into them. Instead, wildcard-declare the per-icon
// submodules (`@atlaskit/icon/glyph/*` and `@atlaskit/icon/core/*`) and
// give them a permissive prop signature.
import type { ComponentType, CSSProperties } from 'react';

type AnyIconProps = {
  label?: string;
  size?: any;
  primaryColor?: string;
  secondaryColor?: string;
  color?: string;
  spacing?: 'none' | 'spacious' | 'compact';
  className?: string;
  style?: CSSProperties;
  testId?: string;
  'data-testid'?: string;
  [key: string]: any;
};

declare module '@atlaskit/icon/glyph/*' {
  const Icon: ComponentType<AnyIconProps>;
  export default Icon;
}

declare module '@atlaskit/icon/core/*' {
  const Icon: ComponentType<AnyIconProps>;
  export default Icon;
}

declare module '@atlaskit/icon/utility/*' {
  const Icon: ComponentType<AnyIconProps>;
  export default Icon;
}

declare module '@atlaskit/icon-lab/core/*' {
  const Icon: ComponentType<AnyIconProps>;
  export default Icon;
}

export {};
