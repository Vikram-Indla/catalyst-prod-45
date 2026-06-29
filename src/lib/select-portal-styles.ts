import type { StylesConfig } from '@atlaskit/select';

const FS = 'var(--ds-font-size-400)';
const FS_SM = 'var(--ds-font-size-200)';

function fontSlots(fontSize: string): Pick<StylesConfig<any>, 'menu' | 'option' | 'singleValue' | 'input'> {
  const fn = (base: object) => ({ ...base, fontSize });
  return { menu: fn, option: fn, singleValue: fn, input: fn };
}

export const portalSelectStyles: StylesConfig<any> = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  ...fontSlots(FS),
};

export const portalSelectStylesCompact: StylesConfig<any> = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  ...fontSlots(FS_SM),
};

export function mergePortalStyles(extra: StylesConfig<any>, compact = false): StylesConfig<any> {
  const portal = compact ? portalSelectStylesCompact : portalSelectStyles;
  return { ...portal, ...extra };
}
